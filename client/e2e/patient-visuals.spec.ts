import type { Locator, Page } from '@playwright/test'
import { test, expect } from './fixtures'
import { openAuthed, watchConsole, expectNoHorizontalOverflow } from './helpers'

/**
 * What the demo patient sees beyond the records themselves: portraits beside
 * doctors' names, Home's order and its readings chart, the AI chat docked
 * beside the page, and the insight bubbles by the chat button.
 *
 * ⚠️ STUBBED: /ai/insights (fixed lines — the real ones change with the day),
 * /ai/conversations (no model, no budget) and the booking POST (the demo data
 * is left exactly as it is).
 *
 * ⚠️ One page load per test: every load spends one of the 60 `/auth/refresh`
 * calls per 15 minutes.
 */

test.use({ demoUser: 'meenakshi' })

const INSIGHTS = [
  {
    id: 'e2e:appointment',
    kind: 'appointment',
    text: 'Your next visit with Dr. Ananya Iyer is on Tue 29 Sep at 9:00 am.',
    question: 'When is my next appointment?',
  },
  {
    id: 'e2e:report',
    kind: 'report',
    text: 'Your HbA1c and fasting glucose report from 10 Sep is ready in Reports.',
    question: 'What did my last lab report show?',
  },
]

async function stubAi(page: Page, insights: typeof INSIGHTS = INSIGHTS): Promise<void> {
  await page.route('**/api/v1/ai/insights', (route) =>
    route.fulfill({ json: { success: true, message: 'ok', data: { enabled: true, insights } } }),
  )
  await page.route('**/api/v1/ai/conversations', (route) =>
    route.fulfill({ json: { success: true, message: 'ok', data: { conversations: [] } } }),
  )
}

/** At least `min` portraits in `scope`, each a picture from our own server that actually loaded. */
async function expectPortraits(scope: Locator, min: number): Promise<void> {
  const imgs = scope.locator('img[src^="/avatars/"]')
  await expect(imgs.first()).toBeAttached()
  const n = await imgs.count()
  expect(n, 'portraits').toBeGreaterThanOrEqual(min)
  for (let i = 0; i < n; i++) {
    const img = imgs.nth(i)
    await img.scrollIntoViewIfNeeded()
    await expect
      .poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0), { message: 'portrait loaded' })
      .toBe(true)
  }
}

test("Home: the counts first, then the next visit with its doctor's portrait", async ({ page }) => {
  const watcher = watchConsole(page)
  await stubAi(page, [])
  await page.setViewportSize({ width: 1440, height: 900 })
  await openAuthed(page, '/app', watcher)

  const glance = page.getByRole('region', { name: 'Your health at a glance' })
  const next = page.getByRole('region', { name: 'Your next appointment' })
  await expect(glance).toBeVisible()
  await expect(next).toBeVisible()
  // Reading order is source order: the counts, then the visit.
  const follows = await glance.evaluate(
    (a, b) => Boolean(b && a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING),
    await next.elementHandle(),
  )
  expect(follows).toBe(true)
  // Side by side on a wide screen: the counts on the left, both starting level.
  const [g, n] = [await glance.boundingBox(), await next.boundingBox()]
  expect(g!.x).toBeLessThan(n!.x)
  expect(Math.abs(g!.y - n!.y)).toBeLessThanOrEqual(1)

  await expectPortraits(next, 1)
  await expectPortraits(page.getByRole('region', { name: 'My doctors' }), 2)
  await expectPortraits(page.getByRole('button', { name: /^Account menu/ }), 1)

  // Stacked on a phone, in the same order, and nothing runs off the side.
  await page.setViewportSize({ width: 390, height: 844 })
  const [g2, n2] = [await glance.boundingBox(), await next.boundingBox()]
  expect(g2!.y + g2!.height).toBeLessThanOrEqual(n2!.y)
  await expectNoHorizontalOverflow(page)
  expect(watcher.errors, 'console errors').toEqual([])
})

