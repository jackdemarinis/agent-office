import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/health': 'http://127.0.0.1:8787',
      '/agents': 'http://127.0.0.1:8787',
      '/machines': 'http://127.0.0.1:8787',
      '/goal': 'http://127.0.0.1:8787',
      '/messages': { target: 'http://127.0.0.1:8787', changeOrigin: true },
      '/events': { target: 'http://127.0.0.1:8787', changeOrigin: true },
      '/ws': { target: 'ws://127.0.0.1:8787', ws: true },
    },
  },
})
