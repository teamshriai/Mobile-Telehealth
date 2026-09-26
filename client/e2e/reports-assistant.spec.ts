import type { Page, Route } from '@playwright/test'
import { test, expect } from './fixtures'
import { openAuthed, watchConsole, expectNoHorizontalOverflow } from './helpers'

/**
 * The demo patient's round: brand, the Home calendar, Reports (scans, the
 * DICOM viewer, labs, vitals) and the floating assistant — as SD Meenakshi
 * Subramaniam, the only patient with imaging, lab and vitals records.
 *
 * ⚠️ THE ASSISTANT IS STUBBED here (page.route on /ai/messages). These tests
 * are about the chat UI — opening, rendering a reply with its source chips,
 * the 108 interlock, Esc — and must not spend the shared model budget or
 * depend on what a model says today. The live pipeline is covered by the
 * server's `npm run ai:eval`; set E2E_AI_LIVE=1 to also send one real
 * question from the browser.
 *
 * ⚠️ One page load per test where possible: every `goto` spends one of the
 * 60 `/auth/refresh` calls per 15 minutes.
 */

test.use({ demoUser: 'meenakshi' })

const PHONE_WIDTHS = [390, 375, 320] as const

/** A rough count of lit pixels on the viewer canvas — "is anything drawn". */
async function litPixels(page: Page): Promise<number> {
  return page.getByTestId('dicom-viewer').locator('canvas').first().evaluate((c: HTMLCanvasElement) => {
    const ctx = c.getContext('2d')
    if (ctx === null) return 0
    const d = ctx.getImageData(0, 0, c.width, c.height).data
    let n = 0
    for (let i = 0; i < d.length; i += 16) if (d[i] > 24) n++
    return n
  })
}

async function pixelSum(page: Page): Promise<number> {
  return page.getByTestId('dicom-viewer').locator('canvas').first().evaluate((c: HTMLCanvasElement) => {
    const ctx = c.getContext('2d')
    if (ctx === null) return 0
    const d = ctx.getImageData(0, 0, c.width, c.height).data
    let s = 0
    for (let i = 0; i < d.length; i += 64) s += d[i]
    return s
  })
}

test('brand: SHRI HEALTH in the title and the shell, and no old product name', async ({ page }) => {
  const watcher = watchConsole(page)
  await openAuthed(page, '/app', watcher)
  await expect(page).toHaveTitle(/SHRI HEALTH/)
  await expect(page.getByRole('banner').getByText('SHRI HEALTH', { exact: true })).toBeVisible()
  await expect(page.locator('body')).not.toContainText(/Stroke AI/)
  expect(watcher.errors, 'console errors').toEqual([])
})

test('Home calendar: a marked day lists its appointments and opens Appointments on that day', async ({ page }) => {
  const watcher = watchConsole(page)
  await openAuthed(page, '/app', watcher)
  const marked = page.getByRole('button', { name: /, \d+ appointments?$/ }).first()
  await expect(marked).toBeVisible()
  await marked.click()
  await expect(marked).toHaveAttribute('aria-pressed', 'true')
  const panel = page.getByTestId('calendar-day-panel')
  await expect(panel).toBeVisible()
  await expect(panel.getByText(/Confirmed|Requested/).first()).toBeVisible()
  await panel.getByRole('link', { name: /Open in Appointments/ }).click()
  await page.waitForURL(/\/app\/appointments/)
  await expect(page.getByRole('heading', { name: 'Appointments', level: 1 })).toBeVisible()
  expect(watcher.errors, 'console errors').toEqual([])
})

