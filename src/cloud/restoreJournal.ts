import { IndexedDbQuestionRepository, type QuestionBundle } from '../questionDatabase/indexedDbRepository'
import { LOCAL_STATE_KEY } from './revision'
import { hasPendingRestore, PENDING_RESTORE_KEY, withLocalWriteLock, type UnderLocalLock } from './localLock'
import type { RestoreAssetAdditions } from './assets'
import { RecordingStore } from '../study/recordings'
import { MaterialStore } from '../study/materials'
interface RestoreJournal { previousRaw: string | null; previousBank: QuestionBundle; metadataKey: string; previousMetadata: string | null; additions?: RestoreAssetAdditions }
async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('workbench-restore-journal', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('journal')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Restore recovery database blocked'))
  })
  return new Promise((resolve, reject) => {
    const tx = db.transaction('journal', mode)
    let request: IDBRequest<T>
    try { request = action(tx.objectStore('journal')) }
    catch (error) { tx.abort(); db.close(); reject(error); return }
    tx.oncomplete = () => { db.close(); resolve(request.result) }
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Restore journal write failed')) }
  })
}
export async function beginRestore(journal: RestoreJournal, options: UnderLocalLock = {}): Promise<void> {
  if (!options.underLock) return withLocalWriteLock(() => beginRestore(journal, { underLock: true }))
  if (await transaction('readonly', store => store.get('pending'))) {
    localStorage.setItem(PENDING_RESTORE_KEY, 'pending')
    throw new Error('An interrupted restore requires recovery')
  }
  // The marker must become durable before the journal: a crash in either gap
  // must prevent already-open editors from superseding the recovery snapshot.
  localStorage.setItem(PENDING_RESTORE_KEY, 'pending')
  try { await transaction('readwrite', store => store.put(journal, 'pending')) }
  catch (error) {
    // No business or asset writes have started, and this aborted transaction
    // cannot leave a journal. A handled quota error must not block local study.
    localStorage.removeItem(PENDING_RESTORE_KEY)
    throw error
  }
}
export async function updateRestoreAssets(additions: RestoreAssetAdditions, options: UnderLocalLock = {}): Promise<void> {
  if (!options.underLock) return withLocalWriteLock(() => updateRestoreAssets(additions, { underLock: true }))
  const journal = await transaction<RestoreJournal | undefined>('readonly', store => store.get('pending'))
  if (!journal) throw new Error('Restore journal unavailable before asset write')
  await transaction('readwrite', store => store.put({ ...journal, additions }, 'pending'))
}
export async function completeRestore(options: UnderLocalLock = {}): Promise<void> {
  if (!options.underLock) return withLocalWriteLock(() => completeRestore({ underLock: true }))
  await transaction('readwrite', store => store.delete('pending'))
  localStorage.removeItem(PENDING_RESTORE_KEY)
}
export async function recoverInterruptedRestore(bank: { restoreBundle(bundle: QuestionBundle, options?: UnderLocalLock): Promise<void> } = new IndexedDbQuestionRepository(), options: UnderLocalLock = {}): Promise<void> {
  if (!options.underLock) return withLocalWriteLock(() => recoverInterruptedRestore(bank, { underLock: true }))
  if (!hasPendingRestore() && typeof indexedDB.databases === 'function') {
    // Detect an existing pre-marker journal on upgrade, without creating/opening
    // the recovery database for browsers that have only used local study mode.
    let databases: IDBDatabaseInfo[]
    try { databases = await indexedDB.databases() }
    catch { return } // No marker: keep local-only study available when IDB is denied.
    if (!databases.some(database => database.name === 'workbench-restore-journal')) return
  }
  const journal = await transaction<RestoreJournal | undefined>('readonly', store => store.get('pending'))
  if (!journal) { localStorage.removeItem(PENDING_RESTORE_KEY); return }
  localStorage.setItem(PENDING_RESTORE_KEY, 'pending')
  if (journal.additions) {
    const recordings = new RecordingStore(), materials = new MaterialStore()
    for (const id of journal.additions.recordings) await recordings.removeRestored(id, journal.additions.token, { underLock: true })
    for (const id of journal.additions.materials) await materials.removeRestored(id, journal.additions.token, { underLock: true })
  }
  await bank.restoreBundle(journal.previousBank, { underLock: true })
  if (journal.previousRaw === null) localStorage.removeItem(LOCAL_STATE_KEY)
  else localStorage.setItem(LOCAL_STATE_KEY, journal.previousRaw)
  if (journal.previousMetadata === null) localStorage.removeItem(journal.metadataKey)
  else localStorage.setItem(journal.metadataKey, journal.previousMetadata)
  await completeRestore({ underLock: true })
}
