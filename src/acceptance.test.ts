import { describe, expect, it } from 'vitest'
import { calculateMastery } from './algorithms/mastery'
import { calculateSkillPriority } from './algorithms/priority'
import { migrateState } from './storage'
import { planForDate } from './questionDatabase/planning'
import { recordBatch, recordRetry } from './questionDatabase/learning'
import type { ErrorType, Section, Skill, WorkbenchState } from './types'
import type { QuestionSource } from './types'

const source: QuestionSource = {
  id: 'ets-acceptance',
  name: 'ETS acceptance fixture',
  publisher: 'ETS',
  sourceType: 'official',
  sourceTier: 'A',
  rightsStatus: 'reference_only',
  examVersions: ['GRE_CURRENT', 'TOEFL_2026'],
  verified: true,
}

function fixture(): WorkbenchState {
  return migrateState({
    schemaVersion: 1,
    profile: {
      examTypes: ['toefl', 'gre'],
      startDate: '2026-10-12',
      targetScores: { toefl: '5.5', gre: '330' },
      currentScores: { toefl: '4.0', gre: '310' },
      dailyMinutes: 480,
      studyDaysPerWeek: 6,
      intensity: 'intensive',
    },
    tasks: [], resources: [], practiceEntries: [], weeklyReviews: [],
  })
}

function addBatch(state: WorkbenchState, skill: Skill, total: number, correct: number, errorType: ErrorType = 'unknown', date = '2026-10-12') {
  return recordBatch(state, {
    date,
    exam: skill.exam,
    section: skill.section as Section,
    skillIds: [skill.id],
    total,
    correct,
    minutes: total,
    errorTypes: Array.from({ length: total - correct }, () => errorType),
    source,
  })
}

function allocation(plan: ReturnType<typeof planForDate>['plan'], skillId: string) {
  return plan.blocks.filter(block => block.skillId === skillId).reduce((sum, block) => sum + block.minutes, 0)
}

describe('P2.1 adaptive planner acceptance contract', () => {
  it('ranks the §52 weak skills above 88% Algebra and prescribes vocabulary next day', () => {
    let state = fixture()
    const byId = (id: string) => state.skills.find(skill => skill.id === id)!
    state = addBatch(state, byId('gre-text-completion'), 50, 24, 'vocabulary')
    state = addBatch(state, byId('gre-reading-comprehension'), 50, 29, 'logic')
    state = addBatch(state, byId('toefl-speaking-interview'), 50, 20, 'fluency')
    state = addBatch(state, byId('gre-geometry'), 50, 31, 'calculation')
    state = addBatch(state, byId('gre-algebra'), 50, 44, 'calculation')
    state.vocabulary = [{ id: 'vocab-due', word: 'abate', meaning: 'reduce', status: 'weak', intervalDays: 1, nextReviewDate: '2026-10-12', correctStreak: 0, incorrectCount: 1 }]

    expect(state.examProfiles.toefl.baselineScore).toBe(4)
    expect(state.examProfiles.gre.baselineScore).toBe(310)
    const planned = planForDate(state, '2026-10-12')
    const rank = (skillId: string) => planned.priorities.findIndex(priority => priority.skillId === skillId)
    expect(rank('gre-text-completion')).toBeLessThan(rank('gre-algebra'))
    expect(rank('gre-reading-comprehension')).toBeLessThan(rank('gre-algebra'))
    expect(rank('toefl-speaking-interview')).toBeLessThan(rank('gre-algebra'))
    expect(rank('gre-geometry')).toBeLessThan(rank('gre-algebra'))
    expect(planned.plan.blocks.some(block => block.type === 'vocabulary' && block.exam === 'gre')).toBe(true)
  })

  it('records the 20-attempt / 10-error loop and resolves eight of ten retries', () => {
    let state = fixture()
    const skill = state.skills.find(item => item.id === 'gre-text-completion')!
    state = addBatch(state, skill, 20, 10, 'vocabulary')
    const before = calculateMastery(skill, state.attempts, state.errorRecords, [])
    expect(state.attempts).toHaveLength(20)
    expect(state.errorRecords).toHaveLength(10)
    expect(state.errorRecords.filter(error => error.errorType === 'vocabulary')).toHaveLength(10)
    const priorities = calculateSkillPriority({ skills: state.skills, attempts: state.attempts, errors: state.errorRecords, reviewDueSkillIds: [skill.id], remainingDays: 30, targetGaps: { gre: 20 } })
    expect(priorities.find(priority => priority.skillId === skill.id)?.score).toBeGreaterThan(0)
    expect(planForDate(state, '2026-10-13').plan.blocks.some(block => block.type === 'error_review')).toBe(true)

    const errorIds = state.errorRecords.map(error => error.id)
    errorIds.forEach((errorId, index) => { state = recordRetry(state, errorId, index < 8, '2026-10-13', 60) })
    const after = calculateMastery(skill, state.attempts, state.errorRecords, state.reviewAttempts)
    expect(state.errorRecords.filter(error => error.status === 'resolved')).toHaveLength(8)
    expect(state.errorRecords.filter(error => error.status === 'reopened')).toHaveLength(2)
    expect(after.retryAccuracy).toBe(80)
    expect(after.masteryScore).toBeGreaterThan(before.masteryScore)
  })

  it('reduces Geometry allocation after its evidence moves from 62% to 83%', () => {
    let state = fixture()
    const geometry = state.skills.find(item => item.id === 'gre-geometry')!
    state = addBatch(state, geometry, 100, 62, 'calculation')
    const beforePlan = planForDate(state, '2026-10-12').plan
    const beforeMastery = calculateMastery(geometry, state.attempts, state.errorRecords, [])
    expect(beforeMastery.accuracy).toBe(62)
    const originalErrors = state.errorRecords.map(error => error.id)

    state = addBatch(state, geometry, 125, 125, 'calculation')
    originalErrors.forEach(errorId => { state = recordRetry(state, errorId, true, '2026-10-13', 60) })
    const afterMastery = calculateMastery(geometry, state.attempts, state.errorRecords, state.reviewAttempts)
    const afterPlan = planForDate(state, '2026-10-13').plan
    expect(afterMastery.accuracy).toBe(83)
    expect(allocation(afterPlan, geometry.id)).toBeLessThan(allocation(beforePlan, geometry.id))
  })
})
