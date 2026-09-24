import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'
import { statePath } from './authState'
import { openAuthed, watchConsole, navigateTo } from './helpers'

/**
 * `S-06-10` — creating a template actually works.
 *
 * ⚠️ WHY THIS EXISTS. Until 23-Sep-2026 template creation was **completely
 * broken**: the client's category `<select>` offered `Consultation | Order set
 * | Discharge | Procedure | Follow-up` while the server's zod enum accepted a
 * disjoint set, so every save 400'd and the screen showed the generic "Could
 * not save this template." A feature that never once worked shipped unnoticed,
 * because the suite covered the screen's *layout* and its permission degrade
 * and never pressed Save.
 *
 * The lesson is narrower than "add a test": a client list and a server enum
 * that must agree, kept in two files, will drift — so the assertion is that
 * every option the UI offers is one the server accepts, not just that one
 * happy-path value works.
 */

test.describe.configure({ mode: 'serial' })

let page: Page

// ⚠️ One page for both tests. A fresh context costs a `/auth/refresh`, and the
// limiter allows 60 per 15 minutes per IP — a budget the suite now sits close
// enough to that every avoidable load matters. See rx-atlas.spec.ts.
test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext({ storageState: statePath('doctor') })
  page = await context.newPage()
  await page.setViewportSize({ width: 1440, height: 1000 })
  await openAuthed(page)
  await navigateTo(page, /templates/i, /\/clinician\/templates$/)
})

test.afterAll(async () => {
  // Persist the rotated jar — this block owns its context, so it owns the duty
  // `fixtures.ts` otherwise performs per test.
  await page.context().storageState({ path: statePath('doctor') })
  await page.context().close()
})

test('every category the UI offers is one the server accepts', async () => {
  const watcher = watchConsole(page)
  await page.getByRole('button', { name: /new template/i }).click()

  const categorySelect = page.locator('#tpl-cat')
  await expect(categorySelect).toBeVisible({ timeout: 20_000 })
  const values = await categorySelect.locator('option').evaluateAll((os) =>
    os.map((o) => (o as HTMLOptionElement).value),
  )
  expect(values.length, 'the category select must offer something').toBeGreaterThan(0)

  // ⚠️ ONE KEY FOR ALL EIGHT PROBES, and a fixed one.
  //
  // The server upserts by key, so writing every category to the same key proves
  // each one is accepted while leaving exactly ONE row behind instead of eight
  // per run, growing forever. The demo template list is something a person
  // looks at; a suite that silts it up with its own debris every run is
  // degrading the fixture it depends on.
  const PROBE_KEY = 'E2E.CATEGORY.PROBE'

  for (const [i, value] of values.entries()) {
    if (i > 0) {
      // Re-open the row just written, so the upsert targets the same key.
      const probeRow = page.getByRole('row').filter({ hasText: /automated test probe/i }).first()
      await expect(probeRow).toBeVisible({ timeout: 20_000 })
      await probeRow.click()
      await expect(page.locator('#tpl-cat')).toBeVisible({ timeout: 20_000 })
    }
    await page.locator('#tpl-name').fill(`Automated test probe (category: ${value})`)
    // The key field is immutable once a template exists, so it is only filled
    // on the first pass — after that the editor is re-opened on the same row.
    if ((await page.locator('#tpl-key').inputValue()) === '') {
      await page.locator('#tpl-key').fill(PROBE_KEY)
    }
    await page.locator('#tpl-cat').selectOption(value)
    await page.locator('#tpl-body').fill(
      'Presenting complaint:\n\nExamination:\n\nImpression:\n\nPlan:',
    )
    await page
      .getByRole('button', { name: i === 0 ? /create template/i : /replace content/i })
      .click()

    // ⚠️ The real assertion: the editor CLOSES. A rejected save leaves the
    // modal open with an error banner, which is exactly what happened for
    // every category before the two lists were reconciled.
    await expect(
      page.locator('#tpl-cat'),
      `saving category "${value}" was refused — the client list and the server ` +
        'enum in template.routes.ts have drifted apart again',
    ).toHaveCount(0, { timeout: 20_000 })
  }

  expect(watcher.errors, 'console errors').toEqual([])
})

/**
 * ⚠️ The screen must not promise versioning it does not do.
 *
 * `ClinicalTemplate.key` is `@unique`, so two rows cannot share a key and the
 * server's save is an in-place `upsert.update`. The screen used to say "Saving
 * creates a new effective period rather than editing this one" — which would
 * lead a clinician to believe a note written last March is still explicable by
 * March's template. It is not; the old body is gone.
 */
test('the editor does not claim versioning the server does not do', async () => {
  const watcher = watchConsole(page)
  // ⚠️ Not `nth(1)` — the probe row written above may sit there. Pick a real
  // seeded template by its key prefix.
  const row = page
    .getByRole('row')
    .filter({ hasText: /TPL\./ })
    .filter({ hasNotText: /automated test probe/i })
    .first()
  await expect(row).toBeVisible({ timeout: 20_000 })
  await row.click()

  await expect(page.locator('#tpl-body')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText(/new effective period/i)).toHaveCount(0)
  await expect(page.getByText(/saving replaces this content/i)).toBeVisible()

  expect(watcher.errors, 'console errors').toEqual([])
})
