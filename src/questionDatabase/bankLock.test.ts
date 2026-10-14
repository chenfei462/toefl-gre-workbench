// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { expect, it, vi } from 'vitest'
import { IndexedDbQuestionRepository } from './indexedDbRepository'
import { beginRestore, completeRestore } from '../cloud/restoreJournal'

const empty = { questions: [], sources: [], passages: [], explanations: [], media: [], revisions: [] }
const record = (id: string) => ({ id, sourceId: 'user-manual', sourceQuestionId: id, exam: 'gre' as const, examVersion: 'GRE_CURRENT', section: 'verbal' as const, questionType: 'text_completion', title: id, skillIds: [], options: [], storageMode: 'reference_only' as const, verification: 'unverified' as const, compatibility: { examVersion: 'GRE_CURRENT', status: 'current' as const }, tags: [], explanationIds: [], mediaIds: [] })
it('waits for the shared restore lock before importing questions', async () => {
  const bank = new IndexedDbQuestionRepository(), id = crypto.randomUUID()
  let release!: () => void
  let entered!: () => void
  const ready = new Promise<void>(resolve => { entered = resolve })
  const gate = new Promise<void>(resolve => { release = resolve })
  const restore = navigator.locks.request('workbench-local-write', async () => { entered(); await gate })
  await ready
  let finished = false
  const importing = bank.importQuestions([record(id)]).then(() => { finished = true })
  try {
    // Waiting for a real DB read ensures an unlocked import has time to commit.
    await bank.exportBundle()
    await bank.exportBundle()
    expect(finished).toBe(false)
  } finally { release(); await restore; await importing }
  expect(await bank.getById(id)).toBeDefined()
})
it('refuses normal bank mutation until an interrupted restore is recovered', async () => {
  const bank = new IndexedDbQuestionRepository(), id = crypto.randomUUID()
  const before = await bank.exportBundle()
  await beginRestore({ previousRaw: null, previousBank: before, metadataKey: 'meta', previousMetadata: null })
  try {
    await expect(bank.importQuestions([record(id)])).rejects.toThrow(/restore|recovery/i)
    await expect(bank.saveReferences({ passages: [{ id, sourceId: 'user-manual', text: 'pending', storageMode: 'full' }] })).rejects.toThrow(/restore|recovery/i)
    await expect(bank.restoreBundle(empty)).rejects.toThrow(/restore|recovery/i)
    expect(await bank.exportBundle()).toEqual(before)
  } finally { await completeRestore() }
})
it('exports the same source order before and after restoring its own bundle', async () => {
  const bank = new IndexedDbQuestionRepository(), before = await bank.exportBundle()
  await bank.restoreBundle(before)
  expect(await bank.exportBundle()).toEqual(before)
})
it('captures all six bank stores in one readonly transaction', async () => {
  const transaction = vi.spyOn(IDBDatabase.prototype, 'transaction')
  try {
    await new IndexedDbQuestionRepository().exportBundle()
    expect(transaction).toHaveBeenCalledTimes(1)
    expect(transaction).toHaveBeenCalledWith(['questions', 'sources', 'passages', 'explanations', 'media', 'revisions'], 'readonly')
  } finally { transaction.mockRestore() }
})
it('preserves the bank if the write-ahead mutation stamp cannot be saved', async () => {
  const bank = new IndexedDbQuestionRepository(), id = crypto.randomUUID(), before = await bank.exportBundle()
  const originalSet = Storage.prototype.setItem
  const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
    if (key === 'workbench:bank-version') throw new Error('bank version quota')
    originalSet.call(this, key, value)
  })
  try {
    await expect(bank.importQuestions([record(id)])).rejects.toThrow('bank version quota')
    expect(await bank.exportBundle()).toEqual(before)
  } finally { set.mockRestore() }
})
