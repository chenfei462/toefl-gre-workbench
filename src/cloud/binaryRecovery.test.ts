import 'fake-indexeddb/auto'
import { expect, it } from 'vitest'
import { MaterialStore } from '../study/materials'
import { RecordingStore } from '../study/recordings'

it('binary rollback removes only records belonging to the interrupted restore', async () => {
  const materials = new MaterialStore('recovery-materials-' + crypto.randomUUID())
  const recordings = new RecordingStore('recovery-recordings-' + crypto.randomUUID())
  const file = { id: 'm', name: 'notes.txt', kind: 'text' as const, rights: 'user_owned' as const, importedAt: '2026-10-14', size: 5, blob: new Blob(['notes']), _restoreToken: 'restore-a' }
  const recording = { id: 'r', blob: new Blob(['audio']), session: {} as never, _restoreToken: 'restore-a' }
  await materials.add(file)
  await recordings.add(recording)
  await materials.removeRestored(file.id, 'restore-b')
  await recordings.removeRestored(recording.id, 'restore-b')
  expect(await materials.list()).toHaveLength(1)
  expect(await recordings.list()).toHaveLength(1)
  await expect(materials.add({ ...file, blob: new Blob(['different']) })).rejects.toThrow()
  await expect(recordings.add({ ...recording, blob: new Blob(['different']) })).rejects.toThrow()
  expect(await (await materials.list())[0].blob.text()).toBe('notes')
  expect(await (await recordings.list())[0].blob.text()).toBe('audio')
  await materials.removeRestored(file.id, 'restore-a')
  await recordings.removeRestored(recording.id, 'restore-a')
  expect(await materials.list()).toEqual([])
  expect(await recordings.list()).toEqual([])
})
