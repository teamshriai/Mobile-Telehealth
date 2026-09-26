import { request as apiRequest, type Page } from '@playwright/test'
import { test, expect } from './fixtures'
import { API_ORIGIN } from './apiOrigin'
import { statePath, passwordFor, DEMO_USERS, type DemoUser } from './authState'
import { openAuthed, watchConsole, expectNoHorizontalOverflow, PITCH_PASSWORD } from './helpers'

/**
 * The Medicines section — prescribed (signed, read-only) beside taken (the
 * patient's own log), refills routed through the hospital administrator, the
 * AI summary as an optional extra, and a printable list.
 *
 * ⚠️ NUMBERS ARE CHECKED AGAINST THE API, NOT HARD-CODED. Supply left and the
 * 30-day figures move every day; comparing the screen with the server's own
 * answer proves the page shows what the record says, whatever the date.
 *
 * ⚠️ Refill requests made here carry the "[e2e]" marker, and global setup and
 * teardown remove them (db:demo:reset-refills) — one open request per
 * medicine is all the database allows, and the demo account should not be
 * left showing a request nobody made.
 *
 * ⚠️ One page load per test where possible (the /auth/refresh budget):
 * widths by resizing, and a fresh read of the page by navigating away and
 * back inside the app rather than reloading.
 */

test.use({ demoUser: 'patient' })

const MARK = '[e2e]'

interface Overview {
  summary: { currentCount: number; doctors: string[]; allergies: string | null; adherence30: { percent: number | null } }
  current: Array<{ name: string; supplyDaysLeft: number | null; prescriber: { name: string | null } }>
  selfReported: string | null
}

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** What the "Current medicines" tile says under its number. */
const doctorsLine = (doctors: string[]): string =>
  doctors.length === 1 ? `Prescribed by ${doctors[0]}` : `From ${doctors.length} doctors`

/** The server's own answer, over a bearer token — no page load, no refresh spent. */
async function overviewFor(user: DemoUser): Promise<Overview> {
  const ctx = await apiRequest.newContext({ baseURL: API_ORIGIN })
  try {
    const login = await ctx.post('/api/v1/auth/login', { data: { email: DEMO_USERS[user], password: passwordFor(user) } })
    expect(login.status()).toBe(200)
    const token = ((await login.json()) as { data: { token: string } }).data.token
    const res = await ctx.get('/api/v1/me/medications', { headers: { Authorization: `Bearer ${token}` } })
    expect(res.status()).toBe(200)
    return ((await res.json()) as { data: Overview }).data
  } finally {
    await ctx.dispose()
  }
}

/** Re-read the page from the server without a reload: out to Home and back. */
async function remount(page: Page): Promise<void> {
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Home' }).click()
  await page.getByRole('heading', { level: 1 }).first().waitFor()
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Medicines' }).click()
  await page.getByTestId('medicine-card').first().waitFor()
}

function card(page: Page, name: string) {
  return page.getByTestId('medicine-card').filter({ has: page.getByRole('heading', { name: new RegExp(`^${name}\\b`) }) })
}

test('SD-P-01: the summary matches the record, and every figure says where it comes from', async ({ page }) => {
  const api = await overviewFor('patient')
  const watcher = watchConsole(page)
  await openAuthed(page, '/app/medicines', watcher)

  const glance = page.getByRole('region', { name: 'Your medicines at a glance' })
  await expect(glance).toContainText(new RegExp(`Current medicines\\s*${api.summary.currentCount}`))
  await expect(glance).toContainText(doctorsLine(api.summary.doctors))
  if (api.summary.adherence30.percent !== null) {
    await expect(glance).toContainText(`${api.summary.adherence30.percent}%`)
    await expect(glance).toContainText('as you logged them')
  }

  const levo = card(page, 'Levothyroxine')
  await expect(levo).toHaveCount(1)
  await expect(levo).toContainText('Prescribed by Dr. Ananya Iyer · General Medicine')
  await expect(levo).toContainText('For Hypothyroidism')
  await expect(levo).toContainText('Once a day (OD)')
  await expect(levo).toContainText('By mouth')
  await expect(levo).toContainText(/empty stomach/i)
  await expect(levo.getByTestId('supply')).toContainText(/days? left|Last day/)
  // The patient's own taps are marked as theirs, never as the record.
  await expect(levo.getByTestId('adherence-line')).toContainText('You logged')

  // Earlier courses — including the ones a renewal replaced — are history.
  await page.getByRole('button', { name: /Past medicines/ }).click()
  await expect(page.locator('#meds-past-list')).toContainText('Levothyroxine')

  // Prescribing stays with clinicians: a refill can be ASKED for; nothing
  // offers to change or stop a medicine.
  await expect(page.getByRole('button', { name: /change dose|stop/i })).toHaveCount(0)

  for (const w of [1440, 1280, 1024, 768, 390, 375, 320]) {
    await page.setViewportSize({ width: w, height: 900 })
    await expectNoHorizontalOverflow(page)
  }
  expect(watcher.errors, 'console errors').toEqual([])
})

