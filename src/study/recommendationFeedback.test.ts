import { describe, expect, it } from 'vitest'
import { migrateState, storage } from '../storage'
import type { DailyPrescriptionBlock } from '../types'
import { recordRecommendationFeedback, recommendationFeedbackSchema } from './recommendationFeedback'

const initial = () => migrateState({ schemaVersion: 1, profile: {}, tasks: [], resources: [], practiceEntries: [], weeklyReviews: [] })
const block: DailyPrescriptionBlock = { id: 'feedback-tc', exam: 'gre', section: 'verbal', skillId: 'gre-text-completion', type: 'practice', minutes: 30, priority: 80, reason: 'Recent errors' }

describe('recommendation feedback', () => {
  it('records the actual recommended skill and minutes without changing learning evidence', () => {
    const state = initial()
    const before = structuredClone(state)
    const next = recordRecommendationFeedback(state, block, '2026-10-14', { rating: 2, verdict: 'priority_too_high', note: '  This skill is familiar  ' })
    expect(next.recommendationFeedback).toHaveLength(1)
    expect(next.recommendationFeedback?.[0]).toMatchObject({ date: '2026-10-14', skillId: block.skillId, recommendedMinutes: 30, rating: 2, verdict: 'priority_too_high', note: 'This skill is familiar' })
    expect(next.recommendationFeedback?.[0].id).toBeTruthy()
    expect(state).toEqual(before)
    const { recommendationFeedback: ignored, ...rest } = next
    void ignored
    const { recommendationFeedback: previous, ...original } = state
    void previous
    expect(rest).toEqual(original)
  })

  it('retains earlier feedback through the same manual backup and restore path', () => {
    const first = recordRecommendationFeedback(initial(), block, '2026-10-14', { rating: 4, verdict: 'correct' })
    const next = recordRecommendationFeedback(first, { ...block, minutes: 20 }, '2026-10-15', { rating: 3, verdict: 'bad_time_allocation' })
    expect(next.recommendationFeedback?.[0]).toEqual(first.recommendationFeedback?.[0])
    expect(storage.import(storage.export(next)).recommendationFeedback).toEqual(next.recommendationFeedback)
  })

  it('rejects feedback without a concrete current skill or a valid recommendation', () => {
    expect(() => recordRecommendationFeedback(initial(), { ...block, skillId: undefined }, '2026-10-14', { rating: 5, verdict: 'correct' })).toThrow()
    expect(() => recordRecommendationFeedback(initial(), { ...block, skillId: 'unknown' }, '2026-10-14', { rating: 5, verdict: 'correct' })).toThrow()
    expect(() => recordRecommendationFeedback(initial(), { ...block, minutes: 0 }, '2026-10-14', { rating: 5, verdict: 'correct' })).toThrow()
    expect(() => recordRecommendationFeedback(initial(), block, '2026-02-30', { rating: 5, verdict: 'correct' })).toThrow()
  })

  it('rejects forged ratings and verdicts instead of accepting unusable pilot evidence', () => {
    const row = { id: 'feedback', date: '2026-10-14', skillId: block.skillId, recommendedMinutes: 30, rating: 3, verdict: 'correct' }
    for (const rating of [0, 6, 1.5, Number.NaN]) expect(recommendationFeedbackSchema.safeParse({ ...row, rating }).success).toBe(false)
    expect(recommendationFeedbackSchema.safeParse({ ...row, verdict: 'guaranteed_improvement' }).success).toBe(false)
    expect(recommendationFeedbackSchema.safeParse({ ...row, skillId: ' ' }).success).toBe(false)
  })
})
