import { z } from 'zod'
import { addDays, format, parseISO } from 'date-fns'
import type { Attempt, ErrorRecord, WorkbenchState } from '../types'
export const mockSessionSchema = z.object({ id: z.string().min(1), exam: z.enum(['toefl', 'gre']), date: z.iso.date(), source: z.string().trim().min(1), kind: z.enum(['official', 'section_test', 'practice', 'community']), overall: z.number().finite().optional(), sectionScores: z.record(z.string(), z.number().finite()), durationMinutes: z.number().positive().max(600), conditions: z.string(), evidence: z.array(z.object({ skillId: z.string(), correct: z.number().int().nonnegative(), total: z.number().int().positive().max(500) }).refine(e => e.correct <= e.total)) }).superRefine((m, ctx) => {
  const valid = (score: number, section?: string) => m.exam === 'toefl' ? score >= 1 && score <= 6 && score * 2 === Math.round(score * 2) : section === 'analytical_writing' ? score >= 0 && score <= 6 && score * 2 === Math.round(score * 2) : section ? score >= 130 && score <= 170 && Number.isInteger(score) : score >= 260 && score <= 340 && Number.isInteger(score)
  const sections = m.exam === 'toefl' ? ['reading', 'listening', 'speaking', 'writing'] : ['verbal', 'quant', 'analytical_writing']
  if (m.overall !== undefined && !valid(m.overall) || Object.entries(m.sectionScores).some(([s, n]) => !sections.includes(s) || !valid(n, s))) ctx.addIssue({ code: 'custom', message: '请使用当前考试分制的真实成绩；不得用正确率换算官方分数' })
})
export type MockSession = z.infer<typeof mockSessionSchema>
export function recordMock(state: WorkbenchState, input: MockSession): WorkbenchState {
  const mock = mockSessionSchema.parse(input)
  if (state.mockSessions?.some(m => m.id === mock.id)) return state
  const weight = { official: 1, section_test: 0.9, practice: 0.7, community: 0.3 }[mock.kind]
  const attempts: Attempt[] = [], errors: ErrorRecord[] = []
  for (const evidence of mock.evidence) {
    const skill = state.skills.find(s => s.id === evidence.skillId && s.exam === mock.exam)
    if (!skill) throw new Error('模考技能与考试不匹配')
    for (let i = 0; i < evidence.total; i++) {
      const attempt: Attempt = { id: crypto.randomUUID(), date: mock.date, exam: mock.exam, section: skill.section, questionType: skill.questionType, skillIds: [skill.id], correct: i < evidence.correct, reviewed: false, sessionId: mock.id, source: mock.source, sourceType: mock.kind === 'official' ? 'official' : 'mock', provenance: 'batch_summary', evidenceWeight: weight }
      attempts.push(attempt)
      if (!attempt.correct) errors.push({ id: crypto.randomUUID(), attemptId: attempt.id, exam: mock.exam, section: skill.section, questionType: skill.questionType, skillIds: [skill.id], errorType: 'unknown', createdAt: mock.date, status: 'new', reviewCount: 0, nextReviewDate: format(addDays(parseISO(mock.date), 1), 'yyyy-MM-dd') })
    }
  }
  return { ...state, mockSessions: [mock, ...(state.mockSessions ?? [])], attempts: [...attempts, ...state.attempts], errorRecords: [...errors, ...state.errorRecords], checkpoints: mock.overall === undefined && !Object.keys(mock.sectionScores).length ? state.checkpoints : [{ id: `checkpoint-${mock.id}`, date: mock.date, exam: mock.exam, source: mock.source, sourceType: mock.kind === 'official' ? 'official' : 'practice', overallScore: mock.overall, ...(mock.overall === undefined ? { sectionOnly: true as const } : {}), sectionScores: mock.sectionScores, notes: mock.conditions }, ...state.checkpoints], examProfiles: mock.overall === undefined ? state.examProfiles : { ...state.examProfiles, [mock.exam]: { ...state.examProfiles[mock.exam], latestScore: [{ date: mock.date, overallScore: mock.overall }, ...state.checkpoints.filter(c => c.exam === mock.exam && !c.sectionOnly && typeof c.overallScore === 'number')].sort((a, b) => b.date.localeCompare(a.date))[0].overallScore } } }
}
