import { z } from 'zod'
import { answerSchema } from './questionDatabase/schema'
import { markQuestionReferencesPending } from './questionDatabase/repository'
import type { Exam, PracticeEntry, StudyTask, UserProfile, WorkbenchState } from './types'

const examSchema = z.enum(['toefl', 'gre'])
const sourceTypeSchema = z.enum(['official', 'third_party', 'self_created', 'mock'])
const errorTypeSchema = z.enum(['vocabulary', 'knowledge', 'concept', 'grammar', 'logic', 'misread', 'calculation', 'strategy', 'time_pressure', 'careless', 'pronunciation', 'fluency', 'listening_detail', 'memory', 'unknown'])
const attemptSchema = z.object({ id: z.string(), date: z.string(), exam: examSchema, section: z.string(), questionType: z.string().optional(), skillIds: z.array(z.string()), source: z.string().optional(), sourceType: sourceTypeSchema, correct: z.boolean().optional(), rawScore: z.number().optional(), timeSeconds: z.number().optional(), difficulty: z.number().int().min(1).max(5).optional(), confidence: z.number().int().min(1).max(5).optional(), errorType: errorTypeSchema.optional(), note: z.string().optional(), reviewed: z.boolean(), taskId: z.string().optional(), questionId: z.string().optional(), questionReferenceStatus: z.enum(['pending', 'valid', 'orphaned']).optional(), sessionId: z.string().optional(), sourceReference: z.object({ sourceId: z.string(), sourceQuestionId: z.string().optional(), locator: z.string().optional(), accessedAt: z.string().optional() }).optional(), selectedAnswer: answerSchema.optional(), evidenceWeight: z.number().min(0).max(1).optional(), excludeFromMastery: z.boolean().optional(), provenance: z.enum(['question', 'reference', 'batch_summary']).optional(), constructedResponse: z.object({ response: z.string().optional(), feedback: z.string().optional(), rubricScore: z.number().optional() }).optional() })
const errorRecordSchema = z.object({ id: z.string(), attemptId: z.string(), exam: examSchema, section: z.string(), questionType: z.string().optional(), skillIds: z.array(z.string()), errorType: errorTypeSchema, explanation: z.string().optional(), correctedUnderstanding: z.string().optional(), createdAt: z.string(), status: z.enum(['new', 'reviewing', 'resolved', 'reopened']), reviewCount: z.number().int().nonnegative(), nextReviewDate: z.string().optional(), resolvedAt: z.string().optional() })

const userQuestionStateSchema = z.object({ questionId: z.string(), timesSeen: z.number().int().nonnegative(), lastResult: z.enum(['correct', 'incorrect', 'ungraded']).optional(), lastAttemptDate: z.string().optional(), personalDifficulty: z.number().int().min(1).max(5).optional(), bookmarked: z.boolean() })
const v2Schema = z.object({ schemaVersion: z.literal(2), profile: z.record(z.string(), z.unknown()), examProfiles: z.object({ toefl: z.record(z.string(), z.unknown()), gre: z.record(z.string(), z.unknown()) }), tasks: z.array(z.record(z.string(), z.unknown())), resources: z.array(z.record(z.string(), z.unknown())), practiceEntries: z.array(z.record(z.string(), z.unknown())), weeklyReviews: z.array(z.record(z.string(), z.unknown())), skills: z.array(z.record(z.string(), z.unknown())), attempts: z.array(attemptSchema), errorRecords: z.array(errorRecordSchema), reviewAttempts: z.array(z.record(z.string(), z.unknown())), mastery: z.array(z.record(z.string(), z.unknown())), checkpoints: z.array(z.record(z.string(), z.unknown())), vocabulary: z.array(z.record(z.string(), z.unknown())), prescriptions: z.array(z.record(z.string(), z.unknown())), legacyPracticeEntries: z.array(z.record(z.string(), z.unknown())), userQuestionStates: z.array(userQuestionStateSchema).default([]), migrationWarnings: z.array(z.string()).optional() })

