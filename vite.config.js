import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const proxy = {
    '/api': {
      target: env.API_PROXY_TARGET || 'https://law-ai-be-production.up.railway.app',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api(?=\/|$)/, ''),
    },
  }
  return {
    plugins: [react()],
    server: { proxy },
    preview: { proxy },
  }
})
