import { createEmptyCard, fsrs, type Card, type Grade } from 'ts-fsrs'
import { format } from 'date-fns'
import { z } from 'zod'
import type { VocabularyItem, WorkbenchState } from '../types'

export const fsrsCardSchema = z.object({ due: z.iso.datetime(), stability: z.number().nonnegative(), difficulty: z.number().nonnegative(), elapsed_days: z.number().nonnegative(), scheduled_days: z.number().nonnegative(), learning_steps: z.number().int().nonnegative(), reps: z.number().int().nonnegative(), lapses: z.number().int().nonnegative(), state: z.number().int().min(0).max(3), last_review: z.iso.datetime().optional() })
export type SerializedCard = z.infer<typeof fsrsCardSchema>
export const vocabularyItemSchema = z.object({ id: z.string(), word: z.string().min(1), meaning: z.string(), source: z.string().optional(), example: z.string().optional(), deck: z.string().optional(), fsrs: fsrsCardSchema.optional(), status: z.enum(['new', 'learning', 'weak', 'mature']), intervalDays: z.number().nonnegative(), nextReviewDate: z.iso.date(), correctStreak: z.number().int().nonnegative(), incorrectCount: z.number().int().nonnegative(), lastReviewedAt: z.string().optional() })
export const vocabularyReviewSchema = z.object({ id: z.string(), cardId: z.string(), reviewedAt: z.iso.datetime(), rating: z.number().int().min(1).max(4), due: z.iso.datetime() })
export type VocabularyReview = z.infer<typeof vocabularyReviewSchema>
const scheduler = fsrs({ enable_fuzz: false })
const serialize = (card: Card): SerializedCard => ({ ...card, due: card.due.toISOString(), last_review: card.last_review?.toISOString() })
export function upgradeVocabulary(item: VocabularyItem): VocabularyItem {
  if (item.fsrs) return item
  return { ...item, deck: item.deck ?? 'GRE', fsrs: serialize(createEmptyCard(new Date(`${item.nextReviewDate}T00:00:00`))) }
}
export function createVocabularyCard(word: string, meaning: string, now = new Date(), source?: string, example?: string, deck = 'GRE'): VocabularyItem {
  if (!word.trim()) throw new Error('请输入单词')
  return { id: crypto.randomUUID(), word: word.trim(), meaning: meaning.trim(), source, example, deck, status: 'new', intervalDays: 0, nextReviewDate: format(now, 'yyyy-MM-dd'), correctStreak: 0, incorrectCount: 0, fsrs: serialize(createEmptyCard(now)) }
}
export function reviewVocabulary(state: WorkbenchState, id: string, rating: Grade, now = new Date()): WorkbenchState {
  const original = state.vocabulary.find(v => v.id === id)
  if (!original || ![1, 2, 3, 4].includes(rating)) throw new Error('无效的词汇或评分')
  const item = upgradeVocabulary(original), card = item.fsrs!
  if (card.last_review && now <= new Date(card.last_review)) throw new Error('这次复习已经保存')
  const result = scheduler.next({ ...card, due: new Date(card.due), last_review: card.last_review ? new Date(card.last_review) : undefined }, now, rating)
  const next = serialize(result.card), correct = rating !== 1, date = format(now, 'yyyy-MM-dd'), exam = item.deck === 'TOEFL' ? 'toefl' : 'gre'
  return { ...state, vocabulary: state.vocabulary.map(v => v.id === id ? { ...item, fsrs: next, status: next.state === 2 ? 'mature' : next.state === 3 ? 'weak' : 'learning', intervalDays: next.scheduled_days, nextReviewDate: format(result.card.due, 'yyyy-MM-dd'), lastReviewedAt: now.toISOString(), correctStreak: correct ? item.correctStreak + 1 : 0, incorrectCount: item.incorrectCount + Number(!correct) } : v), vocabularyReviews: [{ id: crypto.randomUUID(), cardId: id, reviewedAt: now.toISOString(), rating, due: next.due }, ...(state.vocabularyReviews ?? [])], attempts: [{ id: crypto.randomUUID(), date, exam, section: exam === 'gre' ? 'verbal' : 'reading', skillIds: [`${exam}-vocabulary`], source: `Vocabulary · ${item.word}`, sourceType: 'self_created', correct, evidenceWeight: 0.5, reviewed: true, note: `FSRS rating ${rating}` }, ...state.attempts] }
}
