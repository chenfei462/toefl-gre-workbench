import { restoreSnapshot, type Snapshot } from './snapshot'
import type { ConflictRecovery, RemoteSnapshot, SnapshotTransport, SyncPosition } from './types'

export async function pushSnapshot(
  transport: SnapshotTransport, local: Snapshot, position: SyncPosition,
  recover: (record: ConflictRecovery) => Promise<void>,
): Promise<{ status: 'synced'; revision: number } | { status: 'conflict'; remote: RemoteSnapshot | null }> {
  await restoreSnapshot(local)
  for (const revision of [position.baseRevision, position.localRevision]) {
    if (!Number.isSafeInteger(revision) || revision < 0) throw new Error('Invalid revision')
  }
  async function conflict(remote: RemoteSnapshot | null) {
    await recover({ local, remote, position: { ...position }, createdAt: new Date().toISOString() })
    return { status: 'conflict' as const, remote }
  }
  const remote = await transport.read()
  if ((remote?.revision ?? 0) !== position.baseRevision) return conflict(remote)
  const next = Math.max(position.localRevision, position.baseRevision + 1)
  if (!Number.isSafeInteger(next)) throw new Error('Revision exhausted')
  try {
    const saved = await transport.compareAndSwap(local, position.baseRevision, next, position.deviceId)
    if (saved.revision !== next || saved.checksum !== local.checksum) throw new Error('Unexpected server snapshot acknowledgement')
    return { status: 'synced', revision: saved.revision }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && (error.code === 'PT409' || error.code === '40001')) {
      return conflict(await transport.read())
    }
    throw error
  }
}
