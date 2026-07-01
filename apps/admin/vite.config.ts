import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/admin': 'http://localhost:3001',
      '/api':   'http://localhost:3001',
      '/img':   'http://localhost:5173',
    },
  },
})
