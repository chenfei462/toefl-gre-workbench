// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { migrateState, parseWorkbenchState, storage } from './storage'

const v1 = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  profile: {
    examTypes: ['toefl', 'gre'],
    startDate: '2026-10-01',
    targetScores: { toefl: '5.5', gre: '330' },
    currentScores: { toefl: '4.0', gre: '310' },
    dailyMinutes: 45,
    studyDaysPerWeek: 6,
    intensity: 'standard',
  },
  tasks: [{ id: 'task-1', dayIndex: 1, plannedDate: '2026-10-01', exam: 'toefl', section: 'reading', title: 'Read', description: 'Read', estimatedMinutes: 20, resourceIds: [], status: 'done', completedAt: '2026-10-01T10:00:00.000Z' }],
  resources: [],
  practiceEntries: [{ id: 'practice-1', date: '2026-10-01', exam: 'toefl', section: 'reading', total: 2, correct: 1, errorTags: ['made-up-tag'] }],
  weeklyReviews: [],
  ...overrides,
})

describe('storage migration and recovery', () => {
  beforeEach(() => {
    localStorage.clear()
    storage.clear()
  })

  it('migrates a valid V1 payload without expanding aggregate practice entries', () => {
    const state = migrateState(v1())

    expect(state.schemaVersion).toBe(2)
    expect(state.tasks[0]).toMatchObject({ id: 'task-1', completedAt: '2026-10-01T10:00:00.000Z' })
    expect(state.practiceEntries).toHaveLength(1)
    expect(state.legacyPracticeEntries).toHaveLength(1)
    expect(state.attempts).toHaveLength(0)
    expect(state.legacyPracticeEntries[0].errorTags).toContain('made-up-tag')
  })

  it('fills safe defaults for a partial V1 payload', () => {
    const state = migrateState({ schemaVersion: 1, profile: {} })

    expect(state.profile.examTypes).toEqual(['toefl', 'gre'])
    expect(state.profile.dailyMinutes).toBeGreaterThan(0)
    expect(state.skills.length).toBeGreaterThan(0)
    expect(state.attempts).toEqual([])
  })

  it('turns garbage input into a recoverable empty state instead of throwing', () => {
    const state = migrateState('not-json-state')

    expect(state.schemaVersion).toBe(2)
    expect(state.migrationWarnings?.join(' ')).toContain('unrecognized')
    expect(state.tasks).toEqual([])
  })

  it('preserves invalid V2 raw data and exposes a recovery signal', () => {
    const raw = JSON.stringify({ schemaVersion: 2, profile: 'invalid' })
    localStorage.setItem('toefl-gre-workbench:v2', raw)

    expect(storage.load()).toBeNull()
    expect(storage.getRecovery()).toMatchObject({ rawPayload: raw })
    expect(storage.getRecovery()?.reason).toContain('invalid')
    expect(localStorage.getItem('toefl-gre-workbench:recovery')).toBe(raw)
  })

  it('preserves the original recovery backup after saving and loading a new valid plan', () => {
    const original = JSON.stringify({ schemaVersion: 2, profile: 'invalid', attempts: [{ id: 'historical-attempt' }] })
    localStorage.setItem('toefl-gre-workbench:v2', original)
    expect(storage.load()).toBeNull()
    expect(storage.getRecovery()?.rawPayload).toBe(original)

    storage.save(migrateState(v1()))
    expect(storage.load()).not.toBeNull()

    expect(storage.getRecovery()?.rawPayload).toBe(original)
    expect(localStorage.getItem('toefl-gre-workbench:recovery')).toBe(original)
  })

  it('keeps the first recovery payload until the user explicitly clears stored data', () => {
    const original = '{invalid-original-json'
    localStorage.setItem('toefl-gre-workbench:v2', original)
    expect(storage.load()).toBeNull()
    storage.save({ ...migrateState(v1()), migrationWarnings: ['later migration warning'] })
    expect(storage.load()).not.toBeNull()

    expect(storage.getRecovery()?.rawPayload).toBe(original)
    expect(localStorage.getItem('toefl-gre-workbench:recovery')).toBe(original)
    storage.clear()
    expect(storage.getRecovery()).toBeNull()
    expect(localStorage.getItem('toefl-gre-workbench:recovery')).toBeNull()
  })

  it('keeps a legacy TOEFL 0-120 score labelled and out of the official 1-6 baseline', () => {
    const state = migrateState(v1({ profile: {
      ...v1().profile as Record<string, unknown>,
      currentScores: { toefl: '92', gre: '310' },
    } }))

    expect(state.profile.currentScores.toefl).toBe('92')
    expect(state.examProfiles.toefl.baselineScore).toBeUndefined()
    expect(state.migrationWarnings?.some(warning => warning.includes('92') && warning.toLowerCase().includes('legacy'))).toBe(true)
  })

  it('preserves reference status in the persisted V2 schema', () => {
    const state = migrateState(v1())
    const attempts = ['valid', 'orphaned', 'pending'].map((questionReferenceStatus, index) => ({
      id: `attempt-${index}`, date: '2026-10-01', exam: 'gre', section: 'verbal', skillIds: [],
      sourceType: 'self_created', reviewed: false, questionId: `question-${index}`, provenance: 'question', questionReferenceStatus,
    }))

    expect(parseWorkbenchState({ ...state, attempts }).attempts.map(attempt => attempt.questionReferenceStatus)).toEqual(['valid', 'orphaned', 'pending'])
  })

  it('checks restored question-backed evidence again while preserving standalone provenance and historical exclusions', () => {
    const state = migrateState(v1())
    const attempt = { id: 'question-attempt', date: '2026-10-01', exam: 'gre', section: 'verbal', skillIds: [], sourceType: 'self_created', reviewed: false, questionId: 'question-1', provenance: 'question', questionReferenceStatus: 'valid', excludeFromMastery: true }
    const raw = JSON.stringify({ ...state, attempts: [attempt, { ...attempt, id: 'reference-attempt', provenance: 'reference', questionReferenceStatus: undefined }, { ...attempt, id: 'batch-attempt', provenance: 'batch_summary', questionReferenceStatus: undefined }] })
    const restored = storage.import(raw)

    expect(restored.attempts[0]).toMatchObject({ questionReferenceStatus: 'pending', excludeFromMastery: true })
    expect(restored.attempts[1].questionReferenceStatus).toBeUndefined()
    expect(restored.attempts[2].questionReferenceStatus).toBeUndefined()
    localStorage.setItem('toefl-gre-workbench:v2', raw)
    expect(storage.load()?.attempts[0].questionReferenceStatus).toBe('pending')
    expect(restored.attempts).toHaveLength(3)
  })
  it('never rewrites a newer tab save while reading its previous state', () => {
    const initial = migrateState(v1())
    storage.save(initial)
    const originalGet = Storage.prototype.getItem
    let interleave = true
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key) {
      const raw = originalGet.call(this, key)
      if (key === 'toefl-gre-workbench:v2' && interleave) {
        interleave = false
        storage.save({ ...initial, profile: { ...initial.profile, dailyMinutes: 90 } })
      }
      return raw
    })
    try { expect(storage.load()?.profile.dailyMinutes).toBe(45) } finally { get.mockRestore() }
    expect(JSON.parse(localStorage.getItem('toefl-gre-workbench:v2')!).profile.dailyMinutes).toBe(90)
  })

  it('captures initial editor state and its revision from the same immutable record', () => {
    storage.save(migrateState(v1()))
    const raw = localStorage.getItem('toefl-gre-workbench:v2')!
    const revision = JSON.parse(raw)._localRevision
    const record = storage.loadRecord()
    expect(record.state?.profile.dailyMinutes).toBe(45)
    expect(record.revision).toBe(revision)
    expect(localStorage.getItem('toefl-gre-workbench:v2')).toBe(raw)
  })
})
