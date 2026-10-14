import 'fake-indexeddb/auto'
import { expect, it } from 'vitest'
import { IndexedDbQuestionRepository } from '../questionDatabase/indexedDbRepository'
it('restores the complete bank atomically and rejects invalid input before replacement', async () => {
  const repository = new IndexedDbQuestionRepository()
  const original = await repository.exportBundle()
  original.sources.sort((a, b) => a.id.localeCompare(b.id, 'en'))
  await repository.restoreBundle(original)
  expect(await repository.exportBundle()).toEqual(original)
  await expect(repository.restoreBundle({ ...original, sources: [{}] } as never)).rejects.toThrow()
  expect(await repository.exportBundle()).toEqual(original)
})
