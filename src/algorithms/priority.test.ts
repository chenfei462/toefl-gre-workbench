import { describe, expect, it } from 'vitest'
import { calculateSkillPriority, explainPriority, weightedAccuracy, MAINTENANCE_FLOOR } from './priority'
import { calculateMastery } from './mastery'
import type { Attempt, ErrorRecord, Skill } from '../types'

const skill = (id: string, exam: 'gre' | 'toefl' = 'gre'): Skill => ({ id, exam, section: exam === 'gre' ? 'verbal' : 'reading', name: id, priorityWeight: 1 })

function attempt(overrides: Partial<Attempt> & Pick<Attempt, 'id' | 'skillIds'>): Attempt {
  return { date: '2026-01-01', exam: 'gre', section: 'verbal', sourceType: 'self_created', reviewed: false, ...overrides }
}

describe('weightedAccuracy', () => {
  it('caps low-evidence volume so it cannot outweigh reliable observations', () => {
    // 30 community recalls (weight 0.3) all correct vs 3 official attempts (weight 1) all wrong.
    const recalls = Array.from({ length: 30 }, (_, i) => attempt({ id: `r${i}`, skillIds: ['s'], correct: true, evidenceWeight: 0.3 }))
    const official = Array.from({ length: 3 }, (_, i) => attempt({ id: `o${i}`, skillIds: ['s'], correct: false, evidenceWeight: 1 }))
    // Raw counting would report 91% and certify the skill as strong.
    expect(Math.round((30 / 33) * 100)).toBe(91)
    // A naive weight average still flatters it at 75%.
    expect(Math.round(((0.3 * 30) / (0.3 * 30 + 1 * 3)) * 100)).toBe(75)
    // Evidence weighting must reflect the 3 reliable wrong answers instead.
    expect(weightedAccuracy([...recalls, ...official])).toBe(0)
  })

  it('does not let low-evidence volume raise a skill above its reliable evidence', () => {
    // Same reliable evidence (3 wrong), but one variant is padded with 300 correct recalls.
    const unpadded = Array.from({ length: 3 }, (_, i) => attempt({ id: `u${i}`, skillIds: ['s'], correct: false, evidenceWeight: 1 }))
    const padded = [...Array.from({ length: 300 }, (_, i) => attempt({ id: `p${i}`, skillIds: ['s'], correct: true, evidenceWeight: 0.3 })), ...unpadded]
    expect(weightedAccuracy(padded)).toBe(weightedAccuracy(unpadded))
  })

  it('keeps pure reliable evidence exact', () => {
    const a = [attempt({ id: 'a', skillIds: ['s'], correct: true, evidenceWeight: 1 }), attempt({ id: 'b', skillIds: ['s'], correct: false, evidenceWeight: 1 })]
    expect(weightedAccuracy(a)).toBe(50)
  })

  it('returns 0 for no attempts', () => { expect(weightedAccuracy([])).toBe(0) })
})

