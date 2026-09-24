import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'
import { openAuthed, watchConsole, navigateTo } from './helpers'

/**
 * `S-06-04` Ambient Scribe — the T1 overlay, and the `G2` gate it creates.
 *
 * ⚠️ The properties asserted here are the ones that make a scribe safe rather
 * than impressive. A demo that only proves "it produces text" proves the easy
 * half; what matters is that the text cannot reach the record without a
 * decision, that the transcript behind it is inspectable, and that a pause is
 * visible rather than smoothed over.
 */

test.use({
  // The consent flow requests a real microphone, so the browser must be able to
  // grant one. Nothing is read from it — see AmbientScribe.tsx.
  permissions: ['microphone'],
})

async function openNoteForKrishnan(page: Page): Promise<void> {
  await navigateTo(page, /patients/i, /\/clinician\/patients$/)
  await page.getByRole('tab', { name: /my panel/i }).click()
  const row = page.getByRole('row').filter({ hasText: /krishnan/i }).first()
  await expect(row).toBeVisible({ timeout: 20_000 })
  await row.click()
  await page.waitForURL(/\/patient\/[^/]+\/chart/, { timeout: 20_000 })

  // A previous run may have left an open visit; the rail then offers "continue".
  const cont = page.getByRole('link', { name: /continue/i }).first()
  if ((await cont.count()) > 0 && (await cont.isVisible().catch(() => false))) {
    await cont.click()
  } else {
    await page.getByRole('button', { name: /start consultation/i }).click()
  }
  await page.waitForURL(/\/encounter\/[^/]+\/note/, { timeout: 25_000 })
  await expect(page.getByLabel(/^subjective$/i)).toBeVisible({ timeout: 20_000 })
}

test('recording cannot start before consent is recorded', async ({ page }) => {
  const watcher = watchConsole(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await openAuthed(page, undefined, watcher)
  await openNoteForKrishnan(page)

  await page.getByRole('button', { name: /^dictate$/i }).click()

  // ⚠️ CMP-DPDP-05. The control exists but is inert until consent is given —
  // and the screen says which action unblocks it.
  await expect(page.getByRole('button', { name: /start recording/i })).toBeDisabled()
  await expect(page.getByText(/record the patient.s consent before/i)).toBeVisible()

  // ⚠️ And it says plainly that nothing is being captured, before anything
  // starts. A simulation that only admits it in a footnote is not admitting it.
  await expect(page.getByText(/no audio is captured or sent/i)).toBeVisible()

  await page.getByRole('checkbox').first().check()
  await expect(page.getByRole('button', { name: /start recording/i })).toBeEnabled()

  expect(watcher.errors, 'console errors').toEqual([])
})

test('a pause is marked in the transcript rather than hidden', async ({ page }) => {
  const watcher = watchConsole(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await openAuthed(page, undefined, watcher)
  await openNoteForKrishnan(page)

  await page.getByRole('button', { name: /^dictate$/i }).click()
  await page.getByRole('checkbox').first().check()
  await page.getByRole('button', { name: /start recording/i }).click()

  // Stop & draft is gated until enough has been recorded (§6598, ≥10s).
  await expect(page.getByRole('button', { name: /stop & draft/i })).toBeDisabled()

  await page.getByRole('button', { name: /^pause$/i }).click()
  // ⚠️ The gap is in the transcript. A transcript that silently closes over a
  // pause is one nobody can rely on when it is questioned later.
  await expect(page.getByText(/recording paused/i)).toBeVisible()

  await page.getByRole('button', { name: /^resume$/i }).click()
  await expect(page.getByRole('button', { name: /stop & draft/i })).toBeEnabled({
    timeout: 20_000,
  })

  expect(watcher.errors, 'console errors').toEqual([])
})

test('a drafted section cannot reach the record without a disposition', async ({ page }) => {
  const watcher = watchConsole(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await openAuthed(page, undefined, watcher)
  await openNoteForKrishnan(page)

  await page.getByRole('button', { name: /^dictate$/i }).click()
  await page.getByRole('checkbox').first().check()
  await page.getByRole('button', { name: /start recording/i }).click()
  await expect(page.getByRole('button', { name: /stop & draft/i })).toBeEnabled({
    timeout: 20_000,
  })
  await page.getByRole('button', { name: /stop & draft/i }).click()

  // §4.5 wants one mid-confidence item visible so the band means something.
  await expect(page.getByText(/moderate confidence/i).first()).toBeVisible()

  // ⚠️ AI-101's mandatory explainability: the transcript span behind the text.
  await page.getByRole('button', { name: /show what this came from/i }).first().click()
  await expect(page.getByText(/thale suttidange|coffee kudidmele|Namaskara/i).first()).toBeVisible()

  await page.getByRole('button', { name: /put \d+ sections into the note/i }).click()

  // ⚠️ THE G2 RULE. The drafts are on screen as ghost text, but the note is
  // still empty and Sign is unavailable until each one is accepted or rejected.
  await expect(page.getByLabel(/^assessment$/i)).toHaveValue('')
  const sign = page.getByRole('button', { name: /sign note|submit for co-signature/i })
  await expect(sign).toBeDisabled()
  await expect(page.getByText(/accept or reject the drafted/i)).toBeVisible()

  // Accepting writes it; rejecting discards it. Both are dispositions.
  await page.getByRole('button', { name: /^accept$/i }).first().click()
  await expect(page.getByLabel(/^subjective$/i)).not.toHaveValue('')

  expect(watcher.errors, 'console errors').toEqual([])
})

/**
 * ⚠️ §4.8 again, on the newest surface. A T1 AI screen is exactly where an
 * affordance is most likely to be left greyed "so people know it exists".
 */
test('AI-OFF removes Dictate entirely and the note still works', async ({ page }) => {
  const watcher = watchConsole(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await openAuthed(page, undefined, watcher)

  await page.getByRole('button', { name: /ananya/i }).first().click()
  await page.getByRole('radio', { name: /^off/i }).click()
  await page.keyboard.press('Escape')

  await openNoteForKrishnan(page)

  await expect(page.getByRole('button', { name: /^dictate$/i })).toHaveCount(0)
  // The note is unchanged: typing is never the fallback path, it is the path.
  await page.getByLabel(/^assessment$/i).fill('Hypothyroidism, stable on current dose.')
  await expect(page.getByLabel(/^assessment$/i)).toHaveValue(/hypothyroidism/i)
  await expect(page.getByRole('button', { name: /save draft/i })).toBeEnabled()

  expect(watcher.errors, 'console errors').toEqual([])
})
