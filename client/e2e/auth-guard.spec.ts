import { test, expect } from './fixtures'
import { DOCTOR, login, watchConsole } from './helpers'
import { API_ORIGIN } from './authState'

/**
 * The logged-out paths.
 *
 * ⚠️ WHY THIS FILE EXISTS. The suite now runs every other spec from a saved
 * `storageState`, which means authentication is established once and then
 * assumed. Nothing else in the suite would notice if a regression made
 * protected routes public — every test arrives already signed in, so "the guard
 * no longer guards" and "the guard works" look identical from in here.
 *
 * These two tests are the counterweight. They are cheap, and without them the
 * storage-state default is an unchecked assumption sitting under twenty specs.
 *
 * ⚠️ Not covered, deliberately: the 15-minute idle timeout
 * (`client/src/app/useIdleTimeout.ts`, which calls `logout()` and redirects
 * with `state.expired`). Asserting it needs either a fifteen-minute wait or
 * clock manipulation, and a fifteen-minute test that flakes is worse than a
 * gap somebody knows about. Recorded here rather than faked.
 */

/**
 * ⚠️ Stamped on the one request in this file that deliberately replays a revoked
 * refresh token. The server records it on the Critical `TokenReuseDetected` row,
 * which makes that row attributable from the audit trail alone. Changing this
 * string does not break any test — it only makes the alert harder to triage.
 */
// ⚠️ ASCII ONLY. HTTP header values are latin-1; an em dash here makes
// Playwright's request context throw "Invalid character in header content".
const REVOCATION_PROBE_UA =
  'stroke-ai-e2e/auth-guard revocation-probe (expected Critical row, see client/e2e/auth-guard.spec.ts)'

test.describe('anonymous', () => {
  // ⚠️ An explicitly empty jar. Without this the project-level storageState
  // applies and this test would silently assert nothing.
  test.use({ storageState: { cookies: [], origins: [] } })

  test('a protected route is not reachable without a session', async ({ page }) => {
    await page.goto('/clinician')

    // `guards.tsx` redirects to /login carrying the attempted path, so the
    // clinician lands where they were going after signing in.
    await page.waitForURL(/\/login/, { timeout: 30_000 })
    // ⚠️ `/login` with no `?as=` is the entry page ("Who are you?"), so the
    // guard's redirect lands on the three doors — not on a form that would
    // assume which kind of account the person has.
    await expect(page.getByTestId('entry-patient')).toBeVisible()
    await expect(page.getByTestId('entry-clinician')).toBeVisible()
    await expect(page.getByTestId('entry-hospital')).toBeVisible()

    // ⚠️ And no clinical surface leaked on the way past. A guard that redirects
    // *after* painting the shell has still shown a patient banner to someone
    // who is not signed in.
    await expect(page.getByTestId('patient-banner')).toHaveCount(0)
    await expect(page.getByRole('link', { name: /co-sign/i })).toHaveCount(0)
  })
})

/**
 * ⚠️ THIS TEST OWNS ITS OWN SESSION, and that is not incidental.
 *
 * Logging out **revokes the refresh token server-side**
 * (`auth.service.ts` → `refreshTokenService.revoke`). If it ran on the shared
 * `storageState` session it would destroy the credential every later test
 * depends on, and the suite would fail from here to the end for a reason that
 * looks nothing like its cause. So it signs in through the form, on an empty
 * jar, and throws that session away.
 */
test.describe('logout', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('signing out revokes the session server-side, not just in the browser', async ({ page }) => {
    const watcher = watchConsole(page)
    await login(page, DOCTOR, watcher)

    // Capture the refresh cookie while it is still live, so the assertion
    // below tests the SERVER's opinion rather than the browser's cookie jar.
    const cookies = await page.context().cookies()
    const refresh = cookies.find((c) => c.name === 'strokeai_refresh')
    expect(refresh, 'a refresh cookie after signing in').toBeTruthy()

    await page.getByRole('button', { name: /ananya/i }).first().click()
    await page.getByRole('menuitem', { name: /sign out/i }).click()
    await page.waitForURL(/\/login/, { timeout: 30_000 })

    // ⚠️ The real assertion. Present the captured token directly to the API:
    // if logout only cleared the cookie, this still succeeds and the session
    // was never actually ended.
    //
    // ⚠️ THIS WRITES ONE Critical `TokenReuseDetected` AUDIT ROW PER RUN, AND
    // THAT IS CORRECT. Proving server-side revocation requires presenting a
    // revoked token, and presenting a revoked token is precisely what reuse
    // detection exists to catch — so the row is a true statement about what
    // just happened, not a false positive.
    //
    // It is deliberately NOT gated behind an env flag: hiding it would mean the
    // default suite stops proving that logout revokes anything, which is a far
    // worse trade than one attributable row per run. And it is deliberately not
    // cleaned up afterwards — the audit trail is not something a test may edit,
    // for the same reason the break-glass reset expires grants rather than
    // deleting them.
    //
    // ⚠️ WHAT IT IS INSTEAD: self-attributing IN THE DATA. `refreshToken.service`
    // records `meta.userAgent` on the row it writes, so the probe announces
    // itself with the User-Agent below. An investigator triaging a Critical
    // reuse alert can then tell a test probe from a real captured token by
    // reading the row — rather than by knowing that this file exists. A comment
    // only reaches someone who is already looking in the right place; at 03:00
    // on a genuine alert, nobody is.
    const api = await page.request.post(`${API_ORIGIN}/api/v1/auth/refresh`, {
      headers: {
        Cookie: `strokeai_refresh=${refresh!.value}`,
        'User-Agent': REVOCATION_PROBE_UA,
      },
    })
    expect(
      api.status(),
      'a revoked refresh token must not mint a new session — if this is 200, logout only ' +
        'cleared the cookie and the session is still live on the server',
    ).toBe(401)

    // And the protected route is closed.
    await page.goto('/clinician')
    await page.waitForURL(/\/login/, { timeout: 30_000 })
  })
})

/**
 * A guard on the guard: proves `auth.setup.ts` actually produced a session, so
 * a silently-empty state file fails here with a clear message rather than as
 * twenty unrelated "element not found" errors.
 */
test('the saved storage state carries a real session', async ({ page }) => {
  const cookies = await page.context().cookies()
  const refresh = cookies.find((c) => c.name === 'strokeai_refresh')
  expect(
    refresh,
    'no strokeai_refresh cookie in the restored context — auth.setup.ts did not mint a session',
  ).toBeTruthy()

  await page.goto('/clinician')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 })
  expect(page.url(), 'restored session should not bounce to /login').not.toMatch(/\/login/)
})
