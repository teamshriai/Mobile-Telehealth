import { test, expect } from './fixtures'
import {
  BREAKPOINTS, openAuthed, watchConsole, expectNoHorizontalOverflow, navigateTo,
} from './helpers'

/**
 * Every clinician route, at every breakpoint, failing on any console error.
 *
 * Emergency-access review is deliberately NOT here: `breakglass:review:any` is
 * an Admin capability, and a Doctor reaching that screen would be the bug.
 *
 * ⚠️ Routes are reached by CLICKING THE NAV, not by `page.goto`. Two reasons,
 * and the second one cost an afternoon:
 *
 *  1. It is what a clinician actually does, so it tests the Z2 rail too — a
 *     route that works but is unreachable from the nav is still broken.
 *  2. `page.goto` is a full reload, which drops the in-memory access token and
 *     spends one of the 60-per-15-minutes budget on `/auth/refresh`. Five
 *     routes × five breakpoints is 25 reloads per run, and running the suite
 *     twice inside the window exhausted the budget, at which point every test
 *     failed by being bounced to /login — which looks exactly like a broken
 *     application and is not one. The refresh ceiling is correct; the test was
 *     wrong to behave like nothing a human would do.
 *
 * The screenshots are evidence, not decoration — they are what makes "the UI
 * is visibly implemented" a checkable claim rather than an assertion.
 */

const ROUTES = [
  { nav: /my day/i, path: '/clinician', heading: /my day|good (morning|afternoon|evening)/i, name: 'my-day' },
  { nav: /patients/i, path: '/clinician/patients', heading: /patients/i, name: 'patients' },
  { nav: /co-sign/i, path: '/clinician/cosign', heading: /co-sign queue/i, name: 'cosign' },
  { nav: /templates/i, path: '/clinician/templates', heading: /templates/i, name: 'templates' },
]

test.describe('clinician portal sweep', () => {
  /**
   * ⚠️ ONE PAGE LOAD FOR ALL SEVEN BREAKPOINTS, not one per breakpoint.
   *
   * This used to be a `test()` per width, and each one paid an `openAuthed`,
   * i.e. a full reload, i.e. one of the 60 `/auth/refresh` calls the limiter
   * allows per 15 minutes per IP. Seven widths would have been seven of that
   * budget for a screen-size check, and the suite was already close enough to
   * the ceiling that its tail bounced to /login — which reads as a
   * catastrophically broken application and is nothing of the kind.
   *
   * Resizing a live page is also closer to what it claims to test. A layout
   * bug that only appears when a viewport CHANGES — a `matchMedia` listener
   * that never re-subscribes, a drawer that stays open across a breakpoint —
   * is invisible when every width gets a fresh document.
   */
  test('every route renders clean at every breakpoint', async ({ page }) => {
    const watcher = watchConsole(page)
    await page.setViewportSize({ width: BREAKPOINTS[0].width, height: BREAKPOINTS[0].height })
    await openAuthed(page, undefined, watcher)

    for (const bp of BREAKPOINTS) {
      await page.setViewportSize({ width: bp.width, height: bp.height })

      for (const route of ROUTES) {
        // Below lg the rail collapses into a drawer; navigateTo opens it when
        // it has to. That the drawer works at 375 is part of the assertion.
        await navigateTo(page, route.nav, new RegExp(`${route.path}$`))

        await expect(
          page.getByRole('heading', { name: route.heading }).first(),
          `${route.path} heading at ${bp.name}`,
        ).toBeVisible({ timeout: 20_000 })
        await page.waitForTimeout(250)
        await expectNoHorizontalOverflow(page)
        await page.screenshot({
          path: `e2e/screenshots/${bp.name}/${route.name}.png`,
          fullPage: true,
        })
      }
    }

    expect(watcher.errors, `console errors:\n${watcher.errors.join('\n')}`).toEqual([])
  })
})
