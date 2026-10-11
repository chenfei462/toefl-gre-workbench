import { addDays, format, parseISO } from 'date-fns'
import type { PlanTemplate, ProgressSummary, StudyTask, UserProfile, WorkbenchState } from './types'

export const defaultTemplate: PlanTemplate = {
  toefl: [
    { section: 'reading', title: '长阅读精读', description: '完成一篇学术文章，标注主旨、证据与生词。', minutes: 35 },
    { section: 'listening', title: '听力精练', description: '完成一组讲座听力，记录信号词和错题原因。', minutes: 30 },
    { section: 'speaking', title: '口语计时训练', description: '完成两道独立口语题并复听录音。', minutes: 25 },
    { section: 'writing', title: '综合写作', description: '完成一篇综合写作，复盘结构与语言。', minutes: 35 },
  ],
  gre: [
    { section: 'vocabulary', title: '高频词复习', description: '复习 40 个高频词，用例句巩固语境。', minutes: 25 },
    { section: 'quant', title: '数学计时训练', description: '完成一组数学计时题，整理易错模型。', minutes: 35 },
    { section: 'verbal', title: 'Verbal 逻辑训练', description: '完成填空与阅读题，记录干扰项类型。', minutes: 35 },
  ],
}

export function generatePlan(profile: UserProfile, template: PlanTemplate = defaultTemplate): StudyTask[] {
  const tasks: StudyTask[] = []
  let cursor = 0
  for (let dayIndex = 0; dayIndex < 30; dayIndex += 1) {
    const date = format(addDays(parseISO(profile.startDate), dayIndex), 'yyyy-MM-dd')
    const isStudyDay = dayIndex % 7 < profile.studyDaysPerWeek
    profile.examTypes.forEach((exam) => {
      const items = template[exam]
      const item = items[dayIndex % items.length]
      const minutes = isStudyDay ? Math.max(15, Math.round(item.minutes * (profile.dailyMinutes / 90) * (profile.intensity === 'light' ? 0.8 : profile.intensity === 'intensive' ? 1.2 : 1))) : 15
      tasks.push({ id: `task-${dayIndex + 1}-${exam}-${cursor++}`, dayIndex: dayIndex + 1, plannedDate: date, exam, section: isStudyDay ? item.section : (exam === 'toefl' ? 'writing' : 'verbal'), title: isStudyDay ? item.title : '轻复盘与恢复', description: isStudyDay ? item.description : '整理本周错题，做一件轻量复习，给大脑留出恢复时间。', estimatedMinutes: minutes, resourceIds: [], status: 'todo' })
    })
  }
  return tasks
}

export function getTodayTasks(tasks: StudyTask[], isoDate: string): StudyTask[] {
  return tasks.filter((task) => task.plannedDate === isoDate)
}

export function calculateProgress(state: WorkbenchState): ProgressSummary {
  const completedTasks = state.tasks.filter((task) => task.status === 'done').length
  const totals = state.practiceEntries.reduce((acc, entry) => ({ correct: acc.correct + (entry.correct ?? 0), total: acc.total + (entry.total ?? 0), minutes: acc.minutes + (entry.durationMinutes ?? 0) }), { correct: 0, total: 0, minutes: 0 })
  const doneDates = new Set(state.tasks.filter((task) => task.status === 'done').map((task) => task.plannedDate))
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 30; i += 1) {
    const date = format(addDays(today, -i), 'yyyy-MM-dd')
    if (!doneDates.has(date)) break
    streak += 1
  }
  return { completedTasks, totalTasks: state.tasks.length, completionRate: state.tasks.length ? Math.round((completedTasks / state.tasks.length) * 100) : 0, practiceAccuracy: totals.total ? Math.round((totals.correct / totals.total) * 100) : 0, studyMinutes: totals.minutes + state.tasks.filter((task) => task.status === 'done').reduce((sum, task) => sum + task.estimatedMinutes, 0), streak }
}
