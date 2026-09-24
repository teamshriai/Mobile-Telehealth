import { test, expect } from './fixtures'
import { openAuthed, watchConsole, navigateTo, expectNoHorizontalOverflow } from './helpers'

/**
 * `S-06-02` against its atlas spec (`UI_ATLAS.md:6419–6485`).
 *
 * These are the requirements that are easy to regress silently because nothing
 * else depends on them — a tab quietly dropped, an AI control left greyed
 * instead of removed, the escape hatch renamed.
 */

/**
 * Open R. Lakshmanan's chart by CLICKING — §8.2 `SD-P-03`, the patient this
 * screen's spec names as its sample data.
 *
 * ⚠️ Never `page.goto`. Every full reload spends one of the 60 `/auth/refresh`
 * calls the rate limiter allows per 15 minutes per IP, and exhausting it makes
 * every test in the suite fail by bouncing to /login — which looks exactly like
 * a catastrophically broken app and is not one. See `helpers.ts`.
 */
async function openChart(page: import('@playwright/test').Page): Promise<void> {
  await navigateTo(page, /patients/i, /\/clinician\/patients$/)
  await page.getByRole('tab', { name: /my panel/i }).click()
  const row = page.getByRole('row').filter({ hasText: /lakshmanan/i }).first()
  await expect(row).toBeVisible({ timeout: 20_000 })
  await row.click()
  await page.waitForURL(/\/patient\/[^/]+\/chart/, { timeout: 20_000 })
  await expect(page.getByRole('heading', { name: /patient chart/i })).toBeVisible({
    timeout: 20_000,
  })
}

test('S-06-02 carries the atlas tabs, Z6 rail and escape hatch', async ({ page }) => {
  const watcher = watchConsole(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await openAuthed(page, undefined, watcher)

  await openChart(page)

  // §6437 — seven tabs, in this order. Billing is the one most likely to be
  // dropped as "out of module"; the atlas lists it, so it exists and states
  // its boundary.
  for (const name of [
    /^summary$/i,
    /^problems$/i,
    /^medications$/i,
    /^results$/i,
    /^notes$/i,
    /^documents$/i,
    /^billing$/i,
  ]) {
    await expect(page.getByRole('tab', { name })).toBeVisible()
  }

  // §6435 — Z6 context rail, drawn at ≥1280.
  await expect(page.getByRole('complementary', { name: /patient context/i })).toBeVisible()

  // §6446 — "View full record", enabled always. The escape hatch behind every
  // summary in the product.
  await expect(page.getByRole('button', { name: /view full record/i })).toBeEnabled()

  await expectNoHorizontalOverflow(page)
  expect(watcher.errors, 'console errors').toEqual([])
})

test('the Z6 rail becomes a tab below 1280 and is never reachable twice', async ({ page }) => {
  const watcher = watchConsole(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await openAuthed(page, undefined, watcher)

  await openChart(page)

  // ≥1280: rail drawn, no Context tab.
  await expect(page.getByRole('complementary', { name: /patient context/i })).toBeVisible()
  await expect(page.getByRole('tab', { name: /^context$/i })).toHaveCount(0)

  // §6474 — 1024–1279: Z6 collapses to a tab.
  await page.setViewportSize({ width: 1024, height: 900 })
  await expect(page.getByRole('tab', { name: /^context$/i })).toBeVisible()
  await page.getByRole('tab', { name: /^context$/i }).click()
  await expect(page.getByRole('complementary', { name: /patient context/i })).toBeVisible()
  await expectNoHorizontalOverflow(page)

  expect(watcher.errors, 'console errors').toEqual([])
})

/**
 * `GP-17` guardrail 1 — §6.1: "It is not a clinical adviser. A clinical
 * question … is declined and routed to the capability that owns it under its
 * own gate. The assistant never answers it directly, at any confidence."
 *
 * ⚠️ This is the highest-consequence behaviour in the AI fabric. The bubble is
 * on every screen, is ungated, and its answers are not part of any clinical
 * record — so an assistant that helpfully answered a dosing question would be
 * the least supervised and most reachable clinical advice in the product.
 */
test('the assistant declines clinical questions and routes them', async ({ page }) => {
  const watcher = watchConsole(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await openAuthed(page, undefined, watcher)

  await page.getByRole('button', { name: /open assistant/i }).click()

  // A procedural question is answered, with citations.
  await page.getByLabel(/ask the assistant/i).fill('How do I correct a signed note?')
  await page.getByRole('button', { name: /^send$/i }).click()
  await expect(page.getByText(/a signed note is never edited/i)).toBeVisible()
  await expect(page.getByText(/CMP-NABH-10/)).toBeVisible()

  // A clinical one is refused outright and pointed at the owning screen.
  await page.getByLabel(/ask the assistant/i).fill('what dose of amoxicillin should I give')
  await page.getByRole('button', { name: /^send$/i }).click()
  await expect(page.getByText(/that is a clinical question/i)).toBeVisible()
  await expect(page.getByText(/dose-range check on the prescription screen/i)).toBeVisible()

  expect(watcher.errors, 'console errors').toEqual([])
})

/**
 * ⚠️ THE ONE THAT MATTERS MOST HERE. §4.8: with a capability off its
 * affordances are "hidden entirely, never greyed", and the screen stays fully
 * usable. A greyed control would still satisfy a naive "is it disabled" check,
 * so this asserts the controls do not EXIST — and that the record itself is
 * untouched.
 */
test('AI-OFF removes the AI affordances and leaves the record intact', async ({ page }) => {
  const watcher = watchConsole(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await openAuthed(page, undefined, watcher)

  await openChart(page)

  // On: both Z6 actions are present (§6443–6444).
  await expect(page.getByRole('button', { name: /catch me up/i })).toBeVisible()
  await expect(page.getByPlaceholder(/ask the record/i)).toBeVisible()

  await page.getByRole('button', { name: /ananya/i }).first().click()
  await page.getByRole('radio', { name: /^off/i }).click()
  await page.keyboard.press('Escape')

  // Off: gone, not greyed.
  await expect(page.getByRole('button', { name: /catch me up/i })).toHaveCount(0)
  await expect(page.getByPlaceholder(/ask the record/i)).toHaveCount(0)
  await expect(page.getByText(/ai assistance unavailable/i)).toBeVisible()
  // §6.1 guardrail 6 — the Z7b bubble goes too, entirely.
  await expect(page.getByRole('button', { name: /open assistant/i })).toHaveCount(0)

  // ⚠️ The record is untouched: the rail, the tabs and the escape hatch all
  // still work. This is the claim §4.8 makes and the reason the fabric is
  // allowed to exist at all.
  await expect(page.getByRole('complementary', { name: /patient context/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /view full record/i })).toBeEnabled()
  await page.getByRole('tab', { name: /^problems$/i }).click()
  await expect(page.getByRole('tab', { name: /^problems$/i })).toHaveAttribute(
    'aria-selected',
    'true',
  )

  expect(watcher.errors, 'console errors').toEqual([])
})
