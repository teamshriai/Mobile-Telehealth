import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { lanOrigin } from './lanAddress'
import { DOCTOR, PASSWORD } from './helpers'

/**
 * The application served from a LAN address, as a separate device would see it.
 *
 * ⚠️ RUN WITH `npm run test:e2e:lan`, NOT AS PART OF THE DEFAULT SUITE. It
 * needs `npm run dev:lan` (a dev server bound to all interfaces), and every
 * page load here spends one of the 60 `/auth/refresh` calls the limiter allows
 * per 15 minutes per IP — a budget the default suite already sits close to.
 *
 * ⚠️ THE LAN IP IS DISCOVERED, NEVER HARDCODED. See `lanAddress.ts`.
 *
 * ⚠️ These tests do NOT use `storageState`. The saved sessions were minted
 * against `localhost`, and the whole point here is to prove the LAN origin
 * works on its own — reusing a localhost session would assume away the thing
 * under test. So this file signs in through the form, which also exercises the
 * cookie path that D3 broke.
 */

const ORIGIN = lanOrigin()
/** The API on the same LAN host — see the note in `signIn`. */
const LAN_API = lanOrigin(5000)

// If there is no LAN interface (CI container, cable unplugged) the honest
// outcome is a skip that says so — not a pass, and not a failure.
test.skip(ORIGIN === null, 'no non-internal IPv4 interface — nothing to test a LAN against')
test.describe.configure({ mode: 'serial' })

/** Collects every API request the page makes, so their origin can be asserted. */
function watchApi(page: Page): string[] {
  const urls: string[] = []
  page.on('request', (r) => {
    if (r.url().includes('/api/v1/')) urls.push(r.url())
  })
  return urls
}

/**
 * ⚠️ Posts to the API through the page's own request context, so the refresh
 * cookie lands in the browser jar — the same shape `helpers.login()` uses, but
 * against the LAN origin rather than the configured baseURL, which is the
 * whole point of this file.
 *
 * Password rather than OTP on purpose: these tests are about the LAN
 * transport — cookie host, API origin, reload survival — not about how a
 * session is minted. `auth-entry.spec.ts` owns that.
 */
async function signIn(page: Page): Promise<void> {
  // ⚠️ THE LAN API ORIGIN, NOT THE CONFIGURED ONE. `API_ORIGIN` defaults to
  // `http://localhost:5000`, and a cookie set there is scoped to `localhost` —
  // so the subsequent load from the LAN host would arrive with no session and
  // sit at /login until the test timed out. Cookies are host-scoped; that is
  // the entire subject of this file.
  const res = await page.request.post(`${LAN_API}/api/v1/auth/login`, {
    data: { email: DOCTOR, password: PASSWORD },
  })
  expect(res.status(), 'API login over LAN should succeed').toBe(200)
  await page.goto(`${ORIGIN}/clinician`)
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 30_000 })
}

/**
 * ⚠️ THE REGRESSION GUARD FOR D3.
 *
 * `apiClient` used to fold `127.0.0.1` into a hard-coded `http://localhost:5000`.
 * Those are different SITES, and the refresh cookie is `sameSite: 'lax'`, which
 * browsers never send on a cross-site XHR — so the silent refresh 401'd and the
 * session died roughly every fifteen minutes. The general rule that prevents
 * the whole class is: the API origin keeps the page's host and changes only the
 * port. Asserting that on the LAN origin pins it.
 */
