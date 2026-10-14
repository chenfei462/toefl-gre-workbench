import { useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { createOperationClient, getCloudClient } from './client'
import { createEmailAuth } from './auth'
import { createCloudService, type RestorePreview } from './service'
import { createSnapshotTransport } from './transport'
import type { RemoteSnapshot } from './types'
import { download } from '../questionDatabase/download'
import { LOCAL_STATE_KEY, readLocalRevision } from './revision'
import { loadSyncMeta } from './metadata'
import { createAssetSync } from './assets'
import { createBinaryStorage } from './storage'

export function CloudAccount() {
  const client = getCloudClient()
  const [session, setSession] = useState<Session | null>(null)
  const activeUser = useRef<string | undefined>(undefined)
  const accountGeneration = useRef(0)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [syncError, setSyncError] = useState(false)
  const [remoteRevision, setRemoteRevision] = useState<number | null>(null)
  const [localTick, setLocalTick] = useState(0)
  const [preview, setPreview] = useState<RestorePreview | null>(null)
  const [conflict, setConflict] = useState<{ userId: string; remote: RemoteSnapshot | null } | null>(null)
  async function cloudAction(action: 'sync' | 'preview' | 'restore' | 'keep') {
    if (!client || !session) return
    const generation = accountGeneration.current
    const current = () => activeUser.current === session.user.id && accountGeneration.current === generation
    const assertActive = () => { if (!current()) throw new Error('Account changed; operation cancelled') }
    const operationClient = createOperationClient(session.access_token)
    if (!operationClient) return
    const service = createCloudService(session.user.id, createSnapshotTransport(operationClient, session.user.id, session.access_token), undefined, undefined, createAssetSync(createBinaryStorage(operationClient, session.user.id, session.access_token)), assertActive)
    setBusy(true); setMessage(''); setSyncError(false)
    try {
      if (action === 'preview') {
        const next = await service.previewRestore()
        assertActive()
        setPreview(next); setMessage(next ? '请检查云端备份内容后确认恢复。' : '此账号尚无云端备份。')
      } else if (action === 'restore') {
        if (!preview) throw new Error('请先预览云端备份')
        await service.restore(preview)
        assertActive()
        window.location.reload()
      } else {
        if (action === 'keep' && conflict?.userId !== session.user.id) throw new Error('Conflict account mismatch')
        const result = action === 'keep' && conflict ? await service.keepLocal(conflict.remote) : await service.sync()
        assertActive()
        setConflict(result.status === 'conflict' ? { userId: session.user.id, remote: result.remote } : null)
        setRemoteRevision(result.status === 'conflict' ? result.remote?.revision ?? null : result.revision)
        setLocalTick(tick => tick + 1)
        setMessage(result.status === 'conflict' ? '检测到云端冲突；双方快照已保存到本地恢复库。' : `已同步 · 云端版本 ${result.revision}`)
      }
    } catch (error) { if (current()) { setSyncError(true); setMessage(`云端操作未完成：${error instanceof Error ? error.message : String(error)}。本地学习仍可继续。`) } }
    finally { if (current()) setBusy(false); void operationClient.auth.dispose() }
  }
  useEffect(() => {
    if (!client) return
    let active = true
    const acceptSession = (next: Session | null) => {
      if (activeUser.current !== next?.user.id) {
        accountGeneration.current++; setPreview(null); setConflict(null); setMessage(''); setBusy(false); setSyncError(false); setRemoteRevision(null)
      }
      activeUser.current = next?.user.id; setSession(next)
    }
    const { data } = client.auth.onAuthStateChange((_event, next) => { if (active) acceptSession(next) })
    const generation = accountGeneration.current
    createEmailAuth(client).session().then(next => { if (active && generation === accountGeneration.current) acceptSession(next) }).catch(() => { if (active) setMessage('无法恢复登录；本地学习仍可继续。') })
    const invalidateQueuedActions = () => { accountGeneration.current++ }
    return () => { active = false; invalidateQueuedActions(); data.subscription.unsubscribe() }
  }, [client])
  useEffect(() => {
    const localChanged = () => { setLocalTick(tick => tick + 1); setSyncError(false) }
    const focused = () => {
      localChanged()
      if (!client || !session || !navigator.onLine) return
      const operationClient = createOperationClient(session.access_token)
      if (!operationClient) return
      const generation = accountGeneration.current
      void createSnapshotTransport(operationClient, session.user.id, session.access_token).read().then(remote => {
        if (accountGeneration.current === generation && activeUser.current === session.user.id) setRemoteRevision(remote?.revision ?? null)
      }).catch(() => {
        if (accountGeneration.current === generation && activeUser.current === session.user.id) setSyncError(true)
      }).finally(() => { void operationClient.auth.dispose() })
    }
    window.addEventListener('storage', localChanged)
    window.addEventListener('workbench-data-change', localChanged)
    window.addEventListener('focus', focused)
    window.addEventListener('online', focused)
    return () => { window.removeEventListener('storage', localChanged); window.removeEventListener('workbench-data-change', localChanged); window.removeEventListener('focus', focused); window.removeEventListener('online', focused) }
  }, [client, session])
  async function submit(action: 'signin' | 'signup' | 'signout') {
    setBusy(true); setMessage('')
    try {
      const auth = createEmailAuth(client)
      if (action === 'signout') { await auth.signOut(); setSession(null) }
      else {
        const result = await (action === 'signup' ? auth.signUp(email.trim(), password) : auth.signIn(email.trim(), password))
        setSession(result.session)
        if (!result.session) setMessage('请检查邮箱并完成账号确认。')
      }
      setPassword('')
    } catch (error) { setMessage(error instanceof Error ? error.message : '认证失败；本地学习仍可继续。') }
    finally { setBusy(false) }
  }
  void localTick
  let lastSyncAt: string | undefined
  let syncLabel = 'Local only · 本地模式'
  if (session) {
    try {
      const meta = loadSyncMeta(session.user.id, readLocalRevision())
      lastSyncAt = meta.lastSyncAt
      syncLabel = conflict ? 'Conflict · 同步冲突' : syncError ? 'Sync error · 同步未完成' : meta.syncStatus === 'synced' && (remoteRevision === null || remoteRevision === meta.lastSyncedRevision) ? 'Synced · 已同步' : 'Sync pending · 待同步'
    } catch { syncLabel = 'Sync error · 同步记录不可用' }
  }
  return <section className="form-card" aria-label="云端账号"><h3>云端账号</h3>
    <p aria-label="同步状态">{syncLabel}</p>{lastSyncAt && <p>上次同步：{new Date(lastSyncAt).toLocaleString()}</p>}
    {!client ? <p>Cloud Sync unavailable · 本地模式仍可正常使用。</p> : session ? <>
      <p>已登录：{session.user.email}</p><p>本地学习数据保留在此浏览器；点击同步上传已保存的学习记录。</p>
      <button disabled={busy} onClick={() => void cloudAction('sync')}>立即同步</button>
      <button disabled={busy} onClick={() => void cloudAction('preview')}>预览云端备份</button>
      {preview && <div><p>云端版本 {preview.remote.revision} · {preview.state.attempts.length} 条作答 · {preview.state.errorRecords.length} 道错题</p>
        <p>恢复将替换此浏览器的学习记录；替换前保留本地恢复快照。</p>
        <button disabled={busy} onClick={() => void cloudAction('restore')}>确认使用云端备份</button>
        <button disabled={busy} onClick={() => setPreview(null)}>取消恢复</button></div>}
      {conflict && <div role="alert"><p>同步冲突 · 云端版本 {conflict.remote?.revision ?? 0}</p>
        <button disabled={busy} onClick={() => void cloudAction('keep')}>保留本地并覆盖已查看的云端版本</button>
        <button disabled={busy} onClick={() => void cloudAction('preview')}>使用云端：先预览</button>
        <button onClick={() => { download('local-backup.json', localStorage.getItem(LOCAL_STATE_KEY) ?? '{}', 'application/json'); download('cloud-backup.json', JSON.stringify(conflict.remote?.state ?? null, null, 2), 'application/json') }}>导出双方备份</button>
      </div>}
      <button disabled={busy} onClick={() => void submit('signout')}>退出登录</button>
    </> : <form onSubmit={event => { event.preventDefault(); void submit('signin') }}>
      <p>未登录 · 可继续使用本地模式</p>
      <label className="field">邮箱<input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /></label>
      <label className="field">密码<input type="password" autoComplete="current-password" required minLength={6} value={password} onChange={event => setPassword(event.target.value)} /></label>
      <button type="submit" disabled={busy}>登录</button>
      <button type="button" disabled={busy || !email.trim() || password.length < 6} onClick={() => void submit('signup')}>注册邮箱账号</button>
    </form>}
    {message && <p role="status">{message}</p>}
  </section>
}
