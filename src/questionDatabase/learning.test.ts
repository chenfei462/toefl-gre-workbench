import { describe, it, expect } from 'vitest'
import { migrateState, storage } from '../storage'
import { calculateMastery } from '../algorithms/mastery'
import { calculateSkillPriority } from '../algorithms/priority'
import { buildDailyPrescription } from '../algorithms/prescription'
import { recordBatch, recordQuestionAttempt, recordRetry } from './learning'
import type { Question, QuestionSource } from '../types'
const state = () => migrateState({ schemaVersion: 1, profile: { examTypes: ['gre'], startDate: '2026-10-11', targetScores: {}, currentScores: {}, dailyMinutes: 45, studyDaysPerWeek: 6, intensity: 'standard' }, tasks: [], resources: [], practiceEntries: [], weeklyReviews: [] })
const source: QuestionSource = { id: 'pp', name: 'POWERPREP 2', publisher: 'ETS', sourceType: 'official', sourceTier: 'A', rightsStatus: 'reference_only', examVersions: ['GRE_CURRENT'], verified: true }
const q: Question = { id: 'q', sourceId: 'pp', sourceQuestionId: '7', exam: 'gre', examVersion: 'GRE_CURRENT', section: 'verbal', questionType: 'text_completion', skillIds: ['gre-text-completion'], options: [], answer: { text: 'B', verification: 'official' }, storageMode: 'reference_only', verification: 'verified', compatibility: { examVersion: 'GRE_CURRENT', status: 'current' }, promptHash: '', explanationIds: [], mediaIds: [], tags: [], active: true, createdAt: '', updatedAt: '' }
describe('question learning loop', () => {
  it('preserves question provenance and selected answers through export/reload', () => {
    const next = recordQuestionAttempt(state(), q, source, { date: '2026-10-11', correct: false, selectedAnswer: { text: 'D', verification: 'unverified' }, errorType: 'vocabulary', timeSeconds: 94 })
    const restored = storage.import(storage.export(next))
    expect(restored.attempts[0]).toMatchObject({ questionId: 'q', sourceReference: { sourceId: 'pp', sourceQuestionId: '7' }, selectedAnswer: { text: 'D' } })
    expect(restored.errorRecords).toHaveLength(1)
  })
  it('records 20 attempts, ten errors, then eight successful and two failed retries', () => {
    let next = recordBatch(state(), { date: '2026-10-11', exam: 'gre', section: 'verbal', skillIds: ['gre-text-completion'], total: 20, correct: 10, minutes: 30, errorTypes: [...Array(7).fill('vocabulary'), 'logic', 'logic', 'careless'], source })
    expect(next.attempts).toHaveLength(20); expect(next.errorRecords).toHaveLength(10)
    expect(next.errorRecords.filter(e => e.errorType === 'vocabulary')).toHaveLength(7)
    const skill = next.skills.find(s => s.id === 'gre-text-completion')!
    const before = calculateMastery(skill, next.attempts, next.errorRecords, [])
    const priorities = calculateSkillPriority({ skills: next.skills, attempts: next.attempts, errors: next.errorRecords, reviewDueSkillIds: [skill.id], remainingDays: 20, targetGaps: {} })
    const plan = buildDailyPrescription({ date: '2026-10-12', availableMinutes: 45, priorities, dueErrorCount: 10, dueVocabularyCount: 0 })
    expect(plan.blocks.some(b => b.type === 'error_review')).toBe(true)
    const ids = next.errorRecords.map(e => e.id)
    ids.forEach((id, i) => { next = recordRetry(next, id, i < 8, '2026-10-12') })
    expect(next.errorRecords.filter(e => e.status === 'resolved')).toHaveLength(8)
    expect(next.errorRecords.filter(e => e.status === 'reopened')).toHaveLength(2)
    expect(calculateMastery(skill, next.attempts, next.errorRecords, next.reviewAttempts).retryAccuracy).toBe(80)
    expect(calculateMastery(skill, next.attempts, next.errorRecords, next.reviewAttempts).masteryScore).toBeGreaterThan(before.masteryScore)
  })
  it('excludes disputed question results from mastery', () => {
    const next = recordQuestionAttempt(state(), { ...q, verification: 'disputed' }, source, { date: '2026-10-11', correct: true })
    const skill = next.skills.find(s => s.id === 'gre-text-completion')!
    expect(calculateMastery(skill, next.attempts, [], []).attempts).toBe(0)
  })
  it('keeps unverified recall volume from overwhelming official results', () => {
    const s = state(), skill = s.skills.find(s => s.id === 'gre-text-completion')!
    const official = Array.from({ length: 10 }, (_, i) => ({ id: `o-${i}`, date: '2026-10-11', exam: 'gre' as const, section: 'verbal', skillIds: [skill.id], sourceType: 'official' as const, reviewed: false, correct: i < 6, evidenceWeight: 1 }))
    const recalls = Array.from({ length: 100 }, (_, i) => ({ ...official[0], id: `c-${i}`, correct: i < 95, evidenceWeight: 0.3 }))
    expect(calculateMastery(skill, [...official, ...recalls], [], []).accuracy).toBeLessThan(75)
  })
  it('does not let disputed retry records or recall errors affect official mastery', () => {
    const initial = state(), skill = initial.skills.find(s => s.id === 'gre-text-completion')!
    let official = recordBatch(initial, { date: '2026-10-11', exam: 'gre', section: 'verbal', total: 10, correct: 6, minutes: 20, skillIds: [skill.id], errorTypes: [], source })
    const before = calculateMastery(skill, official.attempts, official.errorRecords, []).masteryScore
    for (let i = 0; i < 100; i++) official = recordQuestionAttempt(official, { ...q, id: `recall-${i}` }, { ...source, sourceType: 'community' }, { date: '2026-10-12', correct: false, errorType: 'vocabulary' })
    expect(calculateMastery(skill, official.attempts, official.errorRecords, []).masteryScore).toBeGreaterThan(before - 25)
  })
})
