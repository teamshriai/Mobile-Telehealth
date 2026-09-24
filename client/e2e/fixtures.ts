import { test as base, expect } from '@playwright/test'
import { statePath, type DemoUser } from './authState'

/**
 * The suite's `test`. Import this instead of `@playwright/test`.
 *
 * It does two things, and the second one is the reason this file exists.
 *
 * **1. Picks whose session to use.** `test.use({ demoUser: 'resident' })`
 * selects a state file minted by `auth.setup.ts`. The default is the
 * consultant, which is what most specs want.
 *
 * **2. ⚠️ RE-SAVES THE SESSION AFTER EVERY TEST, AND THIS IS NOT AN
 * OPTIMISATION — IT IS WHAT STOPS THE SUITE ATTACKING ITSELF.**
 *
 * `/auth/refresh` rotates: the token presented is revoked and a replacement is
 * issued. The app calls it once on every page load, so by the end of a test the
 * token in the file on disk has been revoked and the live one exists only in
 * this context's cookie jar.
 *
 * If the next test loaded the stale file, it would present a revoked token.
 * `refreshToken.service.ts` does not treat that as an expired session — it
 * treats it as a *captured* one, because a legitimate client never replays a
 * rotated token. It revokes the **entire token family**, writes a Critical
 * `TokenReuseDetected` audit row, and 401s. Every remaining test then fails,
 * and the demo account is left with a security incident in its audit log that
 * nobody caused.
 *
 * Copying the rotated jar back to disk in teardown is what keeps the chain
 * intact. It is one line, and without it `storageState` is actively worse than
 * logging in per test.
 */

interface DemoFixtures {
  /** Which seeded clinician this test runs as. */
  demoUser: DemoUser
}

export const test = base.extend<DemoFixtures>({
  demoUser: ['doctor', { option: true }],

  storageState: async ({ demoUser }, use) => {
    await use(statePath(demoUser))
  },

  context: async ({ context, demoUser, storageState }, use) => {
    // ⚠️ Serial only. Two workers would load the same file and the second
    // would replay a revoked token — see the header. They would also share one
    // rate-limit bucket, because no limiter in `rateLimiter.ts` sets a
    // `keyGenerator`, so every limiter keys on IP and every worker is
    // 127.0.0.1. Going parallel needs per-worker state files AND headroom in
    // the 60-per-15-minute refresh budget; it is not a config flag flip.
    expect(
      test.info().parallelIndex,
      'this suite must run with workers: 1 — see e2e/fixtures.ts on why parallel workers ' +
        'replay each other\'s refresh tokens and share one rate-limit bucket',
    ).toBe(0)

    await use(context)

    // ⚠️ ONLY WRITE BACK THE FILE WE ACTUALLY LOADED.
    //
    // A test may override `storageState` entirely — `auth-guard.spec.ts` runs
    // two of them on a deliberately empty jar. Without this check the teardown
    // wrote that empty jar over `doctor.json`, and because Playwright orders
    // files alphabetically, `auth-guard` runs first and de-authenticated the
    // other twenty tests. The symptom was twenty "element not found" failures
    // and one honest one; the cause was here.
    //
    // Comparing against the path this fixture supplies is the precise test:
    // if they differ, the session in this context is not the demo user's and
    // must not be persisted as if it were.
    if (storageState === statePath(demoUser)) {
      // The token rotated during the test. Persist the live jar so the next
      // test inherits a valid session rather than replaying a revoked one.
      await context.storageState({ path: statePath(demoUser) })
    }
  },
})

export { expect } from '@playwright/test'
