import type { Question, QuestionSource } from '../types'
import { CURRENT_TYPES, questionSchema } from './schema'
export interface QuestionImportRecord extends Omit<Question, 'id' | 'promptHash' | 'createdAt' | 'updatedAt' | 'active'> { id?: string; promptHash?: string; createdAt?: string; updatedAt?: string; active?: boolean }
export interface ImportIssue { index: number; code: string; message: string; severity: 'warning' | 'error' }
export interface ImportPreview { found: number; valid: Question[]; warnings: ImportIssue[]; duplicates: ImportIssue[]; invalid: ImportIssue[] }
const text = (v: unknown) => String(v ?? '').trim().replace(/\s+/g, ' ')
export function calculateContentHash(record: Pick<Question, 'exam' | 'section' | 'questionType' | 'prompt' | 'options'>): string {
  const normalized = JSON.stringify([record.exam, record.section, record.questionType, text(record.prompt), record.options.map(o => `${text(o.id)}:${text(o.text)}:${text(o.label)}`).sort()]).toLowerCase()
  let hash = 2166136261
  for (let i = 0; i < normalized.length; i++) hash = Math.imul(hash ^ normalized.charCodeAt(i), 16777619)
  return `fnv1a-${(hash >>> 0).toString(16)}`
}
export function normalizeQuestionImport(input: unknown): QuestionImportRecord[] {
  const rows = Array.isArray(input) ? input : input && typeof input === 'object' && Array.isArray((input as { questions?: unknown }).questions) ? (input as { questions: unknown[] }).questions : []
  return rows.map(raw => { const row = raw && typeof raw === 'object' ? { ...raw } as Record<string, unknown> : {}; if (!row.answer && row.correctAnswer && typeof row.correctAnswer === 'object') { const a = row.correctAnswer as Record<string, unknown>; row.answer = { ...a, text: a.textAnswer ?? a.text, verification: row.answerVerification === 'user' ? 'unverified' : row.answerVerification ?? 'unverified' } }; if (!row.verification && row.verificationStatus) row.verification = row.verificationStatus === 'disputed' ? 'disputed' : String(row.verificationStatus).startsWith('verified') || row.verificationStatus === 'user_verified' ? 'verified' : 'unverified'; if (typeof row.compatibility === 'string') row.compatibility = { examVersion: row.examVersion, status: row.compatibility === 'skill_relevant' ? 'legacy' : row.compatibility }; return { ...row, options: Array.isArray(row.options) ? row.options.map((o, i) => typeof o === 'string' ? { id: `option-${i + 1}`, text: o } : o) : [], skillIds: row.skillIds ?? [], tags: row.tags ?? [], explanationIds: row.explanationIds ?? [], mediaIds: row.mediaIds ?? [] } as QuestionImportRecord })
}
function issue(index: number, code: string, message: string, severity: 'warning' | 'error' = 'warning'): ImportIssue { return { index, code, message, severity } }
export function validateQuestionImport(records: QuestionImportRecord[], sources: QuestionSource[]) {
  const warnings: ImportIssue[] = [], invalid: ImportIssue[] = [], valid: QuestionImportRecord[] = []
  records.forEach((record, index) => {
    const parsed = questionSchema.safeParse(record)
    if (!parsed.success) { invalid.push(issue(index, 'invalid_record', parsed.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('; '), 'error')); return }
    const q = parsed.data as QuestionImportRecord, source = sources.find(s => s.id === q.sourceId)
    if (!source) warnings.push(issue(index, 'unknown_source', '未注册来源，不能显示官方标签'))
    if (q.verification === 'disputed' || q.answer?.verification === 'disputed') warnings.push(issue(index, 'disputed_answer', '争议答案不会进入掌握度计算'))
    if (!q.answer || q.answer.verification === 'unverified') warnings.push(issue(index, 'unverified_answer', '缺少已验证答案；结果需人工记录'))
    if (q.compatibility.status === 'current' && !isCurrentFormat(q)) q.compatibility = { ...q.compatibility, status: 'legacy', reason: '版本或题型不属于当前格式' }
    if (q.compatibility.status === 'legacy') warnings.push(issue(index, 'legacy_question', '旧版题目仅作为技能训练资料'))
    if (q.storageMode === 'reference_only') warnings.push(issue(index, 'reference_only', '仅保存来源定位，需在原平台查看题目'))
    if (q.storageMode === 'full' && source && !['licensed', 'public', 'user_owned'].includes(source.rightsStatus)) { invalid.push(issue(index, 'rights_unknown', '此来源仅允许引用；请改为 reference_only', 'error')); return }
    if (q.answer?.verification === 'official' && !isOfficialSource(source)) { invalid.push(issue(index, 'false_official', '非 ETS 来源不能标记 ETS 官方答案', 'error')); return }
    valid.push(q)
  })
  return { valid, warnings, invalid }
}
export function previewQuestionImport(input: unknown, sources: QuestionSource[], existing: Question[] = []): ImportPreview {
  const rows = normalizeQuestionImport(input), checked = validateQuestionImport(rows, sources), duplicates: ImportIssue[] = []
  const ids = new Set(existing.map(q => q.id)), locators = new Set(existing.map(locator).filter(Boolean)), hashes = new Set(existing.filter(q => q.storageMode === 'full').map(calculateContentHash))
  const valid = checked.valid.map((record, index) => { const q = createQuestionFromImport(record), key = locator(q); if (ids.has(q.id) || (key && locators.has(key)) || (q.storageMode === 'full' && hashes.has(q.promptHash))) duplicates.push(issue(index, 'possible_duplicate', 'ID、来源定位或题目内容重复；保留已有记录')); ids.add(q.id); if (key) locators.add(key); if (q.storageMode === 'full') hashes.add(q.promptHash); return q })
  return { found: rows.length, valid, warnings: checked.warnings, duplicates, invalid: checked.invalid }
}
export function locator(q: QuestionImportRecord) { const n = q.sourceQuestionId ?? q.sourceQuestionNumber; return n ? `${q.sourceId}:${q.sourceSection ?? q.section}:${n}` : '' }
function isCurrentFormat(q: QuestionImportRecord) { return q.examVersion === (q.exam === 'toefl' ? 'TOEFL_2026' : 'GRE_CURRENT') && !!CURRENT_TYPES[`${q.exam}:${q.section}`]?.includes(q.questionType) }
export function isEligibleForCurrentMock(q: Question) { return q.active && q.compatibility.status === 'current' && isCurrentFormat(q) && q.verification !== 'disputed' && q.answer?.verification !== 'disputed' }
export function isOfficialSource(s?: QuestionSource) { return !!s && s.sourceType === 'official' && s.publisher === 'ETS' && s.verified && !!s.url && /^https:\/\/([a-z0-9-]+\.)*ets\.org\//i.test(s.url) }
export const EVIDENCE_WEIGHTS = { official: 1, verified: 0.85, userOwned: 0.8, thirdParty: 0.65, community: 0.3, unknown: 0.3 }
export function getQuestionEvidenceWeight(s: QuestionSource, q: Question) { if (q.verification === 'disputed' || q.answer?.verification === 'disputed') return 0; if (s.sourceType === 'community') return 0.3; if (s.sourceType === 'user_owned') return 0.8; if (s.sourceType === 'third_party') return 0.65; if (isOfficialSource(s) && q.answer?.verification === 'official') return 1; return q.verification === 'verified' ? 0.85 : 0.3 }
export function calculateFreshness(q: Question): 'current' | 'legacy' | 'incompatible' { return q.compatibility.status === 'incompatible' ? 'incompatible' : isCurrentFormat(q) && q.compatibility.status === 'current' ? 'current' : 'legacy' }
export function createQuestionFromImport(record: QuestionImportRecord): Question { const now = new Date().toISOString(); return { ...record, id: record.id ?? crypto.randomUUID(), promptHash: calculateContentHash(record), active: record.active ?? true, createdAt: record.createdAt ?? now, updatedAt: record.updatedAt ?? now } }

