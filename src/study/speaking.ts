import { addDays, format } from 'date-fns'
import type { z } from 'zod'
import type { Attempt, ErrorRecord, ErrorType, WorkbenchState } from '../types'
import { speakingSessionSchema, speakingErrorCategories } from './speakingSchema'
export type SpeakingPracticeSession = z.infer<typeof speakingSessionSchema>
export type SpeakingErrorCategory = typeof speakingErrorCategories[number]
export type SpeakingState = WorkbenchState & { speakingSessions?: SpeakingPracticeSession[] }
export const speakingErrorLabels: Record<SpeakingErrorCategory, string> = { pronunciation: '发音', fluency: '流利度', grammar: '语法', vocabulary: '词汇', hesitation: '停顿', memory: '记忆', listening: '听辨', organization: '组织结构' }
const errorMapping: Record<SpeakingErrorCategory, ErrorType> = { pronunciation: 'pronunciation', fluency: 'fluency', grammar: 'grammar', vocabulary: 'vocabulary', hesitation: 'fluency', memory: 'memory', listening: 'listening_detail', organization: 'strategy' }
export function reviewSpeakingSession(state: SpeakingState, id: string, rating: number, categories: SpeakingErrorCategory[], note: string): SpeakingState {
  const session = state.speakingSessions?.find(s => s.id === id)
  if (!session) throw new Error('录音记录不存在')
  if (session.attemptId || state.attempts.some(a => a.sessionId === id && a.section === 'speaking')) return state
  const reviewed = speakingSessionSchema.parse({ ...session, selfRating: rating, errors: [...new Set(categories)], note, attemptId: crypto.randomUUID() })
  const date = format(new Date(session.startedAt), 'yyyy-MM-dd')
  const skillIds = state.skills.filter(s => s.exam === 'toefl' && s.section === 'speaking' && s.questionType === session.taskType).map(s => s.id)
  const attempt: Attempt = { id: reviewed.attemptId!, date, exam: 'toefl', section: 'speaking', questionType: session.taskType, skillIds, sessionId: id, source: '口语录音 · 用户自评（非考试评分）', sourceType: 'self_created', correct: rating >= 4 && !categories.length, timeSeconds: session.durationSeconds, evidenceWeight: 0.3, reviewed: true, note: `自评 ${rating}/5；${note}`, errorType: categories[0] ? errorMapping[categories[0]] : rating < 4 ? 'unknown' : undefined }
  const errors: ErrorRecord[] = (reviewed.errors.length ? reviewed.errors : rating < 4 ? [undefined] : []).map(category => ({ id: crypto.randomUUID(), attemptId: attempt.id, exam: 'toefl', section: 'speaking', questionType: session.taskType, skillIds, errorType: category ? errorMapping[category] : 'unknown', explanation: `${category ? speakingErrorLabels[category] : '需继续练习'}：${note}`, createdAt: date, status: 'new', reviewCount: 0, nextReviewDate: format(addDays(new Date(session.startedAt), 1), 'yyyy-MM-dd') }))
  return { ...state, speakingSessions: state.speakingSessions!.map(s => s.id === id ? reviewed : s), attempts: [attempt, ...state.attempts], errorRecords: [...errors, ...state.errorRecords] }
}
