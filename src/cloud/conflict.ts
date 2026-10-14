import type { ConflictRecovery } from './types'

export async function preserveConflict(userId: string, record: ConflictRecovery): Promise<string> {
  const id = crypto.randomUUID()
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('workbench-cloud-recovery', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('snapshots', { keyPath: 'id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Recovery database blocked; close older tabs'))
  })
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('snapshots', 'readwrite')
    tx.objectStore('snapshots').add({ id, userId, ...record })
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Recovery save failed')) }
    tx.onerror = () => { /* abort reports failure */ }
  })
  return id
}
