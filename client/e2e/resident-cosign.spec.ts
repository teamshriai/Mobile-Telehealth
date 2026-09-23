import { test, expect } from '@playwright/test'
import { RESIDENT, DOCTOR, login, watchConsole, navigateTo } from './helpers'

/**
 * Rule 3, made visible: **authorization reads capabilities, never role names.**
 *
 * Dr Kavitha Rao is a Resident, which in this system means exactly one thing —
 * a user without `note:sign:own`. Nothing anywhere branches on the string
 * "Resident". The observable consequence is that her primary action on a note
 * says "Submit for co-signature" rather than "Sign note", and the note she
 * submits lands in a consultant's queue instead of the record.
 *
 * ⚠️ This is the assertion that would catch someone "simplifying" a capability
 * check into a role check. The UI would look identical right up until a role
 * was renamed or a consultant was given a trainee's account.
 */

test('a clinician without note:sign:own submits for co-signature instead of signing', async ({
  page,
}) => {
  const watcher = watchConsole(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await login(page, RESIDENT, watcher)

  // A resident lands in the clinician portal, not the patient portal.
  await expect(page).toHaveURL(/\/clinician/)

  // ⚠️ GP-02: the co-sign queue is a door a Resident cannot open, so it is
  // absent — not a nav item that 403s, and not a tile reading "0 pending",
  // which would state as fact that nothing is awaiting counter-signature.
  await expect(page.getByRole('link', { name: /co-sign/i })).toHaveCount(0)
  await expect(page.getByText(/awaiting co-sign/i)).toHaveCount(0)
  await page.screenshot({ path: 'e2e/screenshots/resident/01-my-day.png', fullPage: true })

  await navigateTo(page, /patients/i, /\/clinician\/patients$/)

  const firstRow = page.getByRole('row').nth(1)
  await expect(firstRow).toBeVisible({ timeout: 20_000 })
  await firstRow.click()
  await page.waitForURL(/\/patient\/[^/]+\/chart/, { timeout: 20_000 })

  await page.getByRole('button', { name: /start consultation/i }).click()
  await page.waitForURL(/\/encounter\/[^/]+\/note/, { timeout: 25_000 })
  await expect(page.getByLabel(/^subjective$/i)).toBeVisible({ timeout: 20_000 })

  // The capability difference, on screen.
  await expect(page.getByRole('button', { name: /submit for co-signature/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /^sign note$/i })).toHaveCount(0)
  await expect(page.getByText(/do not hold signing rights/i)).toBeVisible()
  await page.screenshot({ path: 'e2e/screenshots/resident/02-submit-not-sign.png', fullPage: true })

  expect(watcher.errors, `console errors:\n${watcher.errors.join('\n')}`).toEqual([])
})

test('a consultant holding note:cosign:assigned sees the approve controls', async ({ page }) => {
  const watcher = watchConsole(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await login(page, DOCTOR, watcher)

  await navigateTo(page, /co-sign/i, /\/clinician\/cosign$/)

  // The seed leaves one resident-authored note awaiting counter-signature.
  const firstNote = page.getByRole('button', { name: /lakshmanan|krishnan|reddy|mathew/i }).first()
  await expect(firstNote).toBeVisible({ timeout: 20_000 })

  // ⚠️ No approve control exists until the note has been opened and read.
  await expect(page.getByRole('button', { name: /^counter-sign$/i })).toHaveCount(0)

  await firstNote.click()
  await expect(page.getByRole('button', { name: /^counter-sign$/i })).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByRole('button', { name: /return to author/i })).toBeVisible()
  await page.screenshot({ path: 'e2e/screenshots/resident/03-cosign-detail.png', fullPage: true })

  expect(watcher.errors, `console errors:\n${watcher.errors.join('\n')}`).toEqual([])
})
