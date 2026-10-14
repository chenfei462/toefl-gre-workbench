import { expect, it, vi } from 'vitest'
import { createOperationClient } from './client'
import { createSnapshotTransport } from './transport'

it('pins both authorization verification and snapshot writes to the captured account token', async () => {
  const calls: { url: string; authorization: string | null }[] = []
  const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    calls.push({ url, authorization: new Headers(init?.headers).get('Authorization') })
    return new Response(JSON.stringify(url.includes('/auth/v1/user') ? { id: 'a' } : [{ user_id: 'a', schema_version: 2, revision: 1, checksum: 'a'.repeat(64), state: {} }]), { status: 200, headers: { 'Content-Type': 'application/json' } })
  })
  const client = createOperationClient('token-a', { VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example' }, fetcher)!
  // Reproduce a concurrently switched shared session. Explicit headers must win.
  vi.spyOn(client.auth, 'getSession').mockResolvedValue({ data: { session: { access_token: 'token-b' } as never }, error: null })
  await createSnapshotTransport(client, 'a', 'token-a').compareAndSwap({ schemaVersion: 2, checksum: 'a'.repeat(64), state: {} }, 0, 1, 'device')
  expect(calls.map(row => row.authorization)).toEqual(['Bearer token-a', 'Bearer token-a'])
  expect(calls[1].url).toContain('push_workbench_snapshot')
})
