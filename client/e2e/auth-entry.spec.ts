import { test, expect, request as pwRequest } from '@playwright/test'
import type { Page } from '@playwright/test'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { codeForChallenge, hasCodeForChallenge, linkFor } from './otpOutbox'
import { API_ORIGIN } from './authState'
import { DOCTOR, PASSWORD, expectNoHorizontalOverflow } from './helpers'

/**
 * The sign-in entry, for every kind of account.
 *
 *   /            "Who are you?" — Patient | Doctor/Clinician | Hospital Administrator
 *   patient      mobile number (SMS code) · email + password · create account
 *   clinician    email + password only
 *   hospital     email + password only
 *
 * ⚠️ NO `storageState`, NO `dependencies: ['setup']`. Every test signs in for
 * real; a session minted elsewhere would assume away the thing under test.
 * Opt-in project (`npm run test:e2e:auth`) because it spends the OTP,
 * forgot-password and reset limiters.
 *
 * ⚠️ PATIENTS ARE CREATED HERE, not taken from the §8 cast: no cast patient has
 * a login, and a test that signs in, resets a password and burns OTP
 * challenges must not do that to a shared demo identity. They are
 * `@example.invalid` so they can never receive mail.
 *
 * ⚠️ CODES ARE READ FROM THE OUTBOX, never typed as `123456`. The suite passes
 * identically with the demo code on or off, so it proves the flow rather than
 * the demo setting.
 */

test.describe.configure({ mode: 'serial' })

const stamp = Date.now().toString().slice(-8)
const PATIENT = {
  email: `e2e.patient.${stamp}@example.invalid`,
  mobile: `9${stamp.padStart(9, '3')}`,
  password: 'Entry#Test2026',
}
const MASKED_TAIL = PATIENT.mobile.slice(-4)
/** A second patient, only for the enumeration check: the first one's number
 *  is still inside its 30s resend cooldown by then. */
const PATIENT_2 = {
  email: `e2e.patient2.${stamp}@example.invalid`,
  mobile: `8${stamp.padStart(9, '5')}`,
  password: PATIENT.password,
}

test.beforeAll(async () => {
  const api = await pwRequest.newContext()
  for (const [p, first] of [[PATIENT, 'Entry'], [PATIENT_2, 'Second']] as const) {
    const res = await api.post(`${API_ORIGIN}/api/v1/auth/register`, {
      data: {
        email: p.email,
        password: p.password,
        firstName: first,
        lastName: 'Tester',
        dateOfBirth: '1990-01-01',
        phoneNumber: p.mobile,
        agreed: true,
      },
    })
    expect(res.status(), `registering the test patient: ${await res.text()}`).toBe(201)
  }
  await api.dispose()
})

async function openDoor(page: Page, door: 'patient' | 'clinician' | 'hospital'): Promise<void> {
  await page.goto('/')
  await page.getByTestId(`entry-${door}`).click()
  await page.waitForURL(new RegExp(`/login\\?as=${door}`))
}

/** Request a code through the UI; the challenge id comes off the network. */
async function requestCode(page: Page, mobile: string): Promise<string> {
  const response = page.waitForResponse(
    (r) => r.url().includes('/auth/otp/request') && r.request().method() === 'POST',
  )
  await page.getByRole('radio', { name: 'Mobile number' }).click()
  await page.getByLabel(/mobile number/i).fill(mobile)
  await page.getByRole('button', { name: /continue/i }).click()
  const res = await response
  expect(res.status()).toBe(200)
  return ((await res.json()) as { data: { challengeId: string } }).data.challengeId
}

async function enterCode(page: Page, code: string): Promise<void> {
  await page.locator('input[aria-label="Digit 1 of 6"]').focus()
  for (const ch of code) await page.keyboard.type(ch)
  await page.getByRole('button', { name: /^verify$/i }).click()
}

async function passwordSignIn(page: Page, email: string, password: string): Promise<void> {
  await page.locator('#login-password-email').fill(email)
  await page.locator('#login-password').fill(password)
  await page.getByRole('button', { name: /^sign in$/i }).click()
}

// ── The entry page ───────────────────────────────────────────────────────────

test('the entry page asks who you are, and has one sign-up link for every kind of account', async ({ page }) => {
  for (const width of [1440, 1024, 768, 390, 375]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /welcome to shri health/i })).toBeVisible()
    for (const door of ['patient', 'clinician', 'hospital'] as const) {
      await expect(page.getByTestId(`entry-${door}`)).toBeVisible()
    }
    await expectNoHorizontalOverflow(page)
  }
  // Exactly one "create account" path; /register asks Patient, Doctor or
  // Hospital Administrator (staff sign-up restored 25 Sep 2026).
  await expect(page.getByRole('link', { name: /create an account/i })).toHaveAttribute('href', '/register')
})

