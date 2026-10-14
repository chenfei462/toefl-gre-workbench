import type { SpeakingPracticeSession } from './speaking'
import { assertNoPendingRestore, withLocalWriteLock, type UnderLocalLock } from '../cloud/localLock'
export interface StoredRecording { id: string; blob: Blob; session: SpeakingPracticeSession; _restoreToken?: string }
export class RecordingStore {
  private name: string
  constructor(name = 'toefl-gre-speaking-recordings') { this.name = name }
  private open(): Promise<IDBDatabase> { return new Promise((resolve, reject) => {
    const request = indexedDB.open(this.name, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('recordings', { keyPath: 'id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('请关闭其他旧版工作台标签后重试'))
  }) }
  private async transact<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('recordings', mode), request = operation(tx.objectStore('recordings'))
      tx.oncomplete = () => { db.close(); resolve(request.result) }
      tx.onabort = () => { db.close(); reject(tx.error ?? new Error('录音存储失败')) }
      tx.onerror = () => { /* Abort handler reports the failed transaction. */ }
    })
  }
  private write(action: () => Promise<void>, options: UnderLocalLock): Promise<void> {
    if (options.underLock) return action()
    return withLocalWriteLock(() => { assertNoPendingRestore(); return action() })
  }
  async put(record: StoredRecording, options: UnderLocalLock = {}): Promise<void> { return this.write(async () => { await this.transact('readwrite', store => store.put(record)) }, options) }
  async add(record: StoredRecording, options: UnderLocalLock = {}): Promise<void> { return this.write(async () => { await this.transact('readwrite', store => store.add(record)) }, options) }
  async removeRestored(id: string, token: string, options: UnderLocalLock = {}): Promise<void> {
    return this.write(async () => {
    await this.transact('readwrite', store => {
      const request = store.get(id)
      request.onsuccess = () => { if (request.result?._restoreToken === token) store.delete(id) }
      return request
    })
    }, options)
  }
  get(id: string): Promise<StoredRecording | undefined> { return this.transact('readonly', store => store.get(id)) }
  list(): Promise<StoredRecording[]> { return this.transact('readonly', store => store.getAll()) }
}
interface RecorderEnvironment { getUserMedia: () => Promise<MediaStream>; createRecorder: (stream: MediaStream) => MediaRecorder }
export class RecordingController {
  private stream?: MediaStream
  private recorder?: MediaRecorder
  private cancelled = false
  private result?: Promise<Blob>
  private rejectResult?: (reason: Error) => void
  private environment: RecorderEnvironment
  private onFailure?: (error: Error) => void
  constructor(environment: RecorderEnvironment = {
    getUserMedia: () => { if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('当前浏览器不支持录音，请使用 HTTPS 或 localhost 上的新版浏览器'); return navigator.mediaDevices.getUserMedia({ audio: true }) },
    createRecorder: stream => new MediaRecorder(stream),
  }, onFailure?: (error: Error) => void) { this.environment = environment; this.onFailure = onFailure }
  async start(): Promise<void> {
    if (this.cancelled || this.result) throw new Error('录音已取消或已开始')
    try {
      const stream = await this.environment.getUserMedia()
      if (this.cancelled) { stream.getTracks().forEach(track => track.stop()); throw new Error('录音已取消') }
      this.stream = stream
      const recorder = this.environment.createRecorder(stream)
      this.recorder = recorder
      const chunks: Blob[] = []
      this.result = new Promise((resolve, reject) => {
        this.rejectResult = reject
        recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
        recorder.onerror = () => { this.release(); const error = new Error('录音失败，请检查麦克风后重试'); reject(error); this.onFailure?.(error) }
        recorder.onstop = () => { this.release(); const blob = new Blob(chunks, { type: recorder.mimeType || chunks[0]?.type || 'audio/webm' }); if (blob.size) resolve(blob); else reject(new Error('没有录到音频，请检查麦克风后重试')) }
      })
      void this.result.catch(() => undefined)
      recorder.start(1000)
    } catch (error) {
      this.release()
      if (error && typeof error === 'object' && 'name' in error && error.name === 'NotAllowedError') throw new Error('麦克风权限被拒绝。请在浏览器设置中允许麦克风后重试。')
      throw error
    }
  }
  stop(): Promise<Blob> {
    if (!this.result || !this.recorder) return Promise.reject(new Error('尚未开始录音'))
    if (this.recorder.state !== 'inactive') { try { this.recorder.stop() } catch (error) { this.release(); this.rejectResult?.(error instanceof Error ? error : new Error('停止录音失败')) } }
    return this.result
  }
  private release() { this.stream?.getTracks().forEach(track => track.stop()); this.stream = undefined }
  dispose() { this.cancelled = true; if (this.recorder?.state === 'recording') { try { this.recorder.stop() } catch { /* Release microphone even when stop fails. */ } }; this.release(); this.rejectResult?.(new Error('录音已取消')) }
}
