// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { storage, migrateState } from '../storage'
import { readLocalRevision, saveWithRevision, saveEditorState, LOCAL_STATE_KEY } from './revision'
import { beginRestore, completeRestore } from './restoreJournal'

beforeEach(() => localStorage.clear())
it('rejects stale editor writes without replacing the newer state', () => {
  const state = migrateState({ schemaVersion: 1, profile: {}, tasks: [] })
  saveWithRevision(state, 0)
  saveWithRevision({ ...state, profile: { ...state.profile, dailyMinutes: 90 } }, 1)
  expect(() => saveWithRevision({ ...state, profile: { ...state.profile, dailyMinutes: 30 } }, 1)).toThrow('another tab')
  expect(storage.load()?.profile.dailyMinutes).toBe(90)
})
it('increments persisted business changes once and ignores identical saves', () => {
  const state = migrateState({ schemaVersion: 1, profile: {}, tasks: [] })
  storage.save(state)
  expect(readLocalRevision()).toBe(1)
  storage.save(state)
  expect(readLocalRevision()).toBe(1)
  storage.save({ ...state, profile: { ...state.profile, dailyMinutes: 60 } })
  expect(readLocalRevision()).toBe(2)
  expect(storage.load()?.profile.dailyMinutes).toBe(60)
  expect(readLocalRevision()).toBe(2)
})
it('ignores business-object key reordering while preserving array order', () => {
  const state = migrateState({ schemaVersion: 1, profile: {}, tasks: [] })
  saveWithRevision(state)
  const reordered = Object.fromEntries(Object.entries(state).reverse())
  reordered.profile = Object.fromEntries(Object.entries(state.profile).reverse())
  expect(saveWithRevision(reordered, 1)).toBe(1)
  expect(readLocalRevision()).toBe(1)
  expect(saveWithRevision({ ...reordered, skills: [...state.skills].reverse() }, 1)).toBe(2)
})
it('refuses an already-open editor save while a crashed restore awaits recovery', async () => {
  const state = migrateState({ schemaVersion: 1, profile: {}, tasks: [] })
  saveWithRevision(state)
  const previousRaw = localStorage.getItem(LOCAL_STATE_KEY)
  await beginRestore({ previousRaw, previousBank: { questions: [], sources: [], passages: [], explanations: [], media: [], revisions: [] }, metadataKey: 'meta', previousMetadata: null })
  try {
    await expect(saveEditorState({ ...state, profile: { ...state.profile, dailyMinutes: 70 } }, 1)).rejects.toThrow(/restore|recovery/i)
    expect(() => storage.clear(1)).toThrow(/restore|recovery/i)
    expect(localStorage.getItem(LOCAL_STATE_KEY)).toBe(previousRaw)
  } finally { await completeRestore() }
})
it('does not advance revision or lose old data on a failed local write', () => {
  const state = migrateState({ schemaVersion: 1, profile: {}, tasks: [] })
  storage.save(state)
  const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
  expect(() => storage.save({ ...state, tasks: [] , profile: { ...state.profile, dailyMinutes: 120 } })).toThrow('quota')
  expect(readLocalRevision()).toBe(1)
  set.mockRestore()
  expect(storage.load()?.profile.dailyMinutes).toBe(state.profile.dailyMinutes)
})

it('never reuses a pre-reset revision when a new plan is saved', () => {
  const state = migrateState({ schemaVersion: 1, profile: {}, tasks: [] })
  storage.save(state)
  const staleRevision = readLocalRevision()
  storage.clear(staleRevision)
  expect(storage.load()).toBeNull()
  storage.save({ ...state, profile: { ...state.profile, dailyMinutes: 75 } })
  expect(() => saveWithRevision(state, staleRevision)).toThrow('another tab')
  expect(storage.load()?.profile.dailyMinutes).toBe(75)
})

it('rejects a reset from a stale editor without erasing newer learning data', () => {
  const state = migrateState({ schemaVersion: 1, profile: {}, tasks: [] })
  storage.save(state)
  const staleRevision = readLocalRevision()
  storage.save({ ...state, profile: { ...state.profile, dailyMinutes: 90 } })
  expect(() => storage.clear(staleRevision)).toThrow('another tab')
  expect(storage.load()?.profile.dailyMinutes).toBe(90)
})

it('keeps learning data and its revision if the reset marker cannot be persisted', () => {
  const state = migrateState({ schemaVersion: 1, profile: {}, tasks: [] })
  storage.save(state)
  const revision = readLocalRevision()
  const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
  expect(() => storage.clear(revision)).toThrow('quota')
  expect(readLocalRevision()).toBe(revision)
  set.mockRestore()
  expect(storage.load()?.profile.dailyMinutes).toBe(state.profile.dailyMinutes)
})
