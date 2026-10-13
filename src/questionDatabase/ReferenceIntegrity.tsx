import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Question, WorkbenchState } from '../types'
import { IndexedDbQuestionRepository } from './indexedDbRepository'
import { isQuestionBackedAttempt, isQuestionBankLinkedAttempt, markQuestionReferencesPending, reconcileQuestionReferences } from './repository'

export interface QuestionReferenceIntegrityProps {
  state: WorkbenchState
  onUpdate: (state: WorkbenchState) => void
  bankRevision?: number
}

/** Recheck the independent bank after learning restores, reference changes, or bank imports. */
export function QuestionReferenceIntegrity({ state, onUpdate, bankRevision = 0 }: QuestionReferenceIntegrityProps) {
  const repository = useMemo(() => new IndexedDbQuestionRepository(), [])
  const latest = useRef({ state, onUpdate })
  useLayoutEffect(() => { latest.current = { state, onUpdate } }, [state, onUpdate])
  const [checking, setChecking] = useState(true)
  const [failure, setFailure] = useState('')
  const [checkedBank, setCheckedBank] = useState<{ key: string; questions: Question[] }>()
  const [retry, setRetry] = useState(0)
  const linked = state.attempts.filter(isQuestionBankLinkedAttempt)
  const referenced = state.attempts.filter(isQuestionBackedAttempt)
  // Status changes must not trigger another read; the same attempts are updated by this effect.
  const referenceKey = JSON.stringify(linked.map(attempt => [attempt.id, attempt.questionId, attempt.provenance]))
  const checkKey = JSON.stringify([referenceKey, bankRevision, retry])
  const reconciliation = checkedBank?.key === checkKey ? reconcileQuestionReferences(state.attempts, checkedBank.questions) : undefined

  useEffect(() => {
    let active = true
    if (!latest.current.state.attempts.some(isQuestionBankLinkedAttempt)) return
    setChecking(true)
    setFailure('')
    const current = latest.current
    const pending = markQuestionReferencesPending(current.state.attempts)
    if (pending !== current.state.attempts) current.onUpdate({ ...current.state, attempts: pending })
    void repository.exportBundle().then(bundle => {
      if (!active) return
      setCheckedBank({ key: checkKey, questions: bundle.questions })
    }).catch(error => {
      if (active) setFailure(error instanceof Error ? error.message : String(error))
    }).finally(() => {
      if (active) setChecking(false)
    })
    return () => { active = false }
  }, [checkKey, repository])

  // A restored learning backup may contain exactly the same ids as the current state.
  // Apply the checked bank to the latest attempts too, without starting a status/read loop.
  useEffect(() => {
    if (!checkedBank || checkedBank.key !== checkKey || checking || failure) return
    const current = latest.current
    const result = reconcileQuestionReferences(current.state.attempts, checkedBank.questions)
    if (result.reconciledAttempts !== current.state.attempts) current.onUpdate({ ...current.state, attempts: result.reconciledAttempts })
  }, [state.attempts, checkedBank, checkKey, checking, failure])

  if (!linked.length) return null
  if (checking) return <p className="qb-alert" role="status">正在核对题库引用；{referenced.length ? `${referenced.length} 条题目作答暂不参与掌握度计算。` : '来源引用作答保留当前结果。'}</p>
  if (failure) return <div className="qb-alert" role="alert"><p>无法核对题库引用：{failure}。相关作答和错题历史已保留。{referenced.length ? `${referenced.length} 条题目作答在核对完成前暂不参与掌握度计算。` : '来源引用作答保留当前结果。'}</p><button className="secondary small" onClick={() => setRetry(value => value + 1)}>重新核对题库</button></div>
  if (reconciliation?.orphanedCount) return <p className="qb-alert" role="alert">缺少题库记录：{reconciliation.orphanedCount} 条作答。作答和错题历史已保留，暂不参与掌握度计算；导入对应题库后会自动重新核对。</p>
  return null
}
