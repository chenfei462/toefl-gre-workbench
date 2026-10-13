import { describe, expect, it } from 'vitest'
import { calculateProgress, generatePlan, getTodayTasks } from './domain'
import type { PlanTemplate, UserProfile, WorkbenchState } from './types'

const profile: UserProfile = {
  examTypes: ['toefl', 'gre'],
  startDate: '2026-10-11',
  targetScores: { toefl: '105', gre: '325' },
  currentScores: { toefl: '92', gre: '308' },
  dailyMinutes: 90,
  studyDaysPerWeek: 6,
  intensity: 'standard',
}

const template: PlanTemplate = {
  toefl: [
    { section: 'reading', title: '长阅读精读', description: '完成一篇文章并整理证据链。', minutes: 35 },
    { section: 'writing', title: '综合写作', description: '完成一篇综合写作并复盘。', minutes: 35 },
  ],
  gre: [
    { section: 'vocabulary', title: '高频词复习', description: '复习 40 个高频词并造句。', minutes: 25 },
    { section: 'quant', title: '数学计时训练', description: '完成一组数学计时题。', minutes: 35 },
  ],
}

describe('study domain', () => {
  it('generates 30 days of tasks across selected exams and skips rest days', () => {
    const tasks = generatePlan(profile, template)

    expect(tasks.length).toBeGreaterThan(30)
    expect(new Set(tasks.map((task) => task.dayIndex)).size).toBe(30)
    expect(tasks.every((task) => task.plannedDate >= profile.startDate)).toBe(true)
  })

  it('calculates completion and practice progress', () => {
    const tasks = generatePlan(profile, template)
    const state: WorkbenchState = {
      schemaVersion: 1,
      profile,
      tasks: tasks.map((task, index) => index < 2 ? { ...task, status: 'done' as const } : task),
      resources: [],
      practiceEntries: [{ id: 'p1', date: '2026-10-11', exam: 'toefl', section: 'reading', correct: 8, total: 10, durationMinutes: 30, errorTags: [] }],
      weeklyReviews: [],
      examProfiles: { toefl: { exam: 'toefl', targetScore: 5.5 }, gre: { exam: 'gre', targetScore: 330 } }, skills: [], attempts: [], errorRecords: [], reviewAttempts: [], mastery: [], checkpoints: [], vocabulary: [], prescriptions: [], legacyPracticeEntries: [], userQuestionStates: [],
    }

    const progress = calculateProgress(state)
    expect(progress.completedTasks).toBe(2)
    expect(progress.practiceAccuracy).toBe(80)
    expect(progress.totalTasks).toBe(tasks.length)
  })

  it('returns today tasks based on an ISO date', () => {
    const tasks = generatePlan(profile, template)
    expect(getTodayTasks(tasks, '2026-10-11').length).toBeGreaterThan(0)
    expect(getTodayTasks(tasks, '2027-01-01')).toHaveLength(0)
  })
})
