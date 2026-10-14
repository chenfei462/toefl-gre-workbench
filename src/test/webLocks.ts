// Serializes test writes exactly like an exclusive browser Web Lock.
// Production intentionally fails closed when that capability is unavailable.
const queues = new Map<string, Promise<unknown>>()
if (typeof localStorage === 'undefined') {
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(String(key), String(value)) },
    removeItem: (key: string) => { values.delete(key) },
    clear: () => { values.clear() },
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() { return values.size },
  } })
}
if (typeof navigator === 'undefined') Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} })
Object.defineProperty(navigator, 'locks', { configurable: true, value: {
  request<T>(name: string, callback: () => T | Promise<T>): Promise<T> {
    const next = (queues.get(name) ?? Promise.resolve()).catch(() => {}).then(callback)
    queues.set(name, next.catch(() => {}))
    return next
  },
} })
