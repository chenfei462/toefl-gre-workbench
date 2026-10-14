import { z } from 'zod'
import type { CloudSyncMeta } from './types'
import { readBankVersion } from './localLock'
const revision = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
const checkpoint = z.object({ localRevision: revision, cloudRevision: revision, at: z.string(), bankVersion: z.string().optional() })
const key = (userId: string) => 'workbench:cloud-meta:' + userId
export function loadSyncMeta(userId: string, localRevision: number): CloudSyncMeta {
  let deviceId = localStorage.getItem('workbench:device-id')
  if (!deviceId) { deviceId = crypto.randomUUID(); localStorage.setItem('workbench:device-id', deviceId) }
  const raw = localStorage.getItem(key(userId))
  const saved = raw ? checkpoint.parse(JSON.parse(raw)) : null
  return { deviceId, localRevision, lastSyncedRevision: saved?.cloudRevision ?? 0,
    lastCloudRevision: saved?.cloudRevision, lastSyncAt: saved?.at,
    syncStatus: saved && saved.localRevision === localRevision && (saved.bankVersion ?? '') === readBankVersion() ? 'synced' : 'pending' }
}
export function acknowledgeSync(userId: string, localRevision: number, cloudRevision: number, bankVersion = readBankVersion()) {
  const value = checkpoint.parse({ localRevision, cloudRevision, at: new Date().toISOString(), bankVersion })
  const raw = localStorage.getItem(key(userId))
  const previous = raw ? checkpoint.parse(JSON.parse(raw)) : null
  if (previous && previous.cloudRevision > cloudRevision) return
  localStorage.setItem(key(userId), JSON.stringify(value))
}
