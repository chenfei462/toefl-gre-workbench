import type { UserQuestionState } from '../types'

export interface UserQuestionStateUpdate {
  questionId: string
  date: string
  correct?: boolean
  personalDifficulty?: 1 | 2 | 3 | 4 | 5
  bookmarked?: boolean
}

export interface UserQuestionPreferencesUpdate {
  questionId: string
  personalDifficulty?: 1 | 2 | 3 | 4 | 5
  bookmarked?: boolean
}

export function updateUserQuestionState(states: UserQuestionState[], input: UserQuestionStateUpdate): UserQuestionState[] {
  const existing = states.find(state => state.questionId === input.questionId)
  const next: UserQuestionState = {
    questionId: input.questionId,
    timesSeen: (existing?.timesSeen ?? 0) + 1,
    lastResult: input.correct === undefined ? 'ungraded' : input.correct ? 'correct' : 'incorrect',
    lastAttemptDate: input.date,
    personalDifficulty: input.personalDifficulty ?? existing?.personalDifficulty,
    bookmarked: input.bookmarked ?? existing?.bookmarked ?? false,
  }
  return [next, ...states.filter(state => state.questionId !== input.questionId)]
}

export function updateUserQuestionPreferences(states: UserQuestionState[], input: UserQuestionPreferencesUpdate): UserQuestionState[] {
  const existing = states.find(state => state.questionId === input.questionId)
  const next: UserQuestionState = {
    questionId: input.questionId,
    timesSeen: existing?.timesSeen ?? 0,
    lastResult: existing?.lastResult ?? 'ungraded',
    lastAttemptDate: existing?.lastAttemptDate,
    personalDifficulty: input.personalDifficulty ?? existing?.personalDifficulty,
    bookmarked: input.bookmarked ?? existing?.bookmarked ?? false,
  }
  return [next, ...states.filter(state => state.questionId !== input.questionId)]
}
