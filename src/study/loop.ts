import { differenceInCalendarDays, parseISO, format } from 'date-fns'
import type { DailyPrescriptionBlock, Exam, WorkbenchState } from '../types'
export function finalWeekExams(state: WorkbenchState, date: string): Exam[] { return state.profile.examTypes.filter(exam => { const target = state.examProfiles[exam].examDate; if (!target) return false; const days = differenceInCalendarDays(parseISO(target), parseISO(date)); return days >= 0 && days <= 7 }) }
export function studySummary(state: WorkbenchState, date: string) {
 const attempts = state.attempts.filter(a => a.date.slice(0, 10) === date)
 const practice = (state.practiceSessions ?? []).filter(s => s.status === 'submitted' && s.submittedAt !== undefined && format(new Date(s.submittedAt), 'yyyy-MM-dd') === date)
 const mocks = (state.mockSessions ?? []).filter(s => s.date === date)
 const measuredSessions = new Set([...practice, ...mocks].map(s => s.id))
 const sessionSeconds = practice.reduce((sum, s) => sum + Math.max(0, s.submittedAt! - s.startedAt) / 1000, 0) + mocks.reduce((sum, s) => sum + s.durationMinutes * 60, 0)
 const attemptSeconds = attempts.filter(a => !a.sessionId || !measuredSessions.has(a.sessionId)).reduce((sum, a) => sum + (a.timeSeconds ?? 0), 0)
 return { attempts: attempts.length, correct: attempts.filter(a => a.correct === true).length, errors: state.errorRecords.filter(e => e.createdAt.slice(0, 10) === date).length, retries: state.reviewAttempts.filter(r => r.date.slice(0, 10) === date).length, vocabulary: (state.vocabularyReviews ?? []).filter(r => format(new Date(r.reviewedAt), 'yyyy-MM-dd') === date).length, minutes: (sessionSeconds + attemptSeconds) / 60 }
}
export function prescriptionDestination(block: DailyPrescriptionBlock): string {
 if (block.type === 'error_review') return 'errors'
 if (block.type === 'mock') return 'diagnostic'
 if (block.section === 'speaking') return 'speaking'
 if (block.type === 'timed_practice' && block.reason.includes('FINAL WEEK')) return `practice?exam=${block.exam}&mixed=true&focusSkill=${block.skillId ?? ''}&minutes=${block.minutes}`
 if (block.type === 'vocabulary' || block.skillId?.endsWith('-vocabulary')) return 'vocabulary'
 return `practice?exam=${block.exam}&skill=${block.skillId ?? ''}&minutes=${block.minutes}`
}
