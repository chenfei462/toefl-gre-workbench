import type { Attempt, ErrorRecord, Skill, SkillMastery } from '../types'

export interface SkillPriority { skillId: string; score: number; reasons: string[]; mastery: SkillMastery }
interface PriorityInput { skills: Skill[]; attempts: Attempt[]; errors: ErrorRecord[]; reviewDueSkillIds: string[]; remainingDays: number; targetGaps: Partial<Record<'toefl' | 'gre', number>>; mastery?: SkillMastery[] }

export function calculateSkillPriority(input: PriorityInput): SkillPriority[] {
  return input.skills.map((skill) => {
    const attempts = input.attempts.filter((attempt) => attempt.skillIds.includes(skill.id) && !attempt.excludeFromMastery && attempt.evidenceWeight !== 0 && typeof attempt.correct === 'boolean'); const correct = attempts.filter((attempt) => attempt.correct).length; const accuracy = attempts.length ? correct / attempts.length : 0.5; const unresolved = input.errors.filter((error) => error.skillIds.includes(skill.id) && error.status !== 'resolved').length; const due = input.reviewDueSkillIds.includes(skill.id); const mastery = input.mastery?.find((item) => item.skillId === skill.id) ?? { skillId: skill.id, attempts: attempts.length, recentAttempts: attempts.length, accuracy: Math.round(accuracy * 100), recentAccuracy: Math.round(accuracy * 100), errorCount: unresolved, unresolvedErrors: unresolved, masteryScore: Math.round(accuracy * 100), confidence: attempts.length < 5 ? 'low' : 'medium' }
    const weakness = (1 - mastery.recentAccuracy / 100) * 45; const unresolvedScore = Math.min(25, unresolved * 5); const dueScore = due ? 18 : 0; const urgency = input.remainingDays <= 7 ? 10 : input.remainingDays <= 21 ? 6 : 2; const gap = (input.targetGaps[skill.exam] ?? 0) > 0 ? 8 : 0; const comfortPenalty = mastery.masteryScore > 85 && accuracy > 0.9 && !due ? 20 : 0; const score = Math.max(0, Math.min(100, Math.round(weakness + unresolvedScore + dueScore + urgency + gap - comfortPenalty)))
    const reasons = attempts.length ? [`Recent accuracy: ${Math.round(accuracy * 100)}%`] : ['No attempt data yet']; if (unresolved) reasons.push(`${unresolved} unresolved errors`); if (due) reasons.push('review due'); if (comfortPenalty) reasons.push('comfort practice reduced'); return { skillId: skill.id, score, reasons, mastery }
  }).sort((a, b) => b.score - a.score)
}

