import type { Page, ConsoleMessage } from '@playwright/test'
import { expect } from '@playwright/test'

export const DOCTOR = 'demo.doctor.iyer@stroke-ai.invalid'
export const SECOND_CONSULTANT = 'demo.doctor.desai@stroke-ai.invalid'
export const RESIDENT = 'demo.resident.rao@stroke-ai.invalid'

/** Read from the environment so no credential is committed. */
export const PASSWORD = process.env.DEMO_CLINIC_PASSWORD ?? ''

/** §5.1's breakpoints, including md 1024 — "the breakpoint that matters most". */
export const BREAKPOINTS = [
  { name: 'xs-375', width: 375, height: 812 },
  { name: 'sm-768', width: 768, height: 1024 },
  { name: 'md-1024', width: 1024, height: 768 },
  { name: 'xl-1440', width: 1440, height: 900 },
  { name: 'wall-1920', width: 1920, height: 1080 },
]

/**
 * Collects console errors for the life of a page.
 *
 * ⚠️ Filters nothing by message. A suite that allowlists "expected" console
 * noise by substring will eventually allowlist the unexpected kind too, and
 * the allowlist grows quietly until the check means nothing.
 *
 * The one thing it does do is start clean at sign-in — `login()` calls
 * `reset()`. That is not an exemption for a class of message: it is a
 * narrower WINDOW. Before sign-in the app probes `/auth/refresh` to find out
 * whether there is a session, and Chrome logs every non-2xx response as a
 * console error whether or not the application handled it. That 401 is the
 * probe working correctly — it is how the app decides you are anonymous.
 * Everything logged from sign-in onwards is collected and asserted on, with
 * no exceptions.
 */
export interface ConsoleWatcher {
  errors: string[]
  reset: () => void
}

export function watchConsole(page: Page): ConsoleWatcher {
  const errors: string[] = []
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') errors.push(`${msg.location().url}: ${msg.text()}`)
  })
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
  return { errors, reset: () => { errors.length = 0 } }
}

/**
 * Open the app on an already-authenticated session and wait for it to settle.
 *
 * This replaces `login()` in every spec. The session comes from the
 * `storageState` minted by `auth.setup.ts`, so there is no form to fill and no
 * `/auth/login` round-trip — but note that the **page load itself still costs
 * one `/auth/refresh`**, because the access token lives in page memory and
 * `AuthContext` re-mints it on every boot. Loads are the budget; logins are not.
 *
 * ⚠️ It asserts we did not land on `/login`. A rate-limited or revoked session
 * fails by *redirecting*, not by throwing, and without this assertion the next
 * line would fail on a missing selector and read as a broken screen rather than
 * a broken session.
 *
 * `path` defaults to the clinician home. Pass a deep link to save a navigation
 * where a spec needs one — every avoided load is one back in the budget.
 */
export async function openAuthed(
  page: Page,
  path = '/clinician',
  watcher?: ConsoleWatcher,
): Promise<void> {
  await page.goto(path)

  // The guard renders a full-page loader while the boot refresh resolves, so
  // wait for real content rather than for the URL.
  await page.getByRole('heading', { level: 1 }).first().waitFor({ state: 'visible', timeout: 30_000 })

  expect(
    page.url(),
    'landed on /login — the saved session was rejected. Either DEMO_CLINIC_PASSWORD is wrong, ' +
      'the refresh budget is exhausted (60 per 15 min per IP), or a stale state file replayed ' +
      'a revoked token. See e2e/fixtures.ts.',
  ).not.toMatch(/\/login/)

  // Everything from here on is asserted on. See watchConsole.
  watcher?.reset()
}

/**
 * Sign in through the form.
 *
 * ⚠️ Kept for the two specs that are ABOUT authentication — the logout test
 * needs a session it is allowed to destroy, and destroying a `storageState`
 * session would poison the file for every later test. Everything else uses
 * `openAuthed`.
 */
export async function login(page: Page, email: string, watcher?: ConsoleWatcher): Promise<void> {
  await page.goto('/login')
  await page.getByLabel(/email/i).first().fill(email)
  await page.getByLabel(/password/i).first().fill(PASSWORD)
  await page.getByRole('button', { name: /sign in|log ?in/i }).first().click()
  await page.waitForURL(/\/(clinician|app|hospital-admin|admin)/, { timeout: 30_000 })
  // Everything from here on is asserted on. See watchConsole.
  watcher?.reset()
}

/**
 * A page that scrolls sideways on a tablet is unusable one-handed in a ward.
 * 1px of slack absorbs sub-pixel rounding in the layout engine, not a real
 * overflow.
 */
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(1)
}

/**
 * Navigate by clicking the nav, at any breakpoint.
 *
 * The Z2 rail is `lg:block` and the hamburger is `lg:hidden`, so exactly one
 * of them exists at any width and a caller cannot know which.
 *
 * WARNING: IT RACES THEM RATHER THAN BRANCHING ON ONE. `isVisible()` is a
 * point-in-time question with no auto-waiting, so using it to choose a branch
 * is a race against first paint -- and this helper has now been written wrong
 * twice in exactly that way. The first version probed the hamburger, so on a
 * phone it silently skipped opening the drawer and waited out the 60s timeout.
 * The second probed the link instead, which merely moved the failure: at 1024
 * and above there IS no hamburger, so when the check fired before the rail had
 * painted it fell back to waiting 15s for a button that does not exist at that
 * width. Racing two `waitFor`s asks "which nav is this?" without assuming
 * anything has rendered yet.
 */
export async function navigateTo(
  page: Page,
  linkName: RegExp,
  urlPattern: RegExp,
): Promise<void> {
  const link = page.getByRole('link', { name: linkName }).first()
  const hamburger = page.getByRole('button', { name: /open navigation menu/i })

  // Whichever appears first tells us which nav this breakpoint has. Exactly
  // one of the two is expected never to resolve, so its rejection is ignored.
  const needsDrawer = await Promise.race([
    link.waitFor({ state: 'visible', timeout: 20_000 }).then(() => false),
    hamburger.waitFor({ state: 'visible', timeout: 20_000 }).then(() => true),
  ])

  if (needsDrawer) {
    await hamburger.click()
    await link.waitFor({ state: 'visible', timeout: 15_000 })
  }

  await link.click()
  await page.waitForURL(urlPattern, { timeout: 20_000 })

  // The drawer animates out after navigating. Waiting for that to finish keeps
  // the evidence screenshots showing the SCREEN rather than a closing drawer
  // on top of it.
  if (needsDrawer) await page.waitForTimeout(400)
}
