import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Precarga el "visto" de los avisos de arranque (aviso legal de "sin
    // dinero real" y consentimiento de cookies) para que sus overlays a
    // pantalla completa no bloqueen el resto de la UI en cada test — no es
    // lo que se está probando aquí.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: 'http://localhost:4200',
          localStorage: [
            { name: 'acerton.noRealMoneyNotice.v1', value: '1' },
            { name: 'quiniela.cookieConsent', value: 'accepted' },
          ],
        },
      ],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // El frontend (y el backend/DB detras) ya deben estar arrancados a mano
  // (npm run dev:frontend / dev:backend + Postgres en Docker) — reuseExistingServer
  // hace que Playwright NO intente levantar otra instancia si localhost:4200
  // ya responde, que es el flujo de desarrollo habitual de este repo.
  webServer: {
    command: 'npm run start --workspace=frontend',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    cwd: '..',
    timeout: 120_000,
  },
});
