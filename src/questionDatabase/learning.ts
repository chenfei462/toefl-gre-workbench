import { addDays, format, parseISO } from 'date-fns'
import type { Attempt, ErrorRecord, ErrorType, Exam, Question, QuestionAnswer, QuestionSource, Section, WorkbenchState } from '../types'
import { getQuestionEvidenceWeight } from './domain'
import { updateUserQuestionState } from './userState'
export interface AttemptInput { date: string; correct?: boolean; selectedAnswer?: QuestionAnswer; timeSeconds?: number; errorType?: ErrorType; note?: string; response?: string; feedback?: string; rubricScore?: number; replaceAttemptId?: string }
function enrichSkills(ids: string[], errorType?: ErrorType, exam: Exam = 'gre') { return [...new Set([...ids, ...(errorType === 'vocabulary' ? [`${exam}-vocabulary`] : errorType === 'logic' ? [`${exam}-logic`] : [])])] }
export function recordQuestionAttempt(state: WorkbenchState, question: Question, source: QuestionSource | undefined, input: AttemptInput): WorkbenchState {
  const correct = input.correct ?? gradeAnswer(question, input.selectedAnswer)
  const disputed = question.verification === 'disputed' || question.answer?.verification === 'disputed'
  const existing = input.replaceAttemptId ? state.attempts.find(a => a.id === input.replaceAttemptId) : undefined
  const attempt: Attempt = { id: existing?.id ?? crypto.randomUUID(), sessionId: existing?.sessionId, date: input.date, exam: question.exam, section: question.section, questionType: question.questionType, skillIds: enrichSkills(question.skillIds, correct === false ? input.errorType : undefined, question.exam), source: source?.name ?? question.sourceId, sourceType: source?.sourceType === 'official' ? 'official' : source?.sourceType === 'third_party' ? 'third_party' : 'self_created', sourceReference: { sourceId: question.sourceId, sourceQuestionId: question.sourceQuestionId ?? question.sourceQuestionNumber, locator: question.sourceSection }, questionId: question.id, selectedAnswer: input.selectedAnswer, correct, timeSeconds: input.timeSeconds, errorType: input.errorType, note: input.note, reviewed: false, evidenceWeight: source ? getQuestionEvidenceWeight(source, question) : 0.3, excludeFromMastery: disputed, provenance: question.storageMode === 'full' ? 'question' : 'reference', constructedResponse: input.response ? { response: input.response, feedback: input.feedback, rubricScore: input.rubricScore } : undefined }
  const oldError = existing ? state.errorRecords.find(e => e.attemptId === existing.id) : undefined
  const errors = state.errorRecords.filter(e => e.attemptId !== attempt.id)
  if (correct === false) errors.unshift({ ...makeError(attempt), ...oldError, exam: attempt.exam, section: attempt.section, questionType: attempt.questionType, skillIds: attempt.skillIds, errorType: attempt.errorType ?? oldError?.errorType ?? 'unknown', explanation: input.note || oldError?.explanation, id: oldError?.id ?? crypto.randomUUID() })
  return { ...state, attempts: [attempt, ...state.attempts.filter(a => a.id !== attempt.id)], errorRecords: errors, userQuestionStates: updateUserQuestionState(state.userQuestionStates, { questionId: question.id, date: input.date, correct, }) }
}
export function gradeAnswer(q: Question, answer?: QuestionAnswer): boolean | undefined {
  if (!answer || !q.answer || !['official', 'verified'].includes(q.answer.verification) || ['speaking', 'essay'].includes(q.answerType ?? '')) return undefined
  const expected = q.answer.optionIds ?? (q.answer.optionId ? [q.answer.optionId] : undefined)
  if (expected) { const selected = answer.optionIds ?? (answer.optionId ? [answer.optionId] : []); return JSON.stringify([...new Set(selected)].sort()) === JSON.stringify([...new Set(expected)].sort()) }
  if (q.answer.numericAnswer !== undefined) return Number(answer.numericAnswer ?? answer.text) === q.answer.numericAnswer
  const accepted = q.answer.acceptedAnswers ?? (q.answer.text ? [q.answer.text] : [])
  return accepted.length ? accepted.some(v => v.trim().toLowerCase() === answer.text?.trim().toLowerCase()) : undefined
}
function makeError(a: Attempt): ErrorRecord { return { id: crypto.randomUUID(), attemptId: a.id, exam: a.exam, section: a.section, questionType: a.questionType, skillIds: a.skillIds, errorType: a.errorType ?? 'unknown', explanation: a.note, createdAt: a.date, status: 'new', reviewCount: 0, nextReviewDate: format(addDays(parseISO(a.date), 1), 'yyyy-MM-dd') } }
export function recordBatch(state: WorkbenchState, input: { date: string; exam: Exam; section: Section; skillIds: string[]; total: number; correct: number; minutes: number; errorTypes: ErrorType[]; source?: QuestionSource }): WorkbenchState {
  if (!Number.isInteger(input.total) || input.total < 1 || input.total > 500 || !Number.isInteger(input.correct) || input.correct < 0 || input.correct > input.total || !Number.isFinite(input.minutes) || input.minutes < 0) throw new Error('请检查题量、正确数和用时')
  const sessionId = crypto.randomUUID()
  const attempts: Attempt[] = Array.from({ length: input.total }, (_, i) => { const wrong = i >= input.correct, errorType = wrong ? input.errorTypes[i - input.correct] ?? 'unknown' : undefined; return { id: crypto.randomUUID(), sessionId, date: input.date, exam: input.exam, section: input.section, questionType: state.skills.find(s => input.skillIds.includes(s.id))?.questionType, skillIds: enrichSkills(input.skillIds, errorType, input.exam), correct: !wrong, errorType, timeSeconds: input.minutes * 60 / input.total, reviewed: false, source: input.source?.name ?? '用户批量汇总', sourceType: input.source?.sourceType === 'official' ? 'official' : 'self_created', sourceReference: input.source ? { sourceId: input.source.id } : undefined, provenance: 'batch_summary', evidenceWeight: input.source?.verified ? 0.8 : 0.5 } })
  return { ...state, attempts: [...attempts, ...state.attempts], errorRecords: [...attempts.filter(a => !a.correct).map(makeError), ...state.errorRecords], practiceEntries: [{ id: sessionId, date: input.date, exam: input.exam, section: input.section, total: input.total, correct: input.correct, durationMinutes: input.minutes, errorTags: [...new Set(input.errorTypes)], note: `${input.source?.name ?? '用户汇总'} · 待补错题定位` }, ...state.practiceEntries] }
}
export function recordRetry(state: WorkbenchState, errorId: string, correct: boolean, date: string, timeSeconds?: number): WorkbenchState {
  const error = state.errorRecords.find(e => e.id === errorId)
  if (!error) throw new Error('错题不存在')
  const intervals = [1, 3, 7, 14], interval = correct ? intervals[Math.min(error.reviewCount + 1, 3)] : 1
  return { ...state, reviewAttempts: [{ id: crypto.randomUUID(), errorRecordId: errorId, date, correct, timeSeconds }, ...state.reviewAttempts], errorRecords: state.errorRecords.map(e => e.id !== errorId ? e : { ...e, status: correct ? 'resolved' : 'reopened', reviewCount: e.reviewCount + 1, nextReviewDate: format(addDays(parseISO(date), interval), 'yyyy-MM-dd'), resolvedAt: correct ? date : undefined }) }
}
