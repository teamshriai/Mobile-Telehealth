import { test, expect } from './fixtures'
import { openAuthed, watchConsole } from './helpers'

/**
 * DD-014 · emergency access.
 *
 * Dr Desai opens a record he has no care relationship with. He is **offered**
 * access rather than refused, because an authorization model that can block
 * resuscitation is the wrong model (§3.2). But:
 *
 *  - Nothing clinical renders before a reason is recorded — the gate replaces
 *    the screen rather than sitting over it.
 *  - Only a name and a UHID appear on the gate itself.
 *  - After the grant, the amber GP-10 banner persists and is not dismissible.
 *
 * ⚠️ This test asserts on what is ABSENT before the reason is given, which is
 * the part that is easy to regress and impossible to notice by eye.
 */

// A patient Dr Desai is not on the care team for. If the demo seed changes
// this patient's care team, this test starts failing loudly rather than
// silently exercising an ordinary authorized read.
const NOT_HIS_PATIENT = 'SHRI-TCHT81-S'

// ⚠️ Dr Desai, who has no care relationship with this patient — that is the
// whole premise. Running it as the default consultant would silently exercise
// an ordinary authorized read.
test.use({ demoUser: 'desai' })

test('a clinician with no care relationship is offered emergency access, not refused', async ({ page }) => {
  const watcher = watchConsole(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  // Deep-linked: one page load, not two. The break-glass gate renders instead
  // of the chart, so there is nothing to click through to get here.
  await openAuthed(page, `/patient/${NOT_HIS_PATIENT}/chart`, watcher)

  // ── The gate, instead of the chart ──
  await expect(
    page.getByRole('heading', { name: /no care relationship with this patient/i }),
  ).toBeVisible({ timeout: 20_000 })
  await expect(page.getByLabel(/reason for access/i)).toBeVisible()
  await expect(page.getByLabel(/describe the clinical need/i)).toBeVisible()

  // ⚠️ Nothing clinical, and no chart, before a reason exists.
  await expect(page.getByRole('heading', { name: /patient chart/i })).toBeHidden()
  await expect(page.getByTestId('patient-banner')).toBeHidden()
  await expect(page.getByRole('heading', { name: /^allergies$/i })).toBeHidden()
  await page.screenshot({ path: 'e2e/screenshots/break-glass/01-gate.png', fullPage: true })

  // The identity shown is name + UHID only.
  await expect(page.getByText(NOT_HIS_PATIENT)).toBeVisible()

  // ⚠️ Narrow the window, do not allowlist a message. The 403 that produced
  // this gate is the FEATURE — Chrome logs every non-2xx response as a console
  // error whether or not the application handled it, and this test exists
  // precisely to provoke one. Everything from here on is asserted on.
  watcher.reset()

  // ── Proceeding is blocked until reason + acknowledgement are complete ──
  const proceed = page.getByRole('button', { name: /break glass and open record/i })
  await expect(proceed).toBeDisabled()

  await page.getByLabel(/reason for access/i).selectOption('CoveringColleague')
  await expect(proceed, 'a category alone must not be enough').toBeDisabled()

  await page
    .getByLabel(/describe the clinical need/i)
    .fill('Synthetic test — covering the overnight medical take; responsible consultant unavailable.')
  await expect(proceed, 'the acknowledgement is still outstanding').toBeDisabled()

  await page.getByRole('checkbox').check()
  await expect(proceed).toBeEnabled()
  await page.screenshot({ path: 'e2e/screenshots/break-glass/02-reason-given.png', fullPage: true })

  // ── Break glass ──
  await proceed.click()
  await expect(page.getByRole('heading', { name: /patient chart/i })).toBeVisible({ timeout: 25_000 })
  await expect(page.getByTestId('patient-banner')).toBeVisible()

  // GP-10: the amber banner persists, and there is no way to dismiss it.
  const banner = page.getByTestId('break-glass-banner')
  await expect(banner).toBeVisible()
  await expect(banner.getByRole('button')).toHaveCount(0)
  await page.screenshot({ path: 'e2e/screenshots/break-glass/03-granted.png', fullPage: true })

  // It survives a navigation — it is tied to the grant, not to the screen.
  await page.getByRole('button', { name: /view full record/i }).click()
  await expect(page.getByTestId('break-glass-banner')).toBeVisible({ timeout: 20_000 })
  await page.screenshot({ path: 'e2e/screenshots/break-glass/04-banner-persists.png', fullPage: true })

  expect(watcher.errors, `console errors:\n${watcher.errors.join('\n')}`).toEqual([])
})
