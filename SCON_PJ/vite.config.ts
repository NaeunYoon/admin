import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // 어드민의 /pm 경로 아래에서 서빙됨 (리버스 프록시). 에셋 URL이 /pm/... 로 생성되도록.
  base: '/pm/',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // 로컬 dev: /pm/api → 백엔드(/api) (운영에선 어드민이 /pm 을 프록시)
      '/pm/api': {
        target: 'http://localhost:3001',
        rewrite: (p) => p.replace(/^\/pm/, ''),
      },
    },
  },
})
