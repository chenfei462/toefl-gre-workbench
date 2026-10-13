import { describe, expect, it } from 'vitest'
import { calculateRollingWindow, calculateScoreTrajectory } from './trajectory'
import type { Attempt, ExamProfile, ScoreCheckpoint } from '../types'

const checkpoint = (id: string, date: string, overallScore: number): ScoreCheckpoint => ({
  id,
  date,
  exam: 'gre',
  source: 'POWERPREP',
  sourceType: 'official',
  overallScore,
  sectionScores: { verbal: overallScore },
})

const attempt = (id: string, date: string, correct: boolean, minutes: number): Attempt => ({
  id,
  date,
  exam: 'gre',
  section: 'verbal',
  skillIds: ['gre-text-completion'],
  sourceType: 'official',
  reviewed: false,
  correct,
  timeSeconds: minutes * 60,
})

describe('score trajectory and rolling activity', () => {
  it('derives baseline, latest, target gap and improving direction from checkpoints', () => {
    const profile: ExamProfile = { exam: 'gre', targetScore: 330, baselineScore: 310 }
    const result = calculateScoreTrajectory('gre', [checkpoint('old', '2026-10-01', 310), checkpoint('new', '2026-10-10', 318)], profile)

    expect(result.baseline?.overallScore).toBe(310)
    expect(result.latest?.overallScore).toBe(318)
    expect(result.target).toBe(330)
    expect(result.gap).toBe(12)
    expect(result.direction).toBe('improving')
    expect(result.delta).toBe(8)
  })

  it('counts only the inclusive seven-day window and exposes accuracy and minutes', () => {
    const attempts = [
      attempt('inside-1', '2026-10-10', true, 2),
      attempt('inside-2', '2026-10-04', false, 3),
      attempt('outside', '2026-10-03', true, 9),
    ]
    const result = calculateRollingWindow(attempts, '2026-10-10')

    expect(result.startDate).toBe('2026-10-04')
    expect(result.endDate).toBe('2026-10-10')
    expect(result.attempts).toBe(2)
    expect(result.correct).toBe(1)
    expect(result.accuracy).toBe(50)
    expect(result.minutes).toBe(5)
  })
})
