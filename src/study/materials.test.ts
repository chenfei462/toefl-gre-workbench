import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { MaterialStore, importMaterial } from './materials'
describe('durable material imports', () => {
  it.each([['source.pdf', 'pdf'], ['source.docx', 'docx'], ['source.mp3', 'audio']])('retains %s as an original file', async (name, kind) => {
    const imported = await importMaterial(new File(['original bytes'], name), 'licensed')
    expect(imported.kind).toBe(kind)
    expect(imported.blob.size).toBe(14)
    expect(imported.text).toBeUndefined()
  })
  it('refuses unknown rights and unsupported or oversized files', async () => {
    await expect(importMaterial(new File(['text'], 'notes.txt'), 'unknown')).rejects.toThrow('使用权')
    await expect(importMaterial(new File(['x'], 'run.exe'), 'user_owned')).rejects.toThrow('支持')
    await expect(importMaterial({ size: 101 * 1024 * 1024 } as File, 'licensed')).rejects.toThrow('100 MB')
  })
  it('persists original material and text across store instances', async () => {
    const material = await importMaterial(new File(['study notes'], 'notes.txt', { type: 'text/plain' }), 'user_owned')
    const first = new MaterialStore('test-materials')
    await first.put(material)
    const loaded = await new MaterialStore('test-materials').list()
    expect(loaded[0].text).toBe('study notes')
    expect(loaded[0].blob.size).toBe(11)
    expect(loaded[0].rights).toBe('user_owned')
  })
})
