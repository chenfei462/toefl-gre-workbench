import { expect, it, vi } from 'vitest'
import { assetManifestSchema, createAssetSync } from './assets'
import { migrateState } from '../storage'
it('rejects same-ID material bytes that differ from the restored backup', async () => {
  const put = vi.fn()
  const service = createAssetSync({ upload: vi.fn(), download: async () => new Blob(['cloud']) }, { get: vi.fn(), put } as never, { list: async () => [{ id: 'm', blob: new Blob(['local']) }], put } as never)
  const state = migrateState({ schemaVersion: 1, profile: {} })
  state.cloudAssets = { recordings: [], materials: [{ id: 'm', name: 'm.txt', kind: 'text', rights: 'user_owned', importedAt: '2026-10-14', reference: { bucket: 'study-materials', cloudPath: 'u/m/' + 'a'.repeat(64), checksum: 'a'.repeat(64), mimeType: 'text/plain', size: 5 } }] }
  await expect(service.restore(state)).rejects.toThrow('Binary conflict')
  expect(put).not.toHaveBeenCalled()
})

it('keeps local binary stores untouched when an upload fails', async () => {
  const blob = new Blob(['notes'], { type: 'text/plain' })
  const material = { id: 'm', name: 'notes.txt', kind: 'text', rights: 'user_owned', importedAt: '2026-10-14', blob, size: blob.size }
  const put = vi.fn()
  const files = { list: async () => [material], put }
  const binary = { upload: async () => { throw new Error('offline') }, download: vi.fn() }
  const service = createAssetSync(binary as never, { get: vi.fn(), put } as never, files as never)
  const state = migrateState({ schemaVersion: 1, profile: {}, resources: [{ id: 'm', title: 'Notes', type: 'document', tags: [] }] })
  await expect(service.upload(state)).rejects.toThrow('offline')
  expect(put).not.toHaveBeenCalled()
  expect(await material.blob.text()).toBe('notes')
})

it('downloads all material bytes before writing any restored record', async () => {
  const put = vi.fn()
  const download = vi.fn().mockResolvedValueOnce(new Blob(['first'])).mockRejectedValueOnce(new Error('checksum mismatch'))
  const service = createAssetSync({ upload: vi.fn(), download }, { get: vi.fn(), put } as never, { list: async () => [], put } as never)
  const state = migrateState({ schemaVersion: 1, profile: {} })
  state.cloudAssets = { recordings: [], materials: ['a', 'b'].map(id => ({ id, name: id + '.txt', kind: 'text', rights: 'user_owned', importedAt: '2026-10-14', reference: { bucket: 'study-materials', cloudPath: 'u/' + id + '/' + 'a'.repeat(64), checksum: 'a'.repeat(64), mimeType: 'text/plain', size: 5 } })) }
  await expect(service.restore(state)).rejects.toThrow('checksum mismatch')
  expect(put).not.toHaveBeenCalled()
})

it('checks the active account after downloads and before local binary writes', async () => {
  const put = vi.fn(), add = vi.fn()
  const service = createAssetSync({ upload: vi.fn(), download: async () => new Blob(['notes']) }, { get: vi.fn(), put, add } as never, { list: async () => [], put, add } as never)
  const state = migrateState({ schemaVersion: 1, profile: {} })
  state.cloudAssets = { recordings: [], materials: [{ id: 'm', name: 'm.txt', kind: 'text', rights: 'user_owned', importedAt: '2026-10-14', reference: { bucket: 'study-materials', cloudPath: 'u/m/' + 'a'.repeat(64), checksum: 'a'.repeat(64), mimeType: 'text/plain', size: 5 } }] }
  await expect(service.restore(state, () => { throw new Error('Account changed') })).rejects.toThrow('Account changed')
  expect(put).not.toHaveBeenCalled()
  expect(add).not.toHaveBeenCalled()
})

it('persists the exact newly added binary IDs before making them visible', async () => {
  const add = vi.fn()
  const service = createAssetSync({ upload: vi.fn(), download: async () => new Blob(['notes']) }, { get: vi.fn(), add, put: vi.fn() } as never, { list: async () => [], add, put: vi.fn() } as never)
  const state = migrateState({ schemaVersion: 1, profile: {} })
  state.cloudAssets = { recordings: [], materials: [{ id: 'm', name: 'm.txt', kind: 'text', rights: 'user_owned', importedAt: '2026-10-14', reference: { bucket: 'study-materials', cloudPath: 'u/m/' + 'a'.repeat(64), checksum: 'a'.repeat(64), mimeType: 'text/plain', size: 5 } }] }
  const journal = vi.fn().mockRejectedValue(new Error('journal quota'))
  await expect(service.restore(state, () => {}, journal)).rejects.toThrow('journal quota')
  expect(journal).toHaveBeenCalledWith({ token: expect.any(String), recordings: [], materials: ['m'] })
  expect(add).not.toHaveBeenCalled()
})

it('rejects duplicate IDs in incoming manifests', () => {
  const row = { id: 'm', name: 'm.txt', kind: 'text', rights: 'user_owned', importedAt: '2026-10-14', reference: { bucket: 'study-materials', cloudPath: 'u/m/' + 'a'.repeat(64), checksum: 'a'.repeat(64), mimeType: 'text/plain', size: 5 } }
  expect(() => assetManifestSchema.parse({ recordings: [], materials: [row, row] })).toThrow()
})
