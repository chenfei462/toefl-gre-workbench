import type { Exam, Skill, WorkbenchState } from '../types'
import { planForDate } from '../questionDatabase/planning'
import type { ScoreTrajectory, RollingWindow } from './trajectory'

export interface DashboardSummary {
  currentScore: Record<Exam, number | undefined>
  gap: Record<Exam, number | undefined>
  mostDangerousSkill?: { skillId: string; name: string; exam: Exam; section: string; score: number; reasons: string[] }
  firstAction?: ReturnType<typeof planForDate>['plan']['blocks'][number]
  why: string
  trajectories: Record<Exam, ScoreTrajectory>
  rolling7Day: RollingWindow
}

export function buildDashboardSummary(state: WorkbenchState, date: string): DashboardSummary {
  const planned = planForDate(state, date)
  const top = planned.priorities[0]
  const skill = top ? state.skills.find(candidate => candidate.id === top.skillId) : undefined
  const firstAction = planned.plan.blocks.find(block => block.skillId) ?? planned.plan.blocks[0]
  const currentScore = {
    toefl: planned.trajectories.toefl.latestScore,
    gre: planned.trajectories.gre.latestScore,
  }
  const gap = {
    toefl: planned.trajectories.toefl.gap,
    gre: planned.trajectories.gre.gap,
  }
  return {
    currentScore,
    gap,
    mostDangerousSkill: skill && top ? { skillId: skill.id, name: skill.name, exam: skill.exam, section: skill.section, score: top.score, reasons: top.reasons } : undefined,
    firstAction,
    why: skill && top ? `${skill.name}: ${top.reasons.join(' · ')}` : '记录一次练习后，系统会解释今天的第一步。',
    trajectories: planned.trajectories,
    rolling7Day: planned.rolling7Day,
  }
}

export function skillForDashboard(state: WorkbenchState, skillId?: string): Skill | undefined {
  return skillId ? state.skills.find(skill => skill.id === skillId) : undefined
}
