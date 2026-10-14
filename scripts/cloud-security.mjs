import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

// Local-stack credentials stay in memory and are never printed or written to the repository.
let config
const hosted = process.argv.includes('--hosted')
let hostedAccounts
if (hosted) {
  const env = Object.fromEntries(readFileSync('.env.hosted.local', 'utf8').split(/\r?\n/).filter(line => line.startsWith('VITE_')).map(line => { const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1)] }))
  hostedAccounts = JSON.parse(readFileSync('.hosted-test-accounts.secret.local', 'utf8'))
  assert.equal(hostedAccounts.projectRef, 'vcfpdxpprugrgmmilahm')
  assert.equal(env.VITE_SUPABASE_URL, 'https://' + hostedAccounts.projectRef + '.supabase.co')
  assert.ok(env.VITE_SUPABASE_PUBLISHABLE_KEY.startsWith('sb_publishable_'))
  config = { API_URL: env.VITE_SUPABASE_URL, ANON_KEY: env.VITE_SUPABASE_PUBLISHABLE_KEY }
} else try {
  config = JSON.parse(execFileSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }))
} catch {
  // Inspect only this project's running local Studio if the CLI is unavailable.
  const [container] = JSON.parse(execFileSync('docker', ['inspect', 'supabase_studio_toefl-gre-workbench'], { encoding: 'utf8' }))
  const env = Object.fromEntries(container.Config.Env.map(value => { const at = value.indexOf('='); return [value.slice(0, at), value.slice(at + 1)] }))
  config = { API_URL: 'http://127.0.0.1:54321', ANON_KEY: env.SUPABASE_ANON_KEY }
  assert.ok(config.ANON_KEY, 'Local gateway anon key unavailable')
}
if (!hosted) assert.equal(new URL(config.API_URL).hostname, '127.0.0.1')
const client = () => createClient(config.API_URL, config.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const a = client(), b = client()
const tag = crypto.randomUUID()
async function signup(c, label) {
  if (hosted) {
    const account = hostedAccounts.users.find(row => row.label === label)
    assert.ok(account?.id)
    const { data, error } = await c.auth.signInWithPassword({ email: account.email, password: account.password })
    assert.ifError(error); assert.equal(data.user.id, account.id)
    // These exact IDs were created solely for this acceptance fixture.
    assert.ifError((await c.from('workbench_snapshots').delete().eq('user_id', account.id)).error)
    return data.user.id
  }
  const { data, error } = await c.auth.signUp({ email: `${label}-${tag}@example.com`, password: `Test-${crypto.randomUUID()}` })
  assert.ifError(error); assert.ok(data.session); return data.user.id
}
const aid = await signup(a, 'a'), bid = await signup(b, 'b')
const anonymous = client()
const snapshot = revision => ({ expected_revision: revision - 1, next_revision: revision, snapshot_schema: 2, source_device: tag, snapshot_checksum: 'a'.repeat(64), snapshot_state: { schemaVersion: 2 } })
for (const c of [a, b]) assert.ifError((await c.rpc('push_workbench_snapshot', snapshot(1))).error)
assert.ok((await anonymous.from('workbench_snapshots').select('*')).error)
assert.ok((await anonymous.rpc('push_workbench_snapshot', snapshot(1))).error)
assert.ok((await a.from('workbench_snapshots').insert({ user_id: bid, schema_version: 2, revision: 1, base_revision: 0, device_id: tag, checksum: 'a'.repeat(64), state: {} })).error)
assert.equal((await a.from('workbench_snapshots').select('*').eq('user_id', aid)).data.length, 1)
assert.deepEqual((await a.from('workbench_snapshots').select('*').eq('user_id', bid)).data, [])
assert.deepEqual((await a.from('workbench_snapshots').update({ revision: 2, base_revision: 1 }).eq('user_id', bid).select()).data, [])
assert.deepEqual((await a.from('workbench_snapshots').delete().eq('user_id', bid).select()).data, [])
const races = await Promise.all([a.rpc('push_workbench_snapshot', snapshot(2)).abortSignal(AbortSignal.timeout(15000)), a.rpc('push_workbench_snapshot', snapshot(2)).abortSignal(AbortSignal.timeout(15000))])
assert.equal(races.filter(r => !r.error).length, 1)
assert.equal(races.filter(r => r.error?.code === 'PT409' && r.status === 409).length, 1)
for (const bucket of ['speaking-recordings', 'study-materials']) {
  const path = `${bid}/test-${tag}.txt`
  assert.ifError((await b.storage.from(bucket).upload(path, new Blob(['private']))).error)
  assert.ok((await a.storage.from(bucket).download(path)).error)
  assert.ok((await anonymous.storage.from(bucket).download(path)).error)
  assert.ok((await a.storage.from(bucket).update(path, new Blob(['changed']))).error)
  assert.ok((await a.storage.from(bucket).upload(path, new Blob(['changed']), { upsert: true })).error)
  assert.ok((await a.storage.from(bucket).createSignedUrl(path, 30)).error)
  assert.ok((await a.storage.from(bucket).upload(`${bid}/injected-${tag}`, new Blob(['forbidden']))).error)
  await a.storage.from(bucket).remove([path])
  const retained = await b.storage.from(bucket).download(path)
  assert.ifError(retained.error)
  assert.equal(await retained.data.text(), 'private')
  assert.ifError((await b.storage.from(bucket).remove([path])).error)
  assert.ok((await b.storage.from(bucket).download(path)).error)
}
for (const [c, id] of [[a, aid], [b, bid]]) {
  assert.ifError((await c.from('workbench_snapshots').delete().eq('user_id', id)).error)
  assert.deepEqual((await c.from('workbench_snapshots').select('*').eq('user_id', id)).data, [])
}
console.log(`PASS: real ${hosted ? 'hosted' : 'local'} Auth A/B, own snapshot CRUD, cross-user isolation, atomic CAS race, private audio/material read/write/delete isolation.`)
