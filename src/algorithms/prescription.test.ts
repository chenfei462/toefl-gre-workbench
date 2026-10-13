import { describe, expect, it } from 'vitest'
import { buildDailyPrescription } from './prescription'
import { calculateSkillPriority } from './priority'
import type { Skill } from '../types'

function plan(skills: Skill[], minutes: number, dueErrorCount = 0) {
  const priorities = calculateSkillPriority({
    skills,
    attempts: [],
    errors: [],
    reviewDueSkillIds: [],
    remainingDays: 15,
    targetGaps: {},
  })
  return buildDailyPrescription({
    date: '2026-10-12',
    availableMinutes: minutes,
    priorities,
    dueErrorCount,
    dueVocabularyCount: 0,
    skills,
  })
}

describe('daily prescription skill metadata', () => {
  it('labels every block for a TOEFL-only profile as TOEFL', () => {
    const skills: Skill[] = [
      { id: 'oral-x9', exam: 'toefl', section: 'speaking', name: 'Speaking', priorityWeight: 1 },
    ]

    const result = plan(skills, 120, 2)

    expect(result.blocks.length).toBeGreaterThan(0)
    expect(result.blocks.every(block => block.exam === 'toefl')).toBe(true)
  })

  it('uses the recorded section for unusual skill ids and quant skills', () => {
    const skills: Skill[] = [
      { id: 'skill-z7', exam: 'gre', section: 'quant', name: 'Geometry', priorityWeight: 1 },
    ]

    const result = plan(skills, 120)
    const practice = result.blocks.find(block => block.skillId === 'skill-z7')

    expect(practice?.section).toBe('quant')
  })

  it('labels a vocabulary block from the active TOEFL vocabulary skill', () => {
    const skills: Skill[] = [
      { id: 'toefl-vocabulary', exam: 'toefl', section: 'reading', name: 'Vocabulary in Context', priorityWeight: 1 },
    ]

    const priorities = calculateSkillPriority({ skills, attempts: [], errors: [], reviewDueSkillIds: [], remainingDays: 15, targetGaps: {} })
    const result = buildDailyPrescription({ date: '2026-10-12', availableMinutes: 120, priorities, dueErrorCount: 0, dueVocabularyCount: 3, skills })
    const vocabulary = result.blocks.find(block => block.type === 'vocabulary')

    expect(vocabulary).toMatchObject({ exam: 'toefl', section: 'reading' })
  })

  it('preserves priority blocks for callers using the legacy input shape', () => {
    const skills: Skill[] = [
      { id: 'tc', exam: 'gre', section: 'verbal', name: 'Text Completion', priorityWeight: 1 },
    ]
    const priorities = calculateSkillPriority({ skills, attempts: [], errors: [], reviewDueSkillIds: [], remainingDays: 15, targetGaps: {} })

    const result = buildDailyPrescription({
      date: '2026-10-12',
      availableMinutes: 120,
      priorities,
      dueErrorCount: 0,
      dueVocabularyCount: 0,
    })

    expect(result.blocks.find(block => block.skillId === 'tc')).toBeDefined()
  })

  it('never allocates more than the available time', () => {
    const skills: Skill[] = [
      { id: 'skill-z7', exam: 'gre', section: 'quant', name: 'Geometry', priorityWeight: 1 },
      { id: 'toefl-speak-11', exam: 'toefl', section: 'speaking', name: 'Speaking', priorityWeight: 1 },
    ]

    const result = plan(skills, 67, 5)

    expect(result.blocks.reduce((sum, block) => sum + block.minutes, 0)).toBeLessThanOrEqual(67)
  })
})
