// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { migrateState, storage } from './storage'
import { generatePlan, defaultTemplate } from './domain'

beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('study profile target synchronization', () => {
  it('uses onboarding targets in the saved planner profile and dashboard', () => {
    render(<MemoryRouter><App /></MemoryRouter>)
    fireEvent.change(screen.getByDisplayValue('5.5'), { target: { value: '5.0' } })
    fireEvent.change(screen.getByDisplayValue('330'), { target: { value: '325' } })
    fireEvent.click(screen.getByRole('button', { name: /生成我的 30 天计划/ }))

    const saved = storage.load()!
    expect(saved.examProfiles.toefl.targetScore).toBe(5)
    expect(saved.examProfiles.gre.targetScore).toBe(325)
    expect(screen.getByText('TOEFL +1 · GRE +15')).toBeTruthy()
  })

  it('updates settings targets while retaining checkpoints and baseline history', () => {
    const state = migrateState({ schemaVersion: 1, profile: {
      examTypes: ['toefl', 'gre'], startDate: '2026-10-13',
      currentScores: { toefl: '4.0', gre: '310' }, targetScores: { toefl: '5.5', gre: '330' },
      dailyMinutes: 60, studyDaysPerWeek: 6, intensity: 'standard',
    }, tasks: [], resources: [], practiceEntries: [], weeklyReviews: [] })
    state.tasks = generatePlan(state.profile, defaultTemplate)
    state.checkpoints = [{ id: 'checkpoint', exam: 'gre', date: '2026-10-13', sourceType: 'manual', source: 'Test checkpoint', overallScore: 315, sectionScores: {} }]
    storage.save(state)
    render(<MemoryRouter initialEntries={['/settings']}><App /></MemoryRouter>)
    fireEvent.change(screen.getByDisplayValue('5.5'), { target: { value: '5.0' } })
    fireEvent.change(screen.getByDisplayValue('330'), { target: { value: '325' } })
    fireEvent.click(screen.getByRole('button', { name: '保存设置' }))

    const saved = storage.load()!
    expect(saved.examProfiles.toefl.targetScore).toBe(5)
    expect(saved.examProfiles.gre.targetScore).toBe(325)
    expect(saved.examProfiles.gre.baselineScore).toBe(310)
    expect(saved.checkpoints).toEqual(state.checkpoints)
    fireEvent.click(screen.getByRole('button', { name: '今日处方' }))
    expect(screen.getByText('TOEFL +1 · GRE +10')).toBeTruthy()
  })

  it('keeps restored backup targets when settings are saved again', async () => {
    const state = migrateState({ schemaVersion: 1, profile: {
      examTypes: ['gre'], startDate: '2026-10-13', currentScores: { gre: '310' }, targetScores: { gre: '330' },
      dailyMinutes: 60, studyDaysPerWeek: 6, intensity: 'standard',
    }, tasks: [], resources: [], practiceEntries: [], weeklyReviews: [] })
    state.tasks = generatePlan(state.profile, defaultTemplate)
    storage.save(state)
    const backup = { ...state, profile: { ...state.profile, targetScores: { gre: '325' } } }
    const { container } = render(<MemoryRouter initialEntries={['/settings']}><App /></MemoryRouter>)
    const targetInput = screen.getByDisplayValue('330') as HTMLInputElement
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [new File([JSON.stringify(backup)], 'learning-backup.json', { type: 'application/json' })] },
    })
    fireEvent.click(await screen.findByRole('button', { name: '确认替换' }))

    expect(storage.load()!.examProfiles.gre.targetScore).toBe(325)
    expect(targetInput.value).toBe('325')
    fireEvent.click(screen.getByRole('button', { name: '保存设置' }))
    expect(storage.load()!.examProfiles.gre.targetScore).toBe(325)
  })
})
