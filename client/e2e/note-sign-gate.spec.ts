import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'
import {
  openAuthed,
  watchConsole,
  navigateTo,
  expectNoHorizontalOverflow,
  confirmSign,
} from './helpers'

/**
 * `S-06-03` — the signing gate, and the promise the screen makes about it.
 *
 * ⚠️ WHAT THIS PROTECTS. The screen used to print "These are advisory. They do
 * not block saving or signing." above a live Sign button while the server
 * refused the signature on exactly those findings (CMP-NABH-05). The clinician
 * only found out by pressing Sign and reading a 400. These tests assert the UI
 * can no longer present a signing state the server would contradict.
 *
 * ⚠️ Navigation is by CLICKING throughout. `page.goto` is a full reload and
 * spends one of the 60 `/auth/refresh` calls the limiter allows per 15 minutes
 * per IP; exhausting it fails every test in the suite by bouncing to /login,
 * which looks like a catastrophically broken app and is not one.
 */

/** Open a fresh consultation from the clinic worklist. */
async function openNote(page: Page): Promise<void> {
  await navigateTo(page, /patients/i, /\/clinician\/patients$/)
  await page.getByRole('tab', { name: /my panel/i }).click()
  const row = page.getByRole('row').filter({ hasText: /lakshmanan/i }).first()
  await expect(row).toBeVisible({ timeout: 20_000 })
  await row.click()
  await page.waitForURL(/\/patient\/[^/]+\/chart/, { timeout: 20_000 })
  await page.getByRole('button', { name: /start consultation/i }).click()
  await page.waitForURL(/\/encounter\/[^/]+\/note/, { timeout: 20_000 })
  await expect(page.getByRole('heading', { name: /consultation note/i })).toBeVisible({
    timeout: 20_000,
  })
}

const signButton = (page: Page) =>
  page.getByRole('button', { name: /sign note|submit for co-signature/i })

