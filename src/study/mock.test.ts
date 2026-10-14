import { expect, it } from 'vitest'
import { migrateState, storage } from '../storage'
import { recordMock } from './mock'
import { calculateScoreTrajectory } from '../algorithms/trajectory'
it('records independent mock, checkpoint and weighted evidence without score conversion', () => {
  const state = recordMock(migrateState({}), { id: 'mock1', exam: 'toefl', date: '2026-10-14', source: 'TestReady', kind: 'official', overall: 4.5, sectionScores: { reading: 4.5, listening: 5, speaking: 4, writing: 4.5 }, durationMinutes: 90, conditions: 'timed, quiet', evidence: [{ skillId: 'toefl-speaking-interview', correct: 3, total: 5 }] })
  expect(state.mockSessions).toHaveLength(1)
  expect(state.checkpoints[0].overallScore).toBe(4.5)
  expect(state.practiceEntries).toHaveLength(0)
  expect(state.attempts).toHaveLength(5)
  expect(state.attempts.every(a => a.evidenceWeight === 1)).toBe(true)
  expect(storage.import(storage.export(state)).mockSessions).toEqual(state.mockSessions)
  expect(recordMock(state, state.mockSessions![0])).toBe(state)
})
it('rejects invalid scores rather than accepting ITP or legacy TOEFL scale', () => {
  expect(() => recordMock(migrateState({}), { id: 'bad', exam: 'toefl', date: '2026-10-14', source: 'test', kind: 'practice', overall: 677, sectionScores: {}, durationMinutes: 60, conditions: '', evidence: [] })).toThrow()
})

it('retains section-only checkpoints without inventing an overall or replacing overall trajectory', () => {
 let state = recordMock(migrateState({}), { id: 'overall', exam: 'toefl', date: '2026-10-13', source: 'test', kind: 'official', overall: 4.5, sectionScores: {}, durationMinutes: 90, conditions: '', evidence: [] })
 state = recordMock(state, { id: 'section', exam: 'toefl', date: '2026-10-14', source: 'section', kind: 'section_test', sectionScores: { reading: 5 }, durationMinutes: 30, conditions: 'timed', evidence: [] })
 expect(state.checkpoints[0]).toMatchObject({ id: 'checkpoint-section', sectionOnly: true, sectionScores: { reading: 5 } })
 expect(state.checkpoints[0].overallScore).toBeUndefined()
 expect(state.examProfiles.toefl.latestScore).toBe(4.5)
  expect(calculateScoreTrajectory('toefl', state.checkpoints, state.examProfiles.toefl)).toMatchObject({ latestScore: 4.5, latest: { id: 'checkpoint-overall' } })
 expect(storage.import(storage.export(state)).checkpoints).toEqual(state.checkpoints)
})
it('uses the newly recorded overall when checkpoints share a date', () => {
 const input = { id: 'old', exam: 'toefl' as const, date: '2026-10-14', source: 'test', kind: 'official' as const, overall: 4, sectionScores: {}, durationMinutes: 90, conditions: '', evidence: [] }
 const state = recordMock(recordMock(migrateState({}), input), { ...input, id: 'new', overall: 5 })
 expect(state.examProfiles.toefl.latestScore).toBe(5)
 expect(calculateScoreTrajectory('toefl', state.checkpoints, state.examProfiles.toefl).latestScore).toBe(5)
})
