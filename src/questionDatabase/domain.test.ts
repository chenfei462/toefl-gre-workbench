import { describe, expect, it } from 'vitest'
import { calculateContentHash, getQuestionEvidenceWeight, isEligibleForCurrentMock, previewQuestionImport } from './domain'
import { MemoryQuestionRepository } from './repository'
import { generatePracticeSet } from '../algorithms/practiceSet'
import type { Question, QuestionSource } from '../types'

const source: QuestionSource = { id: 'ets', name: 'ETS', publisher: 'ETS', url: 'https://www.ets.org/', sourceType: 'official', sourceTier: 'A', examVersions: ['TOEFL_2026'], rightsStatus: 'public', verified: true }
const base: Question = { id: 'q1', sourceId: 'ets', sourceQuestionId: '1', exam: 'toefl', examVersion: 'TOEFL_2026', section: 'reading', questionType: 'read_academic_passage', skillIds: [], prompt: 'A prompt', promptHash: 'x', options: [{ id: 'a', text: 'A' }], answer: { optionId: 'a', verification: 'official' }, storageMode: 'full', verification: 'verified', compatibility: { examVersion: 'TOEFL_2026', status: 'current' }, explanationIds: [], mediaIds: [], tags: [], active: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' }

describe('question database domain', () => {
  it('detects duplicate source ids and content hashes', () => {
    const preview = previewQuestionImport([{ ...base, id: undefined }], [source], [base])
    expect(preview.duplicates).toHaveLength(1)
    expect(calculateContentHash(base)).toBeTruthy()
  })
  it('excludes legacy and disputed questions from current mocks', () => {
    expect(isEligibleForCurrentMock(base)).toBe(true)
    expect(isEligibleForCurrentMock({ ...base, compatibility: { ...base.compatibility, status: 'legacy' } })).toBe(false)
    expect(isEligibleForCurrentMock({ ...base, verification: 'disputed' })).toBe(false)
  })
  it('weights official evidence above community recall', () => {
    expect(getQuestionEvidenceWeight(source, base)).toBe(1)
    expect(getQuestionEvidenceWeight({ ...source, sourceType: 'community', sourceTier: 'D', verified: false }, { ...base, answer: { ...base.answer!, verification: 'unverified' } })).toBe(0.3)
  })
  it('does not silently add duplicate imports', async () => {
    const repo = new MemoryQuestionRepository([base], [source])
    const result = await repo.importQuestions([{ ...base, id: undefined }])
    expect(result.added).toHaveLength(0)
    expect(result.duplicates).toBe(1)
  })
  it('generates only current eligible questions for a timed set', () => {
    const questions: Question[] = [base, { ...base, id: 'legacy', compatibility: { ...base.compatibility, status: 'legacy' as const } }, { ...base, id: 'weak', skillIds: ['weak'] }]
    const result = generatePracticeSet(questions, { availableMinutes: 10, exam: 'toefl', weakSkillIds: ['weak'] })
    expect(result.map((question) => question.id)).toEqual(['weak', 'q1'])
  })
  it('reports malformed rows individually without crashing', () => {
    const preview = previewQuestionImport([null, {}, { ...base, compatibility: undefined }, base], [source])
    expect(preview.invalid).toHaveLength(3)
    expect(preview.valid).toHaveLength(1)
  })
  it('keeps distinct reference locators without treating empty prompts as duplicates', async () => {
    const repo = new MemoryQuestionRepository([], [source])
    const result = await repo.importQuestions([1, 2].map((n) => ({ ...base, id: `ref-${n}`, prompt: undefined, storageMode: 'reference_only', sourceQuestionId: String(n) })))
    expect(result.added).toHaveLength(2)
  })
  it('recomputes supplied hashes and rejects duplicate ids', async () => {
    const repo = new MemoryQuestionRepository([base], [source])
    const result = await repo.importQuestions([{ ...base, sourceQuestionId: 'other', prompt: 'different', promptHash: 'forged' }])
    expect(result.added).toHaveLength(0)
  })
  it('never admits a legacy TOEFL version labeled current to current practice', () => {
    expect(isEligibleForCurrentMock({ ...base, examVersion: 'TOEFL_2023' })).toBe(false)
  })
  it('does not underfill a practice set when only one category is available', () => {
    const questions = Array.from({ length: 5 }, (_, i) => ({ ...base, id: `pool-${i}` }))
    expect(generatePracticeSet(questions, { availableMinutes: 10, exam: 'toefl', weakSkillIds: [] })).toHaveLength(5)
    expect(generatePracticeSet(questions, { availableMinutes: 0, exam: 'toefl', weakSkillIds: [] })).toHaveLength(0)
  })
  it('normalizes the requested answer and verification aliases', () => {
    const preview = previewQuestionImport([{ ...base, answer: undefined, correctAnswer: { optionIds: ['a'] }, answerVerification: 'official', verificationStatus: 'verified_official' }], [source])
    expect(preview.valid[0].answer?.optionIds).toEqual(['a'])
  })
  it('rejects falsely official answers from user sources', () => {
    const preview = previewQuestionImport([{ ...base, sourceId: 'personal' }], [{ ...source, id: 'personal', publisher: 'User', sourceType: 'user_owned' }])
    expect(preview.valid).toHaveLength(0)
    expect(preview.invalid[0].code).toBe('false_official')
  })
  it('marks conflicting answers in the same import disputed', async () => {
    const repo = new MemoryQuestionRepository([], [source])
    const result = await repo.importQuestions([base, { ...base, id: 'q-other', answer: { text: 'another answer', verification: 'verified' } }])
    expect(result.added).toHaveLength(1)
    expect((await repo.getById('q1'))?.verification).toBe('disputed')
  })
})
