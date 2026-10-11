import type { Attempt, ErrorRecord, Skill, SkillMastery } from '../types'

export interface SkillPriority { skillId: string; score: number; reasons: string[]; mastery: SkillMastery }
interface PriorityInput { skills: Skill[]; attempts: Attempt[]; errors: ErrorRecord[]; reviewDueSkillIds: string[]; remainingDays: number; targetGaps: Partial<Record<'toefl' | 'gre', number>>; mastery?: SkillMastery[] }

/**
 * Evidence weights at or above this threshold are treated as reliable training
 * evidence. Mirrors the threshold used by `calculateMastery` so that the
 * priority score and the mastery it is derived from cannot disagree.
 */
export const RELIABLE_EVIDENCE_WEIGHT = 0.65

/** Comfort practice: strong, well-evidenced skills are reduced but never zeroed. */
export const MAINTENANCE_FLOOR = 8

/**
 * Total evidence weight at which a skill's accuracy estimate is fully trusted.
 * Below this the estimate is shrunk toward the neutral prior.
 */
export const EVIDENCE_STRENGTH_TARGET = 10

function weightOf(attempt: Attempt): number { return attempt.evidenceWeight ?? 1 }

/**
 * Evidence-weighted accuracy.
 *
 * Reliable evidence (weight >= RELIABLE_EVIDENCE_WEIGHT) sets the base estimate.
 * Low-evidence volume is admitted only in proportion to how much reliable
 * evidence exists, and it may never push the estimate *above* what reliable
 * evidence alone shows.
 *
 * That last rule is the important one. Without it, correct community recalls
 * would silently repair a skill that reliable evidence shows to be weak: 3 wrong
 * official answers would report 0% alone but 20% once padded with 30 correct
 * recalls. Weak evidence is therefore evidence of uncertainty, not evidence of
 * competence — it can only pull the estimate toward the neutral prior, never
 * above the reliable signal.
 */
export function weightedAccuracy(attempts: Attempt[]): number {
  const reliable = attempts.filter(a => weightOf(a) >= RELIABLE_EVIDENCE_WEIGHT)
  const weak = attempts.filter(a => weightOf(a) < RELIABLE_EVIDENCE_WEIGHT)
  const reliableWeight = reliable.reduce((sum, a) => sum + weightOf(a), 0)
  const weakWeight = weak.reduce((sum, a) => sum + weightOf(a), 0)
  if (!reliableWeight && !weakWeight) return 0

  // With no reliable evidence there is nothing to be confident about, so the
  // estimate sits at the neutral prior; low-evidence volume may move it only
  // halfway, in either direction.
  if (!reliableWeight) {
    const weakCorrect = weak.filter(a => a.correct).reduce((sum, a) => sum + weightOf(a), 0)
    const weakAccuracy = weakCorrect / weakWeight
    return Math.round((0.5 + (weakAccuracy - 0.5) * 0.5) * 100)
  }

  const reliableCorrect = reliable.filter(a => a.correct).reduce((sum, a) => sum + weightOf(a), 0)
  const reliableAccuracy = reliableCorrect / reliableWeight
  if (!weakWeight) return Math.round(reliableAccuracy * 100)

  // Low-evidence volume is capped relative to reliable evidence, and the result
  // is clamped so weak evidence can only pull the estimate down toward the
  // prior, never up above the reliable signal.
  const cap = Math.min(1, reliableWeight * 0.25 / weakWeight)
  const weakCorrect = weak.filter(a => a.correct).reduce((sum, a) => sum + weightOf(a) * cap, 0)
  const weakTotal = weakWeight * cap
  const totalWeight = reliableWeight + weakTotal
  const blended = totalWeight ? (reliableCorrect + weakCorrect) / totalWeight : reliableAccuracy
  return Math.round(Math.min(reliableAccuracy, blended) * 100)
}

export function calculateSkillPriority(input: PriorityInput): SkillPriority[] {
  return input.skills.map((skill) => {
    const attempts = input.attempts.filter((attempt) => attempt.skillIds.includes(skill.id) && !attempt.excludeFromMastery && attempt.evidenceWeight !== 0 && typeof attempt.correct === 'boolean')
    // Evidence-weighted accuracy is the single source of truth for both the
    // score and the stated reason, so they can never contradict each other.
    const accuracy = attempts.length ? weightedAccuracy(attempts) / 100 : 0.5
    const unresolved = input.errors.filter((error) => error.skillIds.includes(skill.id) && error.status !== 'resolved').length
    const due = input.reviewDueSkillIds.includes(skill.id)
    const mastery = input.mastery?.find((item) => item.skillId === skill.id) ?? { skillId: skill.id, attempts: attempts.length, recentAttempts: attempts.length, accuracy: Math.round(accuracy * 100), recentAccuracy: Math.round(accuracy * 100), errorCount: unresolved, unresolvedErrors: unresolved, masteryScore: Math.round(accuracy * 100), confidence: attempts.length < 5 ? 'low' : 'medium' }
    const weakness = (1 - mastery.recentAccuracy / 100) * 45; const unresolvedScore = Math.min(25, unresolved * 5); const dueScore = due ? 18 : 0; const urgency = input.remainingDays <= 7 ? 10 : input.remainingDays <= 21 ? 6 : 2; const gap = (input.targetGaps[skill.exam] ?? 0) > 0 ? 8 : 0; const comfortPenalty = mastery.masteryScore > 85 && accuracy > 0.9 && !due ? 20 : 0
    const raw = weakness + unresolvedScore + dueScore + urgency + gap - comfortPenalty
    // A mastered skill is still maintained: the comfort penalty reduces priority
    // but never lets a skill fall to zero and be abandoned entirely.
    const score = comfortPenalty > 0 ? Math.max(MAINTENANCE_FLOOR, Math.min(100, Math.round(raw))) : Math.max(0, Math.min(100, Math.round(raw)))
    const reasons = attempts.length ? [`Recent accuracy: ${Math.round(accuracy * 100)}%`] : ['No attempt data yet']; if (unresolved) reasons.push(`${unresolved} unresolved errors`); if (due) reasons.push('review due'); if (comfortPenalty) reasons.push('comfort practice reduced, maintenance floor applied'); return { skillId: skill.id, score, reasons, mastery }
  }).sort((a, b) => b.score - a.score)
}
