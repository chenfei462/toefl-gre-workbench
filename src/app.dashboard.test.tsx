// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { calculateProgress } from './domain'
import { Plan, Today } from './App'
import { migrateState } from './storage'

describe('Today dashboard', () => {
  it('answers the five daily decision questions and shows recent trajectory data', () => {
    const state = migrateState({
      schemaVersion: 1,
      profile: {
        examTypes: ['toefl', 'gre'],
        startDate: '2026-10-12',
        targetScores: { toefl: '5.5', gre: '330' },
        currentScores: { toefl: '4.0', gre: '310' },
        dailyMinutes: 480,
        studyDaysPerWeek: 6,
        intensity: 'intensive',
      },
      tasks: [], resources: [], practiceEntries: [], weeklyReviews: [],
    })

    render(<Today state={state} progress={calculateProgress(state)} onUpdate={() => undefined} onNavigate={() => undefined} flash={() => undefined} />)

    expect(screen.getByText('当前分数')).toBeTruthy()
    expect(screen.getByText('距目标差距')).toBeTruthy()
    expect(screen.getByText('最危险技能')).toBeTruthy()
    expect(screen.getByText('今天第一行动')).toBeTruthy()
    expect(screen.getByText('为什么')).toBeTruthy()
    expect(screen.getByText(/Rolling 7-day/)).toBeTruthy()
  })

  it('routes plan task practice actions to the practice page', () => {
    const state = migrateState({
      schemaVersion: 1,
      profile: {
        examTypes: ['gre'],
        startDate: '2026-10-12',
        targetScores: { gre: '330' },
        currentScores: { gre: '310' },
        dailyMinutes: 45,
        studyDaysPerWeek: 6,
        intensity: 'standard',
      },
      tasks: [{ id: 'task-1', dayIndex: 1, plannedDate: '2099-01-01', exam: 'gre', section: 'verbal', title: 'Text completion', description: 'Practice', estimatedMinutes: 20, status: 'todo' }],
      resources: [], practiceEntries: [], weeklyReviews: [],
    })
    const onNavigate = vi.fn()

    render(<Plan state={state} onUpdate={() => undefined} onNavigate={onNavigate} flash={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: /记录练习/ }))

    expect(onNavigate).toHaveBeenCalledWith('practice')
  })
})
