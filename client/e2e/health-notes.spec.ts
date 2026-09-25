import { test, expect } from './fixtures'
import { openAuthed, watchConsole, login, DOCTOR, PATIENT_SHRI_ID, expectNoHorizontalOverflow } from './helpers'

/**
 * Patient voice health notes, END TO END and for real.
 *
 * ⚠️ NOTHING IS MOCKED. The `patient` project launches Chromium with a fake
 * microphone that plays `e2e/fixtures/voice-note-en-16k.wav` — a public-domain
 * 11-second clip of JFK's 1961 inaugural ("ask not what your country can do
 * for you…"). So this test records through `getUserMedia` + `MediaRecorder`,
 * converts to 16 kHz WAV in the browser, uploads, and waits for the SERVER's
 * local Whisper model to transcribe it. The assertion on the transcript is an
 * assertion on the model, not on a fixture string.
 *
 * ⚠️ English only. Accuracy in Kannada, Hindi, Tamil and Malayalam has not
 * been measured — that needs real recordings of real speakers.
 */

test.use({ demoUser: 'patient' })
test.describe.configure({ mode: 'serial' })

test('speak → transcribe on our server → correct → share → saved, attributed to the patient', async ({ page }) => {
  test.setTimeout(120_000)
  const watcher = watchConsole(page)
  await openAuthed(page, '/app/health-notes', watcher)
  await expect(page.getByText(/your doctors do not monitor these notes/i).first()).toBeVisible()

  await page.getByRole('button', { name: /speak a note/i }).click()
  const dialog = page.getByRole('dialog', { name: /add a health note/i })
  await dialog.getByLabel(/language/i).selectOption('en')

  await dialog.getByRole('button', { name: /start recording/i }).click()
  await expect(dialog.getByText(/recording ·/i)).toBeVisible()
  // The whole clip, plus a little: the fake device loops the file.
  await page.waitForTimeout(11_500)
  await dialog.getByRole('button', { name: /stop recording/i }).click()

  await expect(dialog.getByText(/turning your recording into text/i)).toBeVisible()
  const text = dialog.getByLabel(/check and correct the text/i)
  await expect(text).toBeVisible({ timeout: 60_000 })
  // ⚠️ The model heard the clip. Loose on purpose — the loop may add a second
  // "And so my fellow…" — but the sentence itself must be there.
  await expect(text).toHaveValue(/ask not what your country can do for you/i)

  // The patient corrects the words, and shares the note.
  await text.fill('Headache since yesterday evening. Blood pressure 145 over 90 this morning.')
  await dialog.getByRole('radio', { name: /share with my doctors/i }).check()
  await dialog.getByRole('button', { name: /save note/i }).click()
  // The dialog's title becomes "Note saved" — its accessible name changes.
  const saved = page.getByRole('dialog', { name: /note saved/i })
  await expect(saved.getByText(/saved to your health notes and shared with/i)).toBeVisible()
  await saved.getByRole('button', { name: /^done$/i }).click()

  const note = page.getByRole('article').filter({ hasText: 'Headache since yesterday evening' }).first()
  await expect(note).toBeVisible()
  // ⚠️ Patient-generated, and it says so — never the clinician styling.
  await expect(note.getByText('You wrote this')).toBeVisible()
  await expect(note).toContainText(/voice note · corrected after transcription/i)
  await expect(note).toContainText(/shared with my doctors/i)
  await expect(note.getByText(/recorded by/i)).toHaveCount(0)

  // The kept recording plays back — decrypted on the server, owner only.
  await note.getByRole('button', { name: /listen/i }).click()
  await expect(note.locator('audio')).toBeVisible()

  for (const w of [1440, 768, 390, 375]) {
    await page.setViewportSize({ width: w, height: 900 })
    await expectNoHorizontalOverflow(page)
  }
  expect(watcher.errors, 'console errors').toEqual([])
})

test("the care team sees the shared note on the chart, labelled as the patient's", async ({ browser }) => {
  // ⚠️ A FRESH doctor session via `login()`, never the saved doctor.json: a
  // second context replaying that file's refresh token would rotate it out
  // from under the rest of the suite and trip reuse detection.
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await login(page, DOCTOR)
  await page.goto(`/patient/${PATIENT_SHRI_ID}/chart`)
  const card = page.getByRole('heading', { name: /patient-reported notes/i }).locator('..')
  await expect(card).toBeVisible({ timeout: 30_000 })
  await expect(card).toContainText(/not clinically verified/i)
  await expect(card).toContainText('Headache since yesterday evening')
  await expect(card).toContainText(/voice, transcribed, corrected by patient/i)
  await ctx.close()
})

test('a typed note with stroke warning words turns into "call 108"', async ({ page }) => {
  const watcher = watchConsole(page)
  await openAuthed(page, '/app/health-notes?new=text', watcher)
  const dialog = page.getByRole('dialog', { name: /add a health note/i })
  await dialog.getByLabel('Your note').fill('My face is drooping and my arm feels weak right now')
  await dialog.getByRole('button', { name: /save note/i }).click()
  const saved = page.getByRole('dialog', { name: /note saved/i })
  await expect(saved.getByRole('alert')).toContainText(/call 108/i)
  await expect(saved.getByRole('link', { name: /call 108/i })).toHaveAttribute('href', 'tel:108')
  await saved.getByRole('button', { name: /^close$/i }).click()
  expect(watcher.errors, 'console errors').toEqual([])
})

test('deleting a note removes it and its recording, after a confirmation', async ({ page }) => {
  const watcher = watchConsole(page)
  await openAuthed(page, '/app/health-notes', watcher)
  // ⚠️ Every copy, not the first: an earlier interrupted run may have saved
  // the same note, and this test must leave the demo patient clean either way.
  for (const text of ['Headache since yesterday evening', 'My face is drooping']) {
    const matching = page.getByRole('article').filter({ hasText: text })
    for (let remaining = await matching.count(); remaining > 0; remaining -= 1) {
      await matching.first().getByRole('button', { name: /delete/i }).click()
      const confirm = page.getByRole('dialog', { name: /delete this note/i })
      await expect(confirm).toContainText(/cannot be undone/i)
      await confirm.getByRole('button', { name: /delete note/i }).click()
      await expect(confirm).toBeHidden()
      await expect(matching).toHaveCount(remaining - 1)
    }
    await expect(page.getByText(/its recording has been removed/i)).toBeVisible()
  }
  expect(watcher.errors, 'console errors').toEqual([])
})
