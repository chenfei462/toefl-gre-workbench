import { expect, it } from 'vitest'
import { parseCloudQuestionBundle } from '../questionDatabase/bundle'
it('rejects invalid references instead of silently dropping them', () => {
  expect(() => parseCloudQuestionBundle({ questions: [], sources: [{}], passages: [], explanations: [], media: [], revisions: [] })).toThrow()
})
it('accepts an empty complete bundle and rejects missing stores', () => {
  const bundle = { questions: [], sources: [], passages: [], explanations: [], media: [], revisions: [] }
  expect(parseCloudQuestionBundle(bundle)).toEqual(bundle)
  expect(() => parseCloudQuestionBundle({ questions: [] })).toThrow()
})
it('rejects duplicate IDs that would collapse during IndexedDB replacement', () => {
  const row = { id: 's', name: 'Source', publisher: 'User', sourceType: 'user_owned', sourceTier: 'D', rightsStatus: 'user_owned', examVersions: ['GRE_CURRENT'], verified: true }
  expect(() => parseCloudQuestionBundle({ questions: [], sources: [row, row], passages: [], explanations: [], media: [], revisions: [] })).toThrow()
})
