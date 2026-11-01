import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Em desenvolvimento, /api vai para a API local, reproduzindo a mesma origem que haverá em
// produção atrás do proxy reverso (D3). Os testes de ponta a ponta apontam para o servidor falso.
const alvoApi = process.env.API_PROXY_TARGET ?? 'http://localhost:8000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: alvoApi,
        changeOrigin: false,
        rewrite: (caminho) => caminho.replace(/^\/api/, ''),
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: alvoApi,
        rewrite: (caminho) => caminho.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    // Só o tema é processado: o teste de contraste lê as cores dele (`?raw`).
    css: { include: [/globals\.css/] },
  },
})
