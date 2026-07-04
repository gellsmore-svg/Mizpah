import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The trace API source: `galeed serve` (the family trace/debugging API) on its
// default port. Override with VITE_TRACE_API — e.g. http://localhost:8765 to
// point at a running Tirzah instead (same /api/trace shapes; no llm-calls).
const TRACE_API = process.env.VITE_TRACE_API || 'http://localhost:8785'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5274,
    proxy: { '/api': { target: TRACE_API, changeOrigin: true } },
  },
})
