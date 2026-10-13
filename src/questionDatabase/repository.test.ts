import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'
import { IndexedDbQuestionRepository } from './indexedDbRepository'
import { reconcileQuestionReferences } from './repository'
import type { QuestionImportRecord } from './domain'
import type { Attempt, Question } from '../types'

const question = (id: string): Question => ({
  id,
  sourceId: 'user-manual',
  exam: 'gre',
  examVersion: 'GRE_CURRENT',
  section: 'verbal',
  questionType: 'text_completion',
  skillIds: [],
  promptHash: id,
  options: [],
  storageMode: 'reference_only',
  verification: 'unverified',
  compatibility: { examVersion: 'GRE_CURRENT', status: 'current' },
  explanationIds: [],
  mediaIds: [],
  tags: [],
  active: true,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
})

const attempt = (id: string, questionId?: string, provenance: Attempt['provenance'] = 'question'): Attempt => ({
  id,
  date: '2026-10-01',
  exam: 'gre',
  section: 'verbal',
  skillIds: [],
  sourceType: 'self_created',
  questionId,
  provenance,
  reviewed: false,
})

describe('question reference reconciliation', () => {
  it('reports dangling question ids without mutating attempts', () => {
    const attempts = [attempt('orphan', 'missing-question'), attempt('valid', 'q-1')]
    const result = reconcileQuestionReferences(attempts, [question('q-1')])

    expect(result.orphanedAttemptIds).toEqual(['orphan'])
    expect(result.orphanedAttempts).toEqual([attempts[0]])
    expect(result.orphanedCount).toBe(1)
    expect(result.resolvedCount).toBe(1)
    expect(attempts[0].questionReferenceStatus).toBeUndefined()
  })

  it('returns no orphans when every question reference resolves', () => {
    const result = reconcileQuestionReferences([attempt('valid', 'q-1')], [question('q-1')])

    expect(result.orphanedAttempts).toEqual([])
    expect(result.orphanedCount).toBe(0)
    expect(result.resolvedCount).toBe(1)
  })

  it('does not report standalone reference or batch summary attempts', () => {
    const attempts = [attempt('reference', undefined, 'reference'), attempt('batch', undefined, 'batch_summary')]

    expect(reconcileQuestionReferences(attempts, []).orphanedCount).toBe(0)
  })

  it('marks missing question references without deleting attempts or replacing manual exclusions', () => {
    const attempts = [
      { ...attempt('missing', 'absent'), correct: true, excludeFromMastery: false },
      { ...attempt('excluded', 'restored'), excludeFromMastery: true, questionReferenceStatus: 'orphaned' as const },
    ]
    const result = reconcileQuestionReferences(attempts, [question('restored')])

    expect(result.reconciledAttempts).toEqual([
      { ...attempts[0], questionReferenceStatus: 'orphaned' },
      { ...attempts[1], questionReferenceStatus: 'valid' },
    ])
    expect(attempts[0].questionReferenceStatus).toBeUndefined()
    expect(attempts[1].questionReferenceStatus).toBe('orphaned')
  })

  it('leaves standalone provenance independent of bank contents and accepts inactive historical questions', () => {
    const attempts = [attempt('reference', 'not-in-bank', 'reference'), attempt('batch', 'not-in-bank', 'batch_summary'), attempt('history', 'inactive')]
    const result = reconcileQuestionReferences(attempts, [{ ...question('inactive'), active: false }])

    expect(result.reconciledAttempts).toEqual([attempts[0], attempts[1], { ...attempts[2], questionReferenceStatus: 'valid' }])
    expect(result.orphanedCount).toBe(0)
  })

  it.each(['question', 'answer'] as const)('excludes restored pre-dispute evidence when the current %s is disputed', disputed => {
    const restored = { ...attempt('restored', 'q-1'), correct: true }
    const current = { ...question('q-1'), verification: disputed === 'question' ? 'disputed' as const : 'verified' as const, answer: { text: 'B', verification: disputed === 'answer' ? 'disputed' as const : 'verified' as const } }
    const result = reconcileQuestionReferences([restored], [current])

    expect(result.reconciledAttempts[0]).toMatchObject({ questionReferenceStatus: 'valid', excludeFromMastery: true, correct: true })
    expect(restored.excludeFromMastery).toBeUndefined()
    const corrected = { ...current, verification: 'verified' as const, answer: { ...current.answer, verification: 'verified' as const } }
    expect(reconcileQuestionReferences(result.reconciledAttempts, [corrected]).reconciledAttempts[0].excludeFromMastery).toBe(true)
  })

  it.each(['question', 'answer'] as const)('excludes a matching disputed %s for reference provenance without requiring a bank row', disputed => {
    const reference = { ...attempt('reference', 'q-1', 'reference'), correct: true }
    const current = { ...question('q-1'), verification: disputed === 'question' ? 'disputed' as const : 'verified' as const, answer: { text: 'B', verification: disputed === 'answer' ? 'disputed' as const : 'verified' as const } }
    const result = reconcileQuestionReferences([reference, attempt('batch', 'q-1', 'batch_summary')], [current])

    expect(result.reconciledAttempts[0]).toEqual({ ...reference, excludeFromMastery: true })
    expect(result.reconciledAttempts[1].excludeFromMastery).toBeUndefined()
    expect(result.orphanedCount).toBe(0)
    expect(reconcileQuestionReferences([reference], []).reconciledAttempts).toEqual([reference])
    const corrected = { ...current, verification: 'verified' as const, answer: { ...current.answer, verification: 'verified' as const } }
    expect(reconcileQuestionReferences(result.reconciledAttempts, [corrected]).reconciledAttempts[0].excludeFromMastery).toBe(true)
  })
})