test('an empty note cannot be signed, and says why', async ({ page }) => {
  const watcher = watchConsole(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await openAuthed(page, undefined, watcher)
  await openNote(page)

  // The note opens empty. Sign must not be presented as available.
  await expect(signButton(page)).toBeDisabled()
  await expect(page.getByText(/complete assessment and plan before signing/i)).toBeVisible()

  // ⚠️ Saving stays available — the gate is on signing only. A clinician
  // half-way through a consultation must never be locked out of saving.
  await expect(page.getByRole('button', { name: /save draft/i })).toBeEnabled()

  expect(watcher.errors, 'console errors').toEqual([])
})

test('a banned abbreviation blocks signing, and the screen says so before Sign is pressed', async ({
  page,
}) => {
  const watcher = watchConsole(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await openAuthed(page, undefined, watcher)
  await openNote(page)

  await page.getByLabel(/^assessment$/i).fill('Community-acquired pneumonia, right lower lobe.')
  // "4U" is the classic tenfold insulin error the rule exists for.
  await page.getByLabel(/^plan$/i).fill('Insulin 4U stat. Review in 48 hours.')

  // ⚠️ Wait for the CHECK, not for a timeout. The banner appears only after the
  // blur-triggered POST resolves; asserting on the banner alone races the
  // network and fails intermittently under a loaded suite — which reads as a
  // product regression and is not one.
  const checked = page.waitForResponse(
    (r) => r.url().includes('/notes/quality-check') && r.status() === 200,
    { timeout: 20_000 },
  )
  await page.getByLabel(/^assessment$/i).click()
  await checked

  await expect(page.getByText(/documentation issue/i)).toBeVisible({ timeout: 20_000 })

  // ⚠️ THE CONTRADICTION ITSELF. This sentence must never appear again.
  await expect(page.getByText(/they do not block saving or signing/i)).toHaveCount(0)

  // The copy now matches what the server will do.
  await expect(page.getByText(/stays unavailable until these are written out/i)).toBeVisible()
  await expect(signButton(page)).toBeDisabled()
  await expect(page.getByText(/write out .* before signing/i)).toBeVisible()

  // Saving is still fine.
  await expect(page.getByRole('button', { name: /save draft/i })).toBeEnabled()

  // Correcting it releases the gate — the block must not be sticky.
  await page.getByLabel(/^plan$/i).fill('Insulin 4 units stat. Review in 48 hours.')
  const rechecked = page.waitForResponse(
    (r) => r.url().includes('/notes/quality-check') && r.status() === 200,
    { timeout: 20_000 },
  )
  await page.getByLabel(/^assessment$/i).click()
  await rechecked
  await expect(page.getByText(/documentation issue/i)).toHaveCount(0, { timeout: 20_000 })
  await expect(signButton(page)).toBeEnabled()

  expect(watcher.errors, 'console errors').toEqual([])
})

test('a coded diagnosis persists, and a category code is refused', async ({ page }) => {
  const watcher = watchConsole(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await openAuthed(page, undefined, watcher)
  await openNote(page)

  const picker = page.getByLabel(/coded diagnosis \(icd-10\)/i)
  await expect(picker).toBeVisible()

  // ⚠️ A category is offered for context and refused on selection — that is
  // the leaf rule, and it is the reason this field is a typeahead rather than
  // a text box.
  await picker.fill('J18')
  await page.getByRole('option', { name: /J18\s+Pneumonia, organism unspecified/i }).click()
  await expect(page.getByText(/is a category, not a diagnosis/i)).toBeVisible()

  // The specific code beneath it is accepted.
  await picker.fill('J18.9')
  await page.getByRole('option', { name: /J18\.9/ }).first().click()
  await expect(picker).toHaveValue(/J18\.9/)

  await page.getByLabel(/^assessment$/i).fill('Community-acquired pneumonia, right lower lobe.')
  await page.getByLabel(/^plan$/i).fill('Oral antibiotics. Review in 48 hours.')
  await page.getByRole('button', { name: /save draft/i }).click()
  await expect(page.getByText(/saved/i).first()).toBeVisible({ timeout: 20_000 })

  // ⚠️ Persistence, not just UI state: reload the screen through the step nav
  // and confirm the code came back from the server.
  await page.getByRole('link', { name: /problems/i }).first().click()
  await page.waitForURL(/\/encounter\/[^/]+\/problems/, { timeout: 20_000 })
  await page.getByRole('link', { name: /note/i }).first().click()
  await page.waitForURL(/\/encounter\/[^/]+\/note/, { timeout: 20_000 })
  await expect(page.getByLabel(/coded diagnosis \(icd-10\)/i)).toHaveValue(/J18\.9/, {
    timeout: 20_000,
  })

  await expectNoHorizontalOverflow(page)
  expect(watcher.errors, 'console errors').toEqual([])
})

/**
 * ⚠️ THE CLIENT RULE IS A CONVENIENCE; THIS IS THE CONTROL.
 *
 * The picker refuses a category code, but a picker cannot be the enforcement —
 * anything holding a session can PATCH the note directly. Before this change
 * `problemCode` was validated only as `z.string().trim().max(20)`, so `J18` (a
 * category) or `NOTACODE` (not in the catalogue at all) would persist onto a
 * clinical record that a claim is later built from.
 *
 * This drives the real API with the browser's own session rather than the UI.
 */
test('the server refuses a parent-only or unknown code on a direct API call', async ({ page }) => {
  const watcher = watchConsole(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await openAuthed(page, undefined, watcher)
  await openNote(page)

  // ⚠️ THE ACCESS TOKEN IS A BEARER HELD IN JS MEMORY, NOT A COOKIE
  // (`apiClient.ts` — `config.headers.Authorization = 'Bearer ' + accessToken`).
  // So Playwright's request context, which carries cookies only, is
  // unauthenticated and every call comes back as the uniform 404 refusal.
  // Capturing the header off the app's own traffic is what makes this a real
  // authenticated direct call rather than a test of the refusal path.
  // ⚠️ ABSOLUTE URL. There is no dev proxy — the client calls the API origin
  // directly (`apiClient.ts`: BASE_URL defaults to http://localhost:5000), so
  // a relative path here hits Vite and 404s with an empty body, which looks
  // exactly like the API refusing.
  const API = (process.env.VITE_API_BASE_URL ?? 'http://localhost:5000') + '/api/v1'

  let authHeader = ''
  page.on('request', (r) => {
    const h = r.headers()['authorization']
    if (h !== undefined && h !== '') authHeader = h
  })

  // ⚠️ The draft's id comes from the app's OWN traffic rather than being
  // reconstructed — simpler, and immune to response-envelope changes. The
  // listener is armed before the navigation that triggers the request.
  const listPromise = page.waitForResponse(
    (r) => r.url().includes('/api/v1/notes?patientId=') && r.status() === 200,
    { timeout: 20_000 },
  )
  await page.getByRole('link', { name: /problems/i }).first().click()
  await page.waitForURL(/\/encounter\/[^/]+\/problems/, { timeout: 20_000 })
  await page.getByRole('link', { name: /note/i }).first().click()
  const listResponse = await listPromise

  const body = (await listResponse.json()) as {
    data?: { notes?: Array<{ id: string; status: string; encounterId: string | null }> }
  }
  const visitId = page.url().match(/\/encounter\/([^/]+)\/note/)?.[1]
  expect(visitId, 'visit id from the URL').toBeTruthy()
  const draftId = body.data?.notes?.find((n) => n.status === 'Draft')?.id
  expect(draftId, 'an open draft id').toBeTruthy()
  expect(authHeader, 'a bearer token captured from the app').toMatch(/^Bearer /)
  const auth = { Authorization: authHeader }

  // A category code — offered in the picker for context, never codable.
  const parent = await page.request.patch(`${API}/notes/${draftId}`, {
    data: { problemCode: 'J18' },
    headers: auth,
  })
  expect(parent.status(), 'parent code must be refused').toBe(400)
  expect(await parent.text()).toMatch(/category, not a diagnosis/i)

  // A code that is not in the catalogue at all.
  const unknown = await page.request.patch(`${API}/notes/${draftId}`, {
    data: { problemCode: 'NOTACODE' },
    headers: auth,
  })
  expect(unknown.status(), 'unknown code must be refused').toBe(400)
  expect(await unknown.text()).toMatch(/not in the catalogue/i)

  // ⚠️ And a valid leaf still works — the guard must refuse the bad, not
  // everything.
  const leaf = await page.request.patch(`${API}/notes/${draftId}`, {
    data: { problemCode: 'J18.9' },
    headers: auth,
  })
  expect(leaf.status(), 'a leaf code must be accepted').toBe(200)

  expect(watcher.errors, 'console errors').toEqual([])
})

test('a complete, clean note can be signed and is then locked with addendum as the only path', async ({
  page,
}) => {
  const watcher = watchConsole(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await openAuthed(page, undefined, watcher)
  await openNote(page)

  await page.getByLabel(/^subjective$/i).fill('Cough and fever for four days.')
  await page.getByLabel(/^assessment$/i).fill('Community-acquired pneumonia, right lower lobe.')
  await page.getByLabel(/^plan$/i).fill('Oral antibiotics. Review in 48 hours.')
  await page.getByLabel(/^subjective$/i).click()

  await expect(signButton(page)).toBeEnabled({ timeout: 20_000 })
  await signButton(page).click()

  // The confirm dialog, then the signature.
  await confirmSign(page)

  // ⚠️ LOCKED, and the addendum is the only route (CMP-NABH-10). This is the
  // model the fix must not have disturbed.
  await expect(page.getByText(/signed by/i)).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('button', { name: /save draft/i })).toHaveCount(0)
  await expect(signButton(page)).toHaveCount(0)
  await expect(page.getByRole('button', { name: /addendum/i })).toBeVisible()

  expect(watcher.errors, 'console errors').toEqual([])
})
