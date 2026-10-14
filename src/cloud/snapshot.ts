import { z } from 'zod'
import { migrateState, parseWorkbenchState } from '../storage'
import type { WorkbenchState } from '../types'
import { cloudBusinessSchema } from './stateValidation'

export interface Snapshot { schemaVersion: number; state: unknown; checksum: string }

/** JSON semantics match manual backup; sorting affects objects, never array order. */
export function canonicalSerialize(value: unknown): string {
  const json = JSON.parse(JSON.stringify(value))
  const sort = (entry: unknown): unknown => {
    if (Array.isArray(entry)) return entry.map(sort)
    if (entry !== null && typeof entry === 'object') {
      return Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, child]) => [key, sort(child)]))
    }
    return entry
  }
  return JSON.stringify(sort(json))
}

export async function checksum(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalSerialize(value)))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function createSnapshot(state: WorkbenchState): Promise<Snapshot & { state: WorkbenchState }> {
  const validated = parseWorkbenchState(state)
  cloudBusinessSchema.parse(validated)
  return { schemaVersion: validated.schemaVersion, state: validated, checksum: await checksum(validated) }
}

export async function restoreSnapshot(snapshot: Snapshot): Promise<WorkbenchState> {
  if (await checksum(snapshot.state) !== snapshot.checksum) throw new Error('Snapshot checksum mismatch')
  const versioned = z.object({ schemaVersion: z.union([z.literal(1), z.literal(2)]) }).safeParse(snapshot.state)
  if (!versioned.success || versioned.data.schemaVersion !== snapshot.schemaVersion) throw new Error('Unsupported snapshot schema')
  if (snapshot.schemaVersion === 1) {
    z.object({ profile: z.record(z.string(), z.unknown()), tasks: z.array(z.record(z.string(), z.unknown())), resources: z.array(z.record(z.string(), z.unknown())), practiceEntries: z.array(z.record(z.string(), z.unknown())), weeklyReviews: z.array(z.record(z.string(), z.unknown())) }).parse(snapshot.state)
  }
  const restored = migrateState(snapshot.state)
  cloudBusinessSchema.parse(restored)
  return restored
}
