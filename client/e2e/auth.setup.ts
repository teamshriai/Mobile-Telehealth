import { test as setup, expect, request } from '@playwright/test'
import fs from 'node:fs/promises'
import { PASSWORD } from './helpers'
import { AUTH_DIR, API_ORIGIN, DEMO_USERS, passwordFor, statePath, type DemoUser } from './authState'

/**
 * Mint one authenticated session per demo user, before any spec runs.
 *
 * ⚠️ NO BROWSER, AND THAT IS THE WHOLE TRICK. `POST /auth/login` returns the
 * refresh token as a `Set-Cookie` (`auth.controller.ts`), so an
 * `APIRequestContext` can authenticate and `storageState()` captures the cookie
 * jar. No page is ever loaded here — and since the cost of authentication is
 * dominated by the app's boot-time `/auth/refresh`, which only happens when a
 * *page* loads, this setup spends **zero** of the 60-per-15-minute refresh
 * budget. Doing the same thing through the login form would spend three.
 *
 * ⚠️ IT RE-MINTS EVERY RUN, deliberately. A state file is a one-shot
 * credential (see `authState.ts`), so a run that crashed mid-test leaves a
 * revoked token on disk. Overwriting unconditionally at the start of every run
 * is what stops that poisoning the next one — a `if (exists) skip` here would
 * turn one crashed run into a permanently broken suite.
 *
 * ⚠️ Successful logins are free against the limiter — `loginLimiter` sets
 * `skipSuccessfulRequests: true` — so three of them cost nothing. A FAILED
 * login is not free, which is why the assertion below is explicit: a wrong
 * `DEMO_CLINIC_PASSWORD` should fail loudly on run 1 rather than silently
 * burning the 20-attempt budget over several runs.
 */

setup('mint authenticated sessions for the demo cast', async () => {
  expect(
    PASSWORD,
    'DEMO_CLINIC_PASSWORD must be set — see e2e/README.md. Without it every login fails and ' +
      'the login limiter (20 per 15 min) will lock the suite out.',
  ).not.toBe('')

  await fs.mkdir(AUTH_DIR, { recursive: true })

  for (const [name, email] of Object.entries(DEMO_USERS) as Array<[DemoUser, string]>) {
    const password = passwordFor(name)
    // An optional account with no password configured: skipped, not failed —
    // a failed login spends the limiter. Its specs skip on the same check.
    if (password === '') {
      await fs.rm(statePath(name), { force: true })
      continue
    }
    const ctx = await request.newContext({ baseURL: API_ORIGIN })
    try {
      const res = await ctx.post('/api/v1/auth/login', {
        data: { email, password },
      })

      expect(res.status(), `login failed for ${email} — is the API on ${API_ORIGIN}?`).toBe(200)

      // ⚠️ Assert the cookie actually landed. `storageState()` will happily
      // write an empty jar, and an empty state file does not fail loudly — it
      // fails as "every test redirected to /login", which reads like a broken
      // app rather than a broken fixture.
      const state = await ctx.storageState({ path: statePath(name) })
      const refresh = state.cookies.find((c) => c.name === 'strokeai_refresh')
      expect(refresh, `no strokeai_refresh cookie captured for ${email}`).toBeTruthy()
    } finally {
      await ctx.dispose()
    }
  }
})
