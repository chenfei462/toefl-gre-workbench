import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'
import { IndexedDbQuestionRepository } from './indexedDbRepository'
import type { QuestionImportRecord } from './domain'
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
