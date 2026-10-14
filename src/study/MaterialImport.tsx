import { useEffect, useRef, useState } from 'react'
import type { WorkbenchState } from '../types'
import { importMaterial, MaterialStore, type StudyMaterial } from './materials'
const store = new MaterialStore()
const rightsLabels = { user_owned: '本人拥有', public: '公开资源', licensed: '已获授权' }
export function MaterialImport({ state, onUpdate, flash }: { state: WorkbenchState; onUpdate: (state: WorkbenchState) => void; flash: (message: string) => void }) {
  const [materials, setMaterials] = useState<StudyMaterial[]>([]), [rights, setRights] = useState('unknown')
  const [file, setFile] = useState<File>(), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const latest = useRef(state)
  useEffect(() => { latest.current = state }, [state])
  useEffect(() => { let active = true; store.list().then(rows => { if (active) setMaterials(rows.sort((a, b) => b.importedAt.localeCompare(a.importedAt))) }).catch(() => { if (active) setError('读取材料失败，请检查浏览器本地存储权限。') }); return () => { active = false } }, [])
  const save = async () => {
    if (!file || busy) return
    setBusy(true); setError('')
    try {
      const material = await importMaterial(file, rights)
      await store.put(material)
      setMaterials(previous => [material, ...previous])
      onUpdate({ ...latest.current, resources: [{ id: material.id, title: material.name, type: 'document', tags: ['本地材料', rightsLabels[material.rights], material.kind] }, ...latest.current.resources] })
      flash('材料已保存在此浏览器，可预览或下载原文件')
    } catch (reason) { setError(reason instanceof Error ? reason.message : '导入失败，请检查文件和浏览器存储空间') }
    finally { setBusy(false) }
  }
  return <section className="card material-import"><h3>导入学习材料</h3><p>保存本人拥有、公开或已获授权的 TXT、PDF、DOCX、音频。PDF / DOCX 保留原文件供打开阅读，不会自动生成题目。</p><fieldset disabled={busy} style={{ border: 0, padding: 0, display: 'grid', gap: 12 }}><label>材料使用权<select value={rights} onChange={e => setRights(e.target.value)}><option value="unknown">请选择并确认使用权</option>{Object.entries(rightsLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label>材料文件（最多 100 MB，TXT 最多 5 MB）<input type="file" accept=".txt,.pdf,.docx,.mp3,.wav,.ogg,.m4a,.webm,.aac,.flac" onChange={e => setFile(e.target.files?.[0])} /></label><button disabled={!file} onClick={() => void save()}>{busy ? '正在导入…' : '保存材料'}</button></fieldset>{error && <p role="alert">{error}</p>}<h4>本地材料 · {materials.length}</h4><p>材料原文件保存在当前浏览器，JSON 备份仅包含资源目录。请下载原文件单独备份。</p>{materials.map(material => <MaterialCard key={material.id} material={material} />)}</section>
}
function MaterialCard({ material }: { material: StudyMaterial }) {
  const [url, setUrl] = useState('')
  // Object URLs synchronize a browser resource with this mounted preview.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { const value = URL.createObjectURL(material.blob); setUrl(value); return () => URL.revokeObjectURL(value) }, [material.blob])
  return <article style={{ padding: '16px 0', borderTop: '1px solid #ddd', overflowWrap: 'anywhere' }}><strong>{material.name}</strong><p>{rightsLabels[material.rights]} · {Math.ceil(material.size / 1024)} KB · {new Date(material.importedAt).toLocaleString()}</p>{material.kind === 'audio' && url && <audio controls src={url} aria-label={material.name} style={{ maxWidth: '100%' }} />}{material.kind === 'text' && <details><summary>阅读文本</summary><pre style={{ whiteSpace: 'pre-wrap', maxHeight: 360, overflow: 'auto' }}>{material.text}</pre></details>}<p><a href={url} download={material.name}>下载原文件</a>{material.kind === 'pdf' && <> · <a href={url} target="_blank" rel="noopener noreferrer">打开 PDF</a></>}{material.kind === 'docx' && ' · 下载后使用 Word 或兼容程序打开'}</p></article>
}