describe('calculateSkillPriority evidence weighting (gap G-5)', () => {
  it('uses the same weighted evidence for mastery and production priority', () => {
    const s = skill('gre-padded')
    const attempts = [
      ...Array.from({ length: 30 }, (_, i) => attempt({ id: `recall-${i}`, skillIds: [s.id], correct: true, evidenceWeight: 0.3 })),
      ...Array.from({ length: 3 }, (_, i) => attempt({ id: `official-${i}`, skillIds: [s.id], correct: false, evidenceWeight: 1 })),
    ]
    const mastery = calculateMastery(s, attempts, [], [])
    const input = { skills: [s], attempts, errors: [], reviewDueSkillIds: [], remainingDays: 30, targetGaps: {}, mastery: [mastery] }
    const [entry] = calculateSkillPriority(input)
    const explanation = explainPriority(input, s.id)

    expect(mastery.accuracy).toBe(0)
    expect(mastery.recentAccuracy).toBe(0)
    expect(entry.reasons[0]).toBe('Recent accuracy: 0%')
    expect(entry.score).toBe(47)
    expect(explanation.score).toBe(entry.score)
    expect(explanation.factors.find(factor => factor.label === 'accuracy')?.value).toBe(45)
  })

  it('prints the recent accuracy used by weakness when lifetime accuracy differs', () => {
    const s = skill('gre-tc')
    const attempts = [
      ...Array.from({ length: 10 }, (_, i) => attempt({ id: `recent-${i}`, skillIds: [s.id], date: '2026-01-02', correct: false, evidenceWeight: 1 })),
      ...Array.from({ length: 20 }, (_, i) => attempt({ id: `older-${i}`, skillIds: [s.id], date: '2026-01-01', correct: true, evidenceWeight: 1 })),
    ]
    const mastery = calculateMastery(s, attempts, [], [])
    const input = { skills: [s], attempts, errors: [], reviewDueSkillIds: [], remainingDays: 30, targetGaps: {}, mastery: [mastery] }
    const [entry] = calculateSkillPriority(input)
    const explanation = explainPriority(input, s.id)

    expect(mastery.accuracy).toBe(67)
    expect(mastery.recentAccuracy).toBe(0)
    expect(entry.reasons[0]).toBe('Recent accuracy: 0%')
    expect(explanation.factors.find(factor => factor.label === 'accuracy')?.reason).toContain('recent accuracy 0%')
    expect(explanation.score).toBe(entry.score)
  })

  it('does not let low-evidence volume mask a genuine weakness in the ranking', () => {
    // "padded": many community-source correct answers hiding 3 reliable wrong ones.
    const padded = skill('gre-padded')
    // "clean": the same 3 reliable wrong answers, with no misleading padding at all.
    const clean = skill('gre-clean')
    const attempts: Attempt[] = [
      ...Array.from({ length: 30 }, (_, i) => attempt({ id: `p${i}`, skillIds: [padded.id], correct: true, evidenceWeight: 0.3, sourceType: 'third_party' })),
      ...Array.from({ length: 3 }, (_, i) => attempt({ id: `pw${i}`, skillIds: [padded.id], correct: false, evidenceWeight: 1 })),
      ...Array.from({ length: 3 }, (_, i) => attempt({ id: `cw${i}`, skillIds: [clean.id], correct: false, evidenceWeight: 1 })),
    ]
    const ranked = calculateSkillPriority({ skills: [padded, clean], attempts, errors: [], reviewDueSkillIds: [], remainingDays: 30, targetGaps: {} })
    const byId = Object.fromEntries(ranked.map(r => [r.skillId, r]))
    // Under raw counting the padded skill shows 91% and the clean skill 0%, which
    // would make the padded skill look far safer. The evidence-weighted reason that
    // drives the score must report the same weakness for both, so padding buys no
    // priority relief.
    const stated = (id: string) => Number(byId[id].reasons[0].match(/(\d+)%/)?.[1])
    expect(stated(padded.id)).toBe(stated(clean.id))
    expect(stated(padded.id)).toBe(0)
    expect(byId[padded.id].score).toBe(byId[clean.id].score)
    expect(byId[padded.id].score).toBeGreaterThan(0)
  })

  it('still ranks the weakest reliable evidence highest among real candidates', () => {
    const strong = skill('gre-algebra')
    const weak = skill('gre-tc')
    const attempts: Attempt[] = [
      ...Array.from({ length: 10 }, (_, i) => attempt({ id: `s${i}`, skillIds: [strong.id], correct: i < 9, evidenceWeight: 1 })),
      ...Array.from({ length: 10 }, (_, i) => attempt({ id: `w${i}`, skillIds: [weak.id], correct: i < 2, evidenceWeight: 1 })),
    ]
    const ranked = calculateSkillPriority({ skills: [strong, weak], attempts, errors: [], reviewDueSkillIds: [], remainingDays: 30, targetGaps: {} })
    expect(ranked[0].skillId).toBe(weak.id)
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score)
  })

  it('states a reason that agrees with the weighted value used to compute the score', () => {
    const s = skill('gre-tc')
    const attempts: Attempt[] = [
      ...Array.from({ length: 20 }, (_, i) => attempt({ id: `c${i}`, skillIds: [s.id], correct: true, evidenceWeight: 0.3 })),
      ...Array.from({ length: 4 }, (_, i) => attempt({ id: `o${i}`, skillIds: [s.id], correct: false, evidenceWeight: 1 })),
    ]
    const [entry] = calculateSkillPriority({ skills: [s], attempts, errors: [], reviewDueSkillIds: [], remainingDays: 30, targetGaps: {} })
    const stated = Number(entry.reasons[0].match(/(\d+)%/)?.[1])
    expect(stated).toBe(weightedAccuracy(attempts))
    // The stated reason must not report the misleading raw count (20/24 = 83%).
    expect(stated).not.toBe(83)
  })

  it('excludes disputed attempts from both score and reason', () => {
    const s = skill('gre-rc')
    const withDisputed: Attempt[] = [
      attempt({ id: 'ok', skillIds: [s.id], correct: true, evidenceWeight: 1 }),
      attempt({ id: 'disputed', skillIds: [s.id], correct: false, evidenceWeight: 0, excludeFromMastery: true }),
    ]
    const withoutDisputed: Attempt[] = [attempt({ id: 'ok', skillIds: [s.id], correct: true, evidenceWeight: 1 })]
    const [withEntry] = calculateSkillPriority({ skills: [s], attempts: withDisputed, errors: [], reviewDueSkillIds: [], remainingDays: 30, targetGaps: {} })
    const [withoutEntry] = calculateSkillPriority({ skills: [s], attempts: withoutDisputed, errors: [], reviewDueSkillIds: [], remainingDays: 30, targetGaps: {} })
    // The disputed attempt must change nothing at all: neither the score nor the reason.
    expect(withEntry.reasons).toEqual(withoutEntry.reasons)
    expect(withEntry.score).toBe(withoutEntry.score)
    expect(withEntry.mastery.attempts).toBe(withoutEntry.mastery.attempts)
  })

  it('applies a maintenance floor so a mastered skill is never abandoned', () => {
    const s = skill('gre-algebra')
    const attempts: Attempt[] = Array.from({ length: 20 }, (_, i) => attempt({ id: `a${i}`, skillIds: [s.id], correct: true, evidenceWeight: 1, timeSeconds: 60 }))
    const [entry] = calculateSkillPriority({ skills: [s], attempts, errors: [], reviewDueSkillIds: [], remainingDays: 30, targetGaps: {}, mastery: [{ skillId: s.id, attempts: 20, recentAttempts: 20, accuracy: 100, recentAccuracy: 100, errorCount: 0, unresolvedErrors: 0, masteryScore: 95, confidence: 'high' }] })
    expect(entry.reasons).toContain('comfort practice reduced, maintenance floor applied')
    expect(entry.score).toBeGreaterThanOrEqual(MAINTENANCE_FLOOR)
  })

  it('never returns a score outside 0-100 and always explains itself', () => {
    const skills = [skill('gre-tc'), skill('gre-geometry', 'gre'), skill('toefl-speaking' as never, 'toefl')]
    const errors: ErrorRecord[] = [{ id: 'e1', attemptId: 'x', exam: 'gre', section: 'verbal', skillIds: ['gre-tc'], errorType: 'vocabulary', createdAt: '2026-01-01', status: 'new', reviewCount: 0 }]
    const ranked = calculateSkillPriority({ skills, attempts: [], errors, reviewDueSkillIds: ['gre-tc'], remainingDays: 3, targetGaps: { gre: 20, toefl: 1.5 } })
    expect(ranked).toHaveLength(3)
    ranked.forEach(r => { expect(r.score).toBeGreaterThanOrEqual(0); expect(r.score).toBeLessThanOrEqual(100); expect(r.reasons.length).toBeGreaterThan(0) })
  })
})
