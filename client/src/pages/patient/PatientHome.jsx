import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Pill, FolderHeart, Users, Siren, ArrowRight } from 'lucide-react'
import { useAuth } from '../../app/AuthContext.jsx'
import * as profileService from '../../services/profile.service'
import { Banner, SkeletonText } from '../../components/feedback/States.jsx'

/**
 * Patient portal Home.
 *
 * Phase 1 found the old dashboard led with an <h1> of "AI Powered Command
 * Centre" over a dark gradient, and hardcoded clinical facts into JSX —
 * every patient saw the same NIHSS score and the same medication instructions.
 * Both are gone.
 *
 * This page shows ONLY what the backend can actually answer today: who you
 * are, from GET /profile. The four care modules are navigation, not fabricated
 * summaries — each says plainly that it is coming in the next phase rather
 * than displaying invented counts. Phase 3 fills them with real data.
 */

const MODULES = [
  {
    to: '/app/appointments',
    icon: Calendar,
    label: 'Appointments',
    copy: 'See upcoming visits and video consultations.',
  },
  {
    to: '/app/medicines',
    icon: Pill,
    label: 'Medicines',
    copy: 'What to take, and when to take it.',
  },
  {
    to: '/app/health',
    icon: FolderHeart,
    label: 'My Health',
    copy: 'Your records, reports and recovery progress.',
  },
  {
    to: '/app/care-team',
    icon: Users,
    label: 'My Care Team',
    copy: 'The clinicians looking after your recovery.',
  },
]

function greeting(hour) {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function PatientHome() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    let cancelled = false

    profileService
      .getProfile()
      .then((res) => { if (!cancelled) setProfile(res?.profile ?? null) })
      .catch((err) => { if (!cancelled) setLoadError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [])

  const firstName = profile?.firstName ?? user?.name?.split(' ')[0] ?? null

  return (
    <div className="space-y-6">
      {/* ── Greeting ── */}
      <section aria-labelledby="home-heading">
        {loading ? (
          <SkeletonText lines={2} className="max-w-sm" />
        ) : (
          <>
            <h1 id="home-heading" className="text-2xl font-semibold tracking-tight text-[#0F172A] sm:text-3xl">
              {greeting(new Date().getHours())}{firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="mt-1.5 text-sm text-[#475569]">
              Your care, records and appointments in one place.
            </p>
          </>
        )}
      </section>

      {loadError && (
        <Banner tone="error" title="We could not load your profile">
          {loadError}
        </Banner>
      )}

      {/* ── Emergency: the most important action on a stroke product ──
          Given its own full-width block above everything else, not tucked
          into a metric row. */}
      <section aria-labelledby="emergency-heading">
        <div className="rounded-xl border border-[#F0C8C0] bg-[#FBEAE7] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <h2 id="emergency-heading" className="flex items-center gap-2 text-base font-semibold text-[#A33A28]">
                <Siren size={18} aria-hidden="true" />
                Think you are having a stroke?
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[#7A3020]">
                Every minute counts. Call <strong>108</strong> immediately, then check your
                symptoms here.
              </p>
            </div>

            <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row">
              {/* A real, dialable link — Phase 1 found no tel: link anywhere in
                  the codebase and no Indian emergency number at all. */}
              <a
                href="tel:108"
                className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#DC2626] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#B91C1C]"
              >
                <Siren size={16} aria-hidden="true" /> Call 108
              </a>
              <Link
                to="/app/emergency"
                className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#D8A99E] bg-white px-5 text-sm font-semibold text-[#A33A28] transition-colors hover:bg-[#FBEAE7]"
              >
                Check symptoms
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Care modules ── */}
      <section aria-labelledby="modules-heading">
        <h2 id="modules-heading" className="sr-only">Your care</h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {MODULES.map(({ to, icon: Icon, label, copy }) => (
            <li key={to}>
              <Link
                to={to}
                className="focus-ring group flex h-full items-start gap-3.5 rounded-xl border border-[#E8EDF2] bg-white p-4 transition-colors hover:border-[#BFDBFE] hover:bg-[#FAFBFC]"
              >
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF]"
                >
                  <Icon size={19} className="text-[#1D4ED8]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-[#0F172A]">
                    {label}
                    <ArrowRight
                      size={14}
                      aria-hidden="true"
                      className="text-[#64748B] transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-[#475569]">{copy}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
