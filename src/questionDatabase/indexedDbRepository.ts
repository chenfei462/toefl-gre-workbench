import type { AnswerExplanation, Passage, Question, QuestionMedia, QuestionSource } from '../types'
import type { QuestionRepository, QuestionSearch } from './repository'
import { searchQuestions, mergeQuestionImport } from './repository'
import type { QuestionImportRecord } from './domain'
import { defaultSources } from './sources'
import { parseCloudQuestionBundle } from './bundle'
import { assertNoPendingRestore, stampBankMutation, withLocalWriteLock, type UnderLocalLock } from '../cloud/localLock'
export interface Revision { id: string; questionId: string; snapshot: Question; revisedAt: string; reason: string }
export interface QuestionBundle { questions: Question[]; sources: QuestionSource[]; passages: Passage[]; explanations: AnswerExplanation[]; media: QuestionMedia[]; revisions: Revision[] }
const stores = ['questions', 'sources', 'passages', 'explanations', 'media', 'revisions'] as const
export class IndexedDbQuestionRepository implements QuestionRepository {
  private mutate<T>(action: () => Promise<T>): Promise<T> {
    return withLocalWriteLock(async () => {
      assertNoPendingRestore()
      stampBankMutation()
      try { return await action() }
      finally { if (typeof window !== 'undefined') window.dispatchEvent(new Event('workbench-data-change')) }
    })
  }
  private async db(): Promise<IDBDatabase> { return new Promise((resolve, reject) => { const r = indexedDB.open('toefl-gre-question-bank', 2); r.onupgradeneeded = () => { for (const s of stores) if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, { keyPath: 'id' }) }; r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); r.onblocked = () => reject(new Error('请关闭旧版工作台标签后重试')) }) }
  private async read<T>(store: typeof stores[number]): Promise<T[]> { const db = await this.db(); return new Promise((resolve, reject) => { const tx = db.transaction(store); const request = tx.objectStore(store).getAll(); tx.oncomplete = () => { db.close(); resolve(request.result) }; tx.onabort = () => { db.close(); reject(tx.error) } }) }
  private async write(rows: Partial<QuestionBundle>) { const db = await this.db(); return new Promise<void>((resolve, reject) => { const names = Object.keys(rows) as typeof stores[number][]; const tx = db.transaction(names, 'readwrite'); for (const name of names) for (const row of rows[name] ?? []) tx.objectStore(name).put(row); tx.oncomplete = () => { db.close(); resolve() }; tx.onabort = () => { db.close(); reject(tx.error ?? new Error('存储事务失败')) } }) }
  async getById(id: string) { return (await this.read<Question>('questions')).find(q => q.id === id) }
  async search(query: QuestionSearch = {}) { const bundle = await this.exportBundle(); return searchQuestions(bundle.questions, bundle.sources, query) }
  async listSources() { const saved = await this.read<QuestionSource>('sources'); return [...saved, ...defaultSources.filter(s => !saved.some(x => x.id === s.id))] }
  async importQuestions(records: QuestionImportRecord[]) {
    return this.mutate(() => this.importQuestionsUnderLock(records))
  }
  private async importQuestionsUnderLock(records: QuestionImportRecord[]) {
    // Validation and duplicate checks happen inside the same write transaction to avoid concurrent imports racing.
    const sources = await this.listSources(), db = await this.db()
    return new Promise<{ added: Question[]; duplicates: number }>((resolve, reject) => {
      const tx = db.transaction(['questions', 'revisions'], 'readwrite'), store = tx.objectStore('questions'), request = store.getAll()
      let result = { added: [] as Question[], duplicates: 0 }
      request.onsuccess = () => {
        const merged = mergeQuestionImport(records, sources, request.result)
        result = { added: merged.added, duplicates: merged.duplicates }
        merged.questions.forEach(q => store.put(q))
        merged.conflicts.forEach(old => tx.objectStore('revisions').put({ id: crypto.randomUUID(), questionId: old.id, snapshot: old, revisedAt: new Date().toISOString(), reason: '导入答案冲突' }))
      }
      tx.oncomplete = () => { db.close(); resolve(result) }; tx.onabort = () => { db.close(); reject(tx.error) }
    })
  }
  private async updateUnderLock(question: Question) { const old = await this.getById(question.id); await this.write({ questions: [{ ...question, updatedAt: new Date().toISOString() }], revisions: old ? [{ id: crypto.randomUUID(), questionId: old.id, snapshot: old, revisedAt: new Date().toISOString(), reason: '用户修改' }] : [] }) }
  async update(question: Question) { await this.mutate(() => this.updateUnderLock(question)) }
  async markInactive(id: string) { await this.mutate(async () => { const q = await this.getById(id); if (q) await this.updateUnderLock({ ...q, active: false }) }) }
  async exportBundle(): Promise<QuestionBundle> {
    const db = await this.db()
    return new Promise((resolve, reject) => {
      // One transaction captures every store at the same bank revision.
      const tx = db.transaction([...stores], 'readonly')
      const requests = Object.fromEntries(stores.map(name => [name, tx.objectStore(name).getAll()])) as Record<typeof stores[number], IDBRequest>
      tx.oncomplete = () => {
        db.close()
        const bundle = Object.fromEntries(stores.map(name => [name, requests[name].result])) as unknown as QuestionBundle
        bundle.sources = [...bundle.sources, ...defaultSources.filter(source => !bundle.sources.some(saved => saved.id === source.id))].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
        resolve(bundle)
      }
      tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Question bank read failed')) }
    })
  }
  async saveReferences(rows: Partial<Omit<QuestionBundle, 'questions'>>) { await this.mutate(() => this.write(rows)) }
  async restoreBundle(input: QuestionBundle, options: UnderLocalLock = {}): Promise<void> {
    if (!options.underLock) return this.mutate(() => this.restoreBundle(input, { underLock: true }))
    const bundle = parseCloudQuestionBundle(input)
    const db = await this.db()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([...stores], 'readwrite')
      for (const name of stores) {
        const store = tx.objectStore(name)
        store.clear()
        for (const row of bundle[name]) store.put(row)
      }
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Question bank restore failed')) }
    })
  }
}

