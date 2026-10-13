import { addDays, format, parseISO } from 'date-fns'
import type { Attempt, Exam, ExamProfile, ScoreCheckpoint } from '../types'
import { isEligibleLearningEvidence } from './evidence'

export type TrajectoryDirection = 'improving' | 'declining' | 'flat' | 'no_data'

export interface ScoreTrajectory {
  exam: Exam
  target: number
  baseline?: ScoreCheckpoint
  latest?: ScoreCheckpoint
  baselineScore?: number
  latestScore?: number
  gap?: number
  delta?: number
  direction: TrajectoryDirection
  checkpoints: ScoreCheckpoint[]
}

export interface RollingWindow {
  startDate: string
  endDate: string
  attempts: number
  correct: number
  accuracy: number
  minutes: number
}

export function calculateScoreTrajectory(exam: Exam, checkpoints: ScoreCheckpoint[], profile: ExamProfile): ScoreTrajectory {
  const ordered = checkpoints.filter(checkpoint => checkpoint.exam === exam).sort((a, b) => a.date.localeCompare(b.date))
  const baseline = ordered[0]
  const latest = ordered.at(-1)
  const baselineScore = baseline?.overallScore ?? profile.baselineScore
  const latestScore = latest?.overallScore ?? profile.latestScore ?? profile.baselineScore
  const delta = baselineScore !== undefined && latestScore !== undefined ? latestScore - baselineScore : undefined
  const direction: TrajectoryDirection = delta === undefined ? 'no_data' : delta > 0 ? 'improving' : delta < 0 ? 'declining' : 'flat'
  return {
    exam,
    target: profile.targetScore,
    baseline,
    latest,
    baselineScore,
    latestScore,
    gap: latestScore === undefined ? undefined : Math.max(0, profile.targetScore - latestScore),
    delta,
    direction,
    checkpoints: ordered,
  }
}

export function calculateRollingWindow(attempts: Attempt[], endDate: string, windowDays = 7): RollingWindow {
  const days = Math.max(1, Math.floor(windowDays))
  const startDate = format(addDays(parseISO(endDate), -(days - 1)), 'yyyy-MM-dd')
  const window = attempts.filter(attempt => attempt.date >= startDate && attempt.date <= endDate && typeof attempt.correct === 'boolean' && isEligibleLearningEvidence(attempt))
  const correct = window.filter(attempt => attempt.correct).length
  const minutes = Math.round(window.reduce((sum, attempt) => sum + (attempt.timeSeconds ?? 0), 0) / 60)
  return { startDate, endDate, attempts: window.length, correct, accuracy: window.length ? Math.round((correct / window.length) * 100) : 0, minutes }
}
