import { finalWeekExams } from '../study/loop'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { DailyPrescriptionBlock, Exam, WorkbenchState } from '../types'
import { calculateMastery } from '../algorithms/mastery'
import { calculateSkillPriority } from '../algorithms/priority'
import { buildDailyPrescription } from '../algorithms/prescription'
import { calculateRollingWindow, calculateScoreTrajectory } from '../algorithms/trajectory'
import { isEligibleErrorEvidence } from '../algorithms/evidence'
export function planForDate(state: WorkbenchState, date: string) {
  const skills = state.skills.filter(s => state.profile.examTypes.includes(s.exam))
  const mastery = skills.map(s => calculateMastery(s, state.attempts, state.errorRecords, state.reviewAttempts))
  const due = state.errorRecords.filter(e => state.profile.examTypes.includes(e.exam) && e.nextReviewDate && e.nextReviewDate <= date && isEligibleErrorEvidence(e, state.attempts))
  const daysRemaining = (exam: Exam) => Math.max(0, state.examProfiles[exam].examDate ? differenceInCalendarDays(parseISO(state.examProfiles[exam].examDate!), parseISO(date)) : 30 - differenceInCalendarDays(parseISO(date), parseISO(state.profile.startDate)))
  const priorities = state.profile.examTypes.flatMap(exam => calculateSkillPriority({ skills: skills.filter(s => s.exam === exam), attempts: state.attempts, errors: state.errorRecords, mastery, reviewDueSkillIds: due.flatMap(e => e.skillIds), remainingDays: daysRemaining(exam), targetGaps: { gre: state.examProfiles.gre.targetScore - (state.examProfiles.gre.latestScore ?? state.examProfiles.gre.baselineScore ?? 0), toefl: state.examProfiles.toefl.targetScore - (state.examProfiles.toefl.latestScore ?? state.examProfiles.toefl.baselineScore ?? 0) } })).sort((a, b) => b.score - a.score)
  const dueExam = due[0]?.exam
  const dueSection = due[0]?.section
  const plan = buildDailyPrescription({ date, availableMinutes: state.profile.dailyMinutes, priorities, dueErrorCount: due.length, dueVocabularyCount: state.vocabulary.filter(v => v.nextReviewDate <= date).length, skills, dueErrorExam: dueExam, dueErrorSection: dueSection })
  plan.blocks = plan.blocks.map(b => { const skill = skills.find(s => s.id === b.skillId); return skill ? { ...b, exam: skill.exam, section: skill.section } : b })
  const finalExams = finalWeekExams(state, date)
  if (finalExams.length) {
    const focused = priorities.filter(p => p.exam && finalExams.includes(p.exam))
    const unresolved = state.errorRecords.filter(e => finalExams.includes(e.exam) && e.status !== 'resolved' && isEligibleErrorEvidence(e, state.attempts))
    const blocks: DailyPrescriptionBlock[] = []
    let remaining = Math.max(0, state.profile.dailyMinutes)
    const reviewExam = focused.find(p => unresolved.some(e => e.skillIds.includes(p.skillId)))?.exam ?? unresolved[0]?.exam
    if (unresolved.length && reviewExam && remaining > 0) {
      const minutes = Math.min(remaining, 30, Math.max(10, Math.floor(remaining * 0.25)))
      blocks.push({ id: 'final-review', exam: reviewExam, section: unresolved.find(e => e.exam === reviewExam)!.section, type: 'error_review', minutes, priority: 100, reason: 'FINAL WEEK · ' + unresolved.length + ' unresolved errors; review before new material' })
      remaining -= minutes
    }
    const mockExam = finalExams.slice().sort((a, b) => daysRemaining(a) - daysRemaining(b)).find(exam => daysRemaining(exam) > 1 && !(state.mockSessions ?? []).some(m => m.exam === exam && differenceInCalendarDays(parseISO(date), parseISO(m.date)) >= 0 && differenceInCalendarDays(parseISO(date), parseISO(m.date)) <= 3))
    if (mockExam && state.profile.dailyMinutes >= 90 && remaining >= 60) {
      blocks.push({ id: 'final-mock', exam: mockExam, section: focused.find(p => p.exam === mockExam)?.section ?? (mockExam === 'gre' ? 'verbal' : 'reading'), type: 'mock', minutes: 30, priority: 95, reason: 'FINAL WEEK · 30-minute section mock; record real score and conditions' })
      remaining -= 30
    }
    for (const priority of focused.slice(0, 4)) {
      if (remaining <= 0) break
      const minutes = Math.min(45, remaining)
      blocks.push({ id: 'final-' + priority.skillId, exam: priority.exam!, section: priority.section!, skillId: priority.skillId, type: 'timed_practice', minutes, priority: priority.score, reason: 'FINAL WEEK · timed mixed set focused on weak skills · ' + priority.reasons.join(' · ') })
      remaining -= minutes
    }
    plan.blocks = blocks
    plan.rationale = ['FINAL WEEK · focus on exams within seven days; unresolved review, timed mixed sets and spaced section mocks. No new resources.', 'Allocated ' + (state.profile.dailyMinutes - remaining) + ' of ' + state.profile.dailyMinutes + ' minutes.']
  }
  const trajectories = {
    toefl: calculateScoreTrajectory('toefl', state.checkpoints, state.examProfiles.toefl),
    gre: calculateScoreTrajectory('gre', state.checkpoints, state.examProfiles.gre),
  }
  return { plan, priorities, mastery, trajectories, rolling7Day: calculateRollingWindow(state.attempts, date) }
}
