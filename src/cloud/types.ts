import type { Snapshot } from './snapshot'
export interface RemoteSnapshot extends Snapshot { revision: number }
export interface SyncPosition { baseRevision: number; localRevision: number; deviceId: string }
export interface ConflictRecovery { local: Snapshot; remote: RemoteSnapshot | null; position: SyncPosition; createdAt: string }
export interface SnapshotTransport {
  read(): Promise<RemoteSnapshot | null>
  compareAndSwap(snapshot: Snapshot, expected: number, next: number, deviceId: string): Promise<RemoteSnapshot>
}
export interface CloudSyncMeta {
  deviceId: string
  localRevision: number
  lastSyncedRevision: number
  lastCloudRevision?: number
  lastSyncAt?: string
  syncStatus: 'local_only' | 'synced' | 'pending' | 'conflict' | 'error'
}
