import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { WorkbenchState } from '../types'
import { calculateMastery } from '../algorithms/mastery'
import { calculateSkillPriority } from '../algorithms/priority'
import { buildDailyPrescription } from '../algorithms/prescription'
export function planForDate(state: WorkbenchState, date: string) {
  const skills = state.skills.filter(s => state.profile.examTypes.includes(s.exam))
  const mastery = skills.map(s => calculateMastery(s, state.attempts, state.errorRecords, state.reviewAttempts))
  const due = state.errorRecords.filter(e => e.nextReviewDate && e.nextReviewDate <= date && !state.attempts.find(a => a.id === e.attemptId)?.excludeFromMastery)
  const priorities = calculateSkillPriority({ skills, attempts: state.attempts, errors: state.errorRecords, mastery, reviewDueSkillIds: due.flatMap(e => e.skillIds), remainingDays: Math.max(0, 30 - differenceInCalendarDays(parseISO(date), parseISO(state.profile.startDate))), targetGaps: { gre: state.examProfiles.gre.targetScore - (state.examProfiles.gre.latestScore ?? state.examProfiles.gre.baselineScore ?? 0), toefl: state.examProfiles.toefl.targetScore - (state.examProfiles.toefl.latestScore ?? state.examProfiles.toefl.baselineScore ?? 0) } })
  const plan = buildDailyPrescription({ date, availableMinutes: state.profile.dailyMinutes, priorities, dueErrorCount: due.length, dueVocabularyCount: state.vocabulary.filter(v => v.nextReviewDate <= date).length })
  plan.blocks = plan.blocks.map(b => { const skill = skills.find(s => s.id === b.skillId); return skill ? { ...b, exam: skill.exam, section: skill.section } : { ...b, exam: skills[0]?.exam ?? 'gre' } })
  return { plan, priorities }
}
