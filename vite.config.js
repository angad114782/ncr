import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'

// Where the backend listens while developing: API_PROXY, else PORT from backend/.env, else 5120.
function apiTarget() {
  if (process.env.API_PROXY) return process.env.API_PROXY
  try {
    const m = readFileSync(new URL('./backend/.env', import.meta.url), 'utf8').match(/^\s*PORT\s*=\s*(\d+)/m)
    if (m) return `http://localhost:${m[1]}`
  } catch {
    /* no backend/.env */
  }
  return 'http://localhost:5120'
}
const target = apiTarget()

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Development: send /api and /uploads to the backend (npm run dev in backend/). In production nginx does the same.
  server: {
    proxy: {
      '/api': { target: target, changeOrigin: true },
      '/uploads': { target: target, changeOrigin: true },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Libraries change rarely, the app code changes on every deploy: keeping them in their own files means a
        // returning visitor re-downloads only the (small) app file after a deploy, not React / the router / motion again.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'vendor-react'
          if (/node_modules\/(react-router|react-router-dom|react-helmet-async)\//.test(id)) return 'vendor-router'
          if (/node_modules\/(framer-motion|motion-dom|motion-utils)\//.test(id)) return 'vendor-motion'
          return undefined
        },
      },
    },
  },
  preview: {
    proxy: {
      '/api': { target: target, changeOrigin: true },
      '/uploads': { target: target, changeOrigin: true },
    },
  },
})
