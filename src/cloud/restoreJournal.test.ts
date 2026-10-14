// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { expect, it, vi } from 'vitest'
import { beginRestore, recoverInterruptedRestore, completeRestore } from './restoreJournal'
import { LOCAL_STATE_KEY } from './revision'
import { PENDING_RESTORE_KEY, hasPendingRestore } from './localLock'
import { saveEditorState, readLocalRevision } from './revision'
import { migrateState, storage } from '../storage'
it('rolls back a bank committed before the learning state on startup', async () => {
  const bank = { questions: [], sources: [], passages: [], explanations: [], media: [], revisions: [] }
  localStorage.setItem(LOCAL_STATE_KEY, 'old-state')
  await beginRestore({ previousRaw: 'old-state', previousBank: bank, metadataKey: 'meta', previousMetadata: null })
  localStorage.setItem(LOCAL_STATE_KEY, 'partially-committed-new-state')
  const restoreBundle = vi.fn().mockResolvedValue(undefined)
  await recoverInterruptedRestore({ restoreBundle })
  expect(restoreBundle).toHaveBeenCalledWith(bank, { underLock: true })
  expect(localStorage.getItem(LOCAL_STATE_KEY)).toBe('old-state')
  restoreBundle.mockClear()
  await recoverInterruptedRestore({ restoreBundle })
  expect(restoreBundle).not.toHaveBeenCalled()
})
it('does not roll back a completed restore', async () => {
  const bank = { questions: [], sources: [], passages: [], explanations: [], media: [], revisions: [] }
  await beginRestore({ previousRaw: null, previousBank: bank, metadataKey: 'meta', previousMetadata: null })
  await completeRestore()
  const restoreBundle = vi.fn()
  await recoverInterruptedRestore({ restoreBundle })
  expect(restoreBundle).not.toHaveBeenCalled()
})
it('recovers an existing journal written by the pre-marker version', async () => {
  const bank = { questions: [], sources: [], passages: [], explanations: [], media: [], revisions: [] }
  await beginRestore({ previousRaw: 'legacy-state', previousBank: bank, metadataKey: 'meta', previousMetadata: null })
  localStorage.removeItem(PENDING_RESTORE_KEY)
  const restoreBundle = vi.fn().mockResolvedValue(undefined)
  await recoverInterruptedRestore({ restoreBundle })
  expect(restoreBundle).toHaveBeenCalledWith(bank, { underLock: true })
  expect(localStorage.getItem(LOCAL_STATE_KEY)).toBe('legacy-state')
  expect(hasPendingRestore()).toBe(false)
})
it('keeps local-only startup available if recovery-database enumeration is denied', async () => {
  localStorage.removeItem(PENDING_RESTORE_KEY)
  const databases = vi.spyOn(indexedDB, 'databases').mockRejectedValue(new Error('IDB permission denied'))
  const open = vi.spyOn(indexedDB, 'open').mockImplementation(() => { throw new Error('IDB unavailable') })
  try {
    await expect(recoverInterruptedRestore({ restoreBundle: vi.fn() })).resolves.toBeUndefined()
    expect(open).not.toHaveBeenCalled()
  } finally { databases.mockRestore(); open.mockRestore() }
})
it('fails closed when a pending restore cannot read its recovery journal', async () => {
  localStorage.setItem(PENDING_RESTORE_KEY, 'pending')
  const open = vi.spyOn(indexedDB, 'open').mockImplementation(() => { throw new Error('IDB unavailable') })
  try {
    await expect(recoverInterruptedRestore({ restoreBundle: vi.fn() })).rejects.toThrow('IDB unavailable')
    expect(hasPendingRestore()).toBe(true)
  } finally { open.mockRestore(); localStorage.removeItem(PENDING_RESTORE_KEY) }
})
it('unblocks ordinary saves immediately when the initial journal write fails', async () => {
  localStorage.clear()
  const state = migrateState({ schemaVersion: 1, profile: {}, tasks: [] })
  storage.save(state)
  const previousRaw = localStorage.getItem(LOCAL_STATE_KEY), revision = readLocalRevision()
  const bank = { questions: [], sources: [], passages: [], explanations: [], media: [], revisions: [] }
  const originalPut = IDBObjectStore.prototype.put
  const put = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, ...args: Parameters<typeof originalPut>) {
    if (this.name === 'journal') throw new DOMException('Journal quota', 'QuotaExceededError')
    return originalPut.apply(this, args)
  })
  try {
    await expect(beginRestore({ previousRaw, previousBank: bank, metadataKey: 'meta', previousMetadata: null })).rejects.toThrow('Journal quota')
    expect(hasPendingRestore()).toBe(false)
    await expect(saveEditorState({ ...state, profile: { ...state.profile, dailyMinutes: 80 } }, revision)).resolves.toBe(revision + 1)
  } finally { put.mockRestore(); localStorage.removeItem(PENDING_RESTORE_KEY) }
})
