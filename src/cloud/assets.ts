import { z } from 'zod'
import type { WorkbenchState } from '../types'
import { RecordingStore } from '../study/recordings'
import { MaterialStore } from '../study/materials'
import type { createBinaryStorage } from './storage'
import { assertNoPendingRestore, withLocalWriteLock } from './localLock'

const reference = z.object({ bucket: z.enum(['speaking-recordings', 'study-materials']), cloudPath: z.string(), checksum: z.string().regex(/^[a-f0-9]{64}$/), mimeType: z.string(), size: z.number().int().positive().max(100 * 1024 * 1024) })
export const assetManifestSchema = z.object({
  recordings: z.array(z.object({ id: z.string(), reference })),
  materials: z.array(z.object({ id: z.string(), name: z.string(), kind: z.enum(['text', 'audio', 'pdf', 'docx']), rights: z.enum(['user_owned', 'public', 'licensed']), importedAt: z.string(), reference })),
}).superRefine((manifest, ctx) => {
  for (const kind of ['recordings', 'materials'] as const) {
    const seen = new Set<string>()
    manifest[kind].forEach((row, index) => {
      if (seen.has(row.id)) ctx.addIssue({ code: 'custom', path: [kind, index, 'id'], message: 'Duplicate binary ID' })
      seen.add(row.id)
    })
  }
})
export type AssetManifest = z.infer<typeof assetManifestSchema>
export interface RestoreAssetAdditions { token: string; recordings: string[]; materials: string[] }
export type RestoreAssetCommit = (assertActive?: () => void, beforeWrite?: (additions: RestoreAssetAdditions) => Promise<void>) => Promise<void>
type BinaryStorage = ReturnType<typeof createBinaryStorage>

/** Explicit sync uploads only referenced assets; local bytes are never removed. */
export function createAssetSync(binary: BinaryStorage, recordings = new RecordingStore(), materials = new MaterialStore()) {
  return {
    async upload(state: WorkbenchState): Promise<AssetManifest> {
      const manifest: AssetManifest = { recordings: [], materials: [] }
      for (const session of state.speakingSessions ?? []) {
        const record = await recordings.get(session.recordingId)
        if (!record) {
          const existing = state.cloudAssets?.recordings.find(row => row.id === session.recordingId)
          if (!existing) throw new Error('Recording unavailable locally; restore its audio before syncing')
          manifest.recordings.push(existing)
          continue
        }
        manifest.recordings.push({ id: record.id, reference: await binary.upload('speaking-recordings', record.id, record.blob) })
      }
      const rows = await materials.list()
      for (const resource of state.resources) {
        const material = rows.find(row => row.id === resource.id)
        if (material) {
          const { id, name, kind, rights, importedAt } = material
          manifest.materials.push({ id, name, kind, rights, importedAt, reference: await binary.upload('study-materials', id, material.blob) })
        } else {
          const existing = state.cloudAssets?.materials.find(row => row.id === resource.id)
          if (existing) manifest.materials.push(existing)
        }
      }
      return assetManifestSchema.parse(manifest)
    },
    async prepareRestore(state: WorkbenchState): Promise<RestoreAssetCommit> {
      const manifest = state.cloudAssets
      if (!manifest) return async () => {}
      // Download and verify every file before adding any local records.
      const audio = await Promise.all(manifest.recordings.map(async row => {
        const session = state.speakingSessions?.find(item => item.recordingId === row.id)
        if (!session || row.reference.bucket !== 'speaking-recordings') throw new Error('Invalid recording reference')
        return { id: row.id, session, blob: await binary.download(row.reference) }
      }))
      const files = await Promise.all(manifest.materials.map(async row => {
        if (row.reference.bucket !== 'study-materials') throw new Error('Invalid material reference')
        const blob = await binary.download(row.reference)
        return { id: row.id, name: row.name, kind: row.kind, rights: row.rights, importedAt: row.importedAt, size: blob.size, blob, text: row.kind === 'text' ? await blob.text() : undefined }
      }))
      // Network I/O completes before the shared local write lock is acquired.
      // The commit re-reads every collision while ordinary local writers wait.
      return async (assertActive = () => {}, beforeWrite) => {
      const existingFiles = await materials.list()
      assertActive()
      const sameBytes = async (a: Blob, b: Blob) => {
        if (a.size !== b.size) return false
        const left = new Uint8Array(await a.arrayBuffer()), right = new Uint8Array(await b.arrayBuffer())
        return left.every((value, index) => value === right[index])
      }
      // Check every collision before writing anything; never report a successful
      // restore while playback still points at different local bytes.
      for (const record of audio) {
        const existing = await recordings.get(record.id)
        if (existing && !await sameBytes(existing.blob, record.blob)) throw new Error('Binary conflict: local recording differs; export local audio before restoring in a fresh browser')
      }
      for (const file of files) {
        const existing = existingFiles.find(row => row.id === file.id)
        if (existing && !await sameBytes(existing.blob, file.blob)) throw new Error('Binary conflict: local material differs; export local file before restoring in a fresh browser')
      }
      const newAudio = [] as typeof audio
      for (const record of audio) if (!await recordings.get(record.id)) newAudio.push(record)
      const newFiles = files.filter(file => !existingFiles.some(existing => existing.id === file.id))
      const token = crypto.randomUUID()
      assertActive()
      await beforeWrite?.({ token, recordings: newAudio.map(row => row.id), materials: newFiles.map(row => row.id) })
      for (const record of newAudio) { assertActive(); await recordings.add({ ...record, _restoreToken: token }, { underLock: true }) }
      for (const file of newFiles) { assertActive(); await materials.add({ ...file, _restoreToken: token }, { underLock: true }) }
      }
    },
    async restore(state: WorkbenchState, assertActive: () => void = () => {}, beforeWrite?: (additions: RestoreAssetAdditions) => Promise<void>): Promise<void> {
      const commit = await this.prepareRestore(state)
      await withLocalWriteLock(() => { assertNoPendingRestore(); return commit(assertActive, beforeWrite) })
    },
  }
}
