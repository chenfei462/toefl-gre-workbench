import { useState } from 'react'
import type { ErrorRecord, ErrorType } from '../types'
import type { LearningProps } from '../questionDatabase/Capture'
import { Dialog, Input, Select } from '../questionDatabase/ui'
import { addErrorVocabulary, analyzeTraps, ERROR_TYPES, TRAP_TYPES, updateErrorAnalysis } from './traps'

export function TrapSummary({ errors }: { errors: ErrorRecord[] }) {
  const rows = analyzeTraps(errors)
  return <section className="panel"><h3>重复陷阱分析</h3><p>按全部错题计数；已解决的错题保留历史，不重复计算二刷。</p>{rows.length ? <ul>{rows.map(row => <li key={row.trapType}>{row.trapType} · {row.count} 次错误 · 未解决 {row.unresolved}</li>)}</ul> : <p>为错题标注陷阱后，可查看反复出现的原因。</p>}</section>
}

export function ErrorAnalysis({ state, onUpdate, flash, errorId, onClose }: LearningProps & { errorId: string; onClose: () => void }) {
  const error = state.errorRecords.find(e => e.id === errorId)!
  const [draft, setDraft] = useState({ skillIds: error.skillIds, errorType: error.errorType, trapType: error.trapType ?? '', myReason: error.myReason ?? '', correctReason: error.correctReason ?? error.correctedUnderstanding ?? '', betterStrategy: error.betterStrategy ?? '' })
  const [word, setWord] = useState(''), [meaning, setMeaning] = useState(''), [message, setMessage] = useState('')
  const skills = state.skills.filter(s => s.exam === error.exam && (s.section === error.section || error.skillIds.includes(s.id)))
  const traps = [...TRAP_TYPES] as string[]
  if (draft.trapType && !traps.includes(draft.trapType)) traps.push(draft.trapType)
  const save = () => { try { onUpdate(updateErrorAnalysis(state, errorId, draft)); flash('错题分析已保存，技能证据已更新'); onClose() } catch (e) { setMessage(e instanceof Error ? e.message : '保存失败') } }
  const addWord = () => { try { const next = addErrorVocabulary(state, errorId, word, meaning); onUpdate(next); setMessage(next === state ? '该词已在此考试词库中' : '已加入词汇复习，并保留错题来源'); setWord(''); setMeaning('') } catch (e) { setMessage(e instanceof Error ? e.message : '添加失败') } }
  return <Dialog title="分析错因与陷阱" onClose={onClose}>
    <p>{error.questionType ?? error.section} · {error.status} · 二刷 {error.reviewCount} 次</p>
    <fieldset><legend>技能（可多选）</legend>{skills.map(skill => <label className="field" key={skill.id}><span><input type="checkbox" checked={draft.skillIds.includes(skill.id)} onChange={e => setDraft(d => ({ ...d, skillIds: e.target.checked ? [...d.skillIds, skill.id] : d.skillIds.filter(id => id !== skill.id) }))} /> {skill.name}</span></label>)}</fieldset>
    <Select label="错误类型" value={draft.errorType} options={ERROR_TYPES.map(id => ({ id, name: id }))} onChange={v => setDraft(d => ({ ...d, errorType: v as ErrorType }))} />
    <Select label="陷阱类型" value={draft.trapType} options={[{ id: '', name: '未标注 / 不适用' }, ...traps.map(id => ({ id, name: id }))]} onChange={v => setDraft(d => ({ ...d, trapType: v }))} />
    <Input label="我的错误推理" value={draft.myReason} onChange={v => setDraft(d => ({ ...d, myReason: v }))} />
    <Input label="正确推理" value={draft.correctReason} onChange={v => setDraft(d => ({ ...d, correctReason: v }))} />
    <Input label="下次更好的策略" value={draft.betterStrategy} onChange={v => setDraft(d => ({ ...d, betterStrategy: v }))} />
    <button className="primary wide" onClick={save}>保存分析</button>
    <h4>生词加入词汇复习</h4><Input label="不认识的单词" value={word} onChange={setWord} /><Input label="词义（可稍后补充）" value={meaning} onChange={setMeaning} />
    <button className="secondary" onClick={addWord}>加入词汇 / Add to Vocabulary</button>{message && <p role="status">{message}</p>}
  </Dialog>
}
