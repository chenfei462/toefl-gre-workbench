import { describe, expect, it } from 'vitest'
import { buildDashboardSummary } from './dashboard'
import { migrateState } from '../storage'

describe('dashboard five-question summary', () => {
  it('answers current score, gap, danger, first action and why from the live plan', () => {
    const state = migrateState({
      schemaVersion: 1,
      profile: { examTypes: ['gre'], startDate: '2026-10-01', targetScores: { gre: '330' }, currentScores: { gre: '310' }, dailyMinutes: 60, studyDaysPerWeek: 6, intensity: 'standard' },
      tasks: [], resources: [], practiceEntries: [], weeklyReviews: [],
    })
    const next = {
      ...state,
      checkpoints: [{ id: 'checkpoint', date: '2026-10-10', exam: 'gre' as const, source: 'POWERPREP', sourceType: 'official' as const, overallScore: 318, sectionScores: { verbal: 318 } }],
      attempts: [{ id: 'attempt', date: '2026-10-10', exam: 'gre' as const, section: 'verbal', skillIds: ['gre-text-completion'], sourceType: 'official' as const, reviewed: false, correct: false, timeSeconds: 120 }],
    }
    const summary = buildDashboardSummary(next, '2026-10-10')

    expect(summary.currentScore.gre).toBe(318)
    expect(summary.gap.gre).toBe(12)
    expect(summary.mostDangerousSkill?.skillId).toBe('gre-text-completion')
    expect(summary.firstAction?.skillId).toBe('gre-text-completion')
    expect(summary.why).toContain('Text Completion')
    expect(summary.rolling7Day.attempts).toBe(1)
  })
})