export const defaultSkills = [
  { id: 'gre-vocabulary', exam: 'gre' as const, section: 'verbal', name: 'Vocabulary', priorityWeight: 1 }, { id: 'gre-logic', exam: 'gre' as const, section: 'verbal', name: 'Contrast / Inference Logic', priorityWeight: 1 }, { id: 'toefl-vocabulary', exam: 'toefl' as const, section: 'reading', name: 'Vocabulary in Context', priorityWeight: 1 }, { id: 'toefl-logic', exam: 'toefl' as const, section: 'reading', name: 'Reading Logic', priorityWeight: 1 }, { id: 'gre-issue', exam: 'gre' as const, section: 'analytical_writing', questionType: 'analyze_issue', name: 'Analyze an Issue', priorityWeight: 1 },
  { id: 'gre-text-completion', exam: 'gre' as const, section: 'verbal', questionType: 'text_completion', name: 'Text Completion', priorityWeight: 1 }, { id: 'gre-sentence-equivalence', exam: 'gre' as const, section: 'verbal', questionType: 'sentence_equivalence', name: 'Sentence Equivalence', priorityWeight: 1 }, { id: 'gre-reading-comprehension', exam: 'gre' as const, section: 'verbal', questionType: 'reading_comprehension', name: 'Reading Comprehension', priorityWeight: 1 }, { id: 'gre-arithmetic', exam: 'gre' as const, section: 'quant', questionType: 'arithmetic', name: 'Arithmetic', priorityWeight: 1 }, { id: 'gre-algebra', exam: 'gre' as const, section: 'quant', questionType: 'algebra', name: 'Algebra', priorityWeight: 1 }, { id: 'gre-geometry', exam: 'gre' as const, section: 'quant', questionType: 'geometry', name: 'Geometry', priorityWeight: 1 }, { id: 'gre-data-analysis', exam: 'gre' as const, section: 'quant', questionType: 'data_analysis', name: 'Data Analysis', priorityWeight: 1 },
  { id: 'toefl-reading-words', exam: 'toefl' as const, section: 'reading', questionType: 'complete_the_words', name: 'Complete the Words', priorityWeight: 1 }, { id: 'toefl-reading-daily-life', exam: 'toefl' as const, section: 'reading', questionType: 'read_daily_life', name: 'Read in Daily Life', priorityWeight: 1 }, { id: 'toefl-reading-academic', exam: 'toefl' as const, section: 'reading', questionType: 'read_academic_passage', name: 'Read an Academic Passage', priorityWeight: 1 }, { id: 'toefl-listening-response', exam: 'toefl' as const, section: 'listening', questionType: 'choose_response', name: 'Listen and Choose a Response', priorityWeight: 1 }, { id: 'toefl-listening-conversation', exam: 'toefl' as const, section: 'listening', questionType: 'conversation', name: 'Listen to a Conversation', priorityWeight: 1 }, { id: 'toefl-listening-announcement', exam: 'toefl' as const, section: 'listening', questionType: 'announcement', name: 'Listen to an Announcement', priorityWeight: 1 }, { id: 'toefl-listening-talk', exam: 'toefl' as const, section: 'listening', questionType: 'academic_talk', name: 'Listen to an Academic Talk', priorityWeight: 1 }, { id: 'toefl-writing-sentence', exam: 'toefl' as const, section: 'writing', questionType: 'build_sentence', name: 'Build a Sentence', priorityWeight: 1 }, { id: 'toefl-writing-email', exam: 'toefl' as const, section: 'writing', questionType: 'write_email', name: 'Write an Email', priorityWeight: 1 }, { id: 'toefl-writing-discussion', exam: 'toefl' as const, section: 'writing', questionType: 'academic_discussion', name: 'Write for an Academic Discussion', priorityWeight: 1 }, { id: 'toefl-speaking-repeat', exam: 'toefl' as const, section: 'speaking', questionType: 'listen_repeat', name: 'Listen and Repeat', priorityWeight: 1 }, { id: 'toefl-speaking-interview', exam: 'toefl' as const, section: 'speaking', questionType: 'interview', name: 'Take an Interview', priorityWeight: 1 },
]

function createExamProfiles(profile: Record<string, unknown>) {
  const targetScores = isRecord(profile.targetScores) ? profile.targetScores : {}; const currentScores = isRecord(profile.currentScores) ? profile.currentScores : {}
  const toeflTarget = finiteNumber(targetScores.toefl, 5.5); const toeflCurrent = finiteNumber(currentScores.toefl, 0); const greTarget = finiteNumber(targetScores.gre, 330); const greCurrent = finiteNumber(currentScores.gre, 0)
  return { toefl: { exam: 'toefl' as Exam, targetScore: toeflTarget > 6 ? 5.5 : toeflTarget, baselineScore: toeflCurrent > 0 && toeflCurrent <= 6 ? toeflCurrent : undefined, baselineSource: toeflCurrent > 0 && toeflCurrent <= 6 ? 'legacy' as const : undefined }, gre: { exam: 'gre' as Exam, targetScore: greTarget, baselineScore: greCurrent > 0 ? greCurrent : undefined, baselineSource: greCurrent > 0 ? 'legacy' as const : undefined } }
}

