import { defineConfig, devices } from '@playwright/test'

// Ponta a ponta contra o servidor falso do contrato (D13), na mesma origem via proxy do Vite.
const PORTA_API = 8787
const PORTA_WEB = 5174

export default defineConfig({
  testDir: 'e2e',
  testMatch: '*.spec.ts',
  fullyParallel: false,
  workers: 1, // o servidor falso tem um estado só
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORTA_WEB}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: [
    {
      command: `node e2e/servidor-falso/servidor.ts`,
      env: { PORTA: String(PORTA_API) },
      port: PORTA_API,
      reuseExistingServer: false,
    },
    {
      command: `npx vite --port ${PORTA_WEB} --strictPort`,
      env: { API_PROXY_TARGET: `http://localhost:${PORTA_API}` },
      port: PORTA_WEB,
      reuseExistingServer: false,
    },
  ],
})
