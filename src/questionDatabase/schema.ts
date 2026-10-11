import { z } from 'zod'
export const answerSchema = z.object({ optionId: z.string().optional(), optionIds: z.array(z.string()).optional(), text: z.string().optional(), numericAnswer: z.number().optional(), acceptedAnswers: z.array(z.string()).optional(), score: z.number().optional(), verification: z.enum(['official', 'verified', 'unverified', 'disputed']) })
export const questionSchema = z.object({
  id: z.string().min(1).optional(), sourceId: z.string().min(1), sourceQuestionId: z.string().optional(), sourceSection: z.string().optional(), sourceQuestionNumber: z.string().optional(), title: z.string().optional(),
  exam: z.enum(['toefl', 'gre']), examVersion: z.string().min(1), section: z.enum(['reading', 'listening', 'speaking', 'writing', 'vocabulary', 'quant', 'verbal', 'analytical_writing']), questionType: z.string().min(1), skillIds: z.array(z.string()), prompt: z.string().optional(),
  options: z.array(z.object({ id: z.string().min(1), text: z.string().optional(), label: z.string().optional() })), answer: answerSchema.optional(), answerType: z.enum(['single_choice', 'multiple_choice', 'numeric', 'text', 'ordering', 'speaking', 'essay']).optional(),
  difficulty: z.number().int().min(1).max(5).optional(), passageId: z.string().optional(), storageMode: z.enum(['full', 'reference_only']), verification: z.enum(['verified', 'unverified', 'disputed']),
  compatibility: z.object({ examVersion: z.string().min(1), status: z.enum(['current', 'legacy', 'incompatible']), reason: z.string().optional() }), explanationIds: z.array(z.string()), mediaIds: z.array(z.string()), tags: z.array(z.string()), active: z.boolean().optional(), createdAt: z.string().optional(), updatedAt: z.string().optional(), publishedAt: z.string().optional(), lastVerifiedAt: z.string().optional(),
}).superRefine((q, ctx) => {
  if (q.storageMode === 'full' && !q.prompt?.trim()) ctx.addIssue({ code: 'custom', message: '完整题目需要题干', path: ['prompt'] })
  if (q.storageMode === 'reference_only' && !q.sourceQuestionId && !q.sourceQuestionNumber && !q.title) ctx.addIssue({ code: 'custom', message: '来源引用需要题号或标题', path: ['sourceQuestionId'] })
  const ids = q.options.map(o => o.id)
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: '选项 ID 重复', path: ['options'] })
  for (const id of [...(q.answer?.optionIds ?? []), ...(q.answer?.optionId ? [q.answer.optionId] : [])]) if (q.storageMode === 'full' && !ids.includes(id)) ctx.addIssue({ code: 'custom', message: '答案引用了不存在的选项', path: ['answer'] })
})
export const CURRENT_TYPES: Record<string, string[]> = {
  'toefl:reading': ['complete_the_words', 'read_in_daily_life', 'read_daily_life', 'read_academic_passage'], 'toefl:listening': ['choose_response', 'conversation', 'announcement', 'academic_talk'], 'toefl:writing': ['build_sentence', 'write_email', 'academic_discussion'], 'toefl:speaking': ['listen_repeat', 'interview'],
  'gre:verbal': ['reading_comprehension', 'text_completion', 'sentence_equivalence'], 'gre:quant': ['quantitative_comparison', 'multiple_choice_single', 'multiple_choice_multiple', 'numeric_entry', 'data_interpretation', 'arithmetic', 'algebra', 'geometry', 'data_analysis'], 'gre:analytical_writing': ['analyze_issue'], 'gre:writing': ['analyze_issue'],
}