test('Reports: scans newest first with where and when; the CT viewer draws, scrolls and windows', async ({ page }) => {
  const watcher = watchConsole(page)
  await openAuthed(page, '/app/reports', watcher)

  const rows = page.getByTestId('imaging-row')
  await expect(rows).toHaveCount(7)
  // Day headings are DD-MMM-YYYY, newest first.
  const days = await page.getByTestId('imaging-list').locator('h3').allTextContents()
  const stamps = days.map((d) => Date.parse(d.replace(/-/g, ' ')))
  expect(stamps, `days in order: ${days.join(', ')}`).toEqual([...stamps].sort((a, b) => b - a))
  await expect(rows.first()).toContainText('MRI Brain')
  await expect(rows.first()).toContainText('Indostates Whitefield')

  await rows.filter({ hasText: 'CT Brain — plain' }).filter({ hasNotText: '24 hours' }).first().click()
  await expect(page.getByTestId('radiology-report')).toContainText('Impression')
  const viewer = page.getByTestId('dicom-viewer')
  await expect(viewer).toHaveAttribute('data-state', 'ready', { timeout: 30_000 })
  await expect(page.getByTestId('image-attribution')).toContainText('National Library of Medicine')
  await expect.poll(() => litPixels(page), { message: 'the CT canvas is not blank' }).toBeGreaterThan(500)

  const counter = page.getByTestId('slice-counter')
  const before = await counter.textContent()
  await viewer.focus()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await expect(counter).not.toHaveText(before ?? '')

  const sum = await pixelSum(page)
  await page.keyboard.press('4') // bone window
  await expect.poll(() => pixelSum(page), { message: 'a window preset changes the pixels' }).not.toBe(sum)

  for (const w of PHONE_WIDTHS) {
    await page.setViewportSize({ width: w, height: 860 })
    await expectNoHorizontalOverflow(page)
  }
  expect(watcher.errors, 'console errors').toEqual([])
})

test('Reports: the skull X-ray opens and inverts', async ({ page }) => {
  const watcher = watchConsole(page)
  await openAuthed(page, '/app/reports', watcher)
  await page.getByTestId('imaging-row').filter({ hasText: 'X-ray Skull' }).first().click()
  const viewer = page.getByTestId('dicom-viewer')
  await expect(viewer).toHaveAttribute('data-state', 'ready', { timeout: 30_000 })
  await expect.poll(() => litPixels(page)).toBeGreaterThan(500)
  const sum = await pixelSum(page)
  await page.getByRole('button', { name: /Invert/ }).click()
  await expect.poll(() => pixelSum(page), { message: 'invert changes the image' }).not.toBe(sum)
  expect(watcher.errors, 'console errors').toEqual([])
})

test("Reports: lab results carry the lab's range and flag; every vital sign has a value", async ({ page }) => {
  const watcher = watchConsole(page)
  await openAuthed(page, '/app/reports?tab=labs', watcher)
  const labs = page.getByTestId('lab-panel')
  await expect(labs).toBeVisible()
  await expect(labs.getByTestId('lab-report').first()).toBeVisible()
  await expect(labs.getByText('↑ High').first()).toBeVisible()
  await expect(labs.getByTestId('lab-result').filter({ hasText: 'HbA1c' }).first()).toContainText('%')

  await page.getByRole('tab', { name: /Vitals/ }).click()
  const tiles = page.getByTestId('vital-tile')
  await expect(tiles).toHaveCount(9)
  for (const tile of await tiles.all()) await expect(tile).not.toContainText('No reading')
  for (const w of PHONE_WIDTHS) {
    await page.setViewportSize({ width: w, height: 860 })
    await expectNoHorizontalOverflow(page)
  }
  expect(watcher.errors, 'console errors').toEqual([])
})

// ── The floating assistant ──────────────────────────────────────────────────

const NOW = new Date().toISOString()
const turn = (id: string, role: 'User' | 'Assistant', content: string, kind = 'Model') => ({
  id,
  role,
  content,
  isPlaceholder: false,
  kind,
  createdAt: NOW,
})

