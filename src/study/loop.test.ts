import { expect, it } from 'vitest'
import { migrateState } from '../storage'
import { planForDate } from '../questionDatabase/planning'
import { finalWeekExams, studySummary } from './loop'
it('activates final week only for upcoming exams within seven days', () => {
 const state = migrateState({}); state.examProfiles.gre.examDate = '2026-10-21'; state.examProfiles.toefl.examDate = '2026-10-13'
 expect(finalWeekExams(state, '2026-10-14')).toEqual(['gre'])
 const plan = planForDate(state, '2026-10-14').plan
 expect(plan.rationale.join(' ')).toContain('FINAL WEEK')
 expect(plan.blocks.filter(b => b.exam === 'gre').every(b => b.type !== 'learn' && b.type !== 'practice')).toBe(true)
})
it('daily summary counts real study events, not task checkboxes', () => {
 const state = migrateState({}); state.attempts = [{ id: 'a', date: '2026-10-14', exam: 'gre', section: 'verbal', skillIds: [], correct: false, sourceType: 'self_created', reviewed: false, timeSeconds: 90 }]
 expect(studySummary(state, '2026-10-14')).toMatchObject({ attempts: 1, correct: 0, minutes: 1.5 })
})

it('counts measured practice session duration once without assigning fabricated per-question times', () => {
 const state = migrateState({})
 state.practiceSessions = [{ id: 'session', questions: [], answers: {}, flagged: [], currentIndex: 0, startedAt: new Date('2026-10-14T10:00:00').getTime(), deadlineAt: new Date('2026-10-14T10:30:00').getTime(), submittedAt: new Date('2026-10-14T10:28:00').getTime(), status: 'submitted' }]
 state.attempts = [0, 1].map(i => ({ id: String(i), sessionId: 'session', date: '2026-10-14', exam: 'gre', section: 'verbal', skillIds: [], correct: true, sourceType: 'self_created', reviewed: false, timeSeconds: 60 }))
 expect(studySummary(state, '2026-10-14').minutes).toBe(28)
})
