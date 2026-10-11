import { describe, it, expect } from 'vitest'
import { parseQuestionInput } from './ingestion'
import { previewQuestionImport } from './domain'
import { defaultSources } from './sources'
import { parseReferenceBundle } from './bundle'
describe('CSV and JSON ingestion', () => {
  it('parses quoted commas and newlines, stable option ids and numeric answers', () => {
    const csv = 'exam,examVersion,section,questionType,prompt,optionA,optionB,answer,source,questionNumber,skill\r\ngre,GRE_CURRENT,verbal,text_completion,"one,\n two",yes,no,B,user-manual,7,gre-text-completion'
    const rows = parseQuestionInput(csv, 'csv')
    const preview = previewQuestionImport(rows, defaultSources)
    expect(preview.invalid).toHaveLength(0)
    expect(preview.valid[0].prompt).toBe('one,\n two')
    expect(preview.valid[0].answer?.optionId).toBe('B')
  })
  it('rejects arbitrary JSON objects rather than silently importing nothing', () => {
    expect(() => parseQuestionInput('{"hello":1}', 'json')).toThrow()
    expect(() => parseQuestionInput('exam,prompt\ngre,"unterminated', 'csv')).toThrow()
  })
  it('retains dependent explanations while rejecting unvalidated source metadata', () => {
    const bundle = parseReferenceBundle({ explanations: [{ id: 'e', questionId: 'q', body: 'My note', verification: 'unverified', source: 'user' }], sources: [{ id: 'fake', sourceType: 'official' }] })
    expect(bundle.explanations).toHaveLength(1)
    expect(bundle.sources).toHaveLength(0)
  })
})