test('the patient door offers two methods; the staff doors offer password only', async ({ page }) => {
  await openDoor(page, 'patient')
  await expect(page.getByRole('heading', { name: /patient sign in/i })).toBeVisible()
  // Exactly two: mobile number, and email + password. No emailed code.
  await expect(page.getByRole('radio')).toHaveCount(2)
  for (const m of ['Mobile number', 'Email & password']) {
    await expect(page.getByRole('radio', { name: m, exact: true })).toBeVisible()
  }
  await expect(page.getByText(/email otp/i)).toHaveCount(0)
  await expect(page.getByRole('link', { name: /create an account/i })).toBeVisible()

  for (const door of ['clinician', 'hospital'] as const) {
    await openDoor(page, door)
    // ⚠️ No OTP for staff; sign-up is from the welcome page, not these doors.
    await expect(page.getByRole('radiogroup')).toHaveCount(0)
    await expect(page.getByLabel(/mobile number/i)).toHaveCount(0)
    await expect(page.locator('#login-password')).toBeVisible()
    await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /create an account/i })).toHaveCount(0)
  }
})

// ── Patient ──────────────────────────────────────────────────────────────────

test('patient: mobile OTP — a wrong code is refused, the right one signs in', async ({ page }) => {
  await openDoor(page, 'patient')
  const challengeId = await requestCode(page, PATIENT.mobile)
  await expect(page.getByText(new RegExp(`\\+91 ••••• •${MASKED_TAIL}`))).toBeVisible()

  const code = await codeForChallenge(challengeId)
  await enterCode(page, code === '000000' ? '111111' : '000000')
  await expect(page.getByRole('alert')).toContainText(/not correct/i)
  expect(page.url()).toMatch(/\/login/)

  await enterCode(page, code)
  // A new patient has not finished onboarding; either way it is the PATIENT side.
  await page.waitForURL(/\/(onboarding|app)/, { timeout: 30_000 })
})

test('patient: an emailed sign-in code is refused by the server', async () => {
  const api = await pwRequest.newContext()
  const res = await api.post(`${API_ORIGIN}/api/v1/auth/otp/request`, {
    data: { channel: 'Email', identifier: PATIENT.email },
  })
  expect(res.status(), 'sign-in codes go by SMS only').toBe(400)
  await api.dispose()
})

test('patient: email + password signs in, and the visibility toggle works', async ({ page }) => {
  await openDoor(page, 'patient')
  await page.getByRole('radio', { name: 'Email & password' }).click()
  await page.locator('#login-password').fill('peek')
  await expect(page.locator('#login-password')).toHaveAttribute('type', 'password')
  await page.getByRole('button', { name: /show password/i }).click()
  await expect(page.locator('#login-password')).toHaveAttribute('type', 'text')

  await passwordSignIn(page, PATIENT.email, 'Wrong#Password1')
  await expect(page.getByRole('alert')).toBeVisible()
  expect(page.url()).toMatch(/\/login/)

  await passwordSignIn(page, PATIENT.email, PATIENT.password)
  await page.waitForURL(/\/(onboarding|app)/, { timeout: 30_000 })
})

// ── Staff ────────────────────────────────────────────────────────────────────

