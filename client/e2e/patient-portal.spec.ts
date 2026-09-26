import { test, expect } from './fixtures'
import { openAuthed, watchConsole, expectNoHorizontalOverflow } from './helpers'

/**
 * The patient portal, as SD-P-01 Meera Krishnan — the atlas's portal patient.
 *
 * ⚠️ WHAT THIS PROVES, beyond "the pages render": that the clinician-authored
 * record reaches the patient ATTRIBUTED and IN WORDS, and that nothing the
 * patient must not see (a SOAP body, a draft) is on the page. Her data is the
 * seeded §8 record: hypothyroidism (E03.9), levothyroxine, Kannada
 * instructions with English alongside.
 *
 * ⚠️ One page load per test where possible. Every `goto` spends one of the 60
 * `/auth/refresh` calls per 15 minutes, so widths are swept by resizing an
 * already-loaded page rather than reloading it.
 */

test.use({ demoUser: 'patient' })

const WIDTHS = [1440, 1024, 768, 390, 375] as const

test('Home is personal and says where each fact comes from', async ({ page }) => {
  const watcher = watchConsole(page)
  await openAuthed(page, '/app', watcher)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Meera')
  // The medicines cell prefers SIGNED prescriptions and says so.
  await expect(page.getByText(/prescribed by your doctors/i)).toBeVisible()
  await expect(page.getByText(/Levothyroxine 50 mcg/)).toBeVisible()
  await expect(page.getByRole('link', { name: /add a health note/i })).toBeVisible()
  // The next-appointment card carries a month calendar.
  await expect(page.getByRole('group', { name: 'Your upcoming appointments' })).toBeVisible()
  // "My Care Team" is now "My doctors", everywhere.
  await expect(page.getByText(/my care team/i)).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'My doctors' }).first()).toBeVisible()
  // The simulated clinician helper is not shown to patients.
  await expect(page.getByRole('button', { name: /open assistant/i })).toHaveCount(0)
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 })
    await expectNoHorizontalOverflow(page)
  }
  expect(watcher.errors, 'console errors').toEqual([])
})

test('Medicines shows the signed prescription, in words, attributed', async ({ page }) => {
  const watcher = watchConsole(page)
  await openAuthed(page, '/app/medicines', watcher)
  const current = page.getByRole('region', { name: /current/i })
  const card = current.getByRole('article').filter({ hasText: 'Levothyroxine' }).first()
  await expect(card).toBeVisible()
  await expect(card).toContainText('Once a day')
  await expect(card).toContainText('(OD)')
  await expect(card).toContainText('By mouth')
  await expect(card).toContainText(/Prescribed by Dr\.? Ananya Iyer/)
  await expect(card).toContainText(/empty stomach/i)
  // The finished starting course is history, behind a toggle.
  await page.getByRole('button', { name: /Past medicines/ }).click()
  await expect(page.getByRole('region', { name: /past/i }).getByText('Levothyroxine').first()).toBeVisible()
  // Prescribing stays with clinicians: a refill can be ASKED for (see
  // medicines.spec.ts), but nothing here offers to change or stop a dose.
  await expect(page.getByRole('button', { name: /change dose|stop/i })).toHaveCount(0)
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 })
    await expectNoHorizontalOverflow(page)
  }
  expect(watcher.errors, 'console errors').toEqual([])
})

test('My Health: coded conditions, signed visits without the SOAP body, bilingual instructions', async ({ page }) => {
  const watcher = watchConsole(page)
  await openAuthed(page, '/app/health', watcher)

  await expect(page.getByText('Hypothyroidism, unspecified').first()).toBeVisible()
  await expect(page.getByText('ICD-10 E03.9').first()).toBeVisible()
  await expect(page.getByText(/snomed|icd-?11/i)).toHaveCount(0)

  await page.getByRole('tab', { name: 'Instructions' }).click()
  const sheet = page.getByRole('article').filter({ hasText: 'thyroid' }).first()
  await expect(sheet.locator('[lang="kn"]').first()).toBeVisible()
  await expect(sheet.locator('[lang="en"]').first()).toBeVisible()
  await expect(sheet).toContainText(/Recorded by/)

  await page.getByRole('tab', { name: 'Visits' }).click()
  await page.getByRole('link', { name: /clinic visit|follow-up/i }).first().click()
  await page.waitForURL(/\/app\/visits\//)
  await expect(page.getByRole('heading', { name: /seen by/i })).toBeVisible()
  // ⚠️ The clinician's note is not released to the patient — not even its labels.
  await expect(page.getByText(/^(subjective|objective|assessment|plan)$/i)).toHaveCount(0)
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 })
    await expectNoHorizontalOverflow(page)
  }
  expect(watcher.errors, 'console errors').toEqual([])
})

test("another patient's visit id is simply not found", async ({ page }) => {
  await openAuthed(page, '/app/visits/ENC-NOT-MINE-0', undefined)
  await expect(page.getByText('Visit not found', { exact: true })).toBeVisible()
})

