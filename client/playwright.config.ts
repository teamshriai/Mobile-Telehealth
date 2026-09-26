import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'

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
  globalTeardown: './e2e/global-teardown.ts',
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
      // ⚠️ `lan.spec.ts` is excluded here and runs only in the `lan` project
      // below. It needs a dev server bound to all interfaces, and every page
      // load costs one of the 60 `/auth/refresh` calls per 15 minutes.
      testIgnore: /(lan|auth-entry|patient-portal|health-notes|medicines|reports-assistant)\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // The default session. Specs that need another clinician declare it
        // with `test.use({ demoUser: 'resident' })`; the anonymous specs
        // declare an empty jar. See e2e/fixtures.ts.
        storageState: './e2e/.auth/doctor.json',
      },
      dependencies: ['setup'],
    },
    /**
     * ⚠️ OPT-IN: `npm run test:e2e:lan`. Not in the default run.
     *
     * Proves the app works when opened from another device on the Wi-Fi. It
     * signs in through the form rather than reusing a `storageState` minted
     * against localhost — reusing that would assume away the thing under test.
     * No `dependencies: ['setup']` for the same reason.
     *
     * The LAN address is discovered at runtime (`e2e/lanAddress.ts`) and the
     * spec skips itself, loudly, when there is no non-internal interface.
     */
    /**
     * ⚠️ OPT-IN: `npm run test:e2e:auth`. The sign-in entry for every role —
     * patient OTP (mobile + email) and password, staff password, forgot
     * password, the staff invitation. Signs in for real, so it has no
     * `storageState` and no `dependencies: ['setup']` — reusing a minted
     * session would assume away the thing under test. Kept out of the default
     * run because it spends the OTP, forgot-password and reset limiters
     * (5 per 15 minutes each).
     */
    {
      name: 'auth',
      testMatch: /auth-entry\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    /**
     * ⚠️ OPT-IN: `npm run test:e2e:patient`. The patient portal, signed in as
     * SD-P-01 from the saved session. Its own project for two reasons: the
     * page loads spend the shared `/auth/refresh` budget, and Chromium here
     * is given a FAKE MICROPHONE that plays a real speech clip — so the voice
     * note test exercises actual capture → 16 kHz conversion → upload →
     * on-server Whisper, not a mocked transcript.
     */
    {
      name: 'patient',
      testMatch: /(patient-portal|health-notes|medicines|reports-assistant)\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        permissions: ['microphone', 'camera'],
        launchOptions: {
          args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            `--use-file-for-fake-audio-capture=${path.resolve(process.cwd(), 'e2e/fixtures/voice-note-en-16k.wav')}`,
          ],
        },
      },
    },
    {
      name: 'lan',
      testMatch: /lan\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 3000 --strictPort',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
