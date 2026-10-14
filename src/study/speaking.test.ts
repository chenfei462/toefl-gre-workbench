import { describe, it, expect, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { RecordingController, RecordingStore } from './recordings'
import { reviewSpeakingSession } from './speaking'
import { speakingSessionSchema } from './speakingSchema'
import { migrateState } from '../storage'

describe('speaking recording lifecycle', () => {
  it('reports runtime recorder failures immediately and frees tracks', async () => {
    const stop = vi.fn(), failure = vi.fn()
    const fake = { state: 'recording', start: vi.fn(), stop: vi.fn(), onerror: undefined as undefined | (() => void) }
    const controller = new RecordingController({ getUserMedia: async () => ({ getTracks: () => [{ stop }] }) as unknown as MediaStream, createRecorder: () => fake as unknown as MediaRecorder }, failure)
    await controller.start()
    fake.onerror!()
    expect(failure).toHaveBeenCalledOnce()
    expect(stop).toHaveBeenCalledOnce()
    await expect(controller.stop()).rejects.toThrow('录音失败')
  })
  it('reports denied microphone permission', async () => {
    const controller = new RecordingController({ getUserMedia: async () => { throw new DOMException('denied', 'NotAllowedError') }, createRecorder: vi.fn() })
    await expect(controller.start()).rejects.toThrow('麦克风权限')
  })
  it('releases a stream when permission arrives after cancellation', async () => {
    const stop = vi.fn()
    let resolve!: (s: MediaStream) => void
    const createRecorder = vi.fn()
    const controller = new RecordingController({ getUserMedia: () => new Promise(r => { resolve = r }), createRecorder })
    const pending = controller.start()
    controller.dispose()
    resolve({ getTracks: () => [{ stop }] } as unknown as MediaStream)
    await expect(pending).rejects.toThrow('取消')
    expect(stop).toHaveBeenCalledOnce()
    expect(createRecorder).not.toHaveBeenCalled()
  })
  it('stops once, collects audio, and releases the microphone', async () => {
    const stopTrack = vi.fn()
    const fake = { state: 'inactive', mimeType: 'audio/webm', ondataavailable: null as null | ((event: { data: Blob }) => void), onstop: null as null | (() => void), onerror: null, start() { fake.state = 'recording' }, stop() { fake.state = 'inactive'; fake.ondataavailable?.({ data: new Blob(['voice']) }); fake.onstop?.() } }
    const recorder = fake as unknown as MediaRecorder
    const controller = new RecordingController({ getUserMedia: async () => ({ getTracks: () => [{ stop: stopTrack }] }) as unknown as MediaStream, createRecorder: () => recorder })
    await controller.start()
    const first = controller.stop()
    expect(await first).toHaveProperty('size', 5)
    expect(await controller.stop()).toHaveProperty('size', 5)
    expect(stopTrack).toHaveBeenCalledOnce()
  })
  it('releases microphone after recorder startup failure', async () => {
    const stop = vi.fn()
    const controller = new RecordingController({ getUserMedia: async () => ({ getTracks: () => [{ stop }] }) as unknown as MediaStream, createRecorder: () => { throw new Error('device failed') } })
    await expect(controller.start()).rejects.toThrow('device failed')
    expect(stop).toHaveBeenCalledOnce()
  })
  it('persists audio and metadata across store instances', async () => {
    const store = new RecordingStore('speaking-test')
    const session = speakingSessionSchema.parse({ id: 's1', taskType: 'listen_repeat', prompt: 'Repeat', startedAt: '2026-10-14T01:00:00.000Z', durationSeconds: 5, preparationSeconds: 0, responseSeconds: 20, recordingId: 'r1', mimeType: 'audio/webm', byteLength: 5 })
    await store.put({ id: 'r1', blob: new Blob(['voice'], { type: 'audio/webm' }), session })
    const reloaded = await new RecordingStore('speaking-test').get('r1')
    expect(reloaded?.blob.size).toBe(5)
    expect(reloaded?.session).toEqual(session)
  })
  it('records self review only once and maps errors to existing mastery skills', () => {
    const session = speakingSessionSchema.parse({ id: 's1', taskType: 'interview', prompt: 'Why?', startedAt: '2026-10-14T01:00:00.000Z', durationSeconds: 5, preparationSeconds: 0, responseSeconds: 20, recordingId: 'r1', mimeType: 'audio/webm', byteLength: 5 })
    const state = { ...migrateState({}), speakingSessions: [session] }
    const next = reviewSpeakingSession(state, session.id, 2, ['hesitation', 'organization'], 'Need structure')
    expect(next.attempts[0].skillIds).toContain('toefl-speaking-interview')
    expect(next.attempts[0].correct).toBe(false)
    expect(next.errorRecords.map(e => e.errorType)).toEqual(['fluency', 'strategy'])
    expect(reviewSpeakingSession(next, session.id, 5, [], '').attempts).toHaveLength(1)
  })
})
