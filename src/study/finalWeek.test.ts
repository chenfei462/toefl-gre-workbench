import { expect, it } from 'vitest'
import { migrateState } from '../storage'
import { planForDate } from '../questionDatabase/planning'
import { prescriptionDestination } from './loop'
it('uses exam date urgency and reserves final-week mixed and mock time within budget', () => {
 const state = migrateState({ profile: { examTypes: ['gre'], dailyMinutes: 120, startDate: '2026-10-14' } }); state.examProfiles.gre.examDate = '2026-10-19'
 const plan = planForDate(state, '2026-10-14').plan
 expect(plan.blocks.some(b => b.type === 'mock')).toBe(true)
 expect(plan.blocks.some(b => b.type === 'timed_practice' && b.reason.includes('mixed'))).toBe(true)
 expect(plan.blocks.reduce((n, b) => n + b.minutes, 0)).toBeLessThanOrEqual(120)
})

it('focuses the imminent exam, reserves unresolved review before its due date and suppresses adjacent-day mock', () => {
 const state = migrateState({ profile: { examTypes: ['gre', 'toefl'], dailyMinutes: 120, startDate: '2026-10-14' } }); state.examProfiles.gre.examDate = '2026-10-15'; state.examProfiles.toefl.examDate = '2026-12-01'
 state.attempts = [{ id: 'a', date: '2026-10-14', exam: 'gre', section: 'verbal', skillIds: ['gre-text-completion'], sourceType: 'self_created', reviewed: false, correct: false }]
 state.errorRecords = [{ id: 'e', attemptId: 'a', exam: 'gre', section: 'verbal', skillIds: ['gre-text-completion'], errorType: 'logic', status: 'new', createdAt: '2026-10-14', nextReviewDate: '2026-10-20', reviewCount: 0 }]
 const plan = planForDate(state, '2026-10-14').plan
 expect(plan.blocks.every(b => b.exam === 'gre')).toBe(true)
 expect(plan.blocks[0].type).toBe('error_review')
 expect(plan.blocks.some(b => b.type === 'mock')).toBe(false)
 expect(plan.blocks.reduce((sum, b) => sum + b.minutes, 0)).toBeLessThanOrEqual(120)
})
it('does not schedule a mock below 90 minutes or when a mock occurred within three days', () => {
 const state = migrateState({ profile: { examTypes: ['gre'], dailyMinutes: 89, startDate: '2026-10-14' } }); state.examProfiles.gre.examDate = '2026-10-19'
 expect(planForDate(state, '2026-10-14').plan.blocks.some(b => b.type === 'mock')).toBe(false)
 state.profile.dailyMinutes = 90
 state.mockSessions = [{ id: 'recent', exam: 'gre', date: '2026-10-12', source: 'owned', kind: 'practice', durationMinutes: 30, sectionScores: {}, conditions: '', evidence: [] }]
 expect(planForDate(state, '2026-10-14').plan.blocks.some(b => b.type === 'mock')).toBe(false)
 state.mockSessions[0].date = '2026-10-10'
 expect(planForDate(state, '2026-10-14').plan.blocks.some(b => b.type === 'mock')).toBe(true)
})

it('uses per-exam dates for urgency and exposes exam-scoped mixed-set links', () => {
 const state = migrateState({ profile: { examTypes: ['gre', 'toefl'], dailyMinutes: 90, startDate: '2026-10-14' } })
 state.examProfiles.gre.examDate = '2026-10-21'; state.examProfiles.toefl.examDate = '2026-12-01'
 const result = planForDate(state, '2026-10-14')
 const gre = result.priorities.find(p => p.skillId === 'gre-text-completion')!, toefl = result.priorities.find(p => p.skillId === 'toefl-reading-academic')!
 expect(gre.score).toBeGreaterThan(toefl.score)
 const mixed = result.plan.blocks.find(b => b.type === 'timed_practice')!
 const destination = prescriptionDestination(mixed)
 expect(destination).toContain('exam=gre&mixed=true')
 expect(destination).not.toContain('&skill=')
 expect(planForDate(state, '2026-10-13').plan.rationale.join(' ')).not.toContain('FINAL WEEK')
})
