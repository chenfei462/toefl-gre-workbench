// @vitest-environment jsdom
/// <reference types="node" />
import { webcrypto } from 'node:crypto'
import 'fake-indexeddb/auto'
import { beforeEach, expect, it, vi } from 'vitest'
import { createCloudService } from './service'
import { migrateState, storage } from '../storage'
import { createSnapshot } from './snapshot'
import { readLocalRevision, saveEditorState } from './revision'
import { acknowledgeSync, loadSyncMeta } from './metadata'
import { IndexedDbQuestionRepository } from '../questionDatabase/indexedDbRepository'
import { MaterialStore } from '../study/materials'
import { hasPendingRestore } from './localLock'
it('rolls back learning state when restore acknowledgement storage fails', async () => {
  const initial = migrateState({ schemaVersion: 1, profile: {} })
  storage.save(initial)
  const remote = { ...await createSnapshot({ ...initial, profile: { ...initial.profile, dailyMinutes: 99 } }), revision: 3 }
  const service = createCloudService('a', { read: async () => remote, compareAndSwap: vi.fn() }, vi.fn())
  const preview = await service.previewRestore()
  const originalSet = Storage.prototype.setItem
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
    if (key === 'workbench:cloud-meta:a') throw new Error('metadata quota')
    originalSet.call(this, key, value)
  })
  try {
    await expect(service.restore(preview!)).rejects.toThrow('metadata quota')
    expect(storage.load()?.profile.dailyMinutes).toBe(initial.profile.dailyMinutes)
  } finally { spy.mockRestore() }
})
it('rejects a restore after its originating account changes', async () => {
  const initial = migrateState({ schemaVersion: 1, profile: {} })
  storage.save(initial)
  const remote = { ...await createSnapshot(initial), revision: 2 }
  let active = true
  const service = createCloudService('a', { read: async () => remote, compareAndSwap: vi.fn() }, vi.fn(), undefined, undefined, () => { if (!active) throw new Error('Account changed') })
  const preview = await service.previewRestore()
  active = false
  await expect(service.restore(preview!)).rejects.toThrow('Account changed')
  expect(readLocalRevision()).toBe(1)
})
it('includes the bank in uploads and restores it before accepting a restored state', async () => {
  const initial = migrateState({ schemaVersion: 1, profile: {}, tasks: [] })
  storage.save(initial)
  const bundle = { questions: [], sources: [], passages: [], explanations: [], media: [], revisions: [] }
  const bank = { exportBundle: vi.fn().mockResolvedValue(bundle), restoreBundle: vi.fn().mockResolvedValue(undefined) }
  const remote = { ...await createSnapshot({ ...initial, questionBank: bundle }), revision: 3 }
  const service = createCloudService('a', { read: async () => remote, compareAndSwap: vi.fn() }, vi.fn(), bank)
  await service.restore((await service.previewRestore())!)
  expect(bank.restoreBundle).toHaveBeenCalledWith(bundle, { underLock: true })
  expect(storage.load()?.questionBank).toEqual(bundle)
})

