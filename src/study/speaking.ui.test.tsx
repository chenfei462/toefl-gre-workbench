// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SpeakingPlayer } from './SpeakingPlayer'
import { migrateState } from '../storage'
import { RecordingController, RecordingStore } from './recordings'
afterEach(() => { cleanup(); vi.restoreAllMocks() })
describe('speaking player controls', () => {
  it('protects unsaved audio from another recording when storage fails', async () => {
    vi.spyOn(RecordingController.prototype, 'start').mockResolvedValue()
    vi.spyOn(RecordingController.prototype, 'stop').mockResolvedValue(new Blob(['voice'], { type: 'audio/webm' }))
    vi.spyOn(RecordingStore.prototype, 'put').mockRejectedValue(new Error('quota'))
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:test', revokeObjectURL: vi.fn() })
    render(<SpeakingPlayer state={migrateState({})} onUpdate={vi.fn()} flash={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('题型'), { target: { value: 'interview' } })
    fireEvent.change(screen.getByLabelText('题目 / 提示'), { target: { value: 'Describe your town' } })
    fireEvent.change(screen.getByLabelText('准备秒数'), { target: { value: '0' } })
    fireEvent.click(screen.getByText('开始准备'))
    await waitFor(() => expect(screen.getByText('停止录音')).toBeTruthy())
    fireEvent.click(screen.getByText('停止录音'))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('保存失败'))
    expect((screen.getByLabelText('题型').closest('fieldset') as HTMLFieldSetElement).disabled).toBe(true)
    await waitFor(() => expect(screen.getByText('下载录音')).toBeTruthy())
    expect(screen.getByText('重试保存录音')).toBeTruthy()
    vi.unstubAllGlobals()
  })
  it('requires a repeat stimulus before starting', async () => {
    render(<SpeakingPlayer state={migrateState({})} onUpdate={vi.fn()} flash={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('题目 / 提示'), { target: { value: 'Repeat this' } })
    fireEvent.click(screen.getByText('开始准备'))
    expect(screen.getByRole('alert').textContent).toContain('选择题目音频')
    await waitFor(() => expect(screen.getByText('录音历史 · 0')).toBeTruthy())
  })
  it('shows denied permission and re-enables setup', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError')) } })
    vi.stubGlobal('MediaRecorder', class {})
    render(<SpeakingPlayer state={migrateState({})} onUpdate={vi.fn()} flash={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('题型'), { target: { value: 'interview' } })
    fireEvent.change(screen.getByLabelText('题目 / 提示'), { target: { value: 'Tell me about your town' } })
    fireEvent.change(screen.getByLabelText('准备秒数'), { target: { value: '0' } })
    fireEvent.click(screen.getByText('开始准备'))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('麦克风权限被拒绝'))
    expect((screen.getByLabelText('题型').closest('fieldset') as HTMLFieldSetElement).disabled).toBe(false)
    vi.unstubAllGlobals()
  })
})