test('doctor: email + password through the clinician door lands in the Clinician Portal', async ({ page }) => {
  await openDoor(page, 'clinician')
  await passwordSignIn(page, DOCTOR, PASSWORD)
  await page.waitForURL(/\/clinician/, { timeout: 30_000 })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('the door is not authority: a doctor who picks "Patient" still lands as a doctor', async ({ page }) => {
  await openDoor(page, 'patient')
  await page.getByRole('radio', { name: 'Email & password' }).click()
  await passwordSignIn(page, DOCTOR, PASSWORD)
  await page.waitForURL(/\/clinician/, { timeout: 30_000 })
})

test('staff cannot sign in by OTP — no code is sent, and the demo code does not work', async () => {
  const api = await pwRequest.newContext()
  // SD-S-01 Dr Ananya Iyer's registered mobile.
  const req = await api.post(`${API_ORIGIN}/api/v1/auth/otp/request`, {
    data: { channel: 'Sms', identifier: '9845012291' },
  })
  expect(req.status(), 'same 200 as any number — the response must not reveal staff').toBe(200)
  const { challengeId } = (await req.json()).data as { challengeId: string }

  await new Promise((r) => setTimeout(r, 500))
  expect(hasCodeForChallenge(challengeId), 'no code may be issued to a staff account').toBe(false)

  const verify = await api.post(`${API_ORIGIN}/api/v1/auth/otp/verify`, {
    data: { challengeId, code: '123456' },
  })
  expect(verify.status()).toBe(401)
  await api.dispose()
})

test('the OTP request never returns the code and never says who is registered', async () => {
  const api = await pwRequest.newContext()
  const known = await api.post(`${API_ORIGIN}/api/v1/auth/otp/request`, {
    data: { channel: 'Sms', identifier: PATIENT_2.mobile },
  })
  const unknown = await api.post(`${API_ORIGIN}/api/v1/auth/otp/request`, {
    data: { channel: 'Sms', identifier: `7${stamp.padStart(9, '1')}` },
  })
  expect(known.status()).toBe(200)
  {
    const a = await known.json()
    const b = await unknown.json()
    expect(unknown.status()).toBe(200)
    expect(b.message).toBe(a.message)
    expect(Object.keys(b.data).sort()).toEqual(Object.keys(a.data).sort())
    const code = await codeForChallenge(a.data.challengeId as string)
    expect((await known.text()).includes(code), 'the OTP must never appear in a response').toBe(false)
  }
  const role = await api.post(`${API_ORIGIN}/api/v1/auth/otp/request`, {
    data: { channel: 'Sms', identifier: '9845099998', role: 'Admin' },
  })
  expect(role.status(), 'a client-supplied role must be rejected').toBe(400)
  await api.dispose()
})

// ── Forgot password, for real ────────────────────────────────────────────────

test('forgot password changes the stored password: the old one fails, the new one works', async ({ page }) => {
  await openDoor(page, 'patient')
  await page.getByRole('radio', { name: 'Email & password' }).click()
  await page.getByRole('link', { name: /forgot password/i }).click()
  await page.waitForURL(/\/forgot-password\?as=patient/)

  const since = Date.now()
  // ⚠️ By its LABEL: this field's <label> had no `htmlFor`, so assistive tech
  // announced an unnamed input. Finding it by label is the regression check.
  await page.getByLabel('Email address').fill(PATIENT.email)
  await page.locator('#forgot-password-submit').click()
  const link = await linkFor(PATIENT.email, 'password-reset', since)

  const NEW_PASSWORD = 'Changed#Entry2026'
  await page.goto(new URL(link).pathname + new URL(link).search)
  await expect(page.getByRole('heading', { name: /set a new password/i })).toBeVisible({ timeout: 20_000 })
  await page.getByLabel('New password', { exact: true }).fill(NEW_PASSWORD)
  await page.getByLabel('Confirm new password').fill(NEW_PASSWORD)
  await page.getByRole('button', { name: /reset password/i }).click()
  await page.waitForURL(/\/login/, { timeout: 20_000 })

  const api = await pwRequest.newContext()
  const old = await api.post(`${API_ORIGIN}/api/v1/auth/login`, {
    data: { email: PATIENT.email, password: PATIENT.password },
  })
  expect(old.status(), 'the old password must stop working').toBe(401)
  await api.dispose()

  await openDoor(page, 'patient')
  await page.getByRole('radio', { name: 'Email & password' }).click()
  await passwordSignIn(page, PATIENT.email, NEW_PASSWORD)
  await page.waitForURL(/\/(onboarding|app)/, { timeout: 30_000 })
})

// ── The staff invitation ─────────────────────────────────────────────────────

test('a provisioned hospital admin sets a password from the invitation, then signs in', async ({ page }) => {
  const email = `e2e.hadmin.${stamp}@example.invalid`
  const since = Date.now()
  // The bootstrap CLI — the controlled path by which hospital admins exist.
  const cli = spawnSync(
    'npm',
    ['run', '-s', 'db:create-admin', '--', '--email', email, '--mobile', `8${stamp.padStart(9, '5')}`,
      '--first', 'Entry', '--last', 'Admin', '--role', 'HospitalAdmin'],
    { cwd: path.resolve(process.cwd(), '..', 'server'), encoding: 'utf8', timeout: 60_000 },
  )
  expect(cli.status, `create-admin failed:\n${cli.stderr}`).toBe(0)

  const link = await linkFor(email, 'password-setup', since)
  await page.goto(new URL(link).pathname + new URL(link).search)
  await expect(page.getByRole('heading', { name: /set your password/i })).toBeVisible({ timeout: 20_000 })
  await page.getByLabel('New password', { exact: true }).fill('Hospital#Entry26')
  await page.getByLabel('Confirm new password').fill('Hospital#Entry26')
  await page.getByRole('button', { name: /set password/i }).click()
  await page.waitForURL(/\/login/, { timeout: 20_000 })

  await openDoor(page, 'hospital')
  await passwordSignIn(page, email, 'Hospital#Entry26')
  // No hospital linked yet, so onboarding (create/join a hospital) comes first.
  await page.waitForURL(/\/(onboarding|hospital-admin)/, { timeout: 30_000 })
})