test('Appointments: book from real slots, move it, then cancel with confirmation', async ({ page }) => {
  const watcher = watchConsole(page)
  await openAuthed(page, '/app/my-doctors', watcher)
  // "Book a visit" on the care team arrives with the clinician chosen.
  await page.getByRole('link', { name: /book a visit/i }).first().click()
  await page.waitForURL(/\/app\/appointments\?doctor=/)
  await expect(page.getByText(/choose one of this doctor/i)).toBeVisible()

  const times = page.getByRole('radiogroup', { name: /^times on/i }).getByRole('radio')
  await expect(times.first()).toBeVisible({ timeout: 20_000 })
  await times.first().click()
  await page.getByLabel(/reason for visit/i).fill('Thyroid function review')
  await page.getByRole('button', { name: /send request/i }).click()

  const card = page.getByRole('listitem').filter({ hasText: 'Thyroid function review' }).first()
  await expect(card).toBeVisible({ timeout: 20_000 })
  // A request, not a booking: it waits for the hospital's approval.
  await expect(card).toContainText(/awaiting confirmation/i)
  // Reschedule sits beside Cancel.
  await expect(card.getByRole('button', { name: /^reschedule$/i })).toBeVisible()
  await expect(card.getByRole('button', { name: /^cancel$/i })).toBeVisible()
  // The calendar marks it; choosing that day filters the list to it.
  const cal = page.getByRole('group', { name: 'Upcoming appointments' })
  await expect(cal).toBeVisible()
  await cal.getByRole('button', { name: /1 appointment|appointments/ }).first().click()
  await expect(page.getByRole('button', { name: /show all days/i })).toBeVisible()
  await page.getByRole('button', { name: /show all days/i }).click()

  await card.getByRole('button', { name: /^reschedule$/i }).click()
  const dialog = page.getByRole('dialog', { name: /reschedule appointment/i })
  const newTimes = dialog.getByRole('radiogroup', { name: /^times on/i }).getByRole('radio')
  await expect(newTimes.first()).toBeVisible({ timeout: 20_000 })
  await newTimes.first().click()
  await dialog.getByRole('button', { name: /request new time/i }).click()
  await expect(page.getByText(/reschedule requested/i)).toBeVisible({ timeout: 20_000 })

  await card.getByRole('button', { name: /^cancel$/i }).click()
  const confirm = page.getByRole('dialog', { name: /cancel this appointment/i })
  await confirm.getByLabel(/reason/i).fill('Feeling better, will rebook')
  await confirm.getByRole('button', { name: /cancel appointment/i }).click()
  await expect(page.getByText(/appointment cancelled/i)).toBeVisible({ timeout: 20_000 })
  expect(watcher.errors, 'console errors').toEqual([])
})

test('Emergency carries the facts an ambulance crew asks for', async ({ page }) => {
  const watcher = watchConsole(page)
  await openAuthed(page, '/app/emergency', watcher)
  const info = page.getByRole('region', { name: /show this to the ambulance crew/i })
  await expect(info).toBeVisible()
  await expect(info).toContainText('Levothyroxine')
  await expect(info).toContainText('Hypothyroidism')
  await expect(info).toContainText('O+')
  // The call is still the first thing on the page.
  await expect(page.getByRole('link', { name: /call 108/i }).first()).toBeVisible()
  expect(watcher.errors, 'console errors').toEqual([])
})

test('phone layout: bottom bar with a record button; Emergency stays in the header', async ({ page }) => {
  const watcher = watchConsole(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await openAuthed(page, '/app/notifications', watcher)
  await expect(page.getByRole('heading', { name: 'Notifications', level: 1 })).toBeVisible()
  const bar = page.getByRole('navigation', { name: /quick navigation/i })
  await expect(bar).toBeVisible()
  await expect(page.getByRole('banner').getByRole('link', { name: 'Emergency' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await bar.getByRole('link', { name: /record a health note/i }).click()
  await expect(page.getByRole('dialog', { name: /add a health note/i })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.setViewportSize({ width: 1024, height: 800 })
  await expect(bar).toBeHidden()
  expect(watcher.errors, 'console errors').toEqual([])
})


test('Reports has its own place in the navigation, and each tab says plainly when it is empty', async ({ page }) => {
  // SD-P-01 has no scans, lab reports or vital signs on record — only the
  // demo patient does — so every tab shows its own honest empty state.
  const watcher = watchConsole(page)
  await openAuthed(page, '/app/reports', watcher)
  await expect(page.getByRole('heading', { name: 'Reports', level: 1 })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Reports' })).toBeVisible()
  const tabs: Array<[RegExp, string]> = [
    [/Scans and X-rays/, 'No scans or X-rays yet'],
    [/Lab results/, 'No lab results yet'],
    [/Vitals/, 'No vital signs recorded yet'],
  ]
  for (const [tab, empty] of tabs) {
    await page.getByRole('tab', { name: tab }).click()
    await expect(page.getByRole('heading', { name: empty })).toBeVisible()
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 900 })
      await expectNoHorizontalOverflow(page)
    }
  }
  expect(watcher.errors, 'console errors').toEqual([])
})

test('My doctors: renamed page, and the old address still lands on it', async ({ page }) => {
  const watcher = watchConsole(page)
  await openAuthed(page, '/app/care-team', watcher)
  await page.waitForURL(/\/app\/my-doctors$/)
  await expect(page.getByRole('heading', { name: 'My doctors', level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: /book a visit/i }).first()).toBeVisible()
  expect(watcher.errors, 'console errors').toEqual([])
})
