import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { DOCTOR, SECOND_CONSULTANT, RESIDENT, PATIENT, HOSPITAL_ADMIN, PITCH_PATIENT, PITCH_PASSWORD, PASSWORD } from './helpers'

/**
 * Where the suite's authenticated sessions live, and who they belong to.
 *
 * ⚠️ THE FILES HOLD A LIVE REFRESH TOKEN. They are gitignored, and they are not
 * evidence or fixtures — they are credentials with a 30-day life. Treat them
 * the way you would treat a password in a file.
 *
 * ⚠️ AND THEY ARE ONE-SHOT. `/auth/refresh` rotates: presenting a token
 * revokes it and issues a replacement. Replaying a revoked one is not a soft
 * failure — `refreshToken.service.ts` reads it as a captured token, revokes the
 * **entire login family**, and writes a Critical `TokenReuseDetected` audit
 * row. So a state file is only valid until the next page load that uses it,
 * which is why `fixtures.ts` re-saves it after every test and why
 * `auth.setup.ts` re-mints all of them on every run.
 */

const here = path.dirname(fileURLToPath(import.meta.url))

export const AUTH_DIR = path.join(here, '.auth')

/** The demo cast, by the short name specs use in `test.use({ demoUser })`. */
export const DEMO_USERS = {
  doctor: DOCTOR,
  desai: SECOND_CONSULTANT,
  resident: RESIDENT,
  patient: PATIENT,
  hadmin: HOSPITAL_ADMIN,
  meenakshi: PITCH_PATIENT,
} as const

export type DemoUser = keyof typeof DEMO_USERS

/**
 * Each account's password. Everyone in the demo clinic shares
 * DEMO_CLINIC_PASSWORD; the pitch account has its own. An empty value means
 * "not configured here" — setup skips that account and its specs skip too.
 */
export function passwordFor(user: DemoUser): string {
  return user === 'meenakshi' ? PITCH_PASSWORD : PASSWORD
}

export function statePath(user: DemoUser): string {
  return path.join(AUTH_DIR, `${user}.json`)
}

// ⚠️ Re-exported, not defined here — see apiOrigin.ts for why. Keeping the
// name importable from this module means no spec had to change.
export { API_ORIGIN } from './apiOrigin'
