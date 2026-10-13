import { describe, expect, it } from 'vitest'
import { updateUserQuestionState } from './userState'
import type { UserQuestionState } from '../types'

describe('user question state', () => {
  it('creates and updates durable personal state for a question', () => {
    const first = updateUserQuestionState([], { questionId: 'q-1', date: '2026-10-12', correct: false })

    expect(first).toEqual([{ questionId: 'q-1', timesSeen: 1, lastResult: 'incorrect', lastAttemptDate: '2026-10-12', bookmarked: false }])

    const second = updateUserQuestionState(first, { questionId: 'q-1', date: '2026-10-13', correct: true, personalDifficulty: 4, bookmarked: true })
    expect(second).toEqual([{ questionId: 'q-1', timesSeen: 2, lastResult: 'correct', lastAttemptDate: '2026-10-13', personalDifficulty: 4, bookmarked: true }])
  })

  it('preserves personal fields when an attempt update does not provide them', () => {
    const saved: UserQuestionState[] = [{ questionId: 'q-1', timesSeen: 2, lastResult: 'incorrect', lastAttemptDate: '2026-10-12', personalDifficulty: 5, bookmarked: true }]
    const next = updateUserQuestionState(saved, { questionId: 'q-1', date: '2026-10-13', correct: false })

    expect(next[0]).toMatchObject({ timesSeen: 3, personalDifficulty: 5, bookmarked: true, lastResult: 'incorrect' })
  })
})
