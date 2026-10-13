// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuestionBankPage } from './QuestionBank'
import { migrateState } from '../storage'
import { CaptureDialog, ErrorLabPage } from './Capture'
import { recordBatch } from './learning'
import { IndexedDbQuestionRepository } from './indexedDbRepository'
afterEach(cleanup)
describe('question bank import UI', () => {
  it('notifies reference reconciliation after saving a bank import', async () => {
    const state = migrateState({ schemaVersion: 1, profile: {}, tasks: [], resources: [], practiceEntries: [], weeklyReviews: [] })
    const onBankChange = vi.fn()
    render(<QuestionBankPage state={state} onUpdate={vi.fn()} flash={vi.fn()} onBankChange={onBankChange} />)
    await waitFor(() => expect(screen.queryByText('读取中…')).toBeNull())
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '导入题目' }))
    fireEvent.change(screen.getByLabelText('粘贴 JSON / CSV'), { target: { value: JSON.stringify([{
      id: crypto.randomUUID(), sourceId: 'user-manual', sourceQuestionId: crypto.randomUUID(), exam: 'gre', examVersion: 'GRE_CURRENT',
      section: 'verbal', questionType: 'text_completion', storageMode: 'reference_only', verification: 'unverified',
      compatibility: { examVersion: 'GRE_CURRENT', status: 'current' },
    }]) } })
    await user.click(screen.getByRole('button', { name: '预览导入' }))
    await user.click(screen.getByRole('button', { name: '确认保存' }))

    await waitFor(() => expect(onBankChange).toHaveBeenCalledTimes(1))
  })

  it('shows and persists bookmark and personal difficulty for a question', async () => {
    const repository = new IndexedDbQuestionRepository(), id = crypto.randomUUID()
    await repository.importQuestions([{ id, sourceId: 'user-manual', sourceQuestionId: 'Q-1', exam: 'gre', examVersion: 'GRE_CURRENT', section: 'verbal', questionType: 'text_completion', title: 'Saved question', skillIds: [], storageMode: 'reference_only', options: [], verification: 'unverified', compatibility: { examVersion: 'GRE_CURRENT', status: 'current' }, tags: [], explanationIds: [], mediaIds: [] }])
    const state = { ...migrateState({ schemaVersion: 1, profile: {}, tasks: [], resources: [], practiceEntries: [], weeklyReviews: [] }), userQuestionStates: [{ questionId: id, timesSeen: 1, lastResult: 'incorrect' as const, lastAttemptDate: '2026-10-12', personalDifficulty: 4 as const, bookmarked: false }] }
    const update = vi.fn()
    render(<QuestionBankPage state={state} onUpdate={update} flash={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('Saved question')).toBeTruthy())
    const card = within(screen.getByText('Saved question').closest('article')!)
    expect((card.getByLabelText('个人难度') as HTMLSelectElement).value).toBe('4')
    await userEvent.setup().click(card.getByRole('button', { name: '收藏' }))
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ userQuestionStates: [expect.objectContaining({ questionId: id, bookmarked: true, personalDifficulty: 4 })] }))
  })

  it('allows preview cancellation without changing stored questions', async () => {
    const state = migrateState({ schemaVersion: 1, profile: {}, tasks: [], resources: [], practiceEntries: [], weeklyReviews: [] })
    render(<QuestionBankPage state={state} onUpdate={vi.fn()} flash={vi.fn()} />)
    await waitFor(() => expect(screen.queryByText('读取中…')).toBeNull())
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '导入题目' }))
    fireEvent.change(screen.getByLabelText('粘贴 JSON / CSV'), { target: { value: '[{"exam":"gre"}]' } })
    await user.click(screen.getByRole('button', { name: '预览导入' }))
    expect(await screen.findByText(/无效：1/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: '取消导入' }))
    expect(screen.queryByText('导入预览')).toBeNull()
  })
  it('records a reference-only error without needing question text', async () => {
    const state = migrateState({ schemaVersion: 1, profile: {}, tasks: [], resources: [], practiceEntries: [], weeklyReviews: [] }), update = vi.fn(), close = vi.fn()
    render(<CaptureDialog state={state} onUpdate={update} flash={vi.fn()} onClose={close} />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('题号 / 来源定位'), '7')
    await user.type(screen.getByLabelText('我的答案（多选用 | 分隔）'), 'D')
    await user.click(screen.getByRole('button', { name: '保存作答' }))
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1))
    expect(update.mock.calls[0][0].attempts[0]).toMatchObject({ correct: false, provenance: 'reference', questionId: expect.any(String) })
    expect(update.mock.calls[0][0].errorRecords).toHaveLength(1)
  })
  it('does not resolve a failed retry automatically', async () => {
    const initial = migrateState({ schemaVersion: 1, profile: {}, tasks: [], resources: [], practiceEntries: [], weeklyReviews: [] })
    const state = recordBatch(initial, { date: '2026-10-11', exam: 'gre', section: 'verbal', skillIds: ['gre-text-completion'], total: 1, correct: 0, minutes: 2, errorTypes: ['vocabulary'] }), update = vi.fn()
    render(<ErrorLabPage state={state} onUpdate={update} flash={vi.fn()} />)
    const user = userEvent.setup(); await user.click(screen.getByRole('button', { name: '开始二刷' })); expect(update).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: '仍然答错' }))
    expect(update.mock.calls[0][0].errorRecords[0].status).toBe('reopened')
  })
  it('reuses an inactive reference instead of recording an orphan question id', async () => {
    const repository = new IndexedDbQuestionRepository(), id = crypto.randomUUID(), number = crypto.randomUUID()
    await repository.importQuestions([{ id, sourceId: 'user-manual', sourceQuestionId: number, exam: 'gre', examVersion: 'GRE_CURRENT', section: 'verbal', questionType: 'text_completion', skillIds: [], storageMode: 'reference_only', options: [], verification: 'unverified', compatibility: { examVersion: 'GRE_CURRENT', status: 'current' }, tags: [], explanationIds: [], mediaIds: [] }]); await repository.markInactive(id)
    const state = migrateState({ schemaVersion: 1, profile: {}, tasks: [], resources: [], practiceEntries: [], weeklyReviews: [] }), update = vi.fn()
    render(<CaptureDialog state={state} onUpdate={update} flash={vi.fn()} onClose={vi.fn()} />)
    const user = userEvent.setup(); await user.type(screen.getByLabelText('题号 / 来源定位'), number); await user.click(screen.getByRole('button', { name: '保存作答' }))
    await waitFor(() => expect(update).toHaveBeenCalled())
    expect(update.mock.calls[0][0].attempts[0].questionId).toBe(id)
  })
})
