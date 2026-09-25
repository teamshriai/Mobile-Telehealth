import { test, expect } from './fixtures'
import { openAuthed, watchConsole, navigateTo } from './helpers'

/**
 * The coherence walk.
 *
 * ⚠️ This is the test that would have caught the defect the whole Part 0 exists
 * to fix. The database had 30 notes, 14 prescriptions and 22 problems, none of
 * which referenced an encounter — every count healthy, the record incoherent.
 * Opening a visit showed a blank note.
 *
 * So this does not assert that screens render. It asserts that **the same
 * patient's work is still there at the next hop**: the chart lists visits, a
 * visit opens onto the note written at it, and that note carries real text.
 */
test('a visit opens onto the work that was done at it', async ({ page }) => {
  const watcher = watchConsole(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await openAuthed(page, undefined, watcher)

  await navigateTo(page, /patients/i, /\/clinician\/patients$/)
  await page.getByRole('tab', { name: /my panel/i }).click()

  // R. Lakshmanan is the anchor patient — 5 visits across 14 months.
  await page.getByRole('row', { name: /lakshmanan/i }).first().click()
  await page.waitForURL(/\/patient\/[^/]+\/chart/, { timeout: 20_000 })
  await expect(page.getByRole('heading', { name: /patient chart/i })).toBeVisible()

  // ── The chart must show a real history, not one row ──
  await page.getByRole('tab', { name: /documents/i }).click()
  const visitRows = page.getByRole('row')
  await expect
    .poll(async () => await visitRows.count(), { timeout: 20_000 })
    .toBeGreaterThan(3)
  await page.screenshot({ path: 'e2e/screenshots/coherence/01-visit-history.png', fullPage: true })

  // ── Notes tab links to the visit each note was written at ──
  await page.getByRole('tab', { name: /^notes$/i }).click()

  /**
   * ⚠️ Target a note with a NAMED SIGNER, not simply the first row.
   *
   * Two traps here, and both produce a false coherence failure:
   *  - Notes list newest-first, so a blank draft left by an earlier test in
   *    the run sits at the top.
   *  - Filtering on /signed/i does not disambiguate, because the "Signed by"
   *    column renders the literal text "Not signed" for a draft — so the
   *    filter matches the very row it was meant to exclude.
   *
   * Matching the signer's name is unambiguous: only a signed note has one.
   */
  // ⚠️ AND it must not be a draft. `/Dr\.\s/` matches the AUTHOR column too, so
  // a blank draft another spec left behind — every spec that opens a
  // consultation creates one — satisfies it and this test then fails claiming
  // the record is incoherent when it is merely reading the wrong row. The
  // signer column renders the literal "Not signed" for a draft, so excluding
  // that phrase targets what this test always meant: a signed note.
  const noteRow = page
    .getByRole('row')
    .filter({ hasText: /Dr\.\s/ })
    .filter({ hasNotText: /not signed/i })
    .first()
  await expect(noteRow).toBeVisible({ timeout: 20_000 })
  await noteRow.click()

  // ⚠️ The hop that used to 404: the route is keyed on visitId, and the note
  // row carried only the internal UUID.
  await page.waitForURL(/\/encounter\/[^/]+\/note/, { timeout: 20_000 })

  // ── And the note that opens is the one that was written, not a blank ──
  const subjective = page.getByLabel(/^subjective$/i)
  await expect(subjective).toBeVisible({ timeout: 20_000 })
  await expect(
    subjective,
    'opening a visit must show the note written at it, not an empty draft',
  ).not.toBeEmpty()
  await page.screenshot({ path: 'e2e/screenshots/coherence/02-note-has-content.png', fullPage: true })

  expect(watcher.errors, `console errors:\n${watcher.errors.join('\n')}`).toEqual([])
})
