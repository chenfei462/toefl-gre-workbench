import type { Attempt, Question, QuestionSource } from '../types'
import { calculateContentHash, locator, previewQuestionImport, type QuestionImportRecord } from './domain'
import { defaultSources } from './sources'

export interface QuestionSearch { exam?: Question['exam']; section?: string; sourceTier?: string; sourceId?: string; questionType?: string; skillId?: string; difficulty?: number; compatibility?: Question['compatibility']['status']; text?: string; }
export interface QuestionRepository { getById(id: string): Promise<Question | undefined>; search(query?: QuestionSearch): Promise<Question[]>; importQuestions(records: QuestionImportRecord[]): Promise<{ added: Question[]; duplicates: number }>; update(question: Question): Promise<void>; markInactive(id: string): Promise<void>; listSources(): Promise<QuestionSource[]> }

export interface QuestionReferenceReconciliation {
  reconciledAttempts: Attempt[]
  orphanedAttempts: Attempt[]
  orphanedAttemptIds: string[]
  orphanedCount: number
  resolvedCount: number
}

export function isQuestionBackedAttempt(attempt: Attempt): boolean {
  return isQuestionBankLinkedAttempt(attempt) && attempt.provenance !== 'reference'
}

export function isQuestionBankLinkedAttempt(attempt: Attempt): boolean {
  return Boolean(attempt.questionId) && attempt.provenance !== 'batch_summary'
}

function updateReferenceStatuses(attempts: Attempt[], status: (attempt: Attempt) => NonNullable<Attempt['questionReferenceStatus']>, isDisputed?: (attempt: Attempt) => boolean): Attempt[] {
  let changed = false
  const updated = attempts.map(attempt => {
    if (!isQuestionBankLinkedAttempt(attempt)) return attempt
    const backed = isQuestionBackedAttempt(attempt)
    const questionReferenceStatus = backed ? status(attempt) : attempt.questionReferenceStatus
    const addDisputeExclusion = isDisputed?.(attempt) && !attempt.excludeFromMastery
    if (attempt.questionReferenceStatus === questionReferenceStatus && !addDisputeExclusion) return attempt
    changed = true
    return { ...attempt, ...(backed ? { questionReferenceStatus } : {}), ...(addDisputeExclusion ? { excludeFromMastery: true } : {}) }
  })
  return changed ? updated : attempts
}

/** Cached validity cannot be trusted until this browser's separate question bank is read. */
export function markQuestionReferencesPending(attempts: Attempt[]): Attempt[] {
  return updateReferenceStatuses(attempts, () => 'pending')
}

/**
 * Check question-backed attempts against the question bank without changing either input.
 * Batch summaries and reference-only attempts do not promise a durable full-question row,
 * so they are excluded from orphan checks. A matching stored reference can still be disputed.
 */
export function reconcileQuestionReferences(attempts: Attempt[], questions: Question[]): QuestionReferenceReconciliation {
  const questionById = new Map(questions.map(question => [question.id, question]))
  const referenced = attempts.filter(isQuestionBackedAttempt)
  const orphanedAttempts = referenced.filter(attempt => !questionById.has(attempt.questionId!))
  return {
    reconciledAttempts: updateReferenceStatuses(attempts, attempt => questionById.has(attempt.questionId!) ? 'valid' : 'orphaned', attempt => {
      const question = questionById.get(attempt.questionId!)
      // A learning backup may predate a bank dispute. Keep its historical grade,
      // but never restore disputed evidence or clear an existing exclusion.
      return question?.verification === 'disputed' || question?.answer?.verification === 'disputed'
    }),
    orphanedAttempts,
    orphanedAttemptIds: orphanedAttempts.map(attempt => attempt.id),
    orphanedCount: orphanedAttempts.length,
    resolvedCount: referenced.length - orphanedAttempts.length,
  }
}

export class MemoryQuestionRepository implements QuestionRepository {
  public questions: Question[]
  public sources: QuestionSource[]
  constructor(questions: Question[] = [], sources: QuestionSource[] = defaultSources) { this.questions = questions; this.sources = sources }
  async getById(id: string) { return this.questions.find((question) => question.id === id) }
  async search(query: QuestionSearch = {}) { return searchQuestions(this.questions, this.sources, query) }
  async importQuestions(records: QuestionImportRecord[]) { const result = mergeQuestionImport(records, this.sources, this.questions); this.questions = result.questions; return { added: result.added, duplicates: result.duplicates } }
  async update(question: Question) { this.questions = this.questions.map((item) => item.id === question.id ? question : item) }
  async markInactive(id: string) { const question = this.questions.find((item) => item.id === id); if (question) question.active = false }
  async listSources() { return this.sources }
}

export function searchQuestions(questions: Question[], sources: QuestionSource[], q: QuestionSearch = {}) { return questions.filter(x => x.active && (!q.exam || x.exam === q.exam) && (!q.section || x.section === q.section) && (!q.sourceId || x.sourceId === q.sourceId) && (!q.sourceTier || sources.find(s => s.id === x.sourceId)?.sourceTier === q.sourceTier) && (!q.questionType || x.questionType === q.questionType) && (!q.skillId || x.skillIds.includes(q.skillId)) && (!q.difficulty || x.difficulty === q.difficulty) && (!q.compatibility || x.compatibility.status === q.compatibility) && (!q.text || [x.prompt, x.title, x.sourceQuestionId, ...x.tags].join(' ').toLowerCase().includes(q.text.toLowerCase()))) }

export function mergeQuestionImport(records: QuestionImportRecord[], sources: QuestionSource[], existing: Question[]) {
  const preview = previewQuestionImport(records, sources, existing), questions = [...existing], addedIds: string[] = [], conflicts: Question[] = []
  const duplicates = new Set(preview.duplicates.map(d => d.index))
  const answerKey = (q: Question) => JSON.stringify({ options: [...(q.answer?.optionIds ?? (q.answer?.optionId ? [q.answer.optionId] : []))].sort(), text: q.answer?.text?.trim().toLowerCase(), number: q.answer?.numericAnswer, accepted: [...(q.answer?.acceptedAnswers ?? [])].sort() })
  preview.valid.forEach((q, index) => {
    if (!duplicates.has(index)) { questions.unshift(q); addedIds.push(q.id); return }
    const oldIndex = questions.findIndex(old => old.id === q.id || (locator(old) && locator(old) === locator(q)) || (old.storageMode === 'full' && q.storageMode === 'full' && calculateContentHash(old) === q.promptHash))
    const old = questions[oldIndex]
    if (old?.answer && q.answer && answerKey(old) !== answerKey(q)) { conflicts.push(old); questions[oldIndex] = { ...old, verification: 'disputed', answer: { ...old.answer, verification: 'disputed' }, updatedAt: new Date().toISOString() } }
  })
  return { questions, added: questions.filter(q => addedIds.includes(q.id)), duplicates: duplicates.size, conflicts }
}
