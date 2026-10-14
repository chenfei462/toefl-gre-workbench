import { describe, expect, it } from 'vitest'
import { canonicalSerialize, checksum, restoreSnapshot, createSnapshot } from './snapshot'
import { migrateState } from '../storage'

describe('snapshot integrity', () => {
  it('preserves the portable question bundle and includes it in integrity checks', async () => {
    const state = migrateState({ schemaVersion: 1, profile: {}, tasks: [] })
    const questionBank = { questions: [], sources: [], passages: [], explanations: [], media: [], revisions: [] }
    const snapshot = await createSnapshot({ ...state, questionBank })
    expect((await restoreSnapshot(snapshot)).questionBank).toEqual(questionBank)
    const corrupt = { ...snapshot.state, questionBank: { ...questionBank, sources: [{}] } }
    await expect(restoreSnapshot({ schemaVersion: 2, state: corrupt, checksum: await checksum(corrupt) })).rejects.toThrow()
  })
  it('rejects malformed business fields with valid checksums', async () => {
    const valid = migrateState({ schemaVersion: 1, profile: {}, tasks: [] })
    for (const patch of [{ profile: {} }, { tasks: [{}] }, { resources: [{}] }, { checkpoints: [{}] }, { mastery: [{}] }]) {
      const state = { ...valid, ...patch }
      await expect(restoreSnapshot({ schemaVersion: 2, state, checksum: await checksum(state) })).rejects.toThrow()
    }
  })
  it('canonicalizes object keys but retains array order', () => {
    expect(canonicalSerialize({ b: 2, a: [3, 1] })).toBe(canonicalSerialize({ a: [3, 1], b: 2 }))
    expect(canonicalSerialize([1, 2])).not.toBe(canonicalSerialize([2, 1]))
  })
  it('rejects calendar fields that would crash planning after restore', async () => {
    const valid = migrateState({ schemaVersion: 1, profile: {}, tasks: [{ id: 't', plannedDate: '2026-10-14' }] })
    for (const state of [
      { ...valid, profile: { ...valid.profile, startDate: 'bad-date' } },
      { ...valid, tasks: [{ ...valid.tasks[0], plannedDate: 'bad-date' }] },
      { ...valid, examProfiles: { ...valid.examProfiles, gre: { ...valid.examProfiles.gre, examDate: '2026-02-30' } } },
    ]) await expect(restoreSnapshot({ schemaVersion: 2, state, checksum: await checksum(state) })).rejects.toThrow()
  })
  it('round trips valid study data and rejects tampering', async () => {
    const state = migrateState({ schemaVersion: 1, profile: {}, tasks: [] })
    const snapshot = await createSnapshot(state)
    expect((await restoreSnapshot(snapshot)).profile).toEqual(state.profile)
    await expect(restoreSnapshot({ ...snapshot, state: { ...snapshot.state, tasks: [{}] } })).rejects.toThrow('checksum')
  })
  it('rejects unsupported versions even with a valid checksum', async () => {
    const state = { schemaVersion: 999 }
    await expect(restoreSnapshot({ schemaVersion: 999, state, checksum: await checksum(state) })).rejects.toThrow('schema')
  })
  it('migrates explicit V1 backups after integrity validation', async () => {
    const state = { schemaVersion: 1, profile: { examTypes: ['gre'] }, tasks: [], resources: [], practiceEntries: [], weeklyReviews: [] }
    expect((await restoreSnapshot({ schemaVersion: 1, state, checksum: await checksum(state) })).schemaVersion).toBe(2)
  })
})
