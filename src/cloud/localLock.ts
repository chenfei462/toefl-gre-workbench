export const LOCAL_WRITE_LOCK = 'workbench-local-write'
export const PENDING_RESTORE_KEY = 'workbench:restore-pending'
export const BANK_VERSION_KEY = 'workbench:bank-version'

export function readBankVersion(): string { return localStorage.getItem(BANK_VERSION_KEY) ?? '' }

/** Write ahead while holding LOCAL_WRITE_LOCK, before any normal bank mutation. */
export function stampBankMutation(): void { localStorage.setItem(BANK_VERSION_KEY, crypto.randomUUID()) }

export function hasPendingRestore(): boolean {
  return typeof localStorage !== 'undefined' && localStorage.getItem(PENDING_RESTORE_KEY) !== null
}

export function assertNoPendingRestore(): void {
  if (hasPendingRestore()) throw new Error('An interrupted restore requires recovery; refresh before saving current edits')
}

export function withLocalWriteLock<T>(action: () => T | Promise<T>): Promise<T> {
  if (!navigator.locks) return Promise.reject(new Error('Safe local storage locking unavailable; export current edits'))
  return navigator.locks.request(LOCAL_WRITE_LOCK, action)
}

/** Only restore/recovery code already holding LOCAL_WRITE_LOCK may bypass acquisition. */
export interface UnderLocalLock { underLock?: boolean }
