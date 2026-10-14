import { z } from 'zod'
import { answerSchema, questionSchema } from '../questionDatabase/schema'
import type { PracticeSession } from './practice'
const storageMode = z.enum(['full', 'reference_only'])
const ref = z.object({ sourceId: z.string(), sourceQuestionId: z.string().optional(), locator: z.string().optional(), accessedAt: z.string().optional() }).optional()
const source = z.object({ id: z.string(), name: z.string(), publisher: z.string(), sourceType: z.enum(['official', 'community', 'third_party', 'user_owned', 'legacy']), sourceTier: z.enum(['A', 'B', 'C', 'D']), rightsStatus: z.enum(['public', 'licensed', 'user_owned', 'reference_only', 'unknown']), examVersions: z.array(z.string()), verified: z.boolean(), url: z.string().optional(), retrievedAt: z.string().optional(), lastVerifiedAt: z.string().optional(), active: z.boolean().optional(), notes: z.string().optional() })
export const practiceSessionSchema: z.ZodType<PracticeSession> = z.object({
  id: z.string().min(1), startedAt: z.number().finite(), deadlineAt: z.number().finite(), currentIndex: z.number().int().nonnegative(),
  answers: z.record(z.string(), answerSchema), flagged: z.array(z.string()), status: z.enum(['active', 'submitted']), submittedAt: z.number().finite().optional(),
  questions: z.array(z.object({
    question: questionSchema.safeExtend({ difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(), id: z.string().min(1), promptHash: z.string(), active: z.boolean(), createdAt: z.string(), updatedAt: z.string() }), source: source.optional(),
    passage: z.object({ id: z.string(), sourceId: z.string(), title: z.string().optional(), text: z.string().optional(), storageMode, sourceReference: ref }).optional(),
    media: z.array(z.object({ id: z.string(), questionId: z.string(), kind: z.enum(['audio', 'image', 'video']), url: z.string().optional(), storageMode, sourceReference: ref })),
  })).min(1),
}).superRefine((session, ctx) => {
  if (session.currentIndex >= session.questions.length || session.deadlineAt <= session.startedAt || new Set(session.questions.map(q => q.question.id)).size !== session.questions.length || (session.status === 'submitted' && (session.submittedAt === undefined || session.submittedAt < session.startedAt || session.submittedAt > session.deadlineAt))) ctx.addIssue({ code: 'custom', message: 'Invalid practice session bounds' })
})
