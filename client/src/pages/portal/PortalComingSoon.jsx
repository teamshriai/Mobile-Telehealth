import { useNavigate } from 'react-router-dom'
import { Stethoscope, ShieldCheck, HeartPulse, FlaskConical, LogOut, ArrowLeft } from 'lucide-react'
import BrandMark from '../../components/common/BrandMark.jsx'
import { useAuth } from '../../app/AuthContext.jsx'

/**
 * Placeholder portal for roles this phase does not build a real UI for
 * (HealthcareWorker, LabTechnician) or that have none yet (Admin).
 *
 * Bug fix: this component used to take its content from a hardcoded
 * `portal="Doctor"` prop set on the route element in App.jsx, regardless of
 * which of the three roles allowed on that route was actually signed in —
 * so a HealthcareWorker or LabTechnician always saw "Doctor Portal" copy
 * next to a "Role: LabTechnician" field a few lines below it, and there was
 * no PORTALS entry for either role at all (both silently fell back to the
 * Doctor config). The portal shown is now derived from the signed-in
 * user's own role, and every role that can land on this component has its
 * own accurate entry — Doctor and HospitalAdmin no longer use this
 * component at all (they have real portals as of this phase).
 *
 * This page states plainly that the portal is not built, and offers no
 * fabricated dashboard, no mock patient list, no fake metrics. The
 * ARCHITECTURE behind it is real: the account authenticated, the server
 * assigned it a role, RequireAuth routed it here by that role, and the
 * same server-side permission checks that will guard the real portal are
 * already enforcing. Only the UI is pending.
 */

const PORTALS = {
  Doctor: {
    icon: Stethoscope,
    name: 'Doctor Portal',
    blurb:
      'The clinician workspace — your patient list, care-team assignments, appointments and clinical notes.',
  },
  HealthcareWorker: {
    icon: HeartPulse,
    name: 'Clinical Support Portal',
    blurb:
      'Field and ward support — patient registration, care coordination and encounter intake.',
  },
  LabTechnician: {
    icon: FlaskConical,
    name: 'Lab Portal',
    blurb: 'Laboratory workflow — sample tracking, report upload and result delivery.',
  },
  Admin: {
    icon: ShieldCheck,
    name: 'Administrator Portal',
    blurb:
      'Platform administration — user accounts, role assignment, doctor verification and audit review.',
  },
}

export default function PortalComingSoon() {
  const { user, logout, role } = useAuth()
  const navigate = useNavigate()

  const config = PORTALS[role] ?? PORTALS.Doctor
  const Icon = config.icon

  const handleSignOut = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="flex h-16 items-center gap-2.5 border-b border-border-soft bg-surface-1 px-4 sm:px-6">
        <BrandMark size={16} />
        <span className="text-[15px] font-bold tracking-tight text-ink">Stroke AI</span>
        <span aria-hidden="true" className="text-ink-subtle">/</span>
        <span className="text-sm font-medium text-ink-subtle">{config.name}</span>

        <button
          type="button"
          onClick={handleSignOut}
          className="focus-ring tap-target ml-auto inline-flex items-center gap-2 rounded-lg px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-2"
        >
          <LogOut size={16} aria-hidden="true" /> Sign out
        </button>
      </header>

      <main id="main-content" className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg text-center">
          <span
            aria-hidden="true"
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50"
          >
            <Icon size={26} className="text-primary-700" />
          </span>

          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {config.name} is not available yet
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
            {config.blurb} It is not built yet — we are not going to show you a
            preview that behaves like the real thing.
          </p>

          <div className="mt-7 rounded-xl border border-border-soft bg-surface-1 p-5 text-left">
            <p className="text-sm font-semibold text-ink">Your account is set up correctly</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-subtle">Signed in as</dt>
                <dd className="truncate font-medium text-ink">{user?.email ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-subtle">Role</dt>
                <dd className="font-medium text-ink">{role ?? '—'}</dd>
              </div>
            </dl>
            <p className="mt-3.5 border-t border-border-soft pt-3 text-xs leading-relaxed text-ink-subtle">
              Authentication, your role, and the permissions attached to it are live.
              When this portal ships, your account will already work with it.
            </p>
          </div>

          <a
            href="/"
            className="focus-ring mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-primary-700 hover:text-primary-700"
          >
            <ArrowLeft size={15} aria-hidden="true" /> Back to the main site
          </a>
        </div>
      </main>
    </div>
  )
}