test('Today: mark a dose taken, the counts follow, and Undo puts it back', async ({ page }) => {
  const watcher = watchConsole(page)
  await openAuthed(page, '/app/medicines', watcher)
  const today = page.locator('#today')
  const row = today.getByTestId('dose-row').first()
  await expect(row).toBeVisible()

  // Debris from an interrupted run: start from an unmarked dose.
  const leftover = row.getByRole('button', { name: /^Undo/ })
  if (await leftover.isVisible()) {
    await leftover.click()
    await expect(row.getByRole('button', { name: /^Mark taken/ })).toBeVisible()
  }
  const taken = row.getByRole('button', { name: /^Mark taken/ })
  test.skip(!(await taken.isVisible()), 'No dose can be marked at this hour — the first is more than an hour away.')

  const counter = today.getByText(/^\d+ of \d+ taken$/)
  const [before, total] = ((await counter.textContent()) ?? '').match(/\d+/g)!.map(Number)

  await taken.click()
  await expect(row).toHaveAttribute('data-state', 'taken')
  await expect(counter).toHaveText(`${before + 1} of ${total} taken`)
  await expect(page.getByRole('region', { name: 'Your medicines at a glance' })).toContainText(`${before + 1} of ${total} taken`)

  await row.getByRole('button', { name: /^Undo/ }).click()
  await expect(row).not.toHaveAttribute('data-state', 'taken')
  await expect(counter).toHaveText(`${before} of ${total} taken`)
  expect(watcher.errors, 'console errors').toEqual([])
})

