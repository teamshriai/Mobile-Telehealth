import { test, expect, devices, request as pwRequest } from '@playwright/test'
import type { Page } from '@playwright/test'
import { codeForChallenge, hasCodeForChallenge, linkFor } from './otpOutbox'
import { API_ORIGIN } from './authState'
import { DOCTOR, HOSPITAL_ADMIN, PASSWORD, RESIDENT, expectNoHorizontalOverflow } from './helpers'

/**
 * Signing in and signing up, for every kind of account.
 *
 *   /            the entry page — two doors: Patient | Hospital
 *   patient      mobile number (SMS code) · email + password · create account
 *   hospital     "Which role defines you best?" → work email + password.
 *                Only Hospital administrator offers "create account"; doctors,
 *                residents, nurses and lab staff are added by their hospital
 *                administrator (26 Sep 2026).
 *   /register    Patient | Hospital Administrator — nothing else
 *
 * ⚠️ NO `storageState`, NO `dependencies: ['setup']`. Every test signs in for
 * real; a session minted elsewhere would assume away the thing under test.
 *
 * ⚠️ RUN THIS PROJECT ON ITS OWN (`npm run test:e2e:auth`) — it spends per-IP
 * limiters the rest of the suite needs. One run costs about 15 page loads of
 * the 60 `/auth/refresh` calls per 15 minutes, 4 of 10 registrations, 2 of 5
 * password resets, 4 of 10 reset-link checks (StrictMode runs that check
 * twice in dev) and 5 of 20 code requests — so two runs fit one window.
 * Restarting the API resets its in-memory limiters.
 *
 * ⚠️ WHAT A RUN LEAVES BEHIND (all `@example.invalid`, so no mail can ever be
 * delivered): four patients, one self-registered hospital administrator, and
 * one lab technician added to the demo hospital through the real
 * hospital-admin API. The hospital-admin screens neither list nor count lab
 * staff, so the demo is unaffected; the provisioning writes a
 * `UserRegistered` audit row attributed to the demo hospital administrator.
 *
 * ⚠️ PATIENTS ARE CREATED HERE, not taken from the §8 cast: no cast patient has
 * a login, and a test that signs in, resets a password and burns OTP
 * challenges must not do that to a shared demo identity.
 *
 * ⚠️ CODES AND LINKS ARE READ FROM THE OUTBOX, never typed as `123456`. The
 * suite passes identically with the demo code on or off, so it proves the
 * flow rather than the demo setting.
 */

test.describe.configure({ mode: 'serial' })

const stamp = Date.now().toString().slice(-8)

/**
 * ONE allocator for every mobile number this file registers. Registration,
 * staff provisioning and the admin CLI all refuse a number already in use, and
 * two identities once shared a prefix here — which failed the run. Each role
 * gets its own two-digit lead; `71` is reserved for the enumeration check and
 * must never be registered.
 */
const MOBILE = {
  patient: `93${stamp}`,
  patient2: `85${stamp}`,
  unregistered: `71${stamp}`,
  signUpPatient: `66${stamp}`,
  signUpHospitalAdmin: `67${stamp}`,
  labTechnician: `68${stamp}`,
} as const

const PATIENT = {
  email: `e2e.patient.${stamp}@example.invalid`,
  mobile: MOBILE.patient,
  password: 'Entry#Test2026',
}
const MASKED_TAIL = PATIENT.mobile.slice(-4)
/** A second patient, only for the enumeration check: the first one's number
 *  is still inside its 30s resend cooldown by then. */
const PATIENT_2 = {
  email: `e2e.patient2.${stamp}@example.invalid`,
  mobile: MOBILE.patient2,
  password: PATIENT.password,
}

const HOSPITAL_ROLE_LABELS = [
  'Doctor',
  'Resident doctor',
  'Nurse or healthcare worker',
  'Lab technician',
  'Hospital administrator',
  'Platform administrator',
]

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

