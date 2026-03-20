import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import apiPlugin from './server/api-plugin.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const appsScriptUrl = env.VITE_API_URL
  const useProxy = appsScriptUrl && appsScriptUrl.includes('script.google.com')

  return {
    base: '/tableplanner/',
    plugins: useProxy ? [react()] : [react(), apiPlugin()],
    server: useProxy
      ? {
          proxy: {
            '/api': {
              target: appsScriptUrl,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api/, ''),
              followRedirects: true,
            },
          },
        }
      : {},
  }
})
