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
  // ⚠️ SERIAL, AND NOT NEGOTIABLE BY A FLAG. Two things break under parallel
  // workers, and neither is obvious from a failure message:
  //
  //   1. Workers share the storage-state files. `/auth/refresh` rotates and is
  //      single-use, so the second worker to load a file replays a revoked
  //      token — which the server reads as a captured credential and answers by
  //      revoking the whole login family (see e2e/fixtures.ts).
  //   2. Workers share one rate-limit bucket. No limiter in
  //      `server/src/middleware/rateLimiter.ts` sets a `keyGenerator`, so every
  //      one of them keys on IP, and every worker is 127.0.0.1.
  //
  // `fixtures.ts` asserts on this rather than trusting the config to stay put.
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
  projects: [
    // Authenticates the demo cast once, over HTTP, before anything renders.
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // The default session. Specs that need another clinician declare it
        // with `test.use({ demoUser: 'resident' })`; the anonymous specs
        // declare an empty jar. See e2e/fixtures.ts.
        storageState: './e2e/.auth/doctor.json',
      },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 3000 --strictPort',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
