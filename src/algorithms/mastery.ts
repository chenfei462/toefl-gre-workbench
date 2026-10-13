import type { Attempt, ErrorRecord, ReviewAttempt, Skill, SkillMastery } from '../types'
import { isEligibleLearningEvidence, RELIABLE_EVIDENCE_WEIGHT, weightedAccuracy } from './evidence'

export const MASTERY_WEIGHTS = { accuracy: 0.4, recentAccuracy: 0.25, retryAccuracy: 0.2, consistency: 0.1, timeEfficiency: 0.05, unresolvedPenalty: 8 } as const

export function calculateMastery(skill: Skill, attempts: Attempt[], errors: ErrorRecord[], reviews: ReviewAttempt[]): SkillMastery {
  const relevant = attempts.filter((attempt) => attempt.skillIds.includes(skill.id) && typeof attempt.correct === 'boolean' && isEligibleLearningEvidence(attempt)).sort((a, b) => b.date.localeCompare(a.date))
  const reliable = relevant.filter(a => (a.evidenceWeight ?? 1) >= RELIABLE_EVIDENCE_WEIGHT)
  // A batch is recorded as many attempts sharing one date. Keep that whole
  // date bucket together; taking the first ten rows would make insertion
  // order masquerade as a 100% recent score.
  const recent = recentWindow(relevant)
  const accuracy = weightedAccuracy(relevant)
  const recentAccuracy = weightedAccuracy(recent)
  const skillErrors = errors.filter((error) => error.skillIds.includes(skill.id) && relevant.some(a => a.id === error.attemptId))
  const unresolvedErrors = skillErrors.filter((error) => error.status !== 'resolved').length
  const weightOfError = (id: string) => relevant.find(a => a.id === id)?.evidenceWeight ?? 1
  const unresolved = skillErrors.filter(e => e.status !== 'resolved')
  const reliablePenalty = unresolved.filter(e => weightOfError(e.attemptId) >= RELIABLE_EVIDENCE_WEIGHT).reduce((sum, e) => sum + weightOfError(e.attemptId), 0)
  const weakPenalty = unresolved.filter(e => weightOfError(e.attemptId) < RELIABLE_EVIDENCE_WEIGHT).reduce((sum, e) => sum + weightOfError(e.attemptId), 0)
  const weightedUnresolved = reliablePenalty + (reliable.length ? Math.min(weakPenalty, Math.max(0.25, reliablePenalty * 0.25)) : Math.min(weakPenalty, 2))
  const relevantReviews = reviews.filter((review) => skillErrors.some((error) => error.id === review.errorRecordId))
  const retryAccuracy = relevantReviews.length ? percentage(relevantReviews.filter((review) => review.correct).length, relevantReviews.length) : undefined
  const consistency = relevant.length ? Math.min(100, relevant.length * 5) : 0
  const timeEfficiency = relevant.length ? Math.max(0, Math.min(100, 100 - ((averageTime(relevant) - 60) / 2))) : 0
  const rawScore = accuracy * MASTERY_WEIGHTS.accuracy + recentAccuracy * MASTERY_WEIGHTS.recentAccuracy + (retryAccuracy ?? accuracy) * MASTERY_WEIGHTS.retryAccuracy + consistency * MASTERY_WEIGHTS.consistency + timeEfficiency * MASTERY_WEIGHTS.timeEfficiency - weightedUnresolved * MASTERY_WEIGHTS.unresolvedPenalty
  const sampleCap = reliable.length === 0 ? 55 : reliable.length < 5 ? 78 : reliable.length <= 15 ? 90 : 100
  const score = Math.max(0, Math.min(sampleCap, Math.round(rawScore)))
  return { skillId: skill.id, attempts: relevant.length, recentAttempts: recent.length, accuracy, recentAccuracy, retryAccuracy, averageTimeSeconds: relevant.length ? Math.round(averageTime(relevant)) : undefined, errorCount: skillErrors.length, unresolvedErrors, lastPracticedAt: relevant[0]?.date, masteryScore: score, confidence: reliable.length < 5 ? 'low' : reliable.length <= 15 ? 'medium' : 'high' }
}

function percentage(value: number, total: number) { return total ? Math.round((value / total) * 100) : 0 }
function averageTime(attempts: Attempt[]) { return attempts.reduce((sum, attempt) => sum + (attempt.timeSeconds ?? 0), 0) / attempts.length }
function recentWindow(attempts: Attempt[]) {
  const recent: Attempt[] = []
  for (const attempt of attempts) {
    if (recent.length >= 10 && attempt.date !== recent.at(-1)?.date) break
    recent.push(attempt)
  }
  return recent
}

