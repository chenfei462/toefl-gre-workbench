import { describe, expect, it } from 'vitest'
import { migrateState } from '../storage'
import { recordBatch } from '../questionDatabase/learning'
import { planForDate } from '../questionDatabase/planning'

describe('active exam prescription', () => {
  it('preserves inactive-exam history while assigning review blocks only to active exams', () => {
    const initial = migrateState({
      schemaVersion: 1,
      profile: { examTypes: ['toefl'], startDate: '2026-01-01', targetScores: { toefl: '5.5' }, currentScores: { toefl: '4.0' }, dailyMinutes: 480, studyDaysPerWeek: 6, intensity: 'intensive' },
      tasks: [], resources: [], practiceEntries: [], weeklyReviews: [],
    })
    const state = recordBatch(initial, { date: '2026-01-01', exam: 'gre', section: 'verbal', skillIds: ['gre-text-completion'], total: 1, correct: 0, minutes: 2, errorTypes: ['vocabulary'] })
    state.vocabulary = [{ id: 'due-word', word: 'abate', meaning: 'reduce', status: 'weak', intervalDays: 1, nextReviewDate: '2026-01-02', correctStreak: 0, incorrectCount: 1 }]
    const planned = planForDate(state, '2026-01-02')

    expect(planned.plan.blocks.every(block => block.exam === 'toefl')).toBe(true)
    expect(planned.plan.blocks.some(block => block.type === 'vocabulary')).toBe(true)
    expect(planned.plan.blocks.some(block => block.type === 'error_review')).toBe(false)
    expect(state.attempts).toHaveLength(1)
    expect(state.errorRecords).toHaveLength(1)
  })
})
