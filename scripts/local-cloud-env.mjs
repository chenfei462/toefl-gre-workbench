import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'

// Export only public browser configuration. Privileged values never leave memory.
const config = JSON.parse(execFileSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }))
assert.equal(new URL(config.API_URL).hostname, '127.0.0.1')
const key = config.PUBLISHABLE_KEY ?? config.ANON_KEY
assert.ok(typeof key === 'string' && !/[\r\n]/.test(key))
if (!key.startsWith('sb_publishable_')) {
  const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString())
  assert.equal(payload.role, 'anon')
}
writeFileSync('.env.local', `VITE_SUPABASE_URL=${config.API_URL}\nVITE_SUPABASE_PUBLISHABLE_KEY=${key}\n`, { flag: 'wx' })
console.log('Created ignored local public browser configuration; existing files are never overwritten.')
