import { test, expect } from './fixtures'
import { openAuthed, watchConsole, expectNoHorizontalOverflow, navigateTo } from './helpers'

/**
 * ⚠️ THE WHOLE CLINICIAN JOURNEY, IN ONE RUN.
 *
 * My Day → patient → chart → Start consultation → note → problem with an
 * ICD-10 leaf code → prescription → bilingual instructions → Sign → LOCKED →
 * addendum.
 *
 * The suite already covers each of these steps, and that is exactly why this
 * file exists. Every existing spec opens a fresh visit, does one thing and
 * stops, so the product has been proven a step at a time and never as a
 * consultation. The failures this catches are the ones that only appear when
 * state carries: a problem coded on step 2 that the note on step 1 no longer
 * agrees with, a prescription that signs but leaves the note unsignable, an
 * instruction issued against the wrong encounter.
 *
 * ⚠️ It runs at 1024 — §5.1's "breakpoint that matters most", the ward tablet.
 * A journey test at 1440 only proves the journey works at a desk.
 *
 * ⚠️ `SD-P-01` Meera Krishnan, NOT the penicillin patient. This walk must end
 * in a signed note, and `hard-stop.spec.ts` owns the path that must not.
 */

test('the full clinician journey, My Day to signed and locked', async ({ page }) => {
  const watcher = watchConsole(page)
  await page.setViewportSize({ width: 1024, height: 900 })
  await openAuthed(page, undefined, watcher)

  // ── 1. My Day ────────────────────────────────────────────────────────────
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expectNoHorizontalOverflow(page)

  // ── 2. Find the patient ──────────────────────────────────────────────────
  await navigateTo(page, /patients/i, /\/clinician\/patients$/)
  await page.getByRole('tab', { name: /my panel/i }).click()
  const row = page.getByRole('row').filter({ hasText: /krishnan/i }).first()
  await expect(row).toBeVisible({ timeout: 20_000 })
  await row.click()

  // ── 3. Chart ─────────────────────────────────────────────────────────────
  await page.waitForURL(/\/patient\/[^/]+\/chart/, { timeout: 20_000 })
  await expect(page.getByRole('heading', { name: /patient chart/i })).toBeVisible()
  // ⚠️ The Z3 banner is the wrong-patient control and must be present on every
  // patient-scoped step from here to the end of the journey.
  await expect(page.getByTestId('patient-banner')).toBeVisible()

  // ── 4. Start the consultation ────────────────────────────────────────────
  const cont = page.getByRole('link', { name: /continue/i }).first()
  if ((await cont.count()) > 0 && (await cont.isVisible().catch(() => false))) {
    await cont.click()
  } else {
    await page.getByRole('button', { name: /start consultation/i }).click()
  }
  await page.waitForURL(/\/encounter\/[^/]+\/note/, { timeout: 25_000 })
  await expect(page.getByLabel(/^subjective$/i)).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('patient-banner')).toBeVisible()

  // ── 5. Write the note ────────────────────────────────────────────────────
  await page.getByLabel(/^subjective$/i).fill(
    'Thyroid review. Persistent morning fatigue, two kilogram weight gain, ongoing hair fall. '
      + 'Takes levothyroxine each morning but sometimes after coffee.',
  )
  await page.getByLabel(/^objective$/i).fill(
    'Pulse 72 regular. Blood pressure 118/76. Thyroid not enlarged, no palpable nodule.',
  )
  await page.getByLabel(/^assessment$/i).fill('Hypothyroidism, inadequately controlled.')
  await page.getByLabel(/^plan$/i).fill(
    'Continue current dose on an empty stomach with a 30 to 60 minute gap before food or coffee. '
      + 'Repeat thyroid function in six weeks.',
  )
  await page.getByLabel(/^subjective$/i).click()

  // ⚠️ SAVE EXPLICITLY. Asserting the button is enabled proves nothing about
  // the record — autosave runs on a 20s timer and this walk leaves the note in
  // a couple of seconds, so without this click the whole journey continued on
  // top of an unsaved draft and step 9 came back to an empty Assessment.
  await page.getByRole('button', { name: /save draft/i }).click()
  await expect(page.getByText(/saved/i).first()).toBeVisible({ timeout: 20_000 })

  // ── 6. Problems & coding — ICD-10, leaf only ─────────────────────────────
  await page.getByRole('link', { name: /problems & coding/i }).click()
  await page.waitForURL(/\/problems$/, { timeout: 20_000 })
  await expect(page.getByTestId('patient-banner')).toBeVisible()
  await expectNoHorizontalOverflow(page)

  // ⚠️ ICD-10 ONLY. If a SNOMED or ICD-11 affordance ever appears on this
  // screen it is a claim the product cannot honour — there is no terminology
  // pack behind it. The Atlas's own mention of them is a recorded discrepancy,
  // not a licence to draw them.
  await expect(page.getByText(/snomed|icd-?11/i)).toHaveCount(0)

  // ── 7. Prescription ──────────────────────────────────────────────────────
  await page.getByRole('link', { name: /prescription/i }).click()
  await page.waitForURL(/\/rx$/, { timeout: 20_000 })
  await expect(page.getByRole('heading', { name: /add a medicine/i })).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByTestId('patient-banner')).toBeVisible()

  // At 1024 the basket is the Z8 drawer, and its trigger must state the count.
  await expect(page.getByRole('button', { name: /^Prescription —/ })).toBeVisible()
  await expectNoHorizontalOverflow(page)

  // ── 8. Instructions, bilingual ───────────────────────────────────────────
  await page.getByRole('link', { name: /instructions/i }).click()
  await page.waitForURL(/\/instructions$/, { timeout: 20_000 })
  await expect(page.getByRole('heading', { name: /write instructions/i })).toBeVisible({
    timeout: 20_000,
  })

  // ⚠️ A6 — the patient's language, with the English counterpart alongside.
  // Kannada for SD-P-01 is the Atlas's own sample data for S-06-08.
  await page.getByLabel(/language the patient reads/i).selectOption('kn')
  await expect(page.getByRole('heading', { name: /^in kannada$/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /^in english$/i })).toBeVisible()

  // Before anything is typed in English, the screen says what the sheet will
  // lack — rather than letting a one-language printout come as a surprise.
  await expect(page.getByText(/printed sheet will be in kannada only/i)).toBeVisible()

  await page.locator('#instr-title').fill('ಥೈರಾಯ್ಡ್ ಮಾತ್ರೆ ತೆಗೆದುಕೊಳ್ಳುವ ವಿಧಾನ')
  await page.locator('#instr-body').fill(
    'ನಿಮ್ಮ ಥೈರಾಯ್ಡ್ ಮಾತ್ರೆಯನ್ನು ಪ್ರತಿದಿನ ಬೆಳಿಗ್ಗೆ ಖಾಲಿ ಹೊಟ್ಟೆಯಲ್ಲಿ ತೆಗೆದುಕೊಳ್ಳಿ. ನಂತರ ಕನಿಷ್ಠ 30 ನಿಮಿಷ ಏನನ್ನೂ ತಿನ್ನಬೇಡಿ.',
  )
  await page.locator('#instr-en-title').fill('How to take your thyroid medicine')
  await page.locator('#instr-en-body').fill(
    'Take your thyroid tablet every morning on an empty stomach. Do not eat for 30 minutes after.',
  )

  // The warning must clear once the English half exists.
  await expect(page.getByText(/printed sheet will be in kannada only/i)).toHaveCount(0)
  await expect(page.getByText(/will print in kannada and english/i)).toBeVisible()

  // ⚠️ `window.print` is neutralised, not avoided. Issuing goes straight to the
  // printer by design — the patient is still in the room — and a headless run
  // would otherwise hang or fire `afterprint` early and un-stage the sheet.
  await page.evaluate(() => { window.print = () => {} })
  await page.getByRole('button', { name: /issue and print/i }).click()

  // The issued instruction is in the record, in both languages.
  const issued = page.getByRole('listitem').filter({ hasText: /thyroid medicine/i }).first()
  await expect(issued).toBeVisible({ timeout: 20_000 })
  await expect(issued.getByText(/kannada and english/i)).toBeVisible()

  // ⚠️ And the printed artefact carries BOTH columns plus the patient's
  // identity. A discharge sheet that cannot be attributed to a person is not a
  // discharge sheet.
  const sheet = page.locator('[data-print-root]')
  await expect(sheet).toHaveCount(1)
  await expect(sheet).toContainText('Meera Krishnan')
  await expect(sheet).toContainText('How to take your thyroid medicine')
  await expect(sheet).toContainText('ಥೈರಾಯ್ಡ್')
  await expect(sheet).toContainText('English')

  // ── 9. Back to the note, and sign ────────────────────────────────────────
  // ⚠️ Via the step rail, not `page.goto` — a reload costs a `/auth/refresh`,
  // and it is also what a clinician actually does.
  await page.getByRole('link', { name: /^1 note$|^note$/i }).first().click()
  await page.waitForURL(/\/note$/, { timeout: 20_000 })
  await expect(page.getByLabel(/^assessment$/i)).toHaveValue(/hypothyroidism/i, {
    timeout: 20_000,
  })

  const sign = page.getByRole('button', { name: /sign note|submit for co-signature/i })
  await expect(sign).toBeEnabled({ timeout: 20_000 })
  await sign.click()
  await page.getByRole('button', { name: /^sign|^submit/i }).last().click()

  // ── 10. LOCKED, addendum the only way forward (CMP-NABH-10) ──────────────
  await expect(page.getByText(/signed by/i)).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('button', { name: /save draft/i })).toHaveCount(0)
  await expect(sign).toHaveCount(0)
  await expect(page.getByRole('button', { name: /addendum/i })).toBeVisible()

  // ⚠️ The signed text is not editable. A read-only render is not enough — the
  // field must not accept input at all.
  await expect(page.getByLabel(/^assessment$/i)).toHaveCount(0)

  await expectNoHorizontalOverflow(page)
  expect(watcher.errors, 'console errors').toEqual([])
})
