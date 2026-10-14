import { defineConfig } from '@playwright/test'
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173)
const baseURL = `http://127.0.0.1:${port}`
const runId = process.env.PLAYWRIGHT_RUN_ID ?? `${Date.now()}-${process.pid}`
export default defineConfig({
  outputDir: `test-results/${runId}`,
  testDir: './tests/e2e', timeout: 45000, expect: { timeout: 10000 }, fullyParallel: false, workers: process.env.CI ? 1 : 2, retries: process.env.CI ? 1 : 0,
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure', launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] } },
  webServer: { command: `npm run ${process.env.PLAYWRIGHT_PREVIEW === '1' ? 'preview' : 'dev'} -- --host 127.0.0.1 --port ${port} --strictPort`, url: baseURL, reuseExistingServer: false },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
})