test('every API call keeps the page host and never falls back to localhost', async ({ page }) => {
  const api = watchApi(page)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await signIn(page)

  // Exercise several verbs and a few screens so this is not just the auth call.
  await page.getByRole('link', { name: /patients/i }).first().click().catch(() => {})
  await page.waitForTimeout(1500)

  expect(api.length, 'the page should have made API calls').toBeGreaterThan(2)

  const hosts = [...new Set(api.map((u) => new URL(u).host))]
  const lanHost = new URL(ORIGIN!).hostname
  expect(hosts, `API calls must all go to ${lanHost}:5000`).toEqual([`${lanHost}:5000`])

  // ⚠️ The specific failure D3 caused. Named separately so a regression reads
  // as "it fell back to localhost" rather than an array diff.
  expect(
    hosts.some((h) => h.startsWith('localhost') || h.startsWith('127.0.0.1')),
    'an API call fell back to a loopback host — the refresh cookie is sameSite=lax and will '
      + 'not be sent cross-site, so the session will die on the next silent refresh',
  ).toBe(false)

  expect(errors, 'uncaught page errors').toEqual([])
})

/** The cookie has to actually be set on the LAN host, or nothing else matters. */
test('the refresh cookie is set on the LAN host and survives a reload', async ({ page }) => {
  await signIn(page)

  const cookie = (await page.context().cookies()).find((c) => c.name === 'strokeai_refresh')
  expect(cookie, 'no refresh cookie after signing in over LAN').toBeTruthy()
  expect(cookie!.domain.replace(/^\./, '')).toBe(new URL(ORIGIN!).hostname)
  expect(cookie!.httpOnly, 'the refresh cookie must stay httpOnly').toBe(true)
  expect(cookie!.path).toBe('/api/v1/auth')

  // ⚠️ A reload is a real silent-refresh round trip: the access token lives
  // only in page memory, so booting again has to exchange the cookie. If the
  // API origin were cross-site this is exactly where it would fail.
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 30_000 })
  expect(page.url(), 'reload bounced to /login — the silent refresh failed').not.toMatch(/\/login/)
})

/** A deep link must be guarded identically over LAN — no origin-based bypass. */
test('a deep link is still auth-guarded from the LAN origin', async ({ browser }) => {
  const ctx = await browser.newContext() // deliberately anonymous
  const page = await ctx.newPage()
  await page.goto(`${ORIGIN}/clinician/cosign`)
  await page.waitForURL(/\/login/, { timeout: 30_000 })
  // ⚠️ And nothing clinical leaked on the way past.
  await expect(page.getByTestId('patient-banner')).toHaveCount(0)
  await ctx.close()
})

/**
 * ⚠️ REGRESSION GUARD FOR D5. On a LAN page `navigator.mediaDevices` is
 * undefined, and the scribe used to report that as "No microphone is
 * available" — sending a clinician to look for a hardware fault that does not
 * exist. It must name the origin as the cause instead.
 */
test('the scribe blames the insecure origin, not the microphone', async ({ page }) => {
  await signIn(page)

  await page.getByRole('link', { name: /patients/i }).first().click()
  await page.getByRole('tab', { name: /my panel/i }).click()
  await page.getByRole('row').filter({ hasText: /krishnan/i }).first().click({ timeout: 20_000 })
  await page.waitForURL(/\/patient\/[^/]+\/chart/, { timeout: 20_000 })

  const cont = page.getByRole('link', { name: /continue/i }).first()
  if ((await cont.count()) > 0 && (await cont.isVisible().catch(() => false))) await cont.click()
  else await page.getByRole('button', { name: /start consultation/i }).click()
  await page.waitForURL(/\/encounter\/[^/]+\/note/, { timeout: 25_000 })

  await page.getByRole('button', { name: /^dictate$/i }).click()
  await page.getByRole('checkbox').first().check()
  await page.getByRole('button', { name: /start recording/i }).click()

  await expect(page.getByText(/dictation is unavailable on this address/i)).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByText(/only allow microphone access on https or on localhost/i)).toBeVisible()
  // ⚠️ The false claim must be gone.
  await expect(page.getByText(/no microphone is available/i)).toHaveCount(0)

  // And the screen still works — dictation degrading never blocks the note.
  await expect(page.getByRole('button', { name: /stop & draft/i })).toBeVisible()
})