async function openDoor(page: Page, door: 'patient' | 'hospital'): Promise<void> {
  await page.goto('/')
  await page.getByTestId(`entry-${door}`).click()
  await page.waitForURL(new RegExp(`/login\\?as=${door}`))
}

const roleField = (page: Page) => page.getByLabel('Which role defines you best?')

async function chooseRole(page: Page, label: string): Promise<void> {
  await roleField(page).selectOption({ label })
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

async function fillSignUp(page: Page, who: { first: string; email: string; mobile: string; password: string }): Promise<void> {
  await page.locator('#register-firstName').fill(who.first)
  await page.locator('#register-lastName').fill('Tester')
  await page.locator('#register-email').fill(who.email)
  await page.locator('#register-dateOfBirth').fill('1988-04-12')
  await page.locator('#register-phoneNumber').fill(who.mobile)
  await page.locator('#register-password').fill(who.password)
  await page.locator('#register-confirmPassword').fill(who.password)
  await page.locator('input[name="agreed"]').setChecked(true, { force: true })
}

// ── The entry page ───────────────────────────────────────────────────────────

test('the entry page has exactly two doors — Patient and Hospital — at every width', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /welcome to shri health/i })).toBeVisible()
  for (const width of [1920, 1440, 1024, 768, 414, 390, 375, 360, 320]) {
    // Resized, not reloaded: every load spends a refresh call.
    await page.setViewportSize({ width, height: 900 })
    await expect(page.locator('[data-testid^="entry-"]')).toHaveCount(2)
    await expect(page.getByTestId('entry-patient')).toBeVisible()
    await expect(page.getByTestId('entry-hospital')).toBeVisible()
    await expectNoHorizontalOverflow(page)
  }
  await expect(page.getByText(/doctor \/ clinician/i)).toHaveCount(0)
  // One "create account" path from here; /register asks Patient or Hospital
  // Administrator.
  await expect(page.getByRole('link', { name: /create an account/i })).toHaveAttribute('href', '/register')
})

test('the Patient door offers two methods; the Hospital door asks for a role, then a password', async ({ page }) => {
  await openDoor(page, 'patient')
  await expect(page.getByRole('heading', { name: /patient sign in/i })).toBeVisible()
  // Exactly two: mobile number, and email + password. No emailed code.
  await expect(page.getByRole('radio')).toHaveCount(2)
  for (const m of ['Mobile number', 'Email & password']) {
    await expect(page.getByRole('radio', { name: m, exact: true })).toBeVisible()
  }
  await expect(page.getByText(/email otp/i)).toHaveCount(0)
  await expect(page.getByRole('link', { name: /create an account/i })).toHaveAttribute('href', '/register?as=patient')

  // The method radios are one Tab stop with arrow keys.
  await page.getByRole('radio', { name: 'Mobile number' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('radio', { name: 'Email & password' })).toBeFocused()
  await expect(page.getByRole('radio', { name: 'Email & password' })).toHaveAttribute('aria-checked', 'true')

  await page.getByRole('link', { name: /choose a different account type/i }).click()
  await page.getByTestId('entry-hospital').click()
  await page.waitForURL(/\/login\?as=hospital/)
  await expect(page.getByRole('heading', { name: /hospital sign in/i })).toBeVisible()
  // ⚠️ No OTP for staff, and nothing to type until a role is chosen.
  await expect(page.getByRole('radiogroup')).toHaveCount(0)
  await expect(page.getByLabel(/mobile number/i)).toHaveCount(0)
  await expect(page.locator('#login-password')).toHaveCount(0)
  await expect(roleField(page)).toBeFocused()

  // Exactly the roles the backend has — no Pharmacy, no Patient.
  const labels = (await roleField(page).locator('option').allTextContents()).map((t) => t.trim()).slice(1)
  expect(labels).toEqual(HOSPITAL_ROLE_LABELS)

  for (const label of HOSPITAL_ROLE_LABELS) {
    await chooseRole(page, label)
    await expect(page.locator('#login-password')).toBeVisible()
    await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /create an account/i })).toHaveCount(0)
    const signUp = page.getByRole('link', { name: /create an administrator account/i })
    if (label === 'Hospital administrator') {
      // Hospital → Admin → Sign in / Sign up.
      await expect(signUp).toHaveAttribute('href', '/register?as=hospital')
      await expect(page.getByTestId('staff-account-note')).toHaveCount(0)
    } else {
      // Hospital → Doctor, Resident, Nurse, Lab, Platform → Sign in only.
      await expect(signUp).toHaveCount(0)
    }
    if (['Doctor', 'Resident doctor', 'Nurse or healthcare worker', 'Lab technician'].includes(label)) {
      await expect(page.getByTestId('staff-account-note')).toContainText(/hospital administrator creates your account/i)
    }
  }
  // The role is in the address, and a typed email survives a change of role.
  await chooseRole(page, 'Doctor')
  await expect(page).toHaveURL(/as=hospital&role=doctor/)
  await page.locator('#login-password-email').fill('someone@hospital.example')
  await chooseRole(page, 'Lab technician')
  await expect(page.locator('#login-password-email')).toHaveValue('someone@hospital.example')
})