test('Refill: ask, withdraw, ask again — the hospital sends it to the prescriber and the patient sees who has it', async ({ page, browser }) => {
  const watcher = watchConsole(page)
  await openAuthed(page, '/app/medicines', watcher)
  const levo = card(page, 'Levothyroxine')

  const ask = async (): Promise<void> => {
    await levo.getByRole('button', { name: 'Request refill' }).click()
    const dialog = page.getByRole('dialog', { name: 'Request a refill' })
    await dialog.getByLabel(/Anything to add/).fill(`${MARK} Four tablets left.`)
    await dialog.getByRole('button', { name: 'Send request' }).click()
    await expect(dialog).toBeHidden()
    await expect(levo).toContainText('Refill requested · waiting for the hospital')
  }

  await ask()
  // Withdrawable while the hospital has not acted on it.
  await levo.getByRole('button', { name: 'Withdraw' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Withdraw request' }).click()
  await expect(levo.getByRole('button', { name: 'Request refill' })).toBeVisible()
  await ask()

  // The hospital administrator, in their own session.
  const adminCtx = await browser.newContext({ storageState: statePath('hadmin') })
  try {
    const admin = await adminCtx.newPage()
    await admin.goto('/hospital-admin/refills')
    await admin.getByRole('heading', { name: 'Refill requests' }).waitFor()
    const row = admin.getByTestId('refill-row').filter({ hasText: 'Meera Krishnan' }).filter({ hasText: 'Levothyroxine' })
    await expect(row).toHaveCount(1)
    await expect(row).toContainText('Four tablets left.')
    // The default is the doctor who prescribed it.
    await expect(row.getByRole('combobox')).toContainText('Dr. Ananya Iyer (prescribed it)')
    await row.getByRole('button', { name: 'Send to doctor' }).click()
    // The confirmation banner ("Sent to …: <medicine> for <patient>").
    await expect(admin.getByText(/^Sent to Dr\. Ananya Iyer: /)).toBeVisible()
  } finally {
    // The admin's token rotated: keep the live one for the next run.
    await adminCtx.storageState({ path: statePath('hadmin') })
    await adminCtx.close()
  }

  await remount(page)
  await expect(card(page, 'Levothyroxine')).toContainText('Refill request sent to Dr. Ananya Iyer')
  // Once a doctor has it, the patient can no longer withdraw it.
  await expect(card(page, 'Levothyroxine').getByRole('button', { name: 'Withdraw' })).toHaveCount(0)
  expect(watcher.errors, 'console errors').toEqual([])
})

test('AI summary: when AI is off one quiet line replaces it; when on, it is written from the prescriptions', async ({ page }) => {
  const watcher = watchConsole(page)
  // AI off: the server's own "off" answer, stubbed.
  await page.route('**/api/v1/me/medications/summary', async (route) => {
    const data =
      route.request().method() === 'GET'
        ? { state: 'none' }
        : { state: 'off', message: 'AI summaries are not available on this server. Your medicine list above is complete without it.' }
    await route.fulfill({ json: { success: true, message: 'Summary.', data, timestamp: new Date().toISOString() } })
  })
  await openAuthed(page, '/app/medicines', watcher)
  await page.getByRole('button', { name: 'Explain my medicines' }).click()
  await expect(page.getByTestId('ai-summary-quiet')).toContainText('not available')
  await expect(page.getByTestId('ai-summary')).toHaveCount(0)
  await expect(card(page, 'Levothyroxine')).toBeVisible()

  // AI on: the real path, once (cached after the first run).
  await page.unroute('**/api/v1/me/medications/summary')
  await remount(page)
  const summary = page.getByTestId('ai-summary')
  // The card renders only once it knows whether a summary is stored.
  await expect(summary).toBeVisible()
  const explain = summary.getByRole('button', { name: 'Explain my medicines' })
  if (await explain.isVisible()) await explain.click()
  await expect(summary).toContainText('Levothyroxine', { timeout: 30_000 })
  await expect(summary).toContainText('Written by AI from your signed prescriptions')
  expect(watcher.errors, 'console errors').toEqual([])
})

test('Print: one clean sheet — the list, attributed, and nothing of the screen chrome', async ({ page }) => {
  const watcher = watchConsole(page)
  await openAuthed(page, '/app/medicines', watcher)
  await page.evaluate(() => { (window as unknown as { __printed: boolean }).__printed = false; window.print = () => { (window as unknown as { __printed: boolean }).__printed = true } })
  await page.getByRole('button', { name: 'Print list' }).click()
  expect(await page.evaluate(() => (window as unknown as { __printed: boolean }).__printed)).toBe(true)

  await page.emulateMedia({ media: 'print' })
  const sheet = page.locator('[data-print-root]')
  await expect(sheet).toBeVisible()
  await expect(sheet).toContainText('Current medicines')
  await expect(sheet).toContainText('Levothyroxine')
  await expect(sheet).toContainText('Dr. Ananya Iyer')
  await expect(page.getByRole('group', { name: 'Quick actions' })).toBeHidden()
  await page.emulateMedia({ media: null })
  expect(watcher.errors, 'console errors').toEqual([])
})

test.describe('the pitch account', () => {
  test.skip(PITCH_PASSWORD === '', 'DEMO_PATIENT_PASSWORD is not set here.')
  test.use({ demoUser: 'meenakshi' })

  test('Meenakshi: her doctor, the allergy she reported, and supply as the record says', async ({ page }) => {
    const api = await overviewFor('meenakshi')
    const watcher = watchConsole(page)
    await openAuthed(page, '/app/medicines', watcher)

    const glance = page.getByRole('region', { name: 'Your medicines at a glance' })
    await expect(glance).toContainText(new RegExp(`Current medicines\\s*${api.summary.currentCount}`))
    await expect(glance).toContainText(doctorsLine(api.summary.doctors))
    if (api.summary.allergies !== null) {
      await expect(glance).toContainText(new RegExp(`Allergies you told us about:\\s*${escape(api.summary.allergies)}`))
    }

    await expect(page.getByTestId('medicine-card')).toHaveCount(api.current.length)
    for (const m of api.current) {
      const c = card(page, m.name)
      await expect(c).toContainText(`Prescribed by ${m.prescriber.name}`)
      if (m.supplyDaysLeft !== null) {
        const words = m.supplyDaysLeft === 0 ? 'Last day' : m.supplyDaysLeft === 1 ? '1 day left' : `${m.supplyDaysLeft} days left`
        await expect(c.getByTestId('supply')).toContainText(words)
      }
    }
    if (api.selfReported !== null) await expect(page.getByText('Medicines you told us about')).toBeVisible()

    for (const w of [1920, 1440, 1280, 1024, 768, 414, 390, 375, 360, 320]) {
      await page.setViewportSize({ width: w, height: 900 })
      await expectNoHorizontalOverflow(page)
    }
    expect(watcher.errors, 'console errors').toEqual([])
  })
})
