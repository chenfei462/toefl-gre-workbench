import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { SnapshotTransport } from './types'

const rowSchema = z.object({
  user_id: z.string(), schema_version: z.number().int().positive(),
  revision: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  checksum: z.string().regex(/^[a-f0-9]{64}$/), state: z.unknown(),
})
export function createSnapshotTransport(client: SupabaseClient, userId: string, accessToken?: string): SnapshotTransport {
  const parse = (input: unknown) => {
    const row = rowSchema.parse(input)
    if (row.user_id !== userId) throw new Error('Snapshot account mismatch')
    return { schemaVersion: row.schema_version, revision: row.revision, checksum: row.checksum, state: row.state }
  }
  const authorize = async () => {
    const { data, error } = await client.auth.getUser(accessToken)
    if (error || data.user?.id !== userId) throw new Error('Cloud sync requires re-authentication; local data remains available')
  }
  return {
    async read() {
      await authorize()
      const { data, error } = await client.from('workbench_snapshots').select('*').eq('user_id', userId).maybeSingle()
      if (error) throw error
      return data ? parse(data) : null
    },
    async compareAndSwap(snapshot, expected, next, deviceId) {
      await authorize()
      const { data, error } = await client.rpc('push_workbench_snapshot', {
        expected_revision: expected, next_revision: next, snapshot_schema: snapshot.schemaVersion,
        source_device: deviceId, snapshot_checksum: snapshot.checksum, snapshot_state: snapshot.state,
      })
      if (error) throw error
      if (!Array.isArray(data) || data.length !== 1) throw new Error('Missing snapshot acknowledgement')
      return parse(data[0])
    },
  }
}