test('an old Doctor/Clinician link opens the Hospital sign-in with Doctor chosen', async ({ page }) => {
  await page.goto('/login?as=clinician')
  await page.waitForURL(/\/login\?as=hospital&role=doctor/)
  await expect(page.getByRole('heading', { name: /hospital sign in/i })).toBeVisible()
  await expect(roleField(page)).toHaveValue('doctor')
  await expect(page.locator('#login-password-email')).toBeFocused()
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

// ── Hospital ─────────────────────────────────────────────────────────────────

test('doctor: Hospital → Doctor → email + password lands in the Clinician Portal', async ({ page }) => {
  await openDoor(page, 'hospital')
  await chooseRole(page, 'Doctor')
  await passwordSignIn(page, DOCTOR, PASSWORD)
  await page.waitForURL(/\/clinician/, { timeout: 30_000 })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('the door is not authority: a doctor who picks "Patient", and a patient who picks "Hospital", land where their account belongs', async ({ page }) => {
  await openDoor(page, 'patient')
  await page.getByRole('radio', { name: 'Email & password' }).click()
  await passwordSignIn(page, DOCTOR, PASSWORD)
  await page.waitForURL(/\/clinician/, { timeout: 30_000 })

  await page.getByRole('button', { name: /ananya/i }).first().click()
  await page.getByRole('menuitem', { name: /sign out/i }).click()
  await page.waitForURL(/\/login/)
  await page.getByTestId('entry-hospital').click()
  await chooseRole(page, 'Doctor')
  await passwordSignIn(page, PATIENT.email, PATIENT.password)
  await page.waitForURL(/\/(onboarding|app)/, { timeout: 30_000 })
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
    data: { channel: 'Sms', identifier: MOBILE.unregistered },
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

test('an anonymous deep link returns there after Hospital sign-in; a wrong-role route goes to the account’s own home', async ({ page }) => {
  test.skip(PASSWORD === '', 'needs DEMO_CLINIC_PASSWORD for the demo hospital administrator')
  await page.goto('/hospital-admin/doctors')
  await page.waitForURL(/\/login$/, { timeout: 30_000 })
  await page.getByTestId('entry-hospital').click()
  await chooseRole(page, 'Hospital administrator')
  await passwordSignIn(page, HOSPITAL_ADMIN, PASSWORD)
  await page.waitForURL(/\/hospital-admin\/doctors/, { timeout: 30_000 })

  await page.goto('/clinician')
  await page.waitForURL(/\/hospital-admin\/?$/, { timeout: 30_000 })
})

// ── The staff invitation — the hospital administrator adds staff ─────────────

test('a hospital administrator adds a lab technician, who sets a password from the invitation and signs in on the Hospital side', async ({ page }) => {
  test.skip(PASSWORD === '', 'needs DEMO_CLINIC_PASSWORD for the demo hospital administrator')
  const email = `e2e.labtech.${stamp}@example.invalid`
  const labPassword = 'Lab#Entry2026'
  const since = Date.now()

  // The real workflow: the demo hospital's administrator adds a team member
  // through the same endpoint as "Add team member".
  const api = await pwRequest.newContext()
  const login = await api.post(`${API_ORIGIN}/api/v1/auth/login`, {
    data: { email: HOSPITAL_ADMIN, password: PASSWORD },
  })
  expect(login.status()).toBe(200)
  const token = ((await login.json()) as { data: { token: string } }).data.token
  const created = await api.post(`${API_ORIGIN}/api/v1/hospital-admin/staff`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      role: 'LabTechnician',
      firstName: 'Entry',
      lastName: 'Labtech',
      email,
      mobile: MOBILE.labTechnician,
      specialty: 'Lab technician',
      yearsExperience: 3,
    },
  })
  expect(created.status(), `adding the lab technician: ${await created.text()}`).toBe(201)
  await api.dispose()

  const link = await linkFor(email, 'password-setup', since)
  await page.goto(new URL(link).pathname + new URL(link).search)
  await expect(page.getByRole('heading', { name: /set your password/i })).toBeVisible({ timeout: 20_000 })
  await page.getByLabel('New password', { exact: true }).fill(labPassword)
  await page.getByLabel('Confirm new password').fill(labPassword)
  await page.getByRole('button', { name: /set password/i }).click()

  // Invitations go only to staff, so it lands on the Hospital sign-in — with
  // no role borrowed from anyone else.
  await page.waitForURL(/\/login\?as=hospital$/, { timeout: 20_000 })
  await expect(page.getByText(/password set\. choose your role/i)).toBeVisible()
  await expect(roleField(page)).toHaveValue('')
  await chooseRole(page, 'Lab technician')
  await passwordSignIn(page, email, labPassword)
  await page.waitForURL(/\/clinician/, { timeout: 30_000 })
  // The honest "not available yet" page for lab staff — never a fake portal.
  await expect(page.getByRole('heading', { name: /not available yet/i })).toBeVisible()

  // And a resident, from the same door.
  await page.getByRole('button', { name: /sign out/i }).click()
  await page.waitForURL(/\/login/)
  await page.getByTestId('entry-hospital').click()
  await chooseRole(page, 'Resident doctor')
  await passwordSignIn(page, RESIDENT, PASSWORD)
  await page.waitForURL(/\/clinician/, { timeout: 30_000 })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

// ── Sign-up ──────────────────────────────────────────────────────────────────

test('sign-up offers Patient and Hospital Administrator only; both work through the UI', async ({ page }) => {
  const registerCalls: string[] = []
  page.on('request', (r) => {
    if (r.url().includes('/auth/register')) registerCalls.push(r.method())
  })

  await page.goto('/register')
  await expect(page.getByRole('heading', { name: /which of these describes you/i })).toBeVisible()
  const choices = page.getByRole('list', { name: 'Account type' }).getByRole('button')
  await expect(choices).toHaveCount(2)
  await expect(choices.nth(0)).toContainText('Patient')
  await expect(choices.nth(1)).toContainText('Hospital Administrator')
  await expect(page.getByRole('button', { name: /^doctor/i })).toHaveCount(0)
  await expect(page.getByTestId('staff-signup-note')).toContainText(/hospital administrator creates your account/i)
  for (const width of [1280, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await expectNoHorizontalOverflow(page)
  }
  await page.setViewportSize({ width: 1280, height: 900 })

  // Patient → Sign up, from the Patient door.
  await page.getByRole('link', { name: 'Sign in', exact: true }).click()
  await page.waitForURL(/\/login$/)
  await page.getByTestId('entry-patient').click()
  await page.getByRole('link', { name: /create an account/i }).click()
  await page.waitForURL(/\/register\?as=patient/)
  await expect(page.getByRole('heading', { name: 'Create your account', level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Patient', exact: true })).toBeVisible()

  // Nothing is sent until the form is valid.
  await page.getByRole('button', { name: /^create account/i }).click()
  await expect(page.getByText('First name is required')).toBeVisible()
  expect(registerCalls, 'an invalid form must not reach the server').toEqual([])

  await fillSignUp(page, {
    first: 'Signup',
    email: `e2e.signup.patient.${stamp}@example.invalid`,
    mobile: MOBILE.signUpPatient,
    password: 'Signup#Patient26',
  })
  await page.getByRole('button', { name: /^create account/i }).click()
  await page.waitForURL(/\/onboarding/, { timeout: 30_000 })

  // Hospital → Hospital administrator → Sign up.
  await page.getByRole('button', { name: /sign out/i }).click()
  await page.waitForURL(/\/login/)
  await page.getByTestId('entry-hospital').click()
  await chooseRole(page, 'Hospital administrator')
  await page.getByRole('link', { name: /create an administrator account/i }).click()
  await page.waitForURL(/\/register\?as=hospital/)
  await expect(page.getByRole('button', { name: 'Hospital Administrator', exact: true })).toBeVisible()
  await fillSignUp(page, {
    first: 'Signup',
    email: `e2e.signup.hadmin.${stamp}@example.invalid`,
    mobile: MOBILE.signUpHospitalAdmin,
    password: 'Signup#Hadmin26',
  })
  await page.getByRole('button', { name: /^create account/i }).click()
  // A new administrator creates or joins a hospital first.
  await page.waitForURL(/\/onboarding/, { timeout: 30_000 })
  expect(registerCalls).toHaveLength(2)
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

  // From the entry page the reset landed on — no extra page load.
  await page.getByTestId('entry-patient').click()
  await page.getByRole('radio', { name: 'Email & password' }).click()
  await passwordSignIn(page, PATIENT.email, NEW_PASSWORD)
  await page.waitForURL(/\/(onboarding|app)/, { timeout: 30_000 })
})

// ── Session handling ─────────────────────────────────────────────────────────

test('an idle hospital session ends on the entry page with the "signed out" notice', async ({ page }) => {
  // Time runs normally until fast-forwarded; the clinician idle limit is 15 min.
  await page.clock.install()
  await openDoor(page, 'hospital')
  await chooseRole(page, 'Doctor')
  await passwordSignIn(page, DOCTOR, PASSWORD)
  await page.waitForURL(/\/clinician/, { timeout: 30_000 })
  // The idle clock starts when the portal shell mounts — jumping time before
  // then would move the clock without any timer to fire.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  // The warning first (a minute before the 15-minute limit), then the end —
  // two steps, as a person would see them.
  await page.clock.fastForward('14:10')
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await page.clock.fastForward('01:05')
  await page.waitForURL(/\/login/, { timeout: 30_000 })
  await expect(page.getByText(/signed out to protect your information/i)).toBeVisible()
  await expect(page.getByTestId('entry-hospital')).toBeVisible()
})

// ── On a phone ───────────────────────────────────────────────────────────────

test.describe('on a phone', () => {
  // `defaultBrowserType` cannot change inside a file; the rest of the device can.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { defaultBrowserType, ...pixel } = devices['Pixel 7']
  test.use(pixel)

  test('the doors, the role dropdown and the form work by touch without sideways scrolling', async ({ page }) => {
    await page.goto('/')
    await expectNoHorizontalOverflow(page)
    await page.getByTestId('entry-hospital').tap()
    await page.waitForURL(/\/login\?as=hospital/)
    await roleField(page).selectOption('nurse')
    await expect(page.getByTestId('staff-account-note')).toBeVisible()
    await page.locator('#login-password-email').tap()
    await expect(page.locator('#login-password-email')).toBeFocused()
    await expectNoHorizontalOverflow(page)
    for (const target of [roleField(page), page.getByRole('button', { name: /^sign in$/i }), page.getByRole('button', { name: /show password/i })]) {
      const box = await target.boundingBox()
      expect(box?.height ?? 0, 'touch targets are at least 44px').toBeGreaterThanOrEqual(44)
    }
  })
})
