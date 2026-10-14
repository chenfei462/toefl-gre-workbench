import 'fake-indexeddb/auto'
import { expect, it } from 'vitest'
import { preserveConflict } from './conflict'

it('stores both snapshots before acknowledging recovery durability', async () => {
  const record = { local: { schemaVersion: 2, state: { local: true }, checksum: 'local' }, remote: { schemaVersion: 2, state: { remote: true }, checksum: 'remote', revision: 3 }, position: { baseRevision: 1, localRevision: 2, deviceId: 'a' }, createdAt: '2026-10-14' }
  const id = await preserveConflict('user-a', record)
  const db = await new Promise<IDBDatabase>(resolve => { const r = indexedDB.open('workbench-cloud-recovery', 1); r.onsuccess = () => resolve(r.result) })
  const saved = await new Promise(resolve => { const r = db.transaction('snapshots').objectStore('snapshots').get(id); r.onsuccess = () => resolve(r.result) })
  expect(saved).toEqual({ id, userId: 'user-a', ...record })
  db.close()
})
