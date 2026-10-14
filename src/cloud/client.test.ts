import { describe, expect, it } from 'vitest'
import { readCloudConfiguration } from './client'

describe('optional cloud configuration', () => {
  it('keeps local mode available with missing configuration', () => {
    expect(readCloudConfiguration({}).available).toBe(false)
  })
  it('accepts a public key and HTTPS endpoint', () => {
    expect(readCloudConfiguration({ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example' }).available).toBe(true)
  })
  it('rejects privileged keys and insecure remote endpoints', () => {
    for (const key of ['sb_secret_example', 'unknown', `e30.${btoa(JSON.stringify({ role: 'service_role' }))}.signature`]) {
      expect(readCloudConfiguration({ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: key }).available).toBe(false)
    }
    expect(readCloudConfiguration({ VITE_SUPABASE_URL: 'http://example.com', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example' }).available).toBe(false)
  })
  it('accepts local Supabase and legacy anon keys', () => {
    const key = `e30.${btoa(JSON.stringify({ role: 'anon' }))}.signature`
    expect(readCloudConfiguration({ VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_PUBLISHABLE_KEY: key }).available).toBe(true)
  })
})
