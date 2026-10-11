import { addDays, format } from 'date-fns'
import { useState } from 'react'
import { planForDate } from './planning'
import type { LearningProps } from './Capture'
export function NextPlan({ state, onUpdate, flash }: LearningProps) {
  const [date] = useState(() => format(addDays(new Date(), 1), 'yyyy-MM-dd'))
  const { plan } = planForDate(state, date)
  return <section className="qb-sources"><div className="section-heading"><div><span className="eyebrow">Tomorrow · {date}</span><h3>明日训练预览</h3></div><button className="secondary" onClick={() => { onUpdate({ ...state, prescriptions: [plan, ...state.prescriptions.filter(p => p.date !== date)] }); flash('已保存明日处方；新训练结果仍可触发重算') }}>保存明日处方</button></div>{plan.blocks.map(b => <div className="prescription-block" key={b.id}><div><strong>{state.skills.find(s => s.id === b.skillId)?.name ?? b.type} · {b.minutes} min</strong><span>{b.reason}</span></div></div>)}<p>根据当前作答、错误和到期日期重算；保留原始 30 天计划和训练历史。</p></section>
}
