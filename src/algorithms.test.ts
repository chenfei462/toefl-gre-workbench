import { describe, expect, it } from 'vitest'
import { calculateMastery } from './algorithms/mastery'
import { calculateSkillPriority } from './algorithms/priority'
import { buildDailyPrescription } from './algorithms/prescription'
import { advanceReview, isDue } from './algorithms/spacedReview'
import type { Attempt, ErrorRecord, ReviewAttempt, Skill } from './types'

const skills: Skill[] = [
  { id: 'tc', exam: 'gre', section: 'verbal', questionType: 'text_completion', name: 'Text Completion', priorityWeight: 1 },
  { id: 'algebra', exam: 'gre', section: 'quant', questionType: 'algebra', name: 'Algebra', priorityWeight: 1 },
]

const attempt = (id: string, skillId: string, correct: boolean, date = '2026-10-11'): Attempt => ({ id, date, exam: 'gre', section: skillId === 'tc' ? 'verbal' : 'quant', skillIds: [skillId], sourceType: 'official', correct, timeSeconds: 60, reviewed: false })
const error = (id: string, attemptId: string, skillId: string, status: ErrorRecord['status'] = 'new'): ErrorRecord => ({ id, attemptId, exam: 'gre', section: skillId === 'tc' ? 'verbal' : 'quant', skillIds: [skillId], errorType: skillId === 'tc' ? 'vocabulary' : 'calculation', createdAt: '2026-10-11', status, reviewCount: 0 })

describe('V2 adaptive algorithms', () => {
  it('keeps small samples low confidence instead of claiming mastery', () => {
    const mastery = calculateMastery(skills[0], [attempt('a1', 'tc', true), attempt('a2', 'tc', true)], [], [])
    expect(mastery.masteryScore).toBeLessThan(90)
    expect(mastery.confidence).toBe('low')
  })

  it('penalizes unresolved errors and rewards successful retries', () => {
    const weak = calculateMastery(skills[0], [attempt('a1', 'tc', false), attempt('a2', 'tc', true), attempt('a3', 'tc', true), attempt('a4', 'tc', true), attempt('a5', 'tc', true)], [error('e1', 'a1', 'tc')], [])
    const retry: ReviewAttempt = { id: 'r1', errorRecordId: 'e1', date: '2026-10-12', correct: true, confidence: 4 }
    const repaired = calculateMastery(skills[0], [attempt('a1', 'tc', false), attempt('a2', 'tc', true), attempt('a3', 'tc', true), attempt('a4', 'tc', true), attempt('a5', 'tc', true)], [error('e1', 'a1', 'tc', 'resolved')], [retry])
    expect(repaired.masteryScore).toBeGreaterThan(weak.masteryScore)
    expect(repaired.retryAccuracy).toBe(100)
  })

  it('prioritizes weak unresolved skills and explains why', () => {
    const priorities = calculateSkillPriority({ skills, attempts: [attempt('a1', 'tc', false), attempt('a2', 'tc', false), attempt('a3', 'tc', true), attempt('a4', 'algebra', true), attempt('a5', 'algebra', true)], errors: [error('e1', 'a1', 'tc'), error('e2', 'a2', 'tc')], reviewDueSkillIds: ['tc'], remainingDays: 5, targetGaps: { gre: 20 } })
    expect(priorities[0].skillId).toBe('tc')
    expect(priorities[0].score).toBeGreaterThan(70)
    expect(priorities[0].reasons.join(' ')).toContain('unresolved')
  })

  it('does not invent accuracy before a skill has attempts', () => {
    const priorities = calculateSkillPriority({ skills, attempts: [], errors: [], reviewDueSkillIds: [], remainingDays: 30, targetGaps: {} })
    expect(priorities[0].reasons[0]).toContain('No attempt data')
    expect(priorities[0].mastery.confidence).toBe('low')
  })

  it('fits prescription blocks inside the available time budget', () => {
    const priorities = calculateSkillPriority({ skills, attempts: [attempt('a1', 'tc', false), attempt('a2', 'tc', false)], errors: [error('e1', 'a1', 'tc')], reviewDueSkillIds: ['tc'], remainingDays: 5, targetGaps: { gre: 20 } })
    const prescription = buildDailyPrescription({ date: '2026-10-11', availableMinutes: 120, priorities, dueErrorCount: 4, dueVocabularyCount: 0 })
    expect(prescription.blocks.reduce((sum, block) => sum + block.minutes, 0)).toBeLessThanOrEqual(120)
    expect(prescription.blocks[0]?.skillId).toBe('tc')
  })

  it('uses transparent spaced review intervals', () => {
    expect(advanceReview(1, true)).toBe(3)
    expect(advanceReview(3, true)).toBe(7)
    expect(advanceReview(7, false)).toBe(1)
    expect(isDue('2026-10-11', '2026-10-11')).toBe(true)
  })
})
