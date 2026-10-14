import type { ErrorRecord, ErrorType, WorkbenchState } from '../types'
import { createVocabularyCard } from './vocabulary'

export const TRAP_TYPES = ['not_mentioned', 'opposite', 'too_broad', 'too_narrow', 'wrong_scope', 'half_true', 'keyword_match', 'inference_overreach', 'logic_direction', 'contrast_missed', 'support_missed', 'tone', 'vocab_gap', 'near_synonym_trap'] as const
export type TrapType = typeof TRAP_TYPES[number]
export const ERROR_TYPES: ErrorType[] = ['vocabulary', 'knowledge', 'concept', 'grammar', 'logic', 'misread', 'calculation', 'strategy', 'time_pressure', 'careless', 'pronunciation', 'fluency', 'listening_detail', 'memory', 'unknown']
export interface ErrorAnalysisDraft { skillIds: string[]; errorType: ErrorType; trapType?: string; myReason: string; correctReason: string; betterStrategy: string }

export function updateErrorAnalysis(state: WorkbenchState, id: string, draft: ErrorAnalysisDraft): WorkbenchState {
  const error = state.errorRecords.find(e => e.id === id)
  if (!error) throw new Error('找不到这条错题')
  if (!draft.skillIds.length || draft.skillIds.some(id => !state.skills.some(s => s.id === id && s.exam === error.exam && (s.section === error.section || error.skillIds.includes(s.id))))) throw new Error('请选择本考试科目或已有的关联技能')
  if (!ERROR_TYPES.includes(draft.errorType)) throw new Error('请选择有效错因')
  if (draft.trapType && !TRAP_TYPES.includes(draft.trapType as TrapType) && draft.trapType !== error.trapType) throw new Error('请选择有效陷阱类型')
  const details = { ...draft, skillIds: [...new Set(draft.skillIds)], trapType: draft.trapType || undefined, myReason: draft.myReason.trim(), correctReason: draft.correctReason.trim(), betterStrategy: draft.betterStrategy.trim() }
  const errorRecords = state.errorRecords.map(e => e.id === id ? { ...e, ...details } : e)
  const attemptSkills = [...new Set(errorRecords.filter(e => e.attemptId === error.attemptId).flatMap(e => e.skillIds))]
  return { ...state, errorRecords, attempts: state.attempts.map(a => a.id === error.attemptId ? { ...a, skillIds: attemptSkills, errorType: details.errorType } : a) }
}

export function analyzeTraps(errors: ErrorRecord[]) {
  const counts = new Map<string, { trapType: string; count: number; unresolved: number }>()
  for (const error of errors) {
    if (!error.trapType) continue
    const row = counts.get(error.trapType) ?? { trapType: error.trapType, count: 0, unresolved: 0 }
    row.count += 1
    row.unresolved += Number(error.status !== 'resolved')
    counts.set(error.trapType, row)
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.trapType.localeCompare(b.trapType))
}

export function addErrorVocabulary(state: WorkbenchState, errorId: string, word: string, meaning: string, now = new Date()): WorkbenchState {
  const error = state.errorRecords.find(e => e.id === errorId)
  if (!error) throw new Error('找不到这条错题')
  if (!word.trim()) throw new Error('请输入单词')
  const deck = error.exam === 'gre' ? 'GRE' : 'TOEFL'
  if (state.vocabulary.some(v => (v.deck ?? 'GRE') === deck && v.word.toLocaleLowerCase() === word.trim().toLocaleLowerCase())) return state
  const attempt = state.attempts.find(a => a.id === error.attemptId)
  const source = ['Error ' + error.id, 'Attempt ' + error.attemptId, attempt?.source, attempt?.sourceReference?.sourceQuestionId, 'Skills ' + error.skillIds.join(', ')].filter(Boolean).join(' · ')
  return { ...state, vocabulary: [...state.vocabulary, createVocabularyCard(word, meaning, now, source, undefined, deck)] }
}