async function stubAssistant(page: Page): Promise<void> {
  const thread: ReturnType<typeof turn>[] = []
  await page.route('**/api/v1/ai/messages', async (route: Route) => {
    const { content } = route.request().postDataJSON() as { content: string }
    thread.push(turn(`u${thread.length}`, 'User', content))
    thread.push(
      /drooping/i.test(content)
        ? turn(`a${thread.length}`, 'Assistant', 'Some of what you have described can be a sign of a stroke.\n\nCall 108 now.', 'SafetyInterlock')
        : turn(`a${thread.length}`, 'Assistant', 'Your **LDL cholesterol** was 76 mg/dL, and the lab did not mark it. [Lab report 10 Sep 2026]'),
    )
    await route.fulfill({ json: { success: true, message: 'ok', data: { conversationId: '00000000-0000-4000-8000-00000000c0de', messages: thread } } })
  })
  await page.route('**/api/v1/ai/conversations/00000000-0000-4000-8000-00000000c0de', (route) =>
    route.fulfill({ json: { success: true, message: 'ok', data: { conversation: { id: '00000000-0000-4000-8000-00000000c0de', title: 'LDL', messages: thread } } } }),
  )
}

test('AI chat: opens from the corner, shows a reply with its source, the 108 interlock, and closes on Esc', async ({ page }) => {
  const watcher = watchConsole(page)
  await stubAssistant(page)
  await openAuthed(page, '/app/medicines', watcher)

  const launcher = page.getByRole('button', { name: 'Open AI chat' })
  await launcher.click()
  const panel = page.getByTestId('ai-chat-panel')
  await expect(panel).toBeVisible()
  await expect(panel.getByLabel('Ask a question about your health')).toBeFocused()

  await panel.getByRole('button', { name: 'What did my last lab report show?' }).click()
  const reply = panel.getByTestId('chat-reply').last()
  await expect(reply).toContainText('LDL cholesterol')
  await expect(reply.locator('strong')).toHaveText('LDL cholesterol')
  const chip = reply.getByTestId('source-chip')
  await expect(chip).toHaveText('Lab report 10 Sep 2026')

  // The fixed interlock renders as itself, with the call button.
  await panel.getByLabel('Ask a question about your health').fill('my face is drooping right now')
  await panel.getByRole('button', { name: 'Send question' }).click()
  await expect(panel.getByTestId('chat-reply').last()).toHaveAttribute('data-kind', 'SafetyInterlock')
  await expect(panel.getByRole('link', { name: /Call 108/ })).toHaveAttribute('href', 'tel:108')

  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await expect(launcher).toBeFocused()

  // A source chip opens where the fact came from, and the panel gets out of the way.
  await launcher.click()
  await page.getByTestId('ai-chat-panel').getByTestId('source-chip').first().click()
  await page.waitForURL(/\/app\/reports\?tab=labs/)
  await expect(page.getByTestId('ai-chat-panel')).toBeHidden()

  // Not on AI Insights itself — the full view is already there.
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'AI Insights' }).click()
  await page.waitForURL(/\/app\/ai-insights/)
  await expect(page.getByRole('button', { name: 'Open AI chat' })).toHaveCount(0)
  expect(watcher.errors, 'console errors').toEqual([])
})

test('AI chat: the panel fits every phone width', async ({ page }) => {
  const watcher = watchConsole(page)
  await stubAssistant(page)
  await openAuthed(page, '/app', watcher)
  await page.getByRole('button', { name: 'Open AI chat' }).click()
  for (const w of PHONE_WIDTHS) {
    await page.setViewportSize({ width: w, height: 760 })
    await expectNoHorizontalOverflow(page)
    await expect(page.getByTestId('ai-chat-panel').getByRole('button', { name: 'Send question' })).toBeInViewport()
  }
  expect(watcher.errors, 'console errors').toEqual([])
})

test('AI chat (live): one real question is answered from the record', async ({ page }) => {
  test.skip(process.env.E2E_AI_LIVE !== '1', 'spends the shared model budget — set E2E_AI_LIVE=1')
  test.setTimeout(90_000)
  const watcher = watchConsole(page)
  await openAuthed(page, '/app', watcher)
  await page.getByRole('button', { name: 'Open AI chat' }).click()
  const panel = page.getByTestId('ai-chat-panel')
  await panel.getByRole('button', { name: 'When is my next appointment?' }).click()
  const reply = panel.getByTestId('chat-reply').last()
  await expect(reply).toBeVisible({ timeout: 60_000 })
  await expect(reply).toHaveAttribute('data-kind', /Model|BudgetDeferred/)
  expect(watcher.errors, 'console errors').toEqual([])
})