export function migrateState(input: unknown): WorkbenchState {
  const raw = isRecord(input) ? input : {}; const warnings: string[] = []
  if (!isRecord(input)) warnings.push('unrecognized V1 payload; initialized safe defaults')
  if (raw.schemaVersion === 2) return parseWorkbenchState(raw)
  const profile = normalizeProfile(raw.profile, warnings); const practiceEntries = normalizePracticeEntries(raw.practiceEntries, warnings); const tasks = normalizeTasks(raw.tasks, warnings)
  const legacyToefl = [profile.currentScores.toefl, profile.targetScores.toefl].map(value => Number(value)).find(value => Number.isFinite(value) && value > 6 && value <= 120)
  if (legacyToefl !== undefined) warnings.push(`legacy TOEFL score ${legacyToefl} retained in profile text; not converted to official 1-6 score`)
  return { schemaVersion: 2, profile, examProfiles: createExamProfiles(profile as unknown as Record<string, unknown>), tasks, resources: objectArray(raw.resources, 'resources', warnings) as unknown as WorkbenchState['resources'], practiceEntries, weeklyReviews: objectArray(raw.weeklyReviews, 'weeklyReviews', warnings) as unknown as WorkbenchState['weeklyReviews'], skills: defaultSkills, attempts: [], errorRecords: [], reviewAttempts: [], mastery: [], checkpoints: [], vocabulary: [], prescriptions: [], legacyPracticeEntries: practiceEntries.map((entry) => ({ ...entry })), userQuestionStates: [], migrationWarnings: warnings.length ? warnings : undefined }
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value) }
function finiteNumber(value: unknown, fallback: number) { const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN; return Number.isFinite(number) ? number : fallback }
function normalizeProfile(value: unknown, warnings: string[]): UserProfile {
  const raw = isRecord(value) ? value : {}; if (value !== undefined && !isRecord(value)) warnings.push('invalid V1 profile replaced with safe defaults')
  const examTypes: Exam[] = Array.isArray(raw.examTypes) ? raw.examTypes.filter((exam): exam is Exam => exam === 'toefl' || exam === 'gre') : ['toefl', 'gre']
  const targetScores = isRecord(raw.targetScores) ? Object.fromEntries(Object.entries(raw.targetScores).filter(([, score]) => typeof score === 'string' || typeof score === 'number').map(([exam, score]) => [exam, String(score)])) : {}
  const currentScores = isRecord(raw.currentScores) ? Object.fromEntries(Object.entries(raw.currentScores).filter(([, score]) => typeof score === 'string' || typeof score === 'number').map(([exam, score]) => [exam, String(score)])) : {}
  return { examTypes: examTypes.length ? examTypes : ['toefl', 'gre'], startDate: typeof raw.startDate === 'string' && raw.startDate ? raw.startDate : new Date().toISOString().slice(0, 10), targetScores, currentScores, dailyMinutes: Math.max(1, finiteNumber(raw.dailyMinutes, 45)), studyDaysPerWeek: Math.min(7, Math.max(1, Math.round(finiteNumber(raw.studyDaysPerWeek, 6)))), intensity: raw.intensity === 'light' || raw.intensity === 'intensive' ? raw.intensity : 'standard' }
}
function objectArray(value: unknown, name: string, warnings: string[]): Record<string, unknown>[] { if (value === undefined) return []; if (!Array.isArray(value)) { warnings.push(`invalid V1 ${name} retained in recovery backup`); return [] } const valid = value.filter(isRecord); if (valid.length !== value.length) warnings.push(`invalid V1 ${name} entries retained in recovery backup`); return valid }
function normalizePracticeEntries(value: unknown, warnings: string[]): PracticeEntry[] { return objectArray(value, 'practiceEntries', warnings).map((entry, index) => ({ ...entry, id: typeof entry.id === 'string' ? entry.id : `legacy-practice-${index + 1}`, date: typeof entry.date === 'string' ? entry.date : new Date().toISOString().slice(0, 10), exam: entry.exam === 'toefl' ? 'toefl' : 'gre', section: typeof entry.section === 'string' ? entry.section : 'verbal', correct: typeof entry.correct === 'number' ? entry.correct : undefined, total: typeof entry.total === 'number' ? entry.total : undefined, score: typeof entry.score === 'number' ? entry.score : undefined, durationMinutes: typeof entry.durationMinutes === 'number' ? entry.durationMinutes : undefined, errorTags: Array.isArray(entry.errorTags) ? entry.errorTags.map(String) : [], note: typeof entry.note === 'string' ? entry.note : undefined })) as PracticeEntry[] }
function normalizeTasks(value: unknown, warnings: string[]): StudyTask[] { return objectArray(value, 'tasks', warnings).map((task, index) => ({ ...task, id: typeof task.id === 'string' ? task.id : `legacy-task-${index + 1}`, dayIndex: Math.max(1, Math.round(finiteNumber(task.dayIndex, index + 1))), plannedDate: typeof task.plannedDate === 'string' ? task.plannedDate : new Date().toISOString().slice(0, 10), exam: task.exam === 'toefl' ? 'toefl' : 'gre', section: typeof task.section === 'string' ? task.section as StudyTask['section'] : 'verbal', title: typeof task.title === 'string' ? task.title : 'Legacy task', description: typeof task.description === 'string' ? task.description : '', estimatedMinutes: Math.max(1, finiteNumber(task.estimatedMinutes, 15)), resourceIds: Array.isArray(task.resourceIds) ? task.resourceIds.map(String) : [], status: task.status === 'done' || task.status === 'in_progress' || task.status === 'skipped' ? task.status : 'todo', note: typeof task.note === 'string' ? task.note : undefined, completedAt: typeof task.completedAt === 'string' ? task.completedAt : undefined })) as StudyTask[] }

