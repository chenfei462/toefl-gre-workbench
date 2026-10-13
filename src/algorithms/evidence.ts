import type { Attempt, ErrorRecord } from '../types'

export const RELIABLE_EVIDENCE_WEIGHT = 0.65

export function isEligibleLearningEvidence(attempt: Attempt): boolean {
  if (attempt.excludeFromMastery || attempt.evidenceWeight === 0) return false
  if (!attempt.questionId || attempt.provenance === 'reference' || attempt.provenance === 'batch_summary') return true
  return attempt.questionReferenceStatus !== 'pending' && attempt.questionReferenceStatus !== 'orphaned'
}

export function isEligibleErrorEvidence(error: ErrorRecord, attempts: Attempt[]): boolean {
  const attempt = attempts.find(item => item.id === error.attemptId)
  return !!attempt && isEligibleLearningEvidence(attempt)
}

function weightOf(attempt: Attempt): number { return attempt.evidenceWeight ?? 1 }

/** Shared accuracy for mastery and priority; weak evidence cannot improve a reliable signal. */
export function weightedAccuracy(attempts: Attempt[]): number {
  const reliable = attempts.filter(a => weightOf(a) >= RELIABLE_EVIDENCE_WEIGHT)
  const weak = attempts.filter(a => weightOf(a) < RELIABLE_EVIDENCE_WEIGHT)
  const reliableWeight = reliable.reduce((sum, a) => sum + weightOf(a), 0)
  const weakWeight = weak.reduce((sum, a) => sum + weightOf(a), 0)
  if (!reliableWeight && !weakWeight) return 0

  // Without reliable evidence, shrink the weighted result halfway toward the neutral prior.
  if (!reliableWeight) {
    const weakCorrect = weak.filter(a => a.correct).reduce((sum, a) => sum + weightOf(a), 0)
    return Math.round((0.5 + (weakCorrect / weakWeight - 0.5) * 0.5) * 100)
  }

  const reliableCorrect = reliable.filter(a => a.correct).reduce((sum, a) => sum + weightOf(a), 0)
  const reliableAccuracy = reliableCorrect / reliableWeight
  if (!weakWeight) return Math.round(reliableAccuracy * 100)

  // Cap weak volume at 25% of reliable weight and prevent it from masking a measured weakness.
  const cap = Math.min(1, reliableWeight * 0.25 / weakWeight)
  const weakCorrect = weak.filter(a => a.correct).reduce((sum, a) => sum + weightOf(a) * cap, 0)
  const blended = (reliableCorrect + weakCorrect) / (reliableWeight + weakWeight * cap)
  return Math.round(Math.min(reliableAccuracy, blended) * 100)
}
