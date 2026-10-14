import { assertNoPendingRestore, withLocalWriteLock, type UnderLocalLock } from '../cloud/localLock'
export type MaterialRights = 'user_owned' | 'public' | 'licensed'
export interface StudyMaterial { id: string; name: string; kind: 'text' | 'audio' | 'pdf' | 'docx'; rights: MaterialRights; importedAt: string; size: number; blob: Blob; text?: string; _restoreToken?: string }
export async function importMaterial(file: File, rights: string): Promise<StudyMaterial> {
  if (!['user_owned', 'public', 'licensed'].includes(rights)) throw new Error('请明确确认材料使用权：本人拥有、公开资源或已获授权')
  if (!file.size || file.size > 100 * 1024 * 1024) throw new Error('文件需大于 0 字节且不超过 100 MB')
  const extension = file.name.split('.').pop()?.toLowerCase()
  const kind = extension === 'txt' ? 'text' : extension === 'pdf' ? 'pdf' : extension === 'docx' ? 'docx' : ['mp3', 'wav', 'ogg', 'm4a', 'webm', 'aac', 'flac'].includes(extension ?? '') ? 'audio' : undefined
  if (!kind) throw new Error('支持 TXT、PDF、DOCX 和常见音频格式')
  if (kind === 'text' && file.size > 5 * 1024 * 1024) throw new Error('文本材料不得超过 5 MB')
  const mime = kind === 'pdf' ? 'application/pdf' : kind === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : kind === 'text' ? 'text/plain' : file.type || 'audio/' + (extension === 'mp3' ? 'mpeg' : extension === 'm4a' ? 'mp4' : extension)
  return { id: crypto.randomUUID(), name: file.name, kind, rights: rights as MaterialRights, importedAt: new Date().toISOString(), size: file.size, blob: file.slice(0, file.size, mime), text: kind === 'text' ? await file.text() : undefined }
}
export class MaterialStore {
  private name: string
  constructor(name = 'toefl-gre-study-materials') { this.name = name }
  private open(): Promise<IDBDatabase> { return new Promise((resolve, reject) => { const request = indexedDB.open(this.name, 1); request.onupgradeneeded = () => request.result.createObjectStore('materials', { keyPath: 'id' }); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); request.onblocked = () => reject(new Error('请关闭旧版工作台标签后重试')) }) }
  private async run<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.open()
    return new Promise((resolve, reject) => { const tx = db.transaction('materials', mode), request = operation(tx.objectStore('materials')); tx.oncomplete = () => { db.close(); resolve(request.result) }; tx.onabort = () => { db.close(); reject(tx.error ?? new Error('材料存储失败')) } })
  }
  private write(action: () => Promise<void>, options: UnderLocalLock): Promise<void> {
    if (options.underLock) return action()
    return withLocalWriteLock(() => { assertNoPendingRestore(); return action() })
  }
  async put(material: StudyMaterial, options: UnderLocalLock = {}) { return this.write(async () => { await this.run('readwrite', store => store.put(material)) }, options) }
  async add(material: StudyMaterial, options: UnderLocalLock = {}) { return this.write(async () => { await this.run('readwrite', store => store.add(material)) }, options) }
  async removeRestored(id: string, token: string, options: UnderLocalLock = {}): Promise<void> {
    return this.write(async () => {
    await this.run('readwrite', store => {
      const request = store.get(id)
      request.onsuccess = () => { if (request.result?._restoreToken === token) store.delete(id) }
      return request
    })
    }, options)
  }
  list(): Promise<StudyMaterial[]> { return this.run('readonly', store => store.getAll()) }
}
