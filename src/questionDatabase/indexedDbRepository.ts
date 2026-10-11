import type { AnswerExplanation, Passage, Question, QuestionMedia, QuestionSource } from '../types'
import type { QuestionRepository, QuestionSearch } from './repository'
import { searchQuestions, mergeQuestionImport } from './repository'
import type { QuestionImportRecord } from './domain'
import { defaultSources } from './sources'
export interface Revision { id: string; questionId: string; snapshot: Question; revisedAt: string; reason: string }
export interface QuestionBundle { questions: Question[]; sources: QuestionSource[]; passages: Passage[]; explanations: AnswerExplanation[]; media: QuestionMedia[]; revisions: Revision[] }
const stores = ['questions', 'sources', 'passages', 'explanations', 'media', 'revisions'] as const
export class IndexedDbQuestionRepository implements QuestionRepository {
  private async db(): Promise<IDBDatabase> { return new Promise((resolve, reject) => { const r = indexedDB.open('toefl-gre-question-bank', 2); r.onupgradeneeded = () => { for (const s of stores) if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, { keyPath: 'id' }) }; r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); r.onblocked = () => reject(new Error('请关闭旧版工作台标签后重试')) }) }
  private async read<T>(store: typeof stores[number]): Promise<T[]> { const db = await this.db(); return new Promise((resolve, reject) => { const tx = db.transaction(store); const request = tx.objectStore(store).getAll(); tx.oncomplete = () => { db.close(); resolve(request.result) }; tx.onabort = () => { db.close(); reject(tx.error) } }) }
  private async write(rows: Partial<QuestionBundle>) { const db = await this.db(); return new Promise<void>((resolve, reject) => { const names = Object.keys(rows) as typeof stores[number][]; const tx = db.transaction(names, 'readwrite'); for (const name of names) for (const row of rows[name] ?? []) tx.objectStore(name).put(row); tx.oncomplete = () => { db.close(); resolve() }; tx.onabort = () => { db.close(); reject(tx.error ?? new Error('存储事务失败')) } }) }
  async getById(id: string) { return (await this.read<Question>('questions')).find(q => q.id === id) }
  async search(query: QuestionSearch = {}) { return searchQuestions(await this.read<Question>('questions'), await this.listSources(), query) }
  async listSources() { const saved = await this.read<QuestionSource>('sources'); return [...saved, ...defaultSources.filter(s => !saved.some(x => x.id === s.id))] }
  async importQuestions(records: QuestionImportRecord[]) {
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
  async update(question: Question) { const old = await this.getById(question.id); await this.write({ questions: [{ ...question, updatedAt: new Date().toISOString() }], revisions: old ? [{ id: crypto.randomUUID(), questionId: old.id, snapshot: old, revisedAt: new Date().toISOString(), reason: '用户修改' }] : [] }) }
  async markInactive(id: string) { const q = await this.getById(id); if (q) await this.update({ ...q, active: false }) }
  async exportBundle(): Promise<QuestionBundle> { const questions = await this.read<Question>('questions'), sources = await this.listSources(), passages = await this.read<Passage>('passages'), explanations = await this.read<AnswerExplanation>('explanations'), media = await this.read<QuestionMedia>('media'), revisions = await this.read<Revision>('revisions'); return { questions, sources, passages, explanations, media, revisions } }
  async saveReferences(rows: Partial<Omit<QuestionBundle, 'questions'>>) { await this.write(rows) }
}

