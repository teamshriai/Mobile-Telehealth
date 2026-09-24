import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'
import { statePath } from './authState'
import { openAuthed, watchConsole, navigateTo, expectNoHorizontalOverflow } from './helpers'

/**
 * `S-06-07` Prescription Writer — the Atlas rows that were specified and not
 * built: the 1024–1279 basket drawer, the keyboard contract, and the capability
 * split around overriding a hard stop.
 *
 * ⚠️ Nothing here touches the hard stop's behaviour, which `hard-stop.spec.ts`
 * owns. What this file asserts is that the surface AROUND it stays honest at
 * the widths and with the permissions a real prescriber has.
 *
 * ⚠️ ONE PAGE, SHARED, FOR THE WHOLE CONSULTANT BLOCK — for two reasons, and
 * both were learned the hard way.
 *
 *  1. **Refresh budget.** Every fresh context costs one `/auth/refresh`, and
 *     the limiter allows 60 per 15 minutes per IP. Four tests opening four
 *     contexts pushed the suite over that ceiling, and the tail bounced to
 *     /login — which looks like a catastrophically broken application and is
 *     nothing of the kind. The ceiling is not the thing to change.
 *  2. **Demo-data pollution.** Each context started its own consultation for
 *     `SD-P-03`. An encounter that holds a prescription item but no note text
 *     is "content" to `reset-demo-encounters`, so it survives cleanup forever
 *     — and `coherence.spec.ts`, which opens the newest note carrying a
 *     clinician's name, then landed on one of those blank notes and failed.
 *     A test that quietly degrades the fixture every run is worse than no test.
 *
 * ⚠️ AND EVERY ITEM ADDED HERE IS REMOVED AGAIN. For the hard stop that is not
 * just hygiene: `AIP-09` says the dialog cannot be dismissed without a
 * disposition, so removing the blocked drug IS the specified behaviour, not
 * cleanup bolted on afterwards.
 */

/** `SD-P-03` R. Lakshmanan — the penicillin hard-stop patient (§8.2). */
async function openRxForLakshmanan(page: Page): Promise<void> {
  await navigateTo(page, /patients/i, /\/clinician\/patients$/)
  await page.getByRole('tab', { name: /my panel/i }).click()
  const row = page.getByRole('row').filter({ hasText: /lakshmanan/i }).first()
  await expect(row).toBeVisible({ timeout: 20_000 })
  await row.click()
  await page.waitForURL(/\/patient\/[^/]+\/chart/, { timeout: 20_000 })

  const cont = page.getByRole('link', { name: /continue/i }).first()
  if ((await cont.count()) > 0 && (await cont.isVisible().catch(() => false))) {
    await cont.click()
  } else {
    await page.getByRole('button', { name: /start consultation/i }).click()
  }
  await page.waitForURL(/\/encounter\/[^/]+\/note/, { timeout: 25_000 })

  // ⚠️ CLICK the step rail, never `page.goto`. A full reload spends one of the
  // 60 `/auth/refresh` calls the limiter allows per 15 minutes per IP.
  await page.getByRole('link', { name: /prescription/i }).click()
  await page.waitForURL(/\/rx$/, { timeout: 20_000 })
  await expect(page.getByRole('heading', { name: /add a medicine/i })).toBeVisible({
    timeout: 20_000,
  })
}

const basketTrigger = (page: Page) => page.getByRole('button', { name: /^Prescription —/ })

/** Type a generic name into the formulary search and take the first match. */
async function pickDrug(page: Page, query: string): Promise<void> {
  await page.keyboard.press('/')
  await expect(page.getByRole('combobox', { name: /medicine/i })).toBeFocused()
  await page.keyboard.type(query)
  await expect(page.getByRole('option').first()).toBeVisible({ timeout: 20_000 })
  await page.getByRole('option').first().click()
}

