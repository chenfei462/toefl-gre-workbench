import { describe, expect, it } from 'vitest'
import { migrateState, storage } from '../storage'
import { addErrorVocabulary, analyzeTraps, updateErrorAnalysis } from './traps'

function fixture() {
  const state = migrateState({})
  state.attempts = [{ id: 'a', date: '2026-10-14', exam: 'gre', section: 'verbal', skillIds: ['gre-text-completion'], source: 'Personal Q31', sourceType: 'self_created', reviewed: false, correct: false }]
  state.errorRecords = [{ id: 'e', attemptId: 'a', exam: 'gre', section: 'verbal', skillIds: ['gre-text-completion'], errorType: 'vocabulary', createdAt: '2026-10-14', status: 'reopened', reviewCount: 2, nextReviewDate: '2026-10-15' }]
  state.reviewAttempts = [{ id: 'r', errorRecordId: 'e', date: '2026-10-14', correct: false }]
  return state
}

describe('Error Lab analysis', () => {
  it('preserves same-exam enrichment and sibling skills when editing one error', () => {
    const original = fixture()
    original.skills.push({ id: 'gre-cross-section', exam: 'gre', section: 'reading', name: 'Enriched reading skill', priorityWeight: 1 })
    original.errorRecords[0].skillIds.push('gre-cross-section')
    original.errorRecords.push({ ...original.errorRecords[0], id: 'sibling', skillIds: ['gre-vocabulary'] })
    const next = updateErrorAnalysis(original, 'e', { skillIds: ['gre-logic', 'gre-cross-section'], errorType: 'logic', myReason: '', correctReason: '', betterStrategy: '' })
    expect(next.errorRecords[0].skillIds).toEqual(['gre-logic', 'gre-cross-section'])
    expect(next.errorRecords[1].skillIds).toEqual(['gre-vocabulary'])
    expect(next.attempts[0].skillIds).toEqual(['gre-logic', 'gre-cross-section', 'gre-vocabulary'])
    expect(() => updateErrorAnalysis(original, 'e', { skillIds: ['toefl-vocabulary'], errorType: 'logic', myReason: '', correctReason: '', betterStrategy: '' })).toThrow()
  })
  it('round trips analysis while retaining retry identity and aligned skill evidence', () => {
    const original = fixture()
    const skillId = original.skills.find(s => s.exam === 'gre' && s.section === 'verbal')!.id
    const next = updateErrorAnalysis(original, 'e', { skillIds: [skillId], errorType: 'logic', trapType: 'contrast_missed', myReason: 'Missed however', correctReason: 'Contrast reverses the direction', betterStrategy: 'Mark contrast before choosing' })
    const restored = storage.import(storage.export(next))
    expect(restored.errorRecords[0]).toMatchObject({ id: 'e', attemptId: 'a', status: 'reopened', reviewCount: 2, nextReviewDate: '2026-10-15', trapType: 'contrast_missed', myReason: 'Missed however', correctReason: 'Contrast reverses the direction', betterStrategy: 'Mark contrast before choosing', skillIds: [skillId] })
    expect(restored.attempts[0]).toMatchObject({ id: 'a', correct: false, skillIds: [skillId], errorType: 'logic' })
    expect(restored.reviewAttempts).toEqual(original.reviewAttempts)
    expect(original.errorRecords[0].errorType).toBe('vocabulary')
  })
  it('counts each categorized error once with unresolved totals, excluding unclassified history', () => {
    const base = fixture().errorRecords[0]
    expect(analyzeTraps([{ ...base, trapType: 'too_broad' }, { ...base, id: 'e2', trapType: 'too_broad', status: 'resolved' }, { ...base, id: 'e3', trapType: 'not_mentioned' }, { ...base, id: 'legacy' }])).toEqual([{ trapType: 'too_broad', count: 2, unresolved: 1 }, { trapType: 'not_mentioned', count: 1, unresolved: 1 }])
  })
  it('adds an unknown word to FSRS with source linkage and prevents accidental duplicate cards', () => {
    const original = fixture()
    const next = addErrorVocabulary(original, 'e', ' mitigate ', 'reduce', new Date('2026-10-14T09:00:00Z'))
    const card = next.vocabulary.find(v => v.word === 'mitigate')!
    expect(card).toMatchObject({ meaning: 'reduce', deck: 'GRE', fsrs: { state: 0, reps: 0 } })
    expect(card.source).toContain('e')
    expect(card.source).toContain('Personal Q31')
    expect(addErrorVocabulary(next, 'e', 'MITIGATE', 'reduce').vocabulary).toHaveLength(next.vocabulary.length)
    expect(next.errorRecords).toEqual(original.errorRecords)
  })
})
