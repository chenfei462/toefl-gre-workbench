import { describe, expect, it } from 'vitest'
import { calculateSkillPriority, explainPriority } from './priority'
import { calculateMastery } from './mastery'
import type { Attempt, ErrorRecord, Skill } from '../types'

const skills: Skill[] = [
  { id: 'tc', exam: 'gre', section: 'verbal', name: 'Text Completion', priorityWeight: 1 },
  { id: 'rc', exam: 'gre', section: 'verbal', name: 'Reading Comprehension', priorityWeight: 1 },
  { id: 'speaking', exam: 'toefl', section: 'speaking', name: 'Speaking', priorityWeight: 1 },
  { id: 'geometry', exam: 'gre', section: 'quant', name: 'Geometry', priorityWeight: 1 },
  { id: 'algebra', exam: 'gre', section: 'quant', name: 'Algebra', priorityWeight: 1 },
]

const attempt = (id: string, skillId: string, correct: boolean): Attempt => ({
  id,
  date: '2026-10-11',
  exam: skills.find(skill => skill.id === skillId)!.exam,
  section: skills.find(skill => skill.id === skillId)!.section,
  skillIds: [skillId],
  sourceType: 'official',
  correct,
  evidenceWeight: 1,
  reviewed: false,
})

const attemptsAt = (skillId: string, correct: number, total: number) =>
  Array.from({ length: total }, (_, index) => attempt(`${skillId}-${index}`, skillId, index < correct))

const error = (id: string, attemptId: string, skillId: string, nextReviewDate = '2026-10-12'): ErrorRecord => ({
  id,
  attemptId,
  exam: skills.find(skill => skill.id === skillId)!.exam,
  section: skills.find(skill => skill.id === skillId)!.section,
  skillIds: [skillId],
  errorType: 'unknown',
  createdAt: '2026-10-11',
  status: 'new',
  reviewCount: 0,
  nextReviewDate,
})

describe('priority explanation contract', () => {
  it('ranks a weak skill with unresolved due errors above a mastered skill', () => {
    const weak = attemptsAt('tc', 4, 10)
    const strong = attemptsAt('algebra', 10, 10)
    const priorities = calculateSkillPriority({
      skills,
      attempts: [...weak, ...strong],
      errors: [error('tc-error', weak[0].id, 'tc')],
      reviewDueSkillIds: ['tc'],
      remainingDays: 30,
      targetGaps: { gre: 20 },
    })

    expect(priorities.find(priority => priority.skillId === 'tc')!.score)
      .toBeGreaterThan(priorities.find(priority => priority.skillId === 'algebra')!.score)
  })

  it('keeps a mastered skill above the maintenance floor', () => {
    const input = {
      skills,
      attempts: attemptsAt('algebra', 10, 10),
      errors: [],
      reviewDueSkillIds: [],
      remainingDays: 30,
      targetGaps: {},
      mastery: [{ skillId: 'algebra', attempts: 10, recentAttempts: 10, accuracy: 100, recentAccuracy: 100, errorCount: 0, unresolvedErrors: 0, masteryScore: 95, confidence: 'high' as const }],
    }

    const explanation = explainPriority(input, 'algebra')
    expect(explanation.score).toBeGreaterThan(0)
  })

  it('explains the same maintenance score when mastery is derived from attempts', () => {
    const input = {
      skills,
      attempts: attemptsAt('algebra', 20, 20),
      errors: [],
      reviewDueSkillIds: [],
      remainingDays: 30,
      targetGaps: {},
    }
    const priority = calculateSkillPriority(input).find(item => item.skillId === 'algebra')!

    expect(explainPriority(input, 'algebra').score).toBe(priority.score)
  })

  it('rounds the explanation total exactly as the priority for fractional weakness', () => {
    const skill = skills.find(item => item.id === 'algebra')!
    const attempts = attemptsAt(skill.id, 90, 100)
    const errors = attempts.slice(90, 95).map((attempt, index) => error(`error-${index}`, attempt.id, skill.id))
    const input = {
      skills,
      attempts,
      errors,
      reviewDueSkillIds: [skill.id],
      remainingDays: 3,
      targetGaps: { gre: 20 },
      mastery: [calculateMastery(skill, attempts, errors, [])],
    }
    const priority = calculateSkillPriority(input).find(item => item.skillId === skill.id)!

    expect(priority.score).toBe(66)
    expect(explainPriority(input, skill.id).score).toBe(priority.score)
  })

  it('increases urgency when seven days remain instead of thirty', () => {
    const base = {
      skills,
      attempts: attemptsAt('geometry', 5, 10),
      errors: [],
      reviewDueSkillIds: [],
      targetGaps: {},
    }

    expect(explainPriority({ ...base, remainingDays: 7 }, 'geometry').score)
      .toBeGreaterThan(explainPriority({ ...base, remainingDays: 30 }, 'geometry').score)
  })

  it('returns non-empty reasons and bounded scores for the injected profile', () => {
    const attempts = [
      ...attemptsAt('tc', 12, 25),
      ...attemptsAt('rc', 14, 25),
      ...attemptsAt('speaking', 4, 10),
      ...attemptsAt('geometry', 31, 50),
      ...attemptsAt('algebra', 22, 25),
    ]
    const priorities = calculateSkillPriority({
      skills,
      attempts,
      errors: [],
      reviewDueSkillIds: [],
      remainingDays: 30,
      targetGaps: { gre: 20, toefl: 1.5 },
    })

    expect(priorities).toHaveLength(skills.length)
    priorities.forEach(priority => {
      expect(priority.reasons.length).toBeGreaterThan(0)
      expect(priority.score).toBeGreaterThanOrEqual(0)
      expect(priority.score).toBeLessThanOrEqual(100)
      expect(explainPriority({
        skills,
        attempts,
        errors: [],
        reviewDueSkillIds: [],
        remainingDays: 30,
        targetGaps: { gre: 20, toefl: 1.5 },
      }, priority.skillId).summary.length).toBeGreaterThan(0)
    })
  })
})