export function parseWorkbenchState(input: unknown): WorkbenchState {
  const parsed = v2Schema.parse(input) as unknown as WorkbenchState
  parsed.skills = [...parsed.skills, ...defaultSkills.filter(s => !parsed.skills.some(x => x.id === s.id))]; const toefl = parsed.examProfiles.toefl
  if (toefl.targetScore > 6 || (toefl.baselineScore !== undefined && toefl.baselineScore > 6)) {
    parsed.migrationWarnings = [...(parsed.migrationWarnings ?? []), `legacy TOEFL score retained in original profile data; not converted to official 1-6 score (target=${toefl.targetScore}, baseline=${toefl.baselineScore ?? 'unset'})`]
    parsed.examProfiles = { ...parsed.examProfiles, toefl: { ...toefl, targetScore: 5.5, baselineScore: undefined, latestScore: undefined } }
  }
  return parsed
}

function prepareQuestionReferenceCheck(state: WorkbenchState): WorkbenchState { return { ...state, attempts: markQuestionReferencesPending(state.attempts) } }

const KEY = 'toefl-gre-workbench:v2'; const RECOVERY_KEY = 'toefl-gre-workbench:recovery'
export interface StorageRecovery { rawPayload: string; reason: string; recoveredAt: string }
let lastRecovery: StorageRecovery | null = null
function preserveRecovery(rawPayload: string, reason: string) {
  // Keep the original backup until explicit clearing, even if later data also needs recovery.
  if (localStorage.getItem(RECOVERY_KEY) !== null) return
  lastRecovery = { rawPayload, reason, recoveredAt: new Date().toISOString() }
  localStorage.setItem(RECOVERY_KEY, rawPayload)
}

export const storage = {
  load(): WorkbenchState | null {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem('toefl-gre-workbench:v1')
    if (!raw) return null
    try {
      const migrated = prepareQuestionReferenceCheck(migrateState(JSON.parse(raw)))
      localStorage.setItem(KEY, JSON.stringify(migrated))
      if (migrated.migrationWarnings?.length) preserveRecovery(raw, migrated.migrationWarnings.join('; '))
      return migrated
    } catch (error) {
      preserveRecovery(raw, `invalid stored workbench payload: ${error instanceof Error ? error.message : 'parse failed'}`)
      return null
    }
  },
  getRecovery() { if (lastRecovery) return lastRecovery; const raw = localStorage.getItem(RECOVERY_KEY); return raw ? { rawPayload: raw, reason: 'stored workbench payload preserved for recovery', recoveredAt: '' } : null },
  save(state: WorkbenchState) { localStorage.setItem(KEY, JSON.stringify(state)) },
  clear() { localStorage.removeItem(KEY); localStorage.removeItem('toefl-gre-workbench:v1'); localStorage.removeItem(RECOVERY_KEY); lastRecovery = null },
  export(state: WorkbenchState) { return JSON.stringify(state, null, 2) },
  import(raw: string) { return prepareQuestionReferenceCheck(migrateState(JSON.parse(raw))) },
}


