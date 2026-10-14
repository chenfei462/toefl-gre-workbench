import { z } from 'zod'
import type { QuestionBundle } from './indexedDbRepository'
import { questionSchema } from './schema'
const ref = z.object({ sourceId: z.string(), sourceQuestionId: z.string().optional(), locator: z.string().optional(), accessedAt: z.string().optional() }).optional()
const source = z.object({ id: z.string(), name: z.string(), publisher: z.string(), sourceType: z.enum(['official', 'community', 'third_party', 'user_owned', 'legacy']), sourceTier: z.enum(['A', 'B', 'C', 'D']), rightsStatus: z.enum(['public', 'licensed', 'user_owned', 'reference_only', 'unknown']), examVersions: z.array(z.string()), verified: z.boolean(), url: z.url().optional(), retrievedAt: z.string().optional(), lastVerifiedAt: z.string().optional(), active: z.boolean().optional(), notes: z.string().optional() })
const passage = z.object({ id: z.string(), sourceId: z.string(), title: z.string().optional(), text: z.string().optional(), storageMode: z.enum(['full', 'reference_only']), sourceReference: ref })
const explanation = z.object({ id: z.string(), questionId: z.string(), body: z.string(), sourceReference: ref, verification: z.enum(['verified', 'unverified', 'disputed']), sourceUrl: z.url().optional(), source: z.enum(['official', 'verified', 'user', 'generated']).optional() })
const media = z.object({ id: z.string(), questionId: z.string(), kind: z.enum(['audio', 'image', 'video']), url: z.url().optional(), storageMode: z.enum(['full', 'reference_only']), sourceReference: ref })
const revision = z.object({ id: z.string(), questionId: z.string(), snapshot: questionSchema.safeExtend({ promptHash: z.string(), id: z.string(), active: z.boolean(), createdAt: z.string(), updatedAt: z.string() }), revisedAt: z.string(), reason: z.string() })
export function parseCloudQuestionBundle(input: unknown): QuestionBundle {
  return z.object({
    questions: z.array(questionSchema.safeExtend({ promptHash: z.string(), id: z.string().min(1), active: z.boolean(), createdAt: z.string(), updatedAt: z.string() })),
    sources: z.array(source), passages: z.array(passage), explanations: z.array(explanation), media: z.array(media), revisions: z.array(revision),
  }).superRefine((bundle, ctx) => {
    for (const name of ['questions', 'sources', 'passages', 'explanations', 'media', 'revisions'] as const) {
      const seen = new Set<string>()
      bundle[name].forEach((row, index) => {
        if (seen.has(row.id)) ctx.addIssue({ code: 'custom', path: [name, index, 'id'], message: 'Duplicate bank ID' })
        seen.add(row.id)
      })
    }
  }).parse(input) as QuestionBundle
}
export function parseReferenceBundle(input: unknown): Omit<QuestionBundle, 'questions'> {
  const value = input && typeof input === 'object' ? input as Record<string, unknown> : {}
  const valid = <T>(schema: z.ZodType<T>, key: string): T[] => (Array.isArray(value[key]) ? value[key] : []).flatMap(v => { const p = schema.safeParse(v); return p.success ? [p.data] : [] })
  return { sources: valid(source, 'sources'), passages: valid(passage, 'passages'), explanations: valid(explanation, 'explanations'), media: valid(media, 'media'), revisions: valid(revision, 'revisions') } as Omit<QuestionBundle, 'questions'>
}

