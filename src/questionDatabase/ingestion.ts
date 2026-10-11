import type { QuestionImportRecord } from './domain'
export function parseQuestionInput(raw: string, format: 'json' | 'csv'): unknown[] {
  if (format === 'json') { const value = JSON.parse(raw); if (Array.isArray(value)) return value; if (value && Array.isArray(value.questions)) return value.questions; throw new Error('JSON 需要题目数组或 { questions: [...] }') }
  const table: string[][] = [], row: string[] = []; let field = '', quoted = false
  const input = raw.replace(/^\uFEFF/, '')
  for (let i = 0; i < input.length; i++) { const ch = input[i]; if (ch === '"') { if (quoted && input[i + 1] === '"') { field += '"'; i++ } else quoted = !quoted } else if (ch === ',' && !quoted) { row.push(field); field = '' } else if ((ch === '\n' || ch === '\r') && !quoted) { if (ch === '\r' && input[i + 1] === '\n') i++; row.push(field); if (row.some(v => v.trim())) table.push([...row]); row.length = 0; field = '' } else field += ch }
  if (quoted) throw new Error('CSV 引号没有闭合')
  row.push(field); if (row.some(v => v.trim())) table.push(row)
  const headers = table.shift()?.map(v => v.trim()) ?? []
  if (!headers.includes('exam') || !headers.includes('questionType')) throw new Error('CSV 缺少 exam 或 questionType 列')
  return table.map((cells, index) => {
    if (cells.length !== headers.length) throw new Error(`CSV 第 ${index + 2} 行列数不一致`)
    const r = Object.fromEntries(headers.map((h, i) => [h, cells[i]])), examVersion = r.examVersion || (r.exam === 'toefl' ? 'TOEFL_2026' : 'GRE_CURRENT')
    const options = ['A', 'B', 'C', 'D', 'E', 'F'].filter(l => r[`option${l}`]).map(l => ({ id: l, label: l, text: r[`option${l}`] }))
    return { exam: r.exam, examVersion, section: r.section, questionType: r.questionType, sourceId: r.source || 'user-manual', sourceQuestionId: r.questionNumber || undefined, sourceSection: r.sourceSection || r.section, title: r.title || undefined, prompt: r.prompt || undefined, options, answer: r.answer ? { ...(options.length ? r.answer.includes('|') ? { optionIds: r.answer.split('|') } : { optionId: r.answer } : r.questionType === 'numeric_entry' ? { numericAnswer: Number(r.answer) } : { text: r.answer }), verification: ['official', 'verified'].includes(r.verification) ? r.verification : 'unverified' } : undefined, storageMode: r.prompt ? 'full' : 'reference_only', verification: r.verification === 'disputed' ? 'disputed' : r.verification === 'verified' || r.verification === 'official' ? 'verified' : 'unverified', compatibility: { examVersion, status: r.legacy === 'true' ? 'legacy' : 'current' }, skillIds: (r.skill || '').split('|').filter(Boolean), difficulty: r.difficulty ? Number(r.difficulty) : undefined, tags: [], explanationIds: [], mediaIds: [] } as QuestionImportRecord
  })
}
export const CSV_TEMPLATE = 'exam,examVersion,section,questionType,prompt,optionA,optionB,answer,source,questionNumber,skill,difficulty,verification\ngre,GRE_CURRENT,verbal,text_completion,,,,,ets-gre-powerprep-2,7,gre-text-completion,,unverified'