test('Home chart: switch readings with the keyboard, read one, and see every value as a table', async ({ page }) => {
  const watcher = watchConsole(page)
  await stubAi(page, [])
  await openAuthed(page, '/app', watcher)

  const trends = page.getByTestId('health-trends')
  const metrics = trends.getByRole('radiogroup', { name: 'Which reading to show' })
  const bp = metrics.getByRole('radio', { name: 'Blood pressure' })
  await expect(bp).toHaveAttribute('aria-checked', 'true')
  await bp.focus()
  await page.keyboard.press('ArrowRight')
  await expect(metrics.getByRole('radio', { name: 'Pulse' })).toHaveAttribute('aria-checked', 'true')
  await expect(metrics.getByRole('radio', { name: 'Pulse' })).toBeFocused()

  await metrics.getByRole('radio', { name: 'HbA1c' }).click()
  const chart = trends.getByRole('group', { name: /^HbA1c chart/ })
  await chart.focus()
  await page.keyboard.press('End')
  // The latest result is read out with the lab's own range — the lab's words, not ours.
  await expect(chart).toContainText(/Sample taken/)
  await expect(chart).toContainText(/Lab's range/)

  await trends.getByRole('button', { name: 'Show table' }).click()
  const table = trends.getByRole('table')
  await expect(table).toBeVisible()
  expect(await table.getByRole('row').count()).toBeGreaterThanOrEqual(3)
  await trends.getByRole('button', { name: 'Show chart' }).click()
  await expect(trends.getByRole('group', { name: /chart/ })).toBeVisible()
  expect(watcher.errors, 'console errors').toEqual([])
})

test('AI chat docks at full height beside the page, and nothing sits underneath it', async ({ page }) => {
  const watcher = watchConsole(page)
  await stubAi(page, [])
  await page.setViewportSize({ width: 1280, height: 800 })
  await openAuthed(page, '/app', watcher)

  const content = page.locator('#main-content .app-content')
  const before = await content.boundingBox()
  await page.getByRole('button', { name: 'Open AI chat' }).click()
  const panel = page.getByTestId('ai-chat-panel')
  await expect(panel).toHaveAttribute('data-docked', 'true')

  // From the bottom of the header to the bottom of the window.
  const [p, header] = [await panel.boundingBox(), await page.getByRole('banner').boundingBox()]
  expect(Math.abs(p!.y - (header!.y + header!.height))).toBeLessThanOrEqual(1)
  expect(Math.round(p!.y + p!.height)).toBe(800)

  // The page narrowed to make room: nothing in it reaches under the panel.
  await expect.poll(async () => (await content.boundingBox())!.width).toBeLessThan(before!.width)
  const under = await page.evaluate((left) => {
    return [...document.querySelectorAll('#main-content *')].filter((el) => {
      const r = el.getBoundingClientRect()
      return r.width > 1 && r.height > 1 && r.right > left + 0.5
    }).length
  }, p!.x)
  expect(under, 'page elements under the docked chat').toBe(0)
  await expectNoHorizontalOverflow(page)

  // The header's own menus still open over it, and Esc there closes the menu, not the chat.
  await page.getByRole('button', { name: /^Account menu/ }).click()
  const menu = page.getByRole('menu', { name: 'Account menu' })
  await expect(menu).toBeVisible()
  const menuOnTop = await menu.evaluate((m) => {
    const r = m.getBoundingClientRect()
    return m.contains(document.elementFromPoint(r.left + 12, r.bottom - 8))
  })
  expect(menuOnTop).toBe(true)
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await expect(panel).toBeVisible()

  // Another page opens beside it; the chat stays.
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Medicines' }).click()
  await page.waitForURL(/\/app\/medicines/)
  await expect(panel).toBeVisible()

  // Esc inside it closes it, and the page takes the width back.
  await panel.getByLabel('Ask a question about your health').focus()
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await expect(page.locator('html')).not.toHaveAttribute('data-chat-docked', 'true')

  // On a phone it covers the page below the header, and the quick bar steps aside.
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Open AI chat' }).click()
  await expect(panel).toHaveAttribute('data-docked', 'false')
  await expect(page.getByRole('navigation', { name: 'Quick navigation' })).toBeHidden()
  await expectNoHorizontalOverflow(page)
  expect(watcher.errors, 'console errors').toEqual([])
})

test('Insight bubbles: from the record, by the chat button; a tap asks about it, and ✕ ends them', async ({ page }) => {
  const watcher = watchConsole(page)
  await stubAi(page)
  // Fake timers, so the bubbles' pacing (seconds, then ~45 s) can be walked through.
  await page.clock.install()
  await openAuthed(page, '/app/medicines', watcher)

  const nudge = page.getByTestId('insight-nudge')
  await page.clock.fastForward(5_000)
  await expect(nudge).toBeVisible()
  await expect(nudge).toContainText('From your record')
  await expect(nudge).toContainText(INSIGHTS[0].text)
  // It never takes the chat button's name, and it sits right above the button.
  await expect(page.getByRole('button', { name: 'Open AI chat' })).toHaveCount(1)
  const [b, l] = [await nudge.boundingBox(), await page.getByTestId('ai-chat-launcher').boundingBox()]
  expect(b!.y + b!.height).toBeLessThanOrEqual(l!.y)
  expect(Math.abs(b!.x + b!.width - (l!.x + l!.width))).toBeLessThanOrEqual(2)

  // Never on Emergency; back again afterwards.
  const nav = page.getByRole('navigation', { name: 'Main navigation' })
  await nav.getByRole('link', { name: 'Emergency' }).click()
  await page.waitForURL(/\/app\/emergency/)
  await expect(nudge).toBeHidden()
  await nav.getByRole('link', { name: 'Medicines' }).click()
  await page.waitForURL(/\/app\/medicines/)
  await expect(nudge).toBeVisible()

  // A tap opens the chat with the question in the box — not sent.
  await nudge.getByRole('button', { name: /Your next visit/ }).click()
  const panel = page.getByTestId('ai-chat-panel')
  await expect(panel.getByLabel('Ask a question about your health')).toHaveValue(INSIGHTS[0].question)
  await expect(nudge).toBeHidden()
  await panel.getByRole('button', { name: 'Close AI chat' }).click()

  // The next one comes a while later.
  await page.clock.fastForward('00:46')
  await expect(nudge).toContainText(INSIGHTS[1].text)

  // ✕ ends them for this session — they stay gone after a reload.
  await nudge.getByRole('button', { name: 'Hide assistant insights' }).click()
  await expect(nudge).toBeHidden()
  const stored = await page.evaluate(() => sessionStorage.getItem('shri-health.insights'))
  expect(JSON.parse(stored ?? '{}')).toMatchObject({ stopped: true })
  expect(watcher.errors, 'console errors').toEqual([])
})

test('Booking: choose a doctor by face and name; the request then waits for confirmation', async ({ page }) => {
  const watcher = watchConsole(page)
  await stubAi(page, [])
  let posted: Record<string, unknown> | null = null
  await page.route('**/api/v1/appointments', async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    posted = route.request().postDataJSON() as Record<string, unknown>
    await route.fulfill({
      status: 201,
      json: {
        success: true,
        message: 'Appointment requested.',
        data: {
          appointment: {
            id: '00000000-0000-4000-8000-0000000b00c1',
            scheduledAt: String(posted.scheduledAt ?? new Date().toISOString()),
            durationMins: 30,
            mode: 'InPerson',
            modeLabel: 'In person',
            status: 'Requested',
            statusLabel: 'Awaiting confirmation',
            reason: 'Review of my medicines',
            locationName: null,
            doctor: {
              id: String(posted.doctorId ?? ''),
              name: 'Dr. Ananya Iyer',
              specialty: 'General Medicine',
              hospitalName: null,
              photoUrl: '/avatars/doctors/ananya-iyer.webp',
            },
            canCancel: true,
            canReschedule: true,
            joinUrl: null,
            isVideo: false,
            cancelledAt: null,
            cancelReason: null,
            createdAt: new Date().toISOString(),
          },
        },
      },
    })
  })
  await openAuthed(page, '/app/appointments', watcher)
  await page.getByRole('button', { name: 'Request appointment' }).click()

  const picker = page.getByRole('radiogroup', { name: /^Clinician/ })
  await expect(picker.getByRole('radio', { name: /No preference/ })).toHaveAttribute('aria-checked', 'true')
  await expectPortraits(picker, 5)
  // Arrow keys move the choice, as in any radio group.
  await picker.getByRole('radio', { name: /No preference/ }).focus()
  await page.keyboard.press('ArrowDown')
  await expect(picker.getByTestId('doctor-option').first()).toHaveAttribute('aria-checked', 'true')

  await picker.getByRole('radio', { name: /Dr\. Ananya Iyer/ }).click()
  const times = page.getByRole('radiogroup', { name: /^times on/i }).getByRole('radio')
  await expect(times.first()).toBeVisible({ timeout: 20_000 })
  await times.first().click()
  await page.getByLabel(/reason for visit/i).fill('Review of my medicines')
  await page.getByRole('button', { name: /send request/i }).click()

  const confirmation = page.getByTestId('booking-confirmation')
  await expect(confirmation.getByRole('heading', { name: 'Request sent' })).toBeFocused()
  await expect(confirmation).toContainText('Dr. Ananya Iyer')
  await expect(confirmation).toContainText('Awaiting confirmation')
  await expectPortraits(confirmation, 1)
  expect(posted, 'the request that was sent').not.toBeNull()
  await confirmation.getByRole('button', { name: 'Done' }).click()
  await expect(confirmation).toBeHidden()
  expect(watcher.errors, 'console errors').toEqual([])
})
