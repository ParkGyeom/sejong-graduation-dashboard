import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // 졸업요건 백엔드. .env의 VITE_API_PROXY_TARGET로 변경 가능.
  const target = env.VITE_API_PROXY_TARGET || env.VITE_PROXY_TARGET || 'http://localhost:8080'
  // 공학인증(ABEEK) 백엔드. .env의 VITE_ABEEK_PROXY_TARGET로 변경 가능.
  const abeekTarget = env.VITE_ABEEK_PROXY_TARGET || 'http://localhost:8001'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      host: true,
      proxy: {
        // /abeek/* → ABEEK 백엔드의 /* 로 전달 (예: /abeek/api/evaluate/abeek)
        '/abeek': {
          target: abeekTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/abeek/, ''),
        },
        '/api': {
          target,
          changeOrigin: true,
        },
      },
    },
  }
})
