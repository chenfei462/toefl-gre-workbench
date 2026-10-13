// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { migrateState, storage } from '../storage'
import type { Attempt, WorkbenchState } from '../types'
import { IndexedDbQuestionRepository, type QuestionBundle } from './indexedDbRepository'
import { QuestionReferenceIntegrity } from './ReferenceIntegrity'
import { recordQuestionAttempt } from './learning'
import { defaultSources } from './sources'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

function restoredState(questionId = crypto.randomUUID()): WorkbenchState {
  const base = migrateState({ schemaVersion: 1, profile: {} })
  const attempt: Attempt = { id: crypto.randomUUID(), date: '2026-10-01', exam: 'gre', section: 'verbal', skillIds: ['gre-text-completion'], sourceType: 'self_created', reviewed: false, correct: true, provenance: 'question', questionId, questionReferenceStatus: 'valid', excludeFromMastery: true }
  return storage.import(storage.export({ ...base, attempts: [attempt] }))
}

function Host({ initialState, bankRevision = 0, onUpdate }: { initialState: WorkbenchState; bankRevision?: number; onUpdate: (state: WorkbenchState) => void }) {
  const [state, setState] = useState(initialState)
  return <QuestionReferenceIntegrity state={state} bankRevision={bankRevision} onUpdate={next => { setState(next); onUpdate(next) }} />
}