describe('durable question repository', () => {
  it('persists questions and sources across repository instances and applies source tier filters', async () => {
    const repo = new IndexedDbQuestionRepository()
    const sources = await repo.listSources()
    expect(sources.length).toBeGreaterThanOrEqual(15)
    const record = { id: crypto.randomUUID(), sourceId: 'ets-gre-verbal-samples', sourceQuestionId: crypto.randomUUID(), exam: 'gre', examVersion: 'GRE_CURRENT', section: 'verbal', questionType: 'text_completion', skillIds: [], storageMode: 'reference_only', options: [], verification: 'unverified', compatibility: { examVersion: 'GRE_CURRENT', status: 'current' }, tags: [], explanationIds: [], mediaIds: [] } as QuestionImportRecord
    await repo.importQuestions([record])
    const reopened = new IndexedDbQuestionRepository()
    expect(await reopened.getById(record.id!)).toBeDefined()
    expect((await reopened.search({ sourceTier: 'D' })).some(q => q.id === record.id)).toBe(false)
    await reopened.markInactive(record.id!)
    expect((await reopened.getById(record.id!))?.active).toBe(false)
  })
  it('retains an answer revision and disputes conflicting imports', async () => {
    const repo = new IndexedDbQuestionRepository(), id = crypto.randomUUID(), number = crypto.randomUUID()
    const record: QuestionImportRecord = { id, sourceId: 'user-manual', sourceQuestionId: number, exam: 'gre', examVersion: 'GRE_CURRENT', section: 'verbal', questionType: 'text_completion', skillIds: [], storageMode: 'reference_only', options: [], answer: { text: 'B', verification: 'verified' }, verification: 'verified', compatibility: { examVersion: 'GRE_CURRENT', status: 'current' }, tags: [], explanationIds: [], mediaIds: [] }
    await repo.importQuestions([record]); await repo.importQuestions([{ ...record, answer: { text: 'D', verification: 'verified' } }])
    expect((await repo.getById(id))?.verification).toBe('disputed')
    expect((await repo.exportBundle()).revisions.some(r => r.questionId === id && r.snapshot.answer?.text === 'B')).toBe(true)
  })
  it('disputes two conflicting new rows in one transaction', async () => {
    const repo = new IndexedDbQuestionRepository(), id = crypto.randomUUID()
    const record: QuestionImportRecord = { id, sourceId: 'user-manual', sourceQuestionId: id, exam: 'gre', examVersion: 'GRE_CURRENT', section: 'verbal', questionType: 'text_completion', skillIds: [], storageMode: 'reference_only', options: [], answer: { text: 'B', verification: 'verified' }, verification: 'verified', compatibility: { examVersion: 'GRE_CURRENT', status: 'current' }, tags: [], explanationIds: [], mediaIds: [] }
    await repo.importQuestions([record, { ...record, id: crypto.randomUUID(), answer: { text: 'D', verification: 'verified' } }])
    expect((await repo.getById(id))?.verification).toBe('disputed')
    expect((await repo.exportBundle()).revisions.some(r => r.questionId === id)).toBe(true)
  })
})
