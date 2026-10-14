import type { SupabaseClient } from '@supabase/supabase-js'
export interface BinaryReference {
  bucket: 'speaking-recordings' | 'study-materials'
  cloudPath: string
  checksum: string
  mimeType: string
  size: number
}
async function hash(blob: Blob) {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}
export function createBinaryStorage(client: SupabaseClient, userId: string, accessToken?: string) {
  const authorize = async () => {
    const { data, error } = await client.auth.getUser(accessToken)
    if (error || data.user?.id !== userId) throw new Error('Cloud storage requires re-authentication')
  }
  const validate = (ref: BinaryReference) => {
    const parts = ref.cloudPath.split('/')
    if (!['speaking-recordings', 'study-materials'].includes(ref.bucket) || parts.length !== 3 || parts[0] !== userId || !/^[a-zA-Z0-9_-]+$/.test(parts[1]) || parts[2] !== ref.checksum || !/^[a-f0-9]{64}$/.test(ref.checksum)) throw new Error('Invalid cloud storage path')
  }
  return {
    async upload(bucket: BinaryReference['bucket'], id: string, blob: Blob): Promise<BinaryReference> {
      if (!/^[a-zA-Z0-9_-]+$/.test(id) || !blob.size || blob.size > 100 * 1024 * 1024) throw new Error('Invalid binary file')
      const checksum = await hash(blob)
      const ref = { bucket, cloudPath: userId + '/' + id + '/' + checksum, checksum, mimeType: blob.type || 'application/octet-stream', size: blob.size }
      validate(ref)
      await authorize()
      const { error } = await client.storage.from(bucket).upload(ref.cloudPath, blob, { upsert: false, contentType: ref.mimeType })
      if (error) {
        // A retry may encounter an already uploaded immutable object. Verify bytes.
        if (String(error.statusCode) !== '409') throw error
        const existing = await client.storage.from(bucket).download(ref.cloudPath)
        if (existing.error || !existing.data || await hash(existing.data) !== checksum) throw error
      }
      return ref
    },
    async download(ref: BinaryReference): Promise<Blob> {
      validate(ref)
      await authorize()
      const { data, error } = await client.storage.from(ref.bucket).createSignedUrl(ref.cloudPath, 60)
      if (error) throw error
      const response = await fetch(data.signedUrl)
      if (!response.ok) throw new Error('Cloud file download failed')
      const blob = await response.blob()
      if (blob.size !== ref.size || await hash(blob) !== ref.checksum) throw new Error('Cloud file checksum mismatch')
      return blob.slice(0, blob.size, ref.mimeType)
    },
  }
}
