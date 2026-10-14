import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const origin = process.env.HOSTED_URL
assert.ok(/^https:\/\/toefl-gre-workbench-[a-z0-9]+-hahayulu\.vercel\.app$/.test(origin ?? ''), 'An explicit verified workbench deployment is required')
// The CLI uses the connected account. Cookies remain origin-scoped and ignored;
// the bypass credential is never attached to Supabase or included in traces.
execFileSync(process.platform === 'win32' ? 'vercel.cmd' : 'vercel', ['curl', origin, '--scope', 'hahayulu', '--', '--silent', '--show-error', '--dump-header', '.vercel/hosted-headers.local', '--output', '.vercel/hosted-body.local', '--cookie-jar', '.vercel/hosted-cookies.local', '-H', 'x-vercel-set-bypass-cookie:true'], { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' })
const cookies = readFileSync('.vercel/hosted-cookies.local', 'utf8').split(/\r?\n/).flatMap(line => {
  if (!line || line.startsWith('#') && !line.startsWith('#HttpOnly_')) return []
  const parts = line.replace(/^#HttpOnly_/, '').split('\t')
  if (parts.length !== 7) return []
  assert.equal(parts[0].replace(/^\./, ''), new URL(origin).hostname, 'Unexpected cookie origin')
  return [{ domain: parts[0], path: parts[2], secure: parts[3] === 'TRUE', expires: Number(parts[4]), name: parts[5], value: parts[6], httpOnly: line.startsWith('#HttpOnly_'), sameSite: 'Lax' }]
})
assert.ok(cookies.length, 'Deployment authentication cookie unavailable')
writeFileSync('.vercel/hosted-storage.local', JSON.stringify({ cookies, origins: [] }))
const result = spawnSync(process.execPath, ['node_modules/playwright/cli.js', 'test', '--config', 'playwright.hosted.config.ts'], { env: process.env, stdio: 'inherit' })
process.exitCode = result.status ?? 1
