import { useState } from 'react'
import type { DailyPrescriptionBlock, WorkbenchState } from '../types'
import { feedbackVerdicts, recordRecommendationFeedback, type RecommendationFeedbackInput } from './recommendationFeedback'
export interface RecommendationFeedbackProps { state: WorkbenchState; onUpdate: (state: WorkbenchState) => void; block: DailyPrescriptionBlock; date: string }

const verdictLabels: Record<RecommendationFeedbackInput['verdict'], string> = {
  correct: '建议合适', priority_too_high: '优先级太高', priority_too_low: '优先级太低',
  already_mastered: '已经掌握', bad_resource: '资源不合适', bad_time_allocation: '时间分配不合适',
}

export function RecommendationFeedbackForm({ state, onUpdate, block, date }: RecommendationFeedbackProps) {
  const [rating, setRating] = useState('')
  const [verdict, setVerdict] = useState('')
  const [note, setNote] = useState('')
  const [recorded, setRecorded] = useState(false)
  const [error, setError] = useState('')
  const skill = state.skills.find(item => item.id === block.skillId && item.exam === block.exam)
  if (!skill) return null

  const submit = () => {
    if (recorded || !rating || !verdict) return
    try {
      onUpdate(recordRecommendationFeedback(state, block, date, { rating: Number(rating), verdict: verdict as RecommendationFeedbackInput['verdict'], note }))
      setError('')
      setRecorded(true)
    } catch (failure) { setError(failure instanceof Error ? failure.message : '反馈未能记录，请重试') }
  }

  return <details>
    <summary>评价这条建议</summary>
    <div className="form-card" aria-label={`建议反馈：${skill.name}`}>
      <p>{skill.name} · {block.minutes} 分钟 · {date}</p>
      <label className="field">建议评分<select value={rating} disabled={recorded} onChange={event => setRating(event.target.value)}>
        <option value="">请选择评分</option>
        {[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value} / 5</option>)}
      </select></label>
      <label className="field">反馈原因<select value={verdict} disabled={recorded} onChange={event => setVerdict(event.target.value)}>
        <option value="">请选择原因</option>
        {feedbackVerdicts.map(value => <option key={value} value={value}>{verdictLabels[value]}</option>)}
      </select></label>
      <label className="field">补充说明（可选）<textarea value={note} maxLength={1000} disabled={recorded} onChange={event => setNote(event.target.value)} /></label>
      <button className="secondary" type="button" disabled={recorded || !rating || !verdict} onClick={submit}>保存建议反馈</button>
      {error && <p role="alert">{error}</p>}
      {recorded && <p role="status">建议反馈已记录。暂时收集数据，算法权重保持不变。</p>}
    </div>
  </details>
}