test.describe('as the consultant', () => {
  test.describe.configure({ mode: 'serial' })

  let page: Page

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: statePath('doctor') })
    page = await context.newPage()
    await page.setViewportSize({ width: 1440, height: 1000 })
    await openAuthed(page)
    await openRxForLakshmanan(page)
  })

  test.afterAll(async () => {
    // ⚠️ Persist the ROTATED jar, exactly as `fixtures.ts` does per test. This
    // block manages its own context, so it also owns that duty: the token in
    // the file was revoked the moment this page first loaded, and leaving the
    // stale one on disk would make the next spec replay a revoked token — which
    // the server correctly reads as a captured credential, revoking the whole
    // family and writing a Critical audit row nobody caused.
    await page.context().storageState({ path: statePath('doctor') })
    await page.context().close()
  })

  /**
   * ⚠️ §5.1 calls 1024–1279 "the breakpoint that matters most" — a
   * workstation-on-wheels at the bedside. Before this the band rendered
   * byte-identically to a 375px phone: the basket sat below the fold while the
   * prescriber typed into search, so what had already been added was out of
   * sight on the screen whose job is to prevent a duplicate.
   */
  test('the basket is a drawer only in the 1024-1279 band', async () => {
    // ≥1280: two panes, both in flow, no drawer.
    await page.setViewportSize({ width: 1440, height: 1000 })
    await expect(basketTrigger(page)).toHaveCount(0)
    await expect(page.getByRole('heading', { name: /^prescription/i })).toBeVisible()

    // 1024–1279: the drawer, with the count on the trigger.
    await page.setViewportSize({ width: 1024, height: 900 })
    await expect(basketTrigger(page)).toBeVisible()
    await expectNoHorizontalOverflow(page)

    // ⚠️ And exactly ONE basket exists. Rendering both branches and hiding one
    // with CSS would leave two copies in the accessibility tree, each item
    // carrying two Remove buttons with the same accessible name.
    await expect(page.getByRole('dialog', { name: /prescription basket/i })).toHaveCount(0)
    await basketTrigger(page).click()
    await expect(page.getByRole('dialog', { name: /prescription basket/i })).toBeVisible()

    // A convenience surface, so Escape closes it. (The hard-stop dialog, which
    // is not a convenience surface, deliberately does not — see below.)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: /prescription basket/i })).toHaveCount(0)

    // <1024: sequential again, no drawer.
    await page.setViewportSize({ width: 768, height: 1000 })
    await expect(basketTrigger(page)).toHaveCount(0)
    await expectNoHorizontalOverflow(page)

    await page.setViewportSize({ width: 1440, height: 1000 })
  })

  /**
   * §6836: "`/` focuses search · `Enter` adds to basket · basket is never
   * submitted by `Enter`." The third clause is the one that matters — adding is
   * reversible and signing is not, so no keystroke may sign.
   */
  test('/ focuses search, Enter adds, and no keystroke signs', async () => {
    const watcher = watchConsole(page)

    // Atorvastatin is on the §8.5 list and is NOT a beta-lactam, so this path
    // exercises adding without involving the allergy rule at all.
    await pickDrug(page, 'atorva')
    // Selecting fills the field with the chosen drug — the proof that Enter and
    // the click select rather than submit.
    await expect(page.getByRole('combobox', { name: /medicine/i })).toHaveValue(/atorvastatin/i)

    await page.locator('#dose').fill('40')
    const basketItem = page.getByRole('listitem').filter({ hasText: /atorvastatin/i })
    await expect(basketItem).toHaveCount(0)

    await page.locator('#dose').press('Enter') // ⚠️ THIS adds
    await expect(basketItem).toHaveCount(1, { timeout: 20_000 })

    // ⚠️ THE LOAD-BEARING ASSERTION. Enter added an item; it must not have
    // signed, and no keystroke may have opened the confirm dialog either.
    await expect(page.getByRole('button', { name: /sign prescription/i })).toBeVisible()
    await expect(page.getByText(/signed by/i)).toHaveCount(0)
    await expect(page.getByRole('dialog')).toHaveCount(0)

    // Put the fixture back as we found it — see the file header.
    await basketItem.getByRole('button', { name: /remove atorvastatin/i }).click()
    await expect(basketItem).toHaveCount(0, { timeout: 20_000 })

    expect(watcher.errors, 'console errors').toEqual([])
  })

  /**
   * ⚠️ REGRESSION GUARD, and it is worth the awkwardness of asserting a computed
   * style. `HardStopDialog`'s panel carried `bg-surface-0` while `index.css`
   * defines only `surface-1` and `surface-2`, so Tailwind emitted no rule and
   * the panel had NO background: the one dialog in the product whose entire
   * purpose is to be impossible to miss was rendering see-through, with the
   * page text it was blocking readable straight through it. Nothing in the
   * suite caught it, because every behavioural assertion still passed.
   */
  test('the hard-stop dialog is opaque, and Escape cannot dismiss it', async () => {
    const watcher = watchConsole(page)

    await pickDrug(page, 'amoxi')
    await page.locator('#dose').fill('1.2')
    await page.locator('#dose').press('Enter')

    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toBeVisible({ timeout: 25_000 })

    const bg = await dialog.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg, 'the hard-stop panel must have a background colour').not.toBe('rgba(0, 0, 0, 0)')
    expect(bg, 'the hard-stop panel must be fully opaque').not.toMatch(/,\s*0(\.\d+)?\s*\)$/)

    // AIP-09: no disposition, no dismissal.
    await page.keyboard.press('Escape')
    await expect(dialog).toBeVisible()

    // Removing the blocked drug IS the specified disposition — and it leaves
    // the fixture clean.
    await dialog.getByRole('button', { name: /^remove /i }).click()
    await expect(dialog).toHaveCount(0, { timeout: 20_000 })

    expect(watcher.errors, 'console errors').toEqual([])
  })
})

/**
 * `rx:override:hard-stop` is a separate capability from prescribing and is
 * withheld from residents (`permissions.ts` RESIDENT_WITHHELD).
 *
 * ⚠️ The override path used to be offered to everyone, so a resident learned
 * they could not take it only AFTER fetching a second consultant, who then
 * typed their password into a form that 403s. That teaches people the safety
 * control is flaky rather than deliberate — expensive the next time it fires
 * for a real reason.
 */
test.describe('as the resident', () => {
  test.use({ demoUser: 'resident' })

  test('a clinician without override rights is told who holds them', async ({ page }) => {
    const watcher = watchConsole(page)
    await page.setViewportSize({ width: 1440, height: 1000 })
    await openAuthed(page, undefined, watcher)
    await openRxForLakshmanan(page)

    await pickDrug(page, 'amoxi')
    await page.locator('#dose').fill('1.2')
    await page.locator('#dose').press('Enter')

    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toBeVisible({ timeout: 25_000 })

    // Hidden, not greyed (§4.8) — and the reason is stated.
    await expect(
      dialog.getByRole('button', { name: /override with a second consultant/i }),
    ).toHaveCount(0)
    await expect(dialog.getByText(/do not hold override rights/i)).toBeVisible()

    // The safe disposition is still available: the dialog is never a dead end.
    // Taking it also leaves the fixture clean.
    await dialog.getByRole('button', { name: /^remove /i }).click()
    await expect(dialog).toHaveCount(0, { timeout: 20_000 })

    expect(watcher.errors, 'console errors').toEqual([])
  })
})
