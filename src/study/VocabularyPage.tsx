import { useEffect, useState } from 'react'
import type { Grade } from 'ts-fsrs'
import type { LearningProps } from '../questionDatabase/Capture'
import { createVocabularyCard, reviewVocabulary, upgradeVocabulary } from './vocabulary'

export function VocabularyPage({ state, onUpdate, flash }: LearningProps) {
  const [word, setWord] = useState(''), [meaning, setMeaning] = useState(''), [example, setExample] = useState(''), [deck, setDeck] = useState('GRE'), [revealed, setRevealed] = useState<string>()
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(timer) }, [])
  const cards = state.vocabulary.map(upgradeVocabulary), due = cards.filter(v => v.deck === deck && new Date(v.fsrs!.due) <= now)
  const add = () => { if (!word.trim()) return; onUpdate({ ...state, vocabulary: [createVocabularyCard(word, meaning, new Date(), '用户添加', example, deck), ...state.vocabulary] }); setNow(new Date()); setWord(''); setMeaning(''); setExample(''); flash('词汇已加入复习队列') }
  const review = (id: string, rating: Grade) => { try { onUpdate(reviewVocabulary(state, id, rating)); setRevealed(undefined); flash('FSRS 已安排下次复习') } catch (e) { flash(String(e)) } }
  return <><div className="page-intro"><div><span className="eyebrow">Vocabulary · FSRS</span><h2>词汇复习</h2><p>先回忆词义，再按实际记忆程度评分。</p></div><label>词汇 Deck<select aria-label="词汇 Deck" value={deck} onChange={e => setDeck(e.target.value)}><option>GRE</option><option>TOEFL</option></select></label></div>
    <div className="form-card"><label className="field">单词<input placeholder="添加一个词" value={word} onChange={e => setWord(e.target.value)} /></label><label className="field">词义<input value={meaning} onChange={e => setMeaning(e.target.value)} /></label><label className="field">例句<input value={example} onChange={e => setExample(e.target.value)} /></label><button className="primary" onClick={add}>添加词汇</button></div>
    <p>Due Today {due.length} · {cards.length} total · New {cards.filter(v => v.fsrs!.state === 0).length} · Learning {cards.filter(v => v.fsrs!.state === 1).length} · Review {cards.filter(v => v.fsrs!.state === 2).length} · Relearning {cards.filter(v => v.fsrs!.state === 3).length}</p>
    <div className="vocab-list">{due.map(item => <article className="vocab-row" key={item.id}><div><strong>{item.word}</strong><span>{item.source}</span>{revealed === item.id && <><label>编辑 {item.word} 词义<input value={item.meaning} onChange={e => onUpdate({ ...state, vocabulary: state.vocabulary.map(v => v.id === item.id ? { ...v, meaning: e.target.value } : v) })} /></label><p>{item.example}</p></>}</div><div>{revealed !== item.id ? <button className="secondary" onClick={() => setRevealed(item.id)}>显示词义</button> : (['Again', 'Hard', 'Good', 'Easy'] as const).map((label, i) => <button className="secondary" disabled={!item.meaning.trim()} key={label} onClick={() => review(item.id, i + 1 as Grade)}>{label}</button>)}</div></article>)}</div>
    {!due.length && <p className="empty-state">今天没有到期词汇。</p>}<details><summary>词汇与复习历史</summary>{cards.map(v => <p key={v.id}>{v.word} · {v.meaning} · {v.deck} · 下次 {new Date(v.fsrs!.due).toLocaleString()} · reps {v.fsrs!.reps} · lapses {v.fsrs!.lapses}</p>)}{(state.vocabularyReviews ?? []).map(r => <p key={r.id}>{cards.find(v => v.id === r.cardId)?.word} · {['', 'Again', 'Hard', 'Good', 'Easy'][r.rating]} · {new Date(r.reviewedAt).toLocaleString()}</p>)}</details></>
}
