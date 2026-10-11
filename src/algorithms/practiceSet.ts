import type { Question } from '../types'
import { isEligibleForCurrentMock } from '../questionDatabase/domain'

export interface PracticeSetOptions {
  availableMinutes: number
  exam: Question['exam']
  weakSkillIds: string[]
  reviewDueQuestionIds?: string[]
  desiredDifficulty?: 1 | 2 | 3 | 4 | 5
  finalWeek?: boolean
  sourceIds?: string[]
  currentFormatOnly?: boolean
}

export function generatePracticeSet(questions: Question[], options: PracticeSetOptions): Question[] {
  const pool = questions.filter((question) => question.exam === options.exam && (options.currentFormatOnly === false ? question.active && question.verification !== 'disputed' && question.answer?.verification !== 'disputed' : isEligibleForCurrentMock(question)) && (!options.sourceIds || options.sourceIds.includes(question.sourceId)) && (!options.desiredDifficulty || !question.difficulty || question.difficulty === options.desiredDifficulty))
  const due = pool.filter((question) => options.reviewDueQuestionIds?.includes(question.id))
  const weak = pool.filter((question) => !due.includes(question) && question.skillIds.some((id) => options.weakSkillIds.includes(id)))
  const maintenance = pool.filter((question) => !weak.includes(question) && !due.includes(question))
  const target = Math.max(0, Math.floor(options.availableMinutes / 2))
  const ratio = options.finalWeek ? [0.3, 0.4, 0.3] : [0.5, 0.3, 0.2]
  const ordered = [...take(weak, Math.round(target * ratio[0])), ...take(due, Math.round(target * ratio[1])), ...take(maintenance, Math.round(target * ratio[2]))]
  const filtered = options.desiredDifficulty ? ordered.filter((question) => !question.difficulty || question.difficulty === options.desiredDifficulty) : ordered
  return unique([...filtered, ...weak, ...due, ...maintenance]).slice(0, target)
}

function take<T>(items: T[], count: number): T[] { return items.slice(0, Math.max(0, count)) }
function unique(items: Question[]): Question[] { return items.filter((item, index) => items.findIndex((candidate) => candidate.id === item.id) === index) }
