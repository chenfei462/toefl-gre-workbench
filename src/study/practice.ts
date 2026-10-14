import { format } from 'date-fns'
import type { Attempt, Passage, Question, QuestionAnswer, QuestionMedia, QuestionSource, WorkbenchState } from '../types'
import { recordQuestionAttempt } from '../questionDatabase/learning'
export interface PracticeQuestion { question: Question; source?: QuestionSource; passage?: Passage; media: QuestionMedia[] }
export function mixPracticeQuestions(questions: Question[]): Question[] {
  const groups = new Map<string, Question[]>()
  for (const question of questions) { const key = `${question.section}:${question.questionType}:${[...question.skillIds].sort().join(',')}`; groups.set(key, [...(groups.get(key) ?? []), question]) }
  const result: Question[] = []
  while (result.length < questions.length) for (const group of groups.values()) { const question = group.shift(); if (question) result.push(question) }
  return result
}
export interface PracticeSession {
  id: string; questions: PracticeQuestion[]; startedAt: number; deadlineAt: number; currentIndex: number
  answers: Record<string, QuestionAnswer>; flagged: string[]; status: 'active' | 'submitted'; submittedAt?: number
}
export function createPracticeSession(questions: PracticeQuestion[], minutes: number, now = Date.now()): PracticeSession {
  if (!questions.length || !Number.isFinite(minutes) || minutes <= 0 || new Set(questions.map(q => q.question.id)).size !== questions.length) throw new Error('请选择题目并设置有效的练习时长')
  return { id: crypto.randomUUID(), questions: structuredClone(questions), startedAt: now, deadlineAt: now + minutes * 60000, currentIndex: 0, answers: {}, flagged: [], status: 'active' }
}
export function remainingSeconds(session: PracticeSession, now = Date.now()) { return Math.max(0, Math.ceil((session.deadlineAt - now) / 1000)) }
export function hasPracticeAnswer(answer?: QuestionAnswer) { return !!(answer?.optionId || answer?.optionIds?.length || answer?.text?.trim() || answer?.numericAnswer !== undefined) }
export function updatePracticeSession(session: PracticeSession, change: { index?: number; answer?: QuestionAnswer; flag?: boolean }, now = Date.now()): PracticeSession {
  if (session.status !== 'active' || remainingSeconds(session, now) === 0) return session
  const currentIndex = Math.max(0, Math.min(session.questions.length - 1, change.index ?? session.currentIndex))
  const id = session.questions[currentIndex].question.id
  return { ...session, currentIndex, answers: change.answer ? { ...session.answers, [id]: change.answer } : session.answers, flagged: change.flag === undefined ? session.flagged : change.flag ? [...new Set([...session.flagged, id])] : session.flagged.filter(f => f !== id) }
}
export function submitPracticeSession(state: WorkbenchState, id: string, now = Date.now()): WorkbenchState {
  const session = state.practiceSessions?.find(s => s.id === id)
  if (!session) throw new Error('练习不存在')
  if (session.status === 'submitted') return state
  let next = state
  const submittedAt = Math.max(session.startedAt, Math.min(now, session.deadlineAt))
  for (const item of session.questions) {
    if (next.attempts.some(a => a.sessionId === id && a.questionId === item.question.id)) continue
    const answer = session.answers[item.question.id]
    // Ordering is sequence-sensitive; the shared adapter treats option sets as unordered.
    const orderingCorrect = item.question.answerType === 'ordering' && hasPracticeAnswer(answer) && item.question.answer?.optionIds && ['official', 'verified'].includes(item.question.answer.verification) ? JSON.stringify(answer?.optionIds) === JSON.stringify(item.question.answer.optionIds) : undefined
    next = recordQuestionAttempt(next, item.question, item.source, { date: format(new Date(submittedAt), 'yyyy-MM-dd'), correct: orderingCorrect, selectedAnswer: hasPracticeAnswer(answer) ? answer : undefined, response: ['essay', 'speaking'].includes(item.question.answerType ?? '') ? answer?.text : undefined })
    next = { ...next, attempts: next.attempts.map((attempt, i) => i === 0 ? { ...attempt, sessionId: id } : attempt) }
  }
  return { ...next, practiceSessions: next.practiceSessions?.map(s => s.id === id ? { ...s, status: 'submitted', submittedAt } : s) }
}
export function practiceResult(session: PracticeSession, attempts: Attempt[]) {
  const results = attempts.filter(a => a.sessionId === session.id), correct = results.filter(a => a.correct === true).length, wrong = results.filter(a => a.correct === false).length
  return { total: session.questions.length, correct, wrong, ungraded: session.questions.length - correct - wrong, accuracy: correct + wrong ? Math.round(correct / (correct + wrong) * 100) : null, elapsedSeconds: Math.max(0, Math.round(((session.submittedAt ?? Math.min(Date.now(), session.deadlineAt)) - session.startedAt) / 1000)) }
}
