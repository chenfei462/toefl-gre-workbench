import { assertNoPendingRestore, withLocalWriteLock } from './localLock'

export const LOCAL_STATE_KEY = 'toefl-gre-workbench:v2'
function canonicalJson(value: unknown): string {
  const sort = (entry: unknown): unknown => {
    if (Array.isArray(entry)) return entry.map(sort)
    if (entry !== null && typeof entry === 'object') return Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, child]) => [key, sort(child)]))
    return entry
  }
  return JSON.stringify(sort(JSON.parse(JSON.stringify(value))))
}
function persistedState(): Record<string, unknown> | null {
  const raw = localStorage.getItem(LOCAL_STATE_KEY)
  if (!raw) return null
  try {
    const value = JSON.parse(raw)
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null
  } catch { return null }
}
export function readLocalRevision(): number {
  const revision = persistedState()?._localRevision
  return typeof revision === 'number' && Number.isSafeInteger(revision) && revision >= 0 ? revision : 0
}

export function isResetMarker(value: unknown): boolean {
  return !!value && typeof value === 'object' && '_reset' in value && value._reset === true
}

export function clearWithRevision(expectedRevision?: number): number {
  assertNoPendingRestore()
  if (expectedRevision !== undefined && readLocalRevision() !== expectedRevision) {
    throw new Error('Data changed in another tab; export current edits before reloading')
  }
  const revision = readLocalRevision() + 1
  if (!Number.isSafeInteger(revision)) throw new Error('Local revision exhausted; export a backup')
  // Keep the monotonic revision in the same atomic record as the reset. A stale
  // tab must never regain write access after a new plan starts.
  localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify({ _reset: true, _localRevision: revision }))
  return revision
}

export function saveWithRevision(state: object, expectedRevision?: number) {
  if (expectedRevision !== undefined && readLocalRevision() !== expectedRevision) {
    throw new Error('Data changed in another tab; export current edits before reloading')
  }
  const raw = localStorage.getItem(LOCAL_STATE_KEY)
  const previous = persistedState()
  if (raw && !previous) {
    // Preserve malformed source before allowing the existing recovery workflow to save.
    localStorage.setItem('toefl-gre-workbench:revision-recovery:' + crypto.randomUUID(), raw)
  }
  const { _localRevision: ignored, ...business } = previous ?? {}
  void ignored
  if (previous && canonicalJson(business) === canonicalJson(state)) return readLocalRevision()
  const revision = readLocalRevision() + 1
  if (!Number.isSafeInteger(revision)) throw new Error('Local revision exhausted; export a backup')
  // One atomic localStorage replacement contains both data and revision.
  localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify({ ...state, _localRevision: revision }))
  return revision
}

export async function saveEditorState(state: object, expectedRevision: number): Promise<number> {
  return withLocalWriteLock(() => {
    assertNoPendingRestore()
    return saveWithRevision(state, expectedRevision)
  })
}
