// Playwright da verificação da implantação (T076): sem servidor próprio — fala com o nginx que
// deploy/verificar.sh sobe, servindo o build e encaminhando /api para a API local de verdade.
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: 'implantacao.spec.ts',
  workers: 1,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.URL_IMPLANTACAO ?? 'https://localhost:8443',
    ignoreHTTPSErrors: true, // certificado autoassinado da verificação
    locale: 'pt-BR',
  },
})
