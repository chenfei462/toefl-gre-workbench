import { useEffect, useRef, useState } from 'react'
import { RecordingController, RecordingStore, type StoredRecording } from './recordings'
import { reviewSpeakingSession, speakingErrorLabels, type SpeakingErrorCategory, type SpeakingPracticeSession, type SpeakingState } from './speaking'
import { speakingErrorCategories, speakingSessionSchema } from './speakingSchema'
import './speaking.css'
const store = new RecordingStore()
type Phase = 'idle' | 'preparing' | 'permission' | 'recording' | 'saving'
export function SpeakingPlayer({ state, onUpdate, flash }: { state: SpeakingState; onUpdate: (state: SpeakingState) => void; flash: (message: string) => void }) {
  const [taskType, setTaskType] = useState<SpeakingPracticeSession['taskType']>('listen_repeat')
  const [prompt, setPrompt] = useState('')
  const [prep, setPrep] = useState(10), [response, setResponse] = useState(30)
  const [stimulus, setStimulus] = useState<{ url: string; name: string }>()
  const [phase, setPhase] = useState<Phase>('idle'), [remaining, setRemaining] = useState(0)
  const [message, setMessage] = useState(''), [pending, setPending] = useState<StoredRecording>()
  const [recovered, setRecovered] = useState<SpeakingPracticeSession[]>([])
  const [version, setVersion] = useState(0)
  const controller = useRef<RecordingController | undefined>(undefined)
  const stimulusAudio = useRef<HTMLAudioElement | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const mounted = useRef(true), started = useRef(0), busy = useRef(false)
  const stateRef = useRef(state), updateRef = useRef(onUpdate)
  useEffect(() => { stateRef.current = state; updateRef.current = onUpdate }, [state, onUpdate])
  const draft = useRef<{ taskType: SpeakingPracticeSession['taskType']; prompt: string; prep: number; response: number; stimulusName?: string } | undefined>(undefined)
  useEffect(() => { mounted.current = true; store.list().then(rows => { if (mounted.current) setRecovered(rows.map(r => r.session)) }).catch(() => { if (mounted.current) setMessage('录音存储不可用；录音后可下载音频保留备份。') }); return () => { mounted.current = false; clearInterval(timer.current); controller.current?.dispose() } }, [])
  useEffect(() => () => { if (stimulus) URL.revokeObjectURL(stimulus.url) }, [stimulus])
  const persist = async (record: StoredRecording) => {
    await store.put(record)
    if (!mounted.current) return
    const latest = stateRef.current
    if (!latest.speakingSessions?.some(s => s.id === record.session.id)) updateRef.current({ ...latest, speakingSessions: [record.session, ...(latest.speakingSessions ?? [])] })
    setPending(undefined); setVersion(v => v + 1); flash('录音已保存，可复听并完成自评')
  }
  const stop = async () => {
    if (busy.current) return
    busy.current = true; clearInterval(timer.current); setPhase('saving')
    try {
      const blob = await controller.current!.stop()
      const input = draft.current!
      const session = speakingSessionSchema.parse({ id: crypto.randomUUID(), taskType: input.taskType, prompt: input.prompt, startedAt: new Date(started.current).toISOString(), durationSeconds: (Date.now() - started.current) / 1000, preparationSeconds: input.prep, responseSeconds: input.response, stimulusName: input.stimulusName, recordingId: crypto.randomUUID(), mimeType: blob.type, byteLength: blob.size })
      const record = { id: session.recordingId, blob, session }
      if (mounted.current) setPending(record)
      try { await persist(record) } catch { if (mounted.current) setMessage('录音已完成，但保存失败。请下载音频或重试保存；离开页面前务必备份。') }
    } catch (error) { if (mounted.current) setMessage(error instanceof Error ? error.message : '录音失败，请重试') }
    finally { if (mounted.current) setPhase('idle'); busy.current = false }
  }
  const record = async () => {
    setPhase('permission'); clearInterval(timer.current)
    const current = new RecordingController(undefined, error => { if (mounted.current && controller.current === current) { clearInterval(timer.current); setMessage(error.message); setPhase('idle') } }); controller.current = current
    try {
      await current.start()
      if (!mounted.current || controller.current !== current) { current.dispose(); return }
      started.current = Date.now(); setPhase('recording'); setRemaining(draft.current!.response)
      const deadline = Date.now() + draft.current!.response * 1000
      timer.current = setInterval(() => { const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000)); setRemaining(seconds); if (!seconds) void stop() }, 200)
    } catch (error) { if (mounted.current && controller.current === current) { setMessage(error instanceof Error ? error.message : '麦克风启动失败'); setPhase('idle') } }
  }
  const start = () => {
    if (!prompt.trim() || !Number.isInteger(prep) || prep < 0 || prep > 300 || !Number.isInteger(response) || response < 1 || response > 600) { setMessage('请填写题目；准备时间为 0–300 秒，回答时间为 1–600 秒。'); return }
    if (taskType === 'listen_repeat' && !stimulus) { setMessage('Listen and Repeat 请先选择题目音频并播放。'); return }
    draft.current = { taskType, prompt: prompt.trim(), prep, response, stimulusName: stimulus?.name }
    stimulusAudio.current?.pause()
    setMessage(''); setPhase('preparing'); setRemaining(prep)
    if (!prep) { void record(); return }
    const deadline = Date.now() + prep * 1000
    timer.current = setInterval(() => { const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000)); setRemaining(seconds); if (!seconds) void record() }, 200)
  }
  const cancel = () => { clearInterval(timer.current); controller.current?.dispose(); controller.current = undefined; setPhase('idle') }
  const sessions = state.speakingSessions ?? []
  const missing = recovered.filter(s => !sessions.some(saved => saved.id === s.id))
  return <div className="speaking-player"><header><p className="eyebrow">TOEFL 2026 · SPEAKING</p><h2>口语录音训练</h2><p>听题 → 准备 → 回答 → 复听 → 自评。计时可调整；自评不是 AI 或官方考试分数。</p></header>
    <section className="card speaking-setup"><fieldset disabled={phase !== 'idle' || !!pending}><legend>训练设置</legend>
      <label>题型<select value={taskType} onChange={e => setTaskType(e.target.value as typeof taskType)}><option value="listen_repeat">Listen and Repeat</option><option value="interview">Take an Interview</option></select></label>
      <label>题目 / 提示<textarea value={prompt} maxLength={20000} onChange={e => setPrompt(e.target.value)} placeholder="输入你拥有使用权的题目或练习提示" /></label>
      <label>题目音频（本人拥有或已授权）<input type="file" accept="audio/*" onChange={e => { const file = e.target.files?.[0]; if (file) setStimulus({ url: URL.createObjectURL(file), name: file.name }) }} /></label>
      {stimulus && <audio ref={stimulusAudio} aria-label="题目音频" controls src={stimulus.url} />}
      <div className="speaking-timings"><label>准备秒数<input type="number" min={0} max={300} value={prep} onChange={e => setPrep(Number(e.target.value))} /></label><label>回答秒数<input type="number" min={1} max={600} value={response} onChange={e => setResponse(Number(e.target.value))} /></label></div>
      <button className="primary" onClick={start}>开始准备</button></fieldset>
      {phase !== 'idle' && <div className="speaking-status"><strong role="status">{phase === 'preparing' ? '准备中' : phase === 'recording' ? '正在录音' : phase === 'permission' ? '等待麦克风权限' : '保存录音中'}</strong>{['preparing', 'recording'].includes(phase) && <output aria-label="剩余秒数">{remaining}s</output>}{phase === 'recording' ? <button onClick={() => void stop()}>停止录音</button> : phase !== 'saving' && <button onClick={cancel}>取消</button>}</div>}
      {message && <p role="alert">{message}</p>}
      {pending && <div><RecordingAudio blob={pending.blob} id={pending.id} /><button onClick={() => { void persist(pending).catch(() => setMessage('保存仍失败，请下载音频保留备份。')) }}>重试保存录音</button></div>}
    </section>
    {missing.length > 0 && <section className="card"><p>找到 {missing.length} 条本地音频，可以恢复录音历史。</p><button onClick={() => { onUpdate({ ...state, speakingSessions: [...missing.map(s => ({ ...s, attemptId: state.attempts.some(a => a.id === s.attemptId) ? s.attemptId : undefined })), ...sessions] }); setRecovered([]) }}>恢复录音历史</button></section>}
    <section><h3>录音历史 · {sessions.length}</h3><p>音频保存在此浏览器的本地数据库。JSON 备份仅含记录信息；请单独下载音频备份。</p>{!sessions.length && <p>完成第一次录音后，在这里复听和自评。</p>}{sessions.map(session => <SpeakingHistory key={session.id} session={session} version={version} onReview={(rating, errors, note) => { onUpdate(reviewSpeakingSession(state, session.id, rating, errors, note)); flash('自评已进入练习记录和错题复习') }} />)}</section>
  </div>
}
function RecordingAudio({ blob, id }: { blob: Blob; id: string }) {
  const [url, setUrl] = useState('')
  // Object URLs are external resources: allocate after commit, revoke on cleanup.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { const next = URL.createObjectURL(blob); setUrl(next); return () => URL.revokeObjectURL(next) }, [blob])
  return <div className="speaking-audio">{url && <><audio aria-label="复听录音" controls src={url} /><a href={url} download={id + (blob.type.includes('mp4') ? '.m4a' : blob.type.includes('ogg') ? '.ogg' : '.webm')}>下载录音</a></>}</div>
}
function SpeakingHistory({ session, version, onReview }: { session: SpeakingPracticeSession; version: number; onReview: (rating: number, errors: SpeakingErrorCategory[], note: string) => void }) {
  const [blob, setBlob] = useState<Blob>(), [error, setError] = useState('')
  const [rating, setRating] = useState(3), [categories, setCategories] = useState<SpeakingErrorCategory[]>([]), [note, setNote] = useState('')
  useEffect(() => { let active = true; store.get(session.recordingId).then(record => { if (active) { setBlob(record?.blob); setError(record ? '' : '此浏览器没有该音频，可选择以前下载的录音恢复。') } }).catch(() => { if (active) setError('读取录音失败，请重试或恢复音频。') }); return () => { active = false } }, [session.recordingId, version])
  return <article className="card speaking-history"><h4>{session.taskType === 'listen_repeat' ? 'Listen and Repeat' : 'Take an Interview'}</h4><p>{session.prompt}</p><small>{new Date(session.startedAt).toLocaleString()} · {Math.round(session.durationSeconds)} 秒 · {Math.round(session.byteLength / 1024)} KB</small>
    {blob && <RecordingAudio blob={blob} id={session.recordingId} />}
    {error && <div><p role="status">{error}</p><label>恢复音频<input type="file" accept="audio/*" onChange={e => { const file = e.target.files?.[0]; if (file) void store.put({ id: session.recordingId, blob: file, session: { ...session, mimeType: file.type, byteLength: file.size } }).then(() => { setBlob(file); setError('') }).catch(() => setError('恢复失败，请检查浏览器存储空间')) }} /></label></div>}
    {session.attemptId ? <p>已自评 {session.selfRating}/5 · {session.errors.map(e => speakingErrorLabels[e]).join('、') || '无已标记错误'} · {session.note}</p> : <fieldset><legend>复听后自评（1–5，不是考试分数）</legend><label>自评分<select value={rating} onChange={e => setRating(Number(e.target.value))}>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}{n === 1 ? ' · 需要重新练习' : n === 5 ? ' · 表达自如' : ''}</option>)}</select></label><div className="speaking-errors">{speakingErrorCategories.map(category => <label key={category}><input type="checkbox" checked={categories.includes(category)} onChange={e => setCategories(e.target.checked ? [...categories, category] : categories.filter(c => c !== category))} />{speakingErrorLabels[category]}</label>)}</div><label>复盘笔记<textarea value={note} onChange={e => setNote(e.target.value)} placeholder="哪些地方需要改进？下次怎样表达？" /></label><p>4–5 分且未标记错误视为自评达标；其余进入待改进记录，以低权重参与现有掌握度计算。</p><button onClick={() => onReview(rating, categories, note)}>保存自评</button></fieldset>}
  </article>
}
