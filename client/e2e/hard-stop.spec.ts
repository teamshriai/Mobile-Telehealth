import { test, expect } from './fixtures'
import { openAuthed, watchConsole } from './helpers'

/**
 * The deck's beat #8 — "the single most important frame".
 *
 * `SD-P-03` R. Lakshmanan has a documented penicillin allergy. Prescribing
 * co-amoxiclav to him must be **deterministically blocked**, and the block
 * must be a focus-trapped `role="alertdialog"` that cannot be escaped without
 * a disposition.
 *
 * ⚠️ What this test is really asserting is that none of this is AI. The rule
 * is a stored allergen-class row, evaluated server-side; every AI feature in
 * this product is off, and the stop fires anyway. If this test ever starts
 * depending on a model being reachable, the safety property has been lost.
 */

const LAKSHMANAN = 'SHRI-8FJERZ-F'

test('prescribing a beta-lactam to a penicillin-allergic patient is blocked', async ({ page }) => {
  const watcher = watchConsole(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await openAuthed(page, `/patient/${LAKSHMANAN}/chart`, watcher)

  // ── The chart, deep-linked in the first load ──
  await expect(page.getByRole('heading', { name: /patient chart/i })).toBeVisible({ timeout: 20_000 })

  // The allergy must be stated as TEXT, not carried by an icon or a colour.
  await expect(page.getByText(/penicillin/i).first()).toBeVisible()
  await page.screenshot({ path: 'e2e/screenshots/hard-stop/01-allergy-on-chart.png', fullPage: true })

  await page.getByRole('button', { name: /start consultation/i }).click()
  await page.waitForURL(/\/encounter\/[^/]+\/note/, { timeout: 25_000 })

  // ── Prescription writer, via the step rail rather than a reload ──
  await page.getByRole('link', { name: /^prescription$/i }).click()
  await expect(page.getByRole('heading', { name: /add a medicine/i })).toBeVisible({ timeout: 20_000 })

  // The documented allergen is on screen before anything is prescribed.
  await expect(page.getByText(/documented allergies/i)).toBeVisible()
  await page.screenshot({ path: 'e2e/screenshots/hard-stop/02-rx-empty.png', fullPage: true })

  // ── Prescribe co-amoxiclav ──
  await page.getByLabel(/^medicine$/i).fill('amoxi')
  await page.getByRole('option').first().waitFor({ timeout: 15_000 })
  await page.getByRole('option').first().click()
  await page.getByLabel(/^dose$/i).fill('1.2')
  await page.getByLabel(/^days$/i).fill('5')
  await page.getByRole('button', { name: /add to prescription/i }).click()

  // ── The gate ──
  const gate = page.getByRole('alertdialog')
  await expect(gate).toBeVisible({ timeout: 20_000 })
  await expect(gate.getByText(/prescribing blocked/i)).toBeVisible()
  await expect(gate.getByText(/penicillin/i).first()).toBeVisible()
  await page.screenshot({ path: 'e2e/screenshots/hard-stop/03-alertdialog.png', fullPage: true })

  // ⚠️ Escape must NOT dismiss it. A safety gate you can wave away is a gate
  // that gets waved away.
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
  await expect(gate, 'the hard-stop dialog must survive Escape').toBeVisible()

  // Three alternatives, per §6840.
  await expect(gate.getByRole('heading', { name: /alternatives/i })).toBeVisible()

  // The override path exists and demands a second consultant.
  await gate.getByRole('button', { name: /override with a second consultant/i }).click()
  await expect(gate.getByLabel(/clinical justification/i)).toBeVisible()
  await expect(gate.getByLabel(/second consultant.s email/i)).toBeVisible()
  await expect(gate.getByLabel(/their password/i)).toBeVisible()
  // Blocked until a reason, both credentials and the acknowledgement are given.
  await expect(gate.getByRole('button', { name: /record override and proceed/i })).toBeDisabled()
  await page.screenshot({ path: 'e2e/screenshots/hard-stop/04-override-form.png', fullPage: true })

  // ── Disposition: remove the item, the safe path ──
  await gate.getByRole('button', { name: /^back$/i }).click()
  await gate.getByRole('button', { name: /^remove /i }).click()
  await expect(page.getByRole('alertdialog')).toBeHidden({ timeout: 20_000 })

  // With the blocked item gone, signing is available again.
  await expect(page.getByText(/signing is blocked/i)).toBeHidden()
  await page.screenshot({ path: 'e2e/screenshots/hard-stop/05-resolved.png', fullPage: true })

  expect(watcher.errors, `console errors:\n${watcher.errors.join('\n')}`).toEqual([])
})
