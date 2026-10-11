import { describe, expect, it } from 'vitest'
import { migrateState, parseWorkbenchState } from './storage'
import type { WorkbenchState } from './types'

const v1State = {
  schemaVersion: 1,
  profile: {
    examTypes: ['toefl', 'gre'],
    startDate: '2026-10-11',
    targetScores: { toefl: '105', gre: '325' },
    currentScores: { toefl: '92', gre: '308' },
    dailyMinutes: 90,
    studyDaysPerWeek: 6,
    intensity: 'standard',
  },
  tasks: [],
  resources: [],
  practiceEntries: [{ id: 'practice-1', date: '2026-10-11', exam: 'gre', section: 'verbal', correct: 13, total: 20, errorTags: ['vocabulary', 'made-up-tag'] }],
  weeklyReviews: [],
}

describe('V2 state migration', () => {
  it('upgrades V1 data without deleting aggregate history', () => {
    const state = migrateState(v1State)

    expect(state.schemaVersion).toBe(2)
    expect(state.practiceEntries).toHaveLength(1)
    expect(state.attempts).toHaveLength(0)
    expect(state.errorRecords).toHaveLength(0)
    expect(state.legacyPracticeEntries[0]?.errorTags).toContain('made-up-tag')
    expect(state.examProfiles.gre?.targetScore).toBe(325)
  })

  it('preserves V2 state when it is migrated again', () => {
    const initial = migrateState(v1State)
    const migrated = migrateState(initial)
    expect(migrated).toEqual(initial)
  })

  it('rejects attempts with an invalid source type', () => {
    const state = migrateState(v1State) as WorkbenchState
    const invalid = { ...state, attempts: [{ id: 'a', date: '2026-10-11', exam: 'gre', section: 'verbal', skillIds: [], sourceType: 'untrusted', reviewed: false }] }
    expect(() => parseWorkbenchState(invalid)).toThrow()
  })
})
