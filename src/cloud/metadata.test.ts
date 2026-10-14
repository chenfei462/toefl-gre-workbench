// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest'
import { loadSyncMeta, acknowledgeSync } from './metadata'
import 'fake-indexeddb/auto'
import { IndexedDbQuestionRepository } from '../questionDatabase/indexedDbRepository'
beforeEach(() => localStorage.clear())
it('ignores delayed acknowledgements from older cloud writes', () => {
  acknowledgeSync('a', 9, 12)
  acknowledgeSync('a', 7, 10)
  expect(loadSyncMeta('a', 9)).toMatchObject({ lastSyncedRevision: 12, syncStatus: 'synced' })
})
it('isolates account checkpoints and retains a stable device identity', () => {
  const a = loadSyncMeta('a', 3)
  acknowledgeSync('a', 3, 8)
  expect(loadSyncMeta('a', 3)).toMatchObject({ lastSyncedRevision: 8, syncStatus: 'synced' })
  expect(loadSyncMeta('a', 4).syncStatus).toBe('pending')
  expect(loadSyncMeta('b', 3)).toMatchObject({ deviceId: a.deviceId, lastSyncedRevision: 0, syncStatus: 'pending' })
})
it('fails closed on corrupt checkpoints instead of claiming synced', () => {
  localStorage.setItem('workbench:cloud-meta:a', '{bad')
  expect(() => loadSyncMeta('a', 2)).toThrow()
})
it('marks a bank-only import pending after a previous acknowledgement', async () => {
  acknowledgeSync('a', 3, 8)
  expect(loadSyncMeta('a', 3).syncStatus).toBe('synced')
  const id = crypto.randomUUID()
  await new IndexedDbQuestionRepository().importQuestions([{ id, sourceId: 'user-manual', sourceQuestionId: id, exam: 'gre', examVersion: 'GRE_CURRENT', section: 'verbal', questionType: 'text_completion', title: 'Bank-only edit', skillIds: [], options: [], storageMode: 'reference_only', verification: 'unverified', compatibility: { examVersion: 'GRE_CURRENT', status: 'current' }, tags: [], explanationIds: [], mediaIds: [] }])
  expect(loadSyncMeta('a', 3).syncStatus).toBe('pending')
})
it('loads a pre-bank-version checkpoint as synced until the first bank mutation', () => {
  localStorage.setItem('workbench:cloud-meta:a', JSON.stringify({ localRevision: 3, cloudRevision: 8, at: '2026-10-14T00:00:00Z' }))
  expect(loadSyncMeta('a', 3).syncStatus).toBe('synced')
})
