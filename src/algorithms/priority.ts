import type { Attempt, ErrorRecord, Skill, SkillMastery } from '../types'
import { isEligibleErrorEvidence, isEligibleLearningEvidence, weightedAccuracy } from './evidence'
export { RELIABLE_EVIDENCE_WEIGHT, weightedAccuracy } from './evidence'

export interface SkillPriority { skillId: string; score: number; reasons: string[]; mastery: SkillMastery; exam?: Skill['exam']; section?: Skill['section'] }
export interface PriorityInput { skills: Skill[]; attempts: Attempt[]; errors: ErrorRecord[]; reviewDueSkillIds: string[]; remainingDays: number; targetGaps: Partial<Record<'toefl' | 'gre', number>>; mastery?: SkillMastery[] }

export interface PriorityExplanation {
  skillId: string
  score: number
  factors: Array<{ label: string; value: number; reason: string }>
  summary: string
}

/** Comfort practice: strong, well-evidenced skills are reduced but never zeroed. */
export const MAINTENANCE_FLOOR = 8

/**
 * Total evidence weight at which a skill's accuracy estimate is fully trusted.
 * Below this the estimate is shrunk toward the neutral prior.
 */
export const EVIDENCE_STRENGTH_TARGET = 10

export function calculateSkillPriority(input: PriorityInput): SkillPriority[] {
  return input.skills.map((skill) => {
    const attempts = input.attempts.filter((attempt) => attempt.skillIds.includes(skill.id) && isEligibleLearningEvidence(attempt) && typeof attempt.correct === 'boolean')
    // Evidence-weighted accuracy is the single source of truth for both the
    // score and the stated reason, so they can never contradict each other.
    const accuracy = attempts.length ? weightedAccuracy(attempts) / 100 : 0.5
    const unresolved = input.errors.filter((error) => error.skillIds.includes(skill.id) && error.status !== 'resolved' && isEligibleErrorEvidence(error, input.attempts)).length
    const due = input.reviewDueSkillIds.includes(skill.id)
    const suppliedMastery = input.mastery?.find((item) => item.skillId === skill.id)
    // A skill with no attempts has no measured weakness. Keep its priority at
    // the neutral prior instead of treating the default mastery score (0) as
    // evidence of a 0% recent accuracy.
    const recentAccuracy = attempts.length ? suppliedMastery?.recentAccuracy ?? Math.round(accuracy * 100) : 50
    const mastery = suppliedMastery ?? { skillId: skill.id, attempts: attempts.length, recentAttempts: attempts.length, accuracy: Math.round(accuracy * 100), recentAccuracy, errorCount: unresolved, unresolvedErrors: unresolved, masteryScore: Math.round(accuracy * 100), confidence: attempts.length < 5 ? 'low' : 'medium' }
    const weakness = (1 - recentAccuracy / 100) * 45; const unresolvedScore = Math.min(25, unresolved * 5); const dueScore = due ? 18 : 0; const urgency = input.remainingDays <= 7 ? 10 : input.remainingDays <= 21 ? 6 : 2; const gap = (input.targetGaps[skill.exam] ?? 0) > 0 ? 8 : 0; const comfortPenalty = mastery.masteryScore > 85 && accuracy > 0.9 && !due ? 20 : 0
    const raw = weakness + unresolvedScore + dueScore + urgency + gap - comfortPenalty
    // A mastered skill is still maintained: the comfort penalty reduces priority
    // but never lets a skill fall to zero and be abandoned entirely.
    const score = comfortPenalty > 0 ? Math.max(MAINTENANCE_FLOOR, Math.min(100, Math.round(raw))) : Math.max(0, Math.min(100, Math.round(raw)))
    const reasons = attempts.length ? [`Recent accuracy: ${recentAccuracy}%`] : ['No attempt data yet']; if (unresolved) reasons.push(`${unresolved} unresolved errors`); if (due) reasons.push('review due'); if (comfortPenalty) reasons.push('comfort practice reduced, maintenance floor applied'); return { skillId: skill.id, score, reasons, mastery, exam: skill.exam, section: skill.section }
  }).sort((a, b) => b.score - a.score)
}

export function explainPriority(input: PriorityInput, skillId: string): PriorityExplanation {
  const skill = input.skills.find(item => item.id === skillId)
  if (!skill) throw new Error(`Unknown skill: ${skillId}`)
  const attempts = input.attempts.filter(a => a.skillIds.includes(skillId) && isEligibleLearningEvidence(a) && typeof a.correct === 'boolean')
  const accuracy = attempts.length ? weightedAccuracy(attempts) : 50
  const unresolved = input.errors.filter(e => e.skillIds.includes(skillId) && e.status !== 'resolved' && isEligibleErrorEvidence(e, input.attempts)).length
  const due = input.reviewDueSkillIds.includes(skillId)
  const mastery = input.mastery?.find(item => item.skillId === skillId)
  const recentAccuracy = attempts.length ? mastery?.recentAccuracy ?? accuracy : 50
  const weakness = (1 - recentAccuracy / 100) * 45
  const unresolvedScore = Math.min(25, unresolved * 5)
  const dueScore = due ? 18 : 0
  const urgency = input.remainingDays <= 7 ? 10 : input.remainingDays <= 21 ? 6 : 2
  const gap = (input.targetGaps[skill.exam] ?? 0) > 0 ? 8 : 0
  const comfort = (mastery?.masteryScore ?? accuracy) > 85 && accuracy > 90 && !due ? -20 : 0
  const raw = Math.round(weakness + unresolvedScore + dueScore + urgency + gap + comfort)
  const score = comfort < 0
    ? Math.max(MAINTENANCE_FLOOR, Math.min(100, raw))
    : Math.max(0, Math.min(100, raw))
  const factors = [
    // Factor display is rounded; the score above uses the unrounded total, like calculateSkillPriority.
    { label: 'accuracy', value: Math.round(weakness), reason: `Evidence-weighted recent accuracy ${recentAccuracy}%` },
    { label: 'unresolved errors', value: unresolvedScore, reason: `${unresolved} unresolved errors` },
    { label: 'review due', value: dueScore, reason: due ? 'Review is due' : 'No review due' },
    { label: 'exam urgency', value: urgency, reason: `${input.remainingDays} days remaining` },
    { label: 'score gap', value: gap, reason: gap ? 'Target gap exists' : 'No target gap' },
    { label: 'comfort penalty', value: comfort, reason: comfort ? 'Strong evidence reduces comfort practice' : 'No comfort penalty' },
  ].filter(f => f.value !== 0 || f.label === 'accuracy')
  return { skillId, score, factors, summary: `${skill.name}: priority ${score} because ${factors.map(f => f.reason.toLowerCase()).join('; ')}.` }
}
