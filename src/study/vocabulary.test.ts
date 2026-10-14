import { format } from 'date-fns'
import { describe, expect, it } from 'vitest'
import { migrateState, storage } from '../storage'
import { createVocabularyCard, reviewVocabulary, upgradeVocabulary } from './vocabulary'

describe('FSRS vocabulary', () => {
  it('rejects corrupt imported vocabulary scheduler state', () => {
    const state = migrateState({})
    state.vocabulary = [createVocabularyCard('word', 'meaning')]
    state.vocabulary[0].fsrs!.stability = -1
    expect(() => storage.import(JSON.stringify(state))).toThrow()
  })
  it('schedules 100 words with distinct Again/Hard/Good/Easy due times', () => {
    const now = new Date('2026-10-14T09:00:00Z')
    let state = migrateState({})
    state.vocabulary = Array.from({ length: 100 }, (_, i) => createVocabularyCard(`word${i}`, 'meaning', now))
    const ids = state.vocabulary.map(v => v.id)
    ids.forEach((id, i) => { state = reviewVocabulary(state, id, i < 20 ? 1 : i < 40 ? 2 : i < 90 ? 3 : 4, now) })
    expect(new Set(state.vocabulary.map(v => v.fsrs?.due)).size).toBe(4)
    expect(state.vocabulary.every(v => new Date(v.fsrs!.due) > now)).toBe(true)
    expect(state.attempts).toHaveLength(100)
    expect(state.vocabularyReviews).toHaveLength(100)
    expect(state.attempts.filter(a => !a.correct)).toHaveLength(20)
    expect(storage.import(storage.export(state)).vocabulary).toEqual(state.vocabulary)
  })
  it('preserves old word history and due date without inventing past FSRS reviews', () => {
    const old = { id: 'old', word: 'mitigate', meaning: 'reduce', status: 'mature' as const, intervalDays: 14, nextReviewDate: '2026-10-20', correctStreak: 4, incorrectCount: 2 }
    const card = upgradeVocabulary(old)
    expect(card).toMatchObject(old)
    expect(format(new Date(card.fsrs!.due), 'yyyy-MM-dd')).toBe(old.nextReviewDate)
    expect(card.fsrs?.reps).toBe(0)
  })
})
