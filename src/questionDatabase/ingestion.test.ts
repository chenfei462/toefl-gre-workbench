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

  it('rejects full text from an unregistered source even when it is not labelled official', () => {
    const preview = previewQuestionImport([{
      sourceId: 'unknown-source', exam: 'gre', examVersion: 'GRE_CURRENT', section: 'verbal',
      questionType: 'text_completion', prompt: 'A privately supplied question', storageMode: 'full',
      verification: 'unverified', compatibility: { examVersion: 'GRE_CURRENT', status: 'current' },
    }], defaultSources)

    expect(preview.valid).toHaveLength(0)
    expect(preview.invalid).toEqual([expect.objectContaining({ code: 'rights_unknown', severity: 'error' })])
  })

  it('allows an unregistered source to store a standalone reference', () => {
    const preview = previewQuestionImport([{
      sourceId: 'unknown-source', sourceQuestionId: '7', exam: 'gre', examVersion: 'GRE_CURRENT', section: 'verbal',
      questionType: 'text_completion', storageMode: 'reference_only', verification: 'unverified',
      compatibility: { examVersion: 'GRE_CURRENT', status: 'current' },
    }], defaultSources)

    expect(preview.valid).toHaveLength(1)
    expect(preview.invalid).toHaveLength(0)
    expect(preview.warnings.some(issue => issue.code === 'unknown_source')).toBe(true)
  })
})