describe('question reference integrity in the app', () => {
  it('shows missing-bank attempts visibly and retains their history and exclusions', async () => {
    const state = restoredState(), onUpdate = vi.fn()
    render(<Host initialState={state} onUpdate={onUpdate} />)

    expect(screen.getByRole('status').textContent).toContain('核对题库引用')
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('缺少题库记录：1 条作答'))
    const reconciled = onUpdate.mock.calls.at(-1)![0] as WorkbenchState
    expect(reconciled.attempts).toEqual([{ ...state.attempts[0], questionReferenceStatus: 'orphaned' }])
    expect(reconciled.errorRecords).toEqual(state.errorRecords)
  })

  it('resolves history against inactive questions after a bank import revision', async () => {
    const state = restoredState(), onUpdate = vi.fn(), repository = new IndexedDbQuestionRepository()
    const rendered = render(<Host initialState={state} onUpdate={onUpdate} />)
    await screen.findByRole('alert')
    await repository.importQuestions([{ id: state.attempts[0].questionId, sourceId: 'user-manual', sourceQuestionId: crypto.randomUUID(), exam: 'gre', examVersion: 'GRE_CURRENT', section: 'verbal', questionType: 'text_completion', skillIds: [], storageMode: 'reference_only', options: [], verification: 'unverified', compatibility: { examVersion: 'GRE_CURRENT', status: 'current' }, tags: [], explanationIds: [], mediaIds: [] }])
    await repository.markInactive(state.attempts[0].questionId!)
    rendered.rerender(<Host initialState={state} bankRevision={1} onUpdate={onUpdate} />)

    await waitFor(() => expect((onUpdate.mock.calls.at(-1)![0] as WorkbenchState).attempts[0].questionReferenceStatus).toBe('valid'))
    expect(screen.queryByRole('alert')).toBeNull()
    expect((onUpdate.mock.calls.at(-1)![0] as WorkbenchState).attempts[0].excludeFromMastery).toBe(true)
  })

  it('excludes a restored pre-dispute attempt against a currently disputed bank answer', async () => {
    const base = restoredState(), state = { ...base, attempts: [{ ...base.attempts[0], excludeFromMastery: undefined }] }, onUpdate = vi.fn()
    const repository = new IndexedDbQuestionRepository()
    await repository.importQuestions([{ id: state.attempts[0].questionId, sourceId: 'user-manual', sourceQuestionId: crypto.randomUUID(), exam: 'gre', examVersion: 'GRE_CURRENT', section: 'verbal', questionType: 'text_completion', prompt: crypto.randomUUID(), skillIds: ['gre-text-completion'], storageMode: 'full', options: [], answer: { text: 'B', verification: 'disputed' }, verification: 'verified', compatibility: { examVersion: 'GRE_CURRENT', status: 'current' }, tags: [], explanationIds: [], mediaIds: [] }])
    render(<Host initialState={state} onUpdate={onUpdate} />)

    await waitFor(() => expect((onUpdate.mock.calls.at(-1)?.[0] as WorkbenchState | undefined)?.attempts[0]).toMatchObject({ questionReferenceStatus: 'valid', excludeFromMastery: true }))
    expect((onUpdate.mock.calls.at(-1)![0] as WorkbenchState).attempts).toHaveLength(1)
    expect(state.attempts[0].excludeFromMastery).toBeUndefined()
  })

  it('checks a production reference-only attempt restored from before an answer dispute', async () => {
    const repository = new IndexedDbQuestionRepository(), id = crypto.randomUUID()
    await repository.importQuestions([{ id, sourceId: 'user-manual', sourceQuestionId: crypto.randomUUID(), exam: 'gre', examVersion: 'GRE_CURRENT', section: 'verbal', questionType: 'text_completion', skillIds: ['gre-text-completion'], storageMode: 'reference_only', options: [], answer: { text: 'B', verification: 'verified' }, verification: 'verified', compatibility: { examVersion: 'GRE_CURRENT', status: 'current' }, tags: [], explanationIds: [], mediaIds: [] }])
    const question = (await repository.getById(id))!
    const recorded = recordQuestionAttempt(migrateState({ schemaVersion: 1, profile: {} }), question, defaultSources.find(source => source.id === 'user-manual'), { date: '2026-10-01', correct: true })
    const state = storage.import(storage.export(recorded)), onUpdate = vi.fn()
    expect(state.attempts[0].provenance).toBe('reference')
    await repository.update({ ...question, answer: { ...question.answer!, verification: 'disputed' } })
    render(<Host initialState={state} onUpdate={onUpdate} />)

    await waitFor(() => expect((onUpdate.mock.calls.at(-1)?.[0] as WorkbenchState | undefined)?.attempts[0]).toMatchObject({ provenance: 'reference', excludeFromMastery: true }))
    const reconciled = onUpdate.mock.calls.at(-1)![0] as WorkbenchState
    expect(reconciled.attempts[0].questionReferenceStatus).toBeUndefined()
    expect(reconciled.attempts[0].correct).toBe(true)
    expect(reconciled.userQuestionStates).toEqual(state.userQuestionStates)
  })

  it('does not claim standalone references are excluded while a bank check fails', async () => {
    vi.spyOn(IndexedDbQuestionRepository.prototype, 'exportBundle').mockRejectedValueOnce(new Error('database unavailable'))
    const base = restoredState(), state: WorkbenchState = { ...base, attempts: [{ ...base.attempts[0], provenance: 'reference', questionReferenceStatus: undefined, excludeFromMastery: undefined }] }, onUpdate = vi.fn()
    render(<Host initialState={state} onUpdate={onUpdate} />)

    expect(screen.getByRole('status').textContent).not.toContain('暂不参与掌握度')
    expect((await screen.findByRole('alert')).textContent).toContain('无法核对题库引用')
    expect(screen.getByRole('alert').textContent).not.toContain('暂不参与掌握度')
    expect(onUpdate).not.toHaveBeenCalled()
    await userEvent.setup().click(screen.getByRole('button', { name: '重新核对题库' }))
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
    expect(screen.queryByRole('alert')).toBeNull()
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('keeps checks pending and offers retry when the bank cannot be read', async () => {
    vi.spyOn(IndexedDbQuestionRepository.prototype, 'exportBundle').mockRejectedValueOnce(new Error('database unavailable'))
    const state = restoredState(), onUpdate = vi.fn()
    render(<Host initialState={state} onUpdate={onUpdate} />)

    expect((await screen.findByRole('alert')).textContent).toContain('无法核对题库引用')
    expect(screen.getByRole('alert').textContent).toContain('database unavailable')
    expect(onUpdate).not.toHaveBeenCalled()
    await userEvent.setup().click(screen.getByRole('button', { name: '重新核对题库' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('缺少题库记录：1 条作答'))
    expect((onUpdate.mock.calls.at(-1)![0] as WorkbenchState).attempts[0].questionReferenceStatus).toBe('orphaned')
  })

  it('applies asynchronous reference results to the latest learning state', async () => {
    let resolveRead!: (bundle: QuestionBundle) => void
    vi.spyOn(IndexedDbQuestionRepository.prototype, 'exportBundle').mockImplementationOnce(() => new Promise(resolve => { resolveRead = resolve }))
    const state = restoredState(), onUpdate = vi.fn()
    const rendered = render(<QuestionReferenceIntegrity state={state} onUpdate={onUpdate} />)
    const current = { ...state, attempts: [{ ...state.attempts[0], note: 'Saved during the bank read' }] }
    rendered.rerender(<QuestionReferenceIntegrity state={current} onUpdate={onUpdate} />)
    await act(async () => resolveRead({ questions: [], sources: [], passages: [], explanations: [], media: [], revisions: [] }))

    expect(onUpdate).toHaveBeenLastCalledWith({ ...current, attempts: [{ ...current.attempts[0], questionReferenceStatus: 'orphaned' }] })
  })

  it('reconciles a later learning backup containing the same attempt and question ids', async () => {
    const state = restoredState(), onUpdate = vi.fn()
    const rendered = render(<QuestionReferenceIntegrity state={state} onUpdate={onUpdate} />)
    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1))
    const restoredAgain = { ...state, attempts: [{ ...state.attempts[0], note: 'Restored another learning backup' }] }
    rendered.rerender(<QuestionReferenceIntegrity state={restoredAgain} onUpdate={onUpdate} />)

    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(2))
    expect(onUpdate).toHaveBeenLastCalledWith({ ...restoredAgain, attempts: [{ ...restoredAgain.attempts[0], questionReferenceStatus: 'orphaned' }] })
  })
})
