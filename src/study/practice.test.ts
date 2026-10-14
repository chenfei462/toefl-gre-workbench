import { describe, expect, it } from 'vitest'
import { migrateState, storage } from '../storage'
import type { Question } from '../types'
import { createPracticeSession, updatePracticeSession, submitPracticeSession, remainingSeconds, practiceResult, mixPracticeQuestions } from './practice'
import { practiceSessionSchema } from './practiceSchema'
const initial = () => migrateState({ schemaVersion: 1, profile: {}, tasks: [], resources: [], practiceEntries: [], weeklyReviews: [] })
export const question: Question = { id: 'q', sourceId: 'user-manual', exam: 'gre', examVersion: 'GRE_CURRENT', section: 'verbal', questionType: 'text_completion', skillIds: ['gre-text-completion'], prompt: 'Choose the word', options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], answer: { optionId: 'a', verification: 'verified' }, answerType: 'single_choice', storageMode: 'full', verification: 'verified', compatibility: { examVersion: 'GRE_CURRENT', status: 'current' }, promptHash: '', explanationIds: [], mediaIds: [], tags: [], active: true, createdAt: '', updatedAt: '' }
const start = Date.parse('2026-10-14T01:00:00Z')
describe('practice session', () => {
  it('interleaves question types so a mixed first20 is not dominated by the first type', () => {
    const questions = Array.from({ length: 30 }, (_, i) => ({ ...question, id: String(i), questionType: i < 20 ? 'text_completion' : 'reading_comprehension' }))
    expect(mixPracticeQuestions(questions).slice(0, 4).map(q => q.questionType)).toEqual(['text_completion', 'reading_comprehension', 'text_completion', 'reading_comprehension'])
  })
  it('atomically records 20 attempts and seven errors; duplicate submission adds nothing', () => {
    let session = createPracticeSession(Array.from({ length: 20 }, (_, i) => ({ question: { ...question, id: `q${i}` }, media: [] })), 30, start)
    for (let i = 0; i < 20; i++) session = updatePracticeSession(session, { answer: { optionId: i < 13 ? 'a' : 'b', verification: 'unverified' }, index: i }, start + i * 1000)
    const state = { ...initial(), practiceSessions: [session] }
    const next = submitPracticeSession(state, session.id, start + 28 * 60000)
    expect(next.attempts).toHaveLength(20)
    expect(next.errorRecords).toHaveLength(7)
    expect(next.attempts.every(a => a.sessionId === session.id)).toBe(true)
    expect(practiceResult(next.practiceSessions![0], next.attempts)).toMatchObject({ correct: 13, wrong: 7, accuracy: 65, elapsedSeconds: 1680 })
    expect(submitPracticeSession(next, session.id, start + 29 * 60000)).toBe(next)
  })
  it('retains snapshot, answer, flag, position and deadline through JSON reload', () => {
    const q = { ...question }
    const session = updatePracticeSession(createPracticeSession([{ question: q, media: [] }], 1, start), { index: 0, flag: true, answer: { optionId: 'a', verification: 'unverified' } }, start + 2000)
    q.prompt = 'Changed bank question'
    const restored = practiceSessionSchema.parse(JSON.parse(JSON.stringify(session)))
    expect(restored.questions[0].question.prompt).toBe('Choose the word')
    expect(restored.answers.q.optionId).toBe('a')
    expect(restored.flagged).toEqual(['q'])
    expect(remainingSeconds(restored, start + 45000)).toBe(15)
    expect(remainingSeconds(restored, start + 90000)).toBe(0)
    expect(updatePracticeSession(restored, { answer: { optionId: 'b', verification: 'unverified' } }, start + 90000)).toEqual(restored)
  })
  it('keeps unverified, missing answers and constructed responses ungraded', () => {
    const session = createPracticeSession([{ question: { ...question, answer: undefined }, media: [] }, { question: { ...question, id: 'q2' }, media: [] }], 1, start)
    const next = submitPracticeSession({ ...initial(), practiceSessions: [session] }, session.id, start + 90000)
    expect(next.attempts).toHaveLength(2)
    expect(next.errorRecords).toHaveLength(0)
    expect(practiceResult(next.practiceSessions![0], next.attempts)).toMatchObject({ ungraded: 2, accuracy: null, elapsedSeconds: 60 })
  })
  it('restores an active session using the application backup and preserves ordering correctness', () => {
    const q = { ...question, answerType: 'ordering' as const, answer: { optionIds: ['a', 'b'], verification: 'verified' as const } }
    const session = updatePracticeSession(createPracticeSession([{ question: q, media: [] }], 30, start), { answer: { optionIds: ['b', 'a'], verification: 'unverified' } }, start + 1000)
    const restored = storage.import(storage.export({ ...initial(), practiceSessions: [session] }))
    expect(restored.practiceSessions?.[0]).toEqual(session)
    expect(submitPracticeSession(restored, session.id, start + 5000).attempts[0].correct).toBe(false)
  })
})
