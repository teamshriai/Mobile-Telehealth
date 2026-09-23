import { test, expect } from '@playwright/test'
import { DOCTOR, login, watchConsole, expectNoHorizontalOverflow, navigateTo } from './helpers'

/**
 * The W-06-1 spine, walked end to end at the ward-tablet breakpoint (1024 —
 * §5.1's "the breakpoint that matters most").
 *
 * My Day → patient chart → timeline → consultation → note → problems →
 * prescription → instructions.
 *
 * ⚠️ Navigation is by CLICKING, not by `page.goto`, past the first load. That
 * is what a clinician does, it exercises the step rail, and it avoids spending
 * a `/auth/refresh` on every hop — see clinician-sweep.spec.ts for the failure
 * mode that taught us this.
 */

test('W-06-1 spine is walkable', async ({ page }) => {
  const watcher = watchConsole(page)
  await page.setViewportSize({ width: 1024, height: 768 })
  await login(page, DOCTOR, watcher)

  // ── My Day ──
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.screenshot({ path: 'e2e/screenshots/spine/01-my-day.png', fullPage: true })

  // ── Find a patient ──
  await navigateTo(page, /patients/i, /\/clinician\/patients$/)
  await page.getByRole('tab', { name: /my panel/i }).click()
  const firstRow = page.getByRole('row').nth(1)
  await expect(firstRow).toBeVisible({ timeout: 20_000 })
  await firstRow.click()

  // ── Chart ──
  await page.waitForURL(/\/patient\/[^/]+\/chart/, { timeout: 20_000 })
  await expect(page.getByRole('heading', { name: /patient chart/i })).toBeVisible()
  // The Z3 banner is the wrong-patient control. Its absence is a failure.
  await expect(page.getByTestId('patient-banner')).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: 'e2e/screenshots/spine/02-chart.png', fullPage: true })

  // Tabs
  for (const name of [/problems/i, /medications/i, /results/i, /notes/i, /documents/i]) {
    await page.getByRole('tab', { name }).click()
    await page.waitForTimeout(300)
  }
  await page.screenshot({ path: 'e2e/screenshots/spine/03-chart-tabs.png', fullPage: true })

  // ── Timeline, via ARC-02's standing escape to the unsummarised record ──
  await page.getByRole('tab', { name: /summary/i }).click()
  await page.getByRole('link', { name: /open full timeline/i }).click()
  await expect(page.getByRole('heading', { name: /clinical timeline/i })).toBeVisible({
    timeout: 20_000,
  })
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: 'e2e/screenshots/spine/04-timeline.png', fullPage: true })

  // ── Start a consultation ──
  await page.getByRole('link', { name: /back to chart/i }).click()
  await expect(page.getByRole('heading', { name: /patient chart/i })).toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: /start consultation/i }).click()
  await page.waitForURL(/\/encounter\/[^/]+\/note/, { timeout: 25_000 })
  await expect(page.getByLabel(/^subjective$/i)).toBeVisible({ timeout: 20_000 })
  await page.screenshot({ path: 'e2e/screenshots/spine/05-note.png', fullPage: true })

  // ── Templates are usable from the note, not just manageable ──
  await page.getByRole('button', { name: /insert template/i }).click()
  await expect(page.getByRole('heading', { name: /insert a template/i })).toBeVisible({
    timeout: 20_000,
  })
  await page.getByRole('button', { name: /normal cardiorespiratory examination/i }).first().click()
  // ⚠️ Appended into the chosen section, not dropped over the whole note.
  await expect(page.getByLabel(/^plan$/i)).not.toBeEmpty()
  await page.screenshot({ path: 'e2e/screenshots/spine/05b-template-inserted.png', fullPage: true })

  // ── Write and save ──
  await page.getByLabel(/^subjective$/i).fill('Synthetic test entry — reports feeling better.')
  await page.getByLabel(/^assessment$/i).fill('Synthetic test entry — improving.')
  await page.getByRole('button', { name: /save draft/i }).click()
  await expect(page.getByText(/saved \d{2}-/i).first()).toBeVisible({ timeout: 20_000 })
  await page.screenshot({ path: 'e2e/screenshots/spine/06-note-saved.png', fullPage: true })

  // ── Problems, via the W-06-1 step rail ──
  await page.getByRole('link', { name: /problems & coding/i }).click()
  await expect(page.getByRole('heading', { name: /add a problem/i })).toBeVisible({
    timeout: 20_000,
  })
  await page.getByLabel(/icd-10 code or diagnosis/i).fill('pneu')
  await page.waitForTimeout(1200)
  await page.screenshot({ path: 'e2e/screenshots/spine/07-problems.png', fullPage: true })

  // ── Prescription ──
  // ⚠️ The step NUMBER in the rail is aria-hidden — it is decoration, and a
  // screen reader should hear "Prescription", not "3 Prescription". So the
  // accessible name is the label alone, which is what this matches.
  await page.getByRole('link', { name: /^prescription$/i }).click()
  await expect(page.getByRole('heading', { name: /add a medicine/i })).toBeVisible({ timeout: 20_000 })
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: 'e2e/screenshots/spine/08-rx.png', fullPage: true })

  // ── Instructions ──
  await page.getByRole('link', { name: /^instructions$/i }).click()
  await expect(page.getByRole('heading', { name: /write instructions/i })).toBeVisible({
    timeout: 20_000,
  })
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: 'e2e/screenshots/spine/09-instructions.png', fullPage: true })

  expect(watcher.errors, `console errors:\n${watcher.errors.join('\n')}`).toEqual([])
})
