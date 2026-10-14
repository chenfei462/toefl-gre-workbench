import { expect, it, vi } from 'vitest'
import { createBinaryStorage } from './storage'
it('uses immutable user scoped content paths and retains checksum metadata', async () => {
  const upload = vi.fn().mockResolvedValue({ error: null })
  const client = { auth: { getUser: async () => ({ data: { user: { id: 'user-a' } }, error: null }) }, storage: { from: () => ({ upload }) } }
  const result = await createBinaryStorage(client as never, 'user-a').upload('speaking-recordings', 'recording-1', new Blob(['audio'], { type: 'audio/webm' }))
  expect(result.cloudPath).toMatch(new RegExp('^user-a/recording-1/[a-f0-9]{64}$'))
  expect(result.size).toBe(5)
  expect(result.mimeType).toBe('audio/webm')
  expect(upload.mock.calls[0][2].upsert).toBe(false)
})
it('rejects traversal and wrong-account downloads before network access', async () => {
  const from = vi.fn()
  const service = createBinaryStorage({ storage: { from } } as never, 'a')
  await expect(service.download({ bucket: 'study-materials', cloudPath: 'b/file', checksum: 'a'.repeat(64), mimeType: 'text/plain', size: 1 })).rejects.toThrow('path')
  expect(from).not.toHaveBeenCalled()
})
