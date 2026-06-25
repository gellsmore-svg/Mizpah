import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The trace API source (Tirzah today; a central collector later). Override with
// VITE_TRACE_API. All /api calls are proxied here in dev.
const TRACE_API = process.env.VITE_TRACE_API || 'http://localhost:8765'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5274,
    proxy: { '/api': { target: TRACE_API, changeOrigin: true } },
  },
})
