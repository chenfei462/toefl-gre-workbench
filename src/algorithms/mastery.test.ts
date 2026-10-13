import { describe, expect, it } from 'vitest'
import { calculateMastery } from './mastery'
import { calculateSkillPriority } from './priority'
import type { Attempt, Skill } from '../types'

const skill: Skill = { id: 'gre-tc', exam: 'gre', section: 'verbal', name: 'Text Completion', priorityWeight: 1 }
function attempt(id: string, date: string, correct: boolean): Attempt {
  return { id, date, correct, exam: 'gre', section: 'verbal', skillIds: [skill.id], sourceType: 'official', evidenceWeight: 1, reviewed: false }
}

describe('mastery recent-date grouping', () => {
  it('keeps an older same-day batch whole when the newest date has fewer than ten attempts', () => {
    const latest = attempt('latest', '2026-10-13', false)
    const olderBatch = Array.from({ length: 20 }, (_, index) => attempt(`older-${index}`, '2026-10-12', index < 10))
    const attempts = [latest, ...olderBatch]
    const permuted = [latest, ...[...olderBatch].reverse()]
    const mastery = calculateMastery(skill, attempts, [], [])
    const permutedMastery = calculateMastery(skill, permuted, [], [])
    const priority = (rows: Attempt[], measured: typeof mastery) => calculateSkillPriority({ skills: [skill], attempts: rows, errors: [], reviewDueSkillIds: [], remainingDays: 30, targetGaps: {}, mastery: [measured] })[0]

    expect(mastery.recentAttempts).toBe(21)
    expect(mastery.recentAccuracy).toBe(48)
    expect(permutedMastery).toEqual(mastery)
    expect(priority(permuted, permutedMastery)).toEqual(priority(attempts, mastery))
  })
})
