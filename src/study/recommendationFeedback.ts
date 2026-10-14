import { z } from 'zod'
import type { DailyPrescriptionBlock, WorkbenchState } from '../types'

export const feedbackVerdicts = ['correct', 'priority_too_high', 'priority_too_low', 'already_mastered', 'bad_resource', 'bad_time_allocation'] as const
export const recommendationFeedbackSchema = z.object({
  id: z.string().trim().min(1), date: z.iso.date(), skillId: z.string().trim().min(1),
  recommendedMinutes: z.number().int().positive().max(1440), rating: z.number().int().min(1).max(5),
  verdict: z.enum(feedbackVerdicts), note: z.string().trim().max(1000).optional(),
})
export type RecommendationFeedback = z.infer<typeof recommendationFeedbackSchema>
export type RecommendationFeedbackInput = Pick<RecommendationFeedback, 'rating' | 'verdict' | 'note'>

export function recordRecommendationFeedback(state: WorkbenchState, block: DailyPrescriptionBlock, date: string, input: RecommendationFeedbackInput): WorkbenchState {
  if (!block.skillId || !state.skills.some(skill => skill.id === block.skillId && skill.exam === block.exam)) {
    throw new Error('这条建议没有可评价的具体技能')
  }
  const feedback = recommendationFeedbackSchema.parse({
    id: crypto.randomUUID(), date, skillId: block.skillId, recommendedMinutes: block.minutes,
    rating: input.rating, verdict: input.verdict, ...(input.note?.trim() ? { note: input.note.trim() } : {}),
  })
  return { ...state, recommendationFeedback: [...(state.recommendationFeedback ?? []), feedback] }
}
