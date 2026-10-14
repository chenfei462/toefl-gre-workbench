import { storage } from '../storage'
import type { WorkbenchState } from '../types'
import { IndexedDbQuestionRepository, type QuestionBundle } from '../questionDatabase/indexedDbRepository'
import { preserveConflict } from './conflict'
import { acknowledgeSync, loadSyncMeta } from './metadata'
import { isResetMarker, LOCAL_STATE_KEY, readLocalRevision, saveWithRevision } from './revision'
import { canonicalSerialize, createSnapshot, restoreSnapshot } from './snapshot'
import { pushSnapshot } from './sync'
import { beginRestore, completeRestore, recoverInterruptedRestore, updateRestoreAssets } from './restoreJournal'
import { assertNoPendingRestore, readBankVersion, withLocalWriteLock, type UnderLocalLock } from './localLock'
import type { RestoreAssetAdditions, RestoreAssetCommit } from './assets'
import type { ConflictRecovery, RemoteSnapshot, SnapshotTransport } from './types'

export interface RestorePreview { userId: string; remote: RemoteSnapshot; state: WorkbenchState; localRevision: number; localRaw: string | null; localBank: QuestionBundle }
export function createCloudService(userId: string, transport: SnapshotTransport,
  recover: (record: ConflictRecovery) => Promise<unknown> = record => preserveConflict(userId, record),
  bank: { exportBundle(): Promise<QuestionBundle>; restoreBundle(bundle: QuestionBundle, options?: UnderLocalLock): Promise<void> } = new IndexedDbQuestionRepository(),
  assets?: { upload(state: WorkbenchState): Promise<NonNullable<WorkbenchState['cloudAssets']>>; prepareRestore?(state: WorkbenchState): Promise<RestoreAssetCommit>; restore(state: WorkbenchState, assertActive?: () => void, beforeWrite?: (additions: RestoreAssetAdditions) => Promise<void>): Promise<void> },
  assertActive: () => void = () => {}) {
  const portable = async (state: WorkbenchState, questionBank: QuestionBundle) => ({ ...state, questionBank, ...(assets ? { cloudAssets: await assets.upload(state) } : {}) })
  const read = () => {
    const raw = localStorage.getItem(LOCAL_STATE_KEY)
    return raw && !isResetMarker(JSON.parse(raw)) ? storage.import(raw) : null
  }
  const captureLocal = (missingMessage: string) => withLocalWriteLock(async () => {
    assertNoPendingRestore()
    assertActive()
    const revision = readLocalRevision(), state = read()
    if (!state) throw new Error(missingMessage)
    return { revision, state, questionBank: await bank.exportBundle(), bankVersion: readBankVersion() }
  })
  return {
    async keepLocal(remote: RemoteSnapshot | null) {
      const { revision, state, questionBank, bankVersion } = await captureLocal('No local learning data')
      const local = await createSnapshot(await portable(state, questionBank))
      assertActive()
      const meta = loadSyncMeta(userId, revision)
      const position = { baseRevision: remote?.revision ?? 0, localRevision: revision, deviceId: meta.deviceId }
      await recover({ local, remote, position, createdAt: new Date().toISOString() })
      const result = await pushSnapshot(transport, local, position, async record => { await recover(record) })
      if (result.status === 'synced') acknowledgeSync(userId, revision, result.revision, bankVersion)
      return result
    },
    async sync() {
      const { revision, state, questionBank, bankVersion } = await captureLocal('No local learning data; restore cloud backup first')
      const snapshot = await createSnapshot(await portable(state, questionBank))
      assertActive()
      const meta = loadSyncMeta(userId, revision)
      const remote = await transport.read()
      if (remote?.revision === meta.lastSyncedRevision && remote.checksum === snapshot.checksum) {
        await restoreSnapshot(remote)
        acknowledgeSync(userId, revision, remote.revision, bankVersion)
        return { status: 'synced' as const, revision: remote.revision }
      }
      const result = await pushSnapshot(transport, snapshot, { baseRevision: meta.lastSyncedRevision, localRevision: revision, deviceId: meta.deviceId }, async record => { await recover(record) })
      if (result.status === 'synced') acknowledgeSync(userId, revision, result.revision, bankVersion)
      return result
    },
    async previewRestore(): Promise<RestorePreview | null> {
      const remote = await transport.read()
      if (!remote) return null
      assertActive()
      const state = await restoreSnapshot(remote)
      return withLocalWriteLock(async () => {
        assertNoPendingRestore()
        assertActive()
        const localRaw = localStorage.getItem(LOCAL_STATE_KEY), localRevision = readLocalRevision()
        const localBank = await bank.exportBundle()
        return { userId, remote, state, localRevision, localRaw, localBank }
      })
    },
    async restore(preview: RestorePreview) {
      assertActive()
      if (preview.userId !== userId) throw new Error('Restore account mismatch')
      // Revalidate the snapshot at use time, never trust a mutable UI preview.
      const state = await restoreSnapshot(preview.remote)
      // Network staging must not hold the lock needed by offline study writes.
      const commitAssets = assets?.prepareRestore ? await assets.prepareRestore(state) : undefined
      assertActive()
      return withLocalWriteLock(async () => {
        assertNoPendingRestore()
        assertActive()
        if (localStorage.getItem(LOCAL_STATE_KEY) !== preview.localRaw || readLocalRevision() !== preview.localRevision) throw new Error('Local data changed since restore preview')
        const existing = read()
        const previousBank = await bank.exportBundle()
        if (canonicalSerialize(previousBank) !== canonicalSerialize(preview.localBank)) throw new Error('Question bank changed since restore preview')
        const meta = loadSyncMeta(userId, preview.localRevision)
        if (existing) await recover({ local: await createSnapshot({ ...existing, questionBank: previousBank }), remote: preview.remote, position: { baseRevision: meta.lastSyncedRevision, localRevision: preview.localRevision, deviceId: meta.deviceId }, createdAt: new Date().toISOString() })
        assertActive()
        if (localStorage.getItem(LOCAL_STATE_KEY) !== preview.localRaw || readLocalRevision() !== preview.localRevision) throw new Error('Local data changed during recovery')
        const metadataKey = 'workbench:cloud-meta:' + userId
        await beginRestore({ previousRaw: preview.localRaw, previousBank, metadataKey, previousMetadata: localStorage.getItem(metadataKey) }, { underLock: true })
        try {
          assertActive()
          const journalAssets = (additions: RestoreAssetAdditions) => updateRestoreAssets(additions, { underLock: true })
          if (commitAssets) await commitAssets(assertActive, journalAssets)
          else if (assets) await assets.restore(state, assertActive, journalAssets)
          assertActive()
          if (state.questionBank) await bank.restoreBundle(state.questionBank, { underLock: true })
          assertActive()
          const revision = saveWithRevision(state, preview.localRevision)
          acknowledgeSync(userId, revision, preview.remote.revision)
          await completeRestore({ underLock: true })
        }
        catch (error) {
          await recoverInterruptedRestore(bank, { underLock: true })
          throw error
        }
        return state
      })
    },
  }
}
