import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Info } from 'lucide-react'
import DoorHeading from './DoorHeading'
import HospitalRoleField from './HospitalRoleField'
import PasswordSignIn from './PasswordSignIn'
import { AUDIENCE_COPY, hospitalRoleById, type HospitalRoleId } from './audience'
import { useFinishSignIn } from './useFinishSignIn'

/**
 * The Hospital sign-in screen (entry page → Hospital): everyone who works at
 * a hospital — doctors, residents, nurses, lab staff, hospital administrators —
 * plus the SHRI HEALTH platform team.
 *
 * Role first ("Which role defines you best?"), then work email + password.
 * Staff never get a one-time code: the server refuses to issue them one.
 *
 * ⚠️ THE ROLE CHANGES WORDS, NEVER ACCESS. It is not sent anywhere; the
 * account's role, from the server, decides the portal. A mismatch is never
 * reported ("this account is not a doctor") — that would tell a stranger what
 * kind of account an email address has.
 *
 * ⚠️ SIGN-UP IS FOR HOSPITAL ADMINISTRATORS ONLY. Doctors and other staff are
 * added by their hospital administrator (Add team member) and set a password
 * from the emailed link, so their roles offer no "create account" at all.
 */
interface HospitalSignInProps {
  role: HospitalRoleId | null
  onRoleChange: (role: HospitalRoleId) => void
}

export default function HospitalSignIn({ role, onRoleChange }: HospitalSignInProps) {
  const finish = useFinishSignIn()
  const selected = hospitalRoleById(role)
  const [busy, setBusy] = useState(false)
  // Where focus starts: on the role question — or, when the address already
  // named a role (an old Doctor link, "Back to sign in" from Forgot
  // password), straight on the email field. Never moved on a role CHANGE.
  const arrivedWithRole = useRef(role !== null)

  return (
    <div>
      <DoorHeading
        title={AUDIENCE_COPY.hospital.signInHeading}
        description="Choose your role, then sign in with your work email and password."
      />

      <HospitalRoleField
        id="hospital-role"
        value={role}
        onChange={onRoleChange}
        autoFocus={!arrivedWithRole.current}
        disabled={busy}
      />

      {/* Rendered once a role is chosen and then KEPT across role changes —
          same element, same place — so a typed email survives a change of mind. */}
      {selected !== null && (
        <div className="mt-5">
          <PasswordSignIn
            audience="hospital"
            hospitalRole={selected.id}
            onSignedIn={finish}
            autoFocus={arrivedWithRole.current}
            onBusyChange={setBusy}
          />

          {selected.selfSignUp ? (
            <p className="mt-6 text-sm text-ink-muted">
              Setting up a new hospital?{' '}
              <Link to="/register?as=hospital" className="focus-ring rounded font-semibold text-primary-700 hover:underline">
                Create an administrator account
              </Link>
            </p>
          ) : selected.id === 'platform-admin' ? (
            <p className="mt-6 text-xs leading-relaxed text-ink-subtle">
              Platform administrator accounts are created by the SHRI HEALTH team.
            </p>
          ) : (
            <div
              data-testid="staff-account-note"
              className="mt-6 flex items-start gap-2.5 rounded-lg border border-border-soft bg-surface-2 px-3.5 py-3 text-xs leading-relaxed text-ink-muted"
            >
              <Info size={15} strokeWidth={2} aria-hidden="true" className="mt-px flex-shrink-0 text-primary-700" />
              <p>
                Your hospital administrator creates your account and emails you a link to set your
                password. If the link has expired, use &ldquo;Forgot password?&rdquo;.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
