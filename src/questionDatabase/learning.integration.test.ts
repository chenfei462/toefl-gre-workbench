import { describe, expect, it } from 'vitest'
import { migrateState } from '../storage'
import { createQuestionFromImport } from './domain'
import { manualSource } from './sources'
import { recordQuestionAttempt } from './learning'
import { planForDate } from './planning'

describe('reference-only learning loop', () => {
  it('carries an incorrect reference attempt into error review, mastery, priority and prescription', () => {
    const state = migrateState({
      schemaVersion: 1,
      profile: {
        examTypes: ['gre'],
        startDate: '2026-10-01',
        targetScores: { gre: '330' },
        currentScores: { gre: '310' },
        dailyMinutes: 60,
        studyDaysPerWeek: 6,
        intensity: 'standard',
      },
      tasks: [],
      resources: [],
      practiceEntries: [],
      weeklyReviews: [],
    })
    const question = createQuestionFromImport({
      sourceId: manualSource.id,
      sourceQuestionId: 'GRE-Q-7',
      sourceSection: 'verbal',
      title: 'Personal reference · GRE-Q-7',
      exam: 'gre',
      examVersion: 'GRE_CURRENT',
      section: 'verbal',
      questionType: 'text_completion',
      skillIds: ['gre-text-completion'],
      storageMode: 'reference_only',
      options: [],
      verification: 'unverified',
      compatibility: { examVersion: 'GRE_CURRENT', status: 'current' },
      tags: [],
      explanationIds: [],
      mediaIds: [],
    })

    const afterAttempt = recordQuestionAttempt(state, question, manualSource, {
      date: '2026-10-12',
      correct: false,
      errorType: 'vocabulary',
      note: 'missed the contrast signal',
      timeSeconds: 90,
    })
    const plan = planForDate(afterAttempt, '2026-10-13')
    const mastery = plan.mastery.find(item => item.skillId === 'gre-text-completion')
    const priority = plan.priorities.find(item => item.skillId === 'gre-text-completion')

    expect(afterAttempt.attempts[0]).toMatchObject({
      questionId: question.id,
      provenance: 'reference',
      correct: false,
    })
    expect(afterAttempt.errorRecords[0]).toMatchObject({
      attemptId: afterAttempt.attempts[0].id,
      status: 'new',
      nextReviewDate: '2026-10-13',
    })
    expect(afterAttempt.userQuestionStates[0]).toMatchObject({
      questionId: question.id,
      timesSeen: 1,
      lastResult: 'incorrect',
    })
    expect(mastery).toMatchObject({ attempts: 1, errorCount: 1, unresolvedErrors: 1 })
    expect(priority?.reasons).toEqual(expect.arrayContaining(['1 unresolved errors', 'review due']))
    expect(plan.plan.blocks).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'error_review', exam: 'gre', section: 'verbal', minutes: expect.any(Number) }),
    ]))
  })

  it('preserves a due TOEFL error review block in a mixed GRE and TOEFL plan', () => {
    const state = migrateState({
      schemaVersion: 1,
      profile: {
        examTypes: ['gre', 'toefl'],
        startDate: '2026-10-01',
        targetScores: { gre: '330', toefl: '5.5' },
        currentScores: { gre: '310', toefl: '4.5' },
        dailyMinutes: 60,
        studyDaysPerWeek: 6,
        intensity: 'standard',
      },
      tasks: [],
      resources: [],
      practiceEntries: [],
      weeklyReviews: [],
    })
    const question = createQuestionFromImport({
      sourceId: manualSource.id,
      sourceQuestionId: 'TOEFL-Q-7',
      sourceSection: 'reading',
      title: 'Personal reference · TOEFL-Q-7',
      exam: 'toefl',
      examVersion: 'TOEFL_2026',
      section: 'reading',
      questionType: 'read_academic_passage',
      skillIds: ['toefl-reading-academic'],
      storageMode: 'reference_only',
      options: [],
      verification: 'unverified',
      compatibility: { examVersion: 'TOEFL_2026', status: 'current' },
      tags: [],
      explanationIds: [],
      mediaIds: [],
    })

    const afterAttempt = recordQuestionAttempt(state, question, manualSource, {
      date: '2026-10-12',
      correct: false,
      errorType: 'misread',
      note: 'missed the passage detail',
      timeSeconds: 90,
    })
    const plan = planForDate(afterAttempt, '2026-10-13')

    expect(plan.plan.blocks).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'error_review', exam: 'toefl', section: 'reading' }),
    ]))
  })
})
