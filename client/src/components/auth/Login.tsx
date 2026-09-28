import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { CheckCircle, Shield } from 'lucide-react'
import { useAuth } from '../../app/useAuth'
import BrandMark from '../common/BrandMark'
import AuthShell from './AuthShell'
import EntryPage from './EntryPage'
import HospitalSignIn from './HospitalSignIn'
import PatientSignIn from './PatientSignIn'
import { parseAudience, parseHospitalRole, type Audience, type HospitalRoleId } from './audience'

/**
 * Sign in, addressed to whoever chose the door on the entry page.
 *
 *  - no `?as`        — the entry page itself: two cards, Patient | Hospital.
 *  - `?as=patient`   — mobile number (a code by SMS) or email + password;
 *                      plus "Create an account". No emailed sign-in code:
 *                      withdrawn 25 Sep 2026, and the server refuses it.
 *  - `?as=hospital`  — "Which role defines you best?" (`&role=doctor|
 *                      resident|nurse|lab|hospital-admin|platform-admin`),
 *                      then work email + password. Only a hospital
 *                      administrator can create an account from here;
 *                      everyone else is added by theirs.
 *  - `?as=clinician` — the old Doctor/Clinician door: opens Hospital with
 *                      Doctor chosen, and the address is rewritten.
 *
 * ⚠️ THE DOOR AND THE ROLE ARE NOT ROLE CLAIMS. Neither is sent to the
 * server; the account's role decides the portal after sign-in.
 *
 * ⚠️ EVERY ADDRESS CHANGE KEEPS ROUTER STATE. `from` (return after sign-in),
 * `expired` and `message` live in `location.state`; a search-param update that
 * dropped them would silently break "return to where you were".
 */

interface LoginLocationState {
  message?: string
  expired?: boolean
  from?: string
}

export default function Login() {
  const [params] = useSearchParams()
  const audience = parseAudience(params.get('as'))
  if (audience === null) return <EntryPage />
  // Keyed so switching doors starts a clean state machine.
  return <DoorSignIn key={audience} audience={audience} />
}

function DoorSignIn({ audience }: { audience: Audience }) {
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const state = (location.state ?? null) as LoginLocationState | null
  const legacyDoctorLink = params.get('as') === 'clinician'
  const role = audience === 'hospital'
    ? parseHospitalRole(params.get('role')) ?? (legacyDoctorLink ? 'doctor' : null)
    : null

  const writeRole = useCallback(
    (next: HospitalRoleId) => setParams({ as: 'hospital', role: next }, { replace: true, state: location.state }),
    [setParams, location.state],
  )

  // Once, on arrival: an old Doctor/Clinician link becomes a Hospital one.
  const normalised = useRef(false)
  useEffect(() => {
    if (normalised.current) return
    normalised.current = true
    if (legacyDoctorLink) writeRole(role ?? 'doctor')
  }, [legacyDoctorLink, role, writeRole])

  // A sign-in error left on the shared auth context by an earlier attempt
  // must not greet this screen; once, on arrival.
  const { clearError } = useAuth()
  const clearErrorOnArrival = useRef(clearError)
  useEffect(() => {
    clearErrorOnArrival.current()
    document.title = 'Sign in · SHRI HEALTH'
  }, [])

  // ⚠️ Announced, not just shown. A status element inserted together with
  // its text on a route change is often not read out, so the banners live in
  // an always-present polite region and are filled in after mount.
  const [announce, setAnnounce] = useState(false)
  useEffect(() => setAnnounce(true), [])
  const sessionExpired = state?.expired === true
  const successMessage = state?.message ?? ''

  return (
    <AuthShell>
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10 sm:px-6">
        <div className="mb-8 flex items-center gap-2.5">
          <BrandMark size={18} />
          <span className="text-sm font-semibold tracking-[0.06em] text-ink">SHRI HEALTH</span>
        </div>

        <div aria-live="polite" aria-atomic="true">
          {announce && sessionExpired && (
            <p className="mb-5 flex items-center gap-2 rounded-md border border-warning-fg/40 bg-warning-bg px-3.5 py-2.5 text-sm font-medium text-warning-fg">
              <Shield size={16} strokeWidth={2} aria-hidden="true" className="flex-shrink-0" />
              <span>You were signed out to protect your information. Please sign in again.</span>
            </p>
          )}
          {announce && successMessage !== '' && (
            <p className="mb-5 flex items-center gap-2 rounded-md border border-success-fg/25 bg-success-bg px-3.5 py-2.5 text-sm font-medium text-success-fg">
              <CheckCircle size={16} strokeWidth={2} aria-hidden="true" className="flex-shrink-0" />
              <span>{successMessage}</span>
            </p>
          )}
        </div>

        {audience === 'patient' ? <PatientSignIn /> : <HospitalSignIn role={role} onRoleChange={writeRole} />}
      </div>
    </AuthShell>
  )
}
