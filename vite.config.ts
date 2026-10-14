import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'prompt', injectRegister: 'auto',
    manifest: { name: 'TOEFL GRE Study Workbench', short_name: 'Study Workbench', start_url: '/', display: 'standalone', theme_color: '#f5f3ed', background_color: '#f5f3ed' },
    workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'], navigateFallback: '/index.html', cleanupOutdatedCaches: true, maximumFileSizeToCacheInBytes: 3 * 1024 * 1024 },
  })],
})
