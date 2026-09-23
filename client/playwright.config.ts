import { defineConfig, devices } from '@playwright/test'

/**
 * Browser verification for the clinician portal.
 *
 * ⚠️ This suite is the acceptance gate for the M-06 phase, not a smoke test.
 * Type-check, lint and build all passing says nothing about whether a
 * clinician can actually use the screens, which is the thing being delivered.
 *
 * It boots the Vite dev server itself but expects the API on :5000 to be
 * running already — the API needs a database and a seeded demo clinic, and
 * silently starting one from here would hide a missing seed behind a timeout.
 */
export default defineConfig({
  testDir: './e2e',
  // Expires the demo break-glass grants so the suite is repeatable — see the
  // file for why the break-glass test cannot clean up after itself.
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- --port 3000 --strictPort',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
