import { useNavigate } from 'react-router-dom'
import { Stethoscope, ShieldCheck, LogOut, ArrowLeft } from 'lucide-react'
import BrandMark from '../../components/common/BrandMark.jsx'
import { useAuth } from '../../app/AuthContext.jsx'

/**
 * Doctor / Administrator portal placeholder.
 *
 * These portals are Phase 6+. The Phase 2 brief is explicit: route them to a
 * controlled placeholder rather than pretending a future portal is
 * operational. So this page states plainly that the portal is not built, and
 * offers no fabricated dashboard, no mock patient list, no fake metrics.
 *
 * The ARCHITECTURE behind it is real, and that is the point of shipping it now:
 * the account authenticated, the server assigned it a role, RequireAuth routed
 * it here by that role, and the same server-side permission checks that will
 * guard the real portal are already enforcing. Only the UI is pending.
 */

const PORTALS = {
  Doctor: {
    icon: Stethoscope,
    name: 'Doctor Portal',
    blurb:
      'The clinician workspace — your patient list, care-team assignments, appointments and clinical notes.',
  },
  Admin: {
    icon: ShieldCheck,
    name: 'Administrator Portal',
    blurb:
      'Platform administration — user accounts, role assignment, doctor verification and audit review.',
  },
}

export default function PortalComingSoon({ portal = 'Doctor' }) {
  const { user, logout, role } = useAuth()
  const navigate = useNavigate()

  const config = PORTALS[portal] ?? PORTALS.Doctor
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
