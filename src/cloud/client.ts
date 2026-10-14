import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type Environment = Record<string, string | undefined>
export type CloudConfiguration = { available: true; url: string; key: string } | { available: false; reason: string }

/** Configuration checks prevent accidental privileged-key use; authorization remains server-side. */
export function readCloudConfiguration(env: Environment): CloudConfiguration {
  const url = env.VITE_SUPABASE_URL?.trim()
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  const unavailable = { available: false as const, reason: 'Cloud Sync unavailable. Local mode remains usable.' }
  if (!url || !key) return unavailable
  try {
    const endpoint = new URL(url)
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname)
    if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash || (endpoint.protocol !== 'https:' && !(local && endpoint.protocol === 'http:'))) return unavailable
    let publicKey = key.startsWith('sb_publishable_')
    if (!publicKey && key.split('.').length === 3) {
      const payload = key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
      publicKey = JSON.parse(atob(payload)).role === 'anon'
    }
    return publicKey ? { available: true, url, key } : unavailable
  } catch {
    return unavailable
  }
}

let client: SupabaseClient | undefined
/** Cloud operations capture one token so an account change cannot redirect a
 * pending snapshot or file request into the next account's namespace. */
export function createOperationClient(accessToken: string, env: Environment = import.meta.env, fetcher?: typeof fetch): SupabaseClient | null {
  const configuration = readCloudConfiguration(env)
  if (!configuration.available || !accessToken || /[\r\n]/.test(accessToken)) return null
  return createClient(configuration.url, configuration.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'workbench-operation-' + crypto.randomUUID() },
    global: { headers: { Authorization: 'Bearer ' + accessToken }, ...(fetcher ? { fetch: fetcher } : {}) },
  })
}
export function getCloudClient(): SupabaseClient | null {
  if (client) return client
  const configuration = readCloudConfiguration(import.meta.env)
  if (!configuration.available) return null
  client = createClient(configuration.url, configuration.key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
  return client
}
