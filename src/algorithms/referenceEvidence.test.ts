import { describe, expect, it } from 'vitest'
import { migrateState } from '../storage'
import { planForDate } from '../questionDatabase/planning'
import type { Attempt, WorkbenchState } from '../types'

function fixture(): WorkbenchState {
  return migrateState({
    schemaVersion: 1,
    profile: { examTypes: ['gre'], startDate: '2026-01-01', targetScores: { gre: '330' }, currentScores: { gre: '310' }, dailyMinutes: 120, studyDaysPerWeek: 6, intensity: 'standard' },
    tasks: [], resources: [], practiceEntries: [], weeklyReviews: [],
  })
}

function addError(state: WorkbenchState, questionReferenceStatus: Attempt['questionReferenceStatus'], provenance: Attempt['provenance'] = 'question'): WorkbenchState {
  return {
    ...state,
    attempts: [{ id: 'a1', date: '2026-01-01', exam: 'gre', section: 'verbal', skillIds: ['gre-text-completion'], sourceType: 'official', correct: false, evidenceWeight: 1, reviewed: false, questionId: 'missing-question', provenance, questionReferenceStatus }],
    errorRecords: [{ id: 'e1', attemptId: 'a1', exam: 'gre', section: 'verbal', skillIds: ['gre-text-completion'], errorType: 'vocabulary', createdAt: '2026-01-01', status: 'new', reviewCount: 0, nextReviewDate: '2026-01-02' }],
  }
}

describe('question-reference eligibility across the planning pipeline', () => {
  it.each(['pending', 'orphaned'] as const)('excludes %s question-backed attempts and their errors', status => {
    const state = fixture()
    const baseline = planForDate(state, '2026-01-02')
    const planned = planForDate(addError(state, status), '2026-01-02')
    const priority = (plan: typeof planned) => plan.priorities.find(item => item.skillId === 'gre-text-completion')!

    expect(planned.mastery.find(item => item.skillId === 'gre-text-completion')?.attempts).toBe(0)
    expect(priority(planned).score).toBe(priority(baseline).score)
    expect(priority(planned).reasons).toEqual(priority(baseline).reasons)
    expect(planned.plan.blocks.some(block => block.type === 'error_review')).toBe(false)
    expect(planned.rolling7Day.attempts).toBe(0)
  })

  it.each(['reference', 'batch_summary'] as const)('keeps %s evidence eligible without a stored question row', provenance => {
    const planned = planForDate(addError(fixture(), 'orphaned', provenance), '2026-01-02')

    expect(planned.mastery.find(item => item.skillId === 'gre-text-completion')?.attempts).toBe(1)
    expect(planned.priorities.find(item => item.skillId === 'gre-text-completion')?.reasons).toContain('1 unresolved errors')
    expect(planned.plan.blocks.some(block => block.type === 'error_review')).toBe(true)
    expect(planned.rolling7Day.attempts).toBe(1)
  })
})
