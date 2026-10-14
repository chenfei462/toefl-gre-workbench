import { defineConfig } from '@playwright/test'
const baseURL = process.env.HOSTED_URL
if (!baseURL || !/^https:\/\/[a-z0-9.-]+\.vercel\.app$/.test(baseURL)) throw new Error('An explicit HTTPS Vercel deployment is required')
export default defineConfig({
  testDir: './tests/hosted', workers: 1, timeout: 180000,
  expect: { timeout: 15000 }, outputDir: `test-results/hosted-${Date.now()}`,
  use: { baseURL, actionTimeout: 15000, trace: 'off', screenshot: 'only-on-failure', storageState: '.vercel/hosted-storage.local', launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] } },
})