beforeEach(() => {
  localStorage.clear()
  Object.defineProperty(globalThis.crypto, 'subtle', { configurable: true, value: webcrypto.subtle })
})
it('rejects bank edits made after preview without losing the imported question', async () => {
  const initial = migrateState({ schemaVersion: 1, profile: {}, tasks: [] })
  storage.save(initial)
  const bank = new IndexedDbQuestionRepository()
  const bundle = await bank.exportBundle()
  const remote = { ...await createSnapshot({ ...initial, questionBank: bundle }), revision: 5 }
  const service = createCloudService('a', { read: async () => remote, compareAndSwap: vi.fn() }, vi.fn(), bank)
  const preview = (await service.previewRestore())!
  const id = crypto.randomUUID()
  await bank.importQuestions([{ id, sourceId: 'user-manual', sourceQuestionId: id, exam: 'gre', examVersion: 'GRE_CURRENT', section: 'verbal', questionType: 'text_completion', title: 'Imported after preview', skillIds: [], options: [], storageMode: 'reference_only', verification: 'unverified', compatibility: { examVersion: 'GRE_CURRENT', status: 'current' }, tags: [], explanationIds: [], mediaIds: [] }])
  await expect(service.restore(preview)).rejects.toThrow(/bank.*changed/i)
  expect(await bank.getById(id)).toBeDefined()
})
it('does not manufacture a new remote revision when nothing changed', async () => {
  const initial = migrateState({ schemaVersion: 1, profile: {}, tasks: [] })
  storage.save(initial)
  const { IndexedDbQuestionRepository } = await import('../questionDatabase/indexedDbRepository')
  const questionBank = await new IndexedDbQuestionRepository().exportBundle()
  const remote = { ...await createSnapshot({ ...initial, questionBank }), revision: 4 }
  acknowledgeSync('a', readLocalRevision(), 4)
  const compareAndSwap = vi.fn()
  const service = createCloudService('a', { read: async () => remote, compareAndSwap }, vi.fn())
  expect(await service.sync()).toEqual({ status: 'synced', revision: 4 })
  expect(compareAndSwap).not.toHaveBeenCalled()
})
it('restores only after durable recovery and rejects changes made after preview', async () => {
  const initial = migrateState({ schemaVersion: 1, profile: {}, tasks: [] })
  storage.save(initial)
  const remote = { ...await createSnapshot({ ...initial, profile: { ...initial.profile, dailyMinutes: 90 } }), revision: 4 }
  const recover = vi.fn().mockResolvedValue(undefined)
  const service = createCloudService('a', { read: async () => remote, compareAndSwap: vi.fn() }, recover)
  const preview = await service.previewRestore()
  storage.save({ ...initial, profile: { ...initial.profile, dailyMinutes: 70 } })
  await expect(service.restore(preview!)).rejects.toThrow('changed')
  expect(storage.load()?.profile.dailyMinutes).toBe(70)
  const next = await service.previewRestore()
  await service.restore(next!)
  expect(recover).toHaveBeenCalled()
  expect(storage.load()?.profile.dailyMinutes).toBe(90)
})
it('preserves local state if recovery cannot be saved', async () => {
  const initial = migrateState({ schemaVersion: 1, profile: {}, tasks: [] })
  storage.save(initial)
  const remote = { ...await createSnapshot(initial), revision: 1 }
  const service = createCloudService('a', { read: async () => remote, compareAndSwap: vi.fn() }, async () => { throw new Error('quota') })
  const revision = readLocalRevision()
  await expect(service.restore((await service.previewRestore())!)).rejects.toThrow('quota')
  expect(readLocalRevision()).toBe(revision)
})
it('does not add cloud assets when local recovery cannot be saved', async () => {
  const initial = migrateState({ schemaVersion: 1, profile: {}, tasks: [] })
  storage.save(initial)
  const remote = { ...await createSnapshot(initial), revision: 2 }
  const restore = vi.fn()
  const service = createCloudService('a', { read: async () => remote, compareAndSwap: vi.fn() }, async () => { throw new Error('recovery quota') }, undefined, { upload: vi.fn(), restore })
  await expect(service.restore((await service.previewRestore())!)).rejects.toThrow('recovery quota')
  expect(restore).not.toHaveBeenCalled()
})
it('rolls back only files added by the failed restore token', async () => {
  const initial = migrateState({ schemaVersion: 1, profile: {}, tasks: [] })
  storage.save(initial)
  const previousRaw = localStorage.getItem('toefl-gre-workbench:v2')
  const remote = { ...await createSnapshot({ ...initial, profile: { ...initial.profile, dailyMinutes: 99 } }), revision: 3 }
  const materials = new MaterialStore(), existingId = crypto.randomUUID(), addedId = crypto.randomUUID(), token = crypto.randomUUID()
  const material = (id: string, _restoreToken?: string) => ({ id, name: 'notes.txt', kind: 'text' as const, rights: 'user_owned' as const, importedAt: '2026-10-14', size: 5, blob: new Blob(['notes']), _restoreToken })
  await materials.put(material(existingId, 'unrelated-token'))
  const service = createCloudService('a', { read: async () => remote, compareAndSwap: vi.fn() }, vi.fn(), undefined, {
    upload: vi.fn(),
    async restore(_state, assertActive, beforeWrite) {
      assertActive!()
      expect(hasPendingRestore()).toBe(true)
      await beforeWrite!({ token, recordings: [], materials: [existingId, addedId] })
      await materials.add(material(addedId, token), { underLock: true })
      throw new Error('partial asset commit')
    },
  })
  await expect(service.restore((await service.previewRestore())!)).rejects.toThrow('partial asset commit')
  expect((await materials.list()).some(row => row.id === existingId)).toBe(true)
  expect((await materials.list()).some(row => row.id === addedId)).toBe(false)
  expect(localStorage.getItem('toefl-gre-workbench:v2')).toBe(previousRaw)
  expect(hasPendingRestore()).toBe(false)
})
it('keeps local writes available during cloud asset downloads and rejects the stale commit', async () => {
  const initial = migrateState({ schemaVersion: 1, profile: {}, tasks: [] })
  storage.save(initial)
  const remote = { ...await createSnapshot(initial), revision: 3 }
  let staged!: () => void, finishDownload!: () => void
  const started = new Promise<void>(resolve => { staged = resolve })
  const download = new Promise<void>(resolve => { finishDownload = resolve })
  const commit = vi.fn().mockResolvedValue(undefined), restore = vi.fn()
  const service = createCloudService('a', { read: async () => remote, compareAndSwap: vi.fn() }, vi.fn(), undefined, {
    upload: vi.fn(), restore,
    async prepareRestore() { staged(); await download; return commit },
  })
  const preview = (await service.previewRestore())!
  const restoring = service.restore(preview)
  await started
  try {
    await saveEditorState({ ...initial, profile: { ...initial.profile, dailyMinutes: 77 } }, preview.localRevision)
  } finally { finishDownload() }
  await expect(restoring).rejects.toThrow('Local data changed')
  expect(commit).not.toHaveBeenCalled()
  expect(restore).not.toHaveBeenCalled()
  expect(storage.load()?.profile.dailyMinutes).toBe(77)
  expect(hasPendingRestore()).toBe(false)
})
it('queues concurrent bank imports until restore commits without erasing their questions', async () => {
  const initial = migrateState({ schemaVersion: 1, profile: {}, tasks: [] })
  storage.save(initial)
  const bank = new IndexedDbQuestionRepository()
  const remote = { ...await createSnapshot({ ...initial, questionBank: await bank.exportBundle() }), revision: 3 }
  let entered!: () => void, finishRecovery!: () => void
  const started = new Promise<void>(resolve => { entered = resolve })
  const gate = new Promise<void>(resolve => { finishRecovery = resolve })
  const service = createCloudService('a', { read: async () => remote, compareAndSwap: vi.fn() }, async () => { entered(); await gate }, bank)
  const restoring = service.restore((await service.previewRestore())!)
  await started
  const id = crypto.randomUUID()
  let imported = false
  const importing = bank.importQuestions([{ id, sourceId: 'user-manual', sourceQuestionId: id, exam: 'gre', examVersion: 'GRE_CURRENT', section: 'verbal', questionType: 'text_completion', title: 'Queued during restore', skillIds: [], options: [], storageMode: 'reference_only', verification: 'unverified', compatibility: { examVersion: 'GRE_CURRENT', status: 'current' }, tags: [], explanationIds: [], mediaIds: [] }]).then(() => { imported = true })
  try {
    await bank.exportBundle()
    await bank.exportBundle()
    expect(imported).toBe(false)
  } finally { finishRecovery(); await restoring; await importing }
  expect(await bank.getById(id)).toBeDefined()
  expect(hasPendingRestore()).toBe(false)
})
it.each(['sync', 'keepLocal'] as const)('%s keeps a bank mutation during upload pending after acknowledging the captured snapshot', async action => {
  const initial = migrateState({ schemaVersion: 1, profile: {}, tasks: [] })
  storage.save(initial)
  const bank = new IndexedDbQuestionRepository(), revision = readLocalRevision()
  let started!: () => void, finishUpload!: () => void
  const ready = new Promise<void>(resolve => { started = resolve })
  const upload = new Promise<void>(resolve => { finishUpload = resolve })
  const compareAndSwap = vi.fn(async snapshot => ({ ...snapshot, revision: 1 }))
  const service = createCloudService('a', { read: async () => null, compareAndSwap }, vi.fn(), bank, {
    restore: vi.fn(), async upload() { started(); await upload; return { recordings: [], materials: [] } },
  })
  const syncing = action === 'sync' ? service.sync() : service.keepLocal(null)
  await ready
  const id = crypto.randomUUID()
  try {
    await bank.importQuestions([{ id, sourceId: 'user-manual', sourceQuestionId: id, exam: 'gre', examVersion: 'GRE_CURRENT', section: 'verbal', questionType: 'text_completion', title: 'Edited during upload', skillIds: [], options: [], storageMode: 'reference_only', verification: 'unverified', compatibility: { examVersion: 'GRE_CURRENT', status: 'current' }, tags: [], explanationIds: [], mediaIds: [] }])
  } finally { finishUpload() }
  await expect(syncing).resolves.toEqual({ status: 'synced', revision: 1 })
  expect(readLocalRevision()).toBe(revision)
  expect(loadSyncMeta('a', revision).syncStatus).toBe('pending')
  const uploaded = compareAndSwap.mock.calls[0][0]
  expect(uploaded.state.questionBank.questions.some((question: { id: string }) => question.id === id)).toBe(false)
  expect(await bank.getById(id)).toBeDefined()
})
