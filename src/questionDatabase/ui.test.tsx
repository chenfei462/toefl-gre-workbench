// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuestionBankPage } from './QuestionBank'
import { migrateState } from '../storage'
import { CaptureDialog, ErrorLabPage } from './Capture'
import { recordBatch } from './learning'
import { IndexedDbQuestionRepository } from './indexedDbRepository'
afterEach(cleanup)
describe('question bank import UI', () => {
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
