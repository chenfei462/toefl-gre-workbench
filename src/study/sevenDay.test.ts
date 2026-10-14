import { expect, it } from 'vitest'
import { format } from 'date-fns'
import { migrateState, storage } from '../storage'
import { recordQuestionAttempt, recordRetry } from '../questionDatabase/learning'
import { planForDate } from '../questionDatabase/planning'
import { createVocabularyCard, reviewVocabulary } from './vocabulary'
import type { Question, QuestionSource } from '../types'

// Synthetic acceptance evidence, not a claim of seven days of real learner use.
it('adapts seven daily prescriptions as weakness shifts, retaining attempt/retry/FSRS history through backup', () => {
  let state = migrateState({ profile: { examTypes: ['gre'], startDate: '2026-10-01', dailyMinutes: 120 } })
  const source: QuestionSource = { id: 'owned', name: 'Learner-owned diagnostic', publisher: 'Learner', sourceType: 'user_owned', sourceTier: 'B', rightsStatus: 'user_owned', examVersions: ['GRE_CURRENT'], verified: true }
  const skills = ['gre-text-completion', 'gre-reading-comprehension']
  const plans: ReturnType<typeof planForDate>[] = []
  const dates = Array.from({ length: 7 }, (_, i) => '2026-10-' + String(i + 1).padStart(2, '0'))
  state.vocabulary = [createVocabularyCard('mitigate', 'reduce', new Date('2026-10-01T09:00:00'), 'Personal diagnostic')]
  for (const [day, date] of dates.entries()) {
    for (const skillId of skills) {
      for (let i = 0; i < 12; i++) {
        const question: Question = { id: date + '-' + skillId + '-' + i, sourceId: source.id, sourceQuestionId: String(i), exam: 'gre', examVersion: 'GRE_CURRENT', section: 'verbal', questionType: skillId === skills[0] ? 'text_completion' : 'reading_comprehension', skillIds: [skillId], options: [], storageMode: 'reference_only', verification: 'verified', compatibility: { examVersion: 'GRE_CURRENT', status: 'current' }, promptHash: '', explanationIds: [], mediaIds: [], tags: [], active: true, createdAt: date, updatedAt: date }
        const correct = day < 3 ? skillId === skills[1] : skillId === skills[0]
        state = recordQuestionAttempt(state, question, source, { date, correct, timeSeconds: 90 })
      }
    }
    // After day three the learner successfully retries previous TC errors.
    if (day >= 3) for (const error of state.errorRecords.filter(e => e.skillIds.includes(skills[0]) && e.status !== 'resolved')) state = recordRetry(state, error.id, true, date, 75)
    const reviewedAt = new Date(date + 'T09:00:00')
    state = reviewVocabulary(state, state.vocabulary[0].id, 1, reviewedAt)
    expect(format(reviewedAt, 'yyyy-MM-dd')).toBe(date)
    plans.push(planForDate(state, date))
  }
  expect(plans).toHaveLength(7)
  expect(plans[0].priorities[0].skillId).toBe(skills[0])
  expect(plans[0].plan.blocks.find(b => b.skillId)?.skillId).toBe(skills[0])
  expect(plans[6].priorities[0].skillId).toBe(skills[1])
  expect(plans[6].plan.blocks.find(b => b.skillId)?.skillId).toBe(skills[1])
  expect(plans[6].priorities[0].reasons.join(' ')).toContain('unresolved errors')
  expect(plans[6].mastery.find(m => m.skillId === skills[0])!.retryAccuracy).toBe(100)
  expect(state.attempts).toHaveLength(7 * 24 + 7)
  expect(state.errorRecords).toHaveLength(7 * 12)
  expect(state.reviewAttempts).toHaveLength(3 * 12)
  expect(state.vocabularyReviews).toHaveLength(7)
  const restored = storage.import(storage.export(state))
  expect(restored.attempts.map(a => a.id)).toEqual(state.attempts.map(a => a.id))
  expect(restored.errorRecords).toEqual(state.errorRecords)
  expect(restored.reviewAttempts).toEqual(state.reviewAttempts)
  expect(restored.vocabulary).toEqual(state.vocabulary)
  expect(restored.vocabularyReviews).toEqual(state.vocabularyReviews)
  expect(planForDate(restored, dates[6]).priorities).toEqual(plans[6].priorities)
})
