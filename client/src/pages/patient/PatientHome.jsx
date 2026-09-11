import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Pill, FolderHeart, Users, Siren, ArrowRight, Phone } from 'lucide-react'
import { useAuth } from '../../app/AuthContext.jsx'
import * as profileService from '../../services/profile.service'
import * as appointmentService from '../../services/appointment.service'
import * as careTeamService from '../../services/careteam.service'
import * as notificationService from '../../services/notification.service'
import { Banner, SkeletonText, Skeleton } from '../../components/feedback/States.jsx'
import HealthSnapshot from '../../components/home/HealthSnapshot.jsx'
import UpcomingAppointment from '../../components/home/UpcomingAppointment.jsx'
import RecentActivity from '../../components/home/RecentActivity.jsx'
import CareTeamPreview from '../../components/home/CareTeamPreview.jsx'

/**
 * Patient portal Home.
 *
 * Phase 1 removed the fabricated version of this page (a dark "AI Powered
 * Command Centre" with a hardcoded NIHSS score every patient saw). Phase 3
 * replaced it with something honest but nearly empty: one API call and four
 * navigation cards.
 *
 * This revision keeps the honesty and fixes the emptiness. The patient's real
 * records — appointments, care team, notifications, medications — were all
 * available from existing endpoints and none of them reached this page.
 *
 * Rules this page holds to:
 *  - Every number is COUNTED from a real record. Nothing is scored or predicted.
 *  - No motivational clinical reassurance. The product does not know how anyone
 *    is doing, so it does not say.
 *  - A section that has no data renders a calm empty state, never a blank box.
 *  - A failure in one panel must not blank the page: the four requests settle
 *    independently.
 */

const MODULES = [
  { to: '/app/appointments', icon: Calendar,    label: 'Appointments' },
  { to: '/app/medicines',    icon: Pill,        label: 'Medicines' },
  { to: '/app/health',       icon: FolderHeart, label: 'My Health' },
  { to: '/app/care-team',    icon: Users,       label: 'My Care Team' },
]

function greeting(hour) {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/** Earliest future appointment that has not been cancelled. */
function nextAppointment(appointments) {
  const now = new Date()
  return (
    appointments
      .filter((a) => a.status !== 'Cancelled' && new Date(a.scheduledAt) > now)
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))[0] ?? null
  )
}

export default function PatientHome() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [careTeam, setCareTeam] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState(null)

  useEffect(() => {
    let cancelled = false

    // allSettled, not all: a care-team outage must not take the whole
    // dashboard down with it. Each panel degrades to its own empty state.
    Promise.allSettled([
      profileService.getProfile(),
      appointmentService.listAppointments(),
      careTeamService.listCareTeam(),
      notificationService.listNotifications(4),
    ])
      .then(([p, a, c, n]) => {
        if (cancelled) return
        if (p.status === 'fulfilled') setProfile(p.value?.profile ?? null)
        else setProfileError(p.reason?.message ?? 'Could not load your profile.')
        if (a.status === 'fulfilled') setAppointments(a.value ?? [])
        if (c.status === 'fulfilled') setCareTeam(c.value ?? [])
        if (n.status === 'fulfilled') setNotifications(n.value ?? [])
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [])

  const firstName = profile?.firstName ?? user?.name?.split(' ')[0] ?? null
  const upcoming = nextAppointment(appointments)

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonText lines={2} className="max-w-sm" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" rounded="rounded-xl" />)}
        </div>
        <Skeleton className="h-36" rounded="rounded-xl" />
        <div className="grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-56" rounded="rounded-xl" />
          <Skeleton className="h-56" rounded="rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-7">
      {/* ── Welcome ──
          Contextual, not motivational. It states what the page contains; it
          does not tell the patient how their recovery is going, because the
          product has no basis for saying so. */}
      <section aria-labelledby="home-heading">
        <h1
          id="home-heading"
          className="text-2xl font-semibold tracking-tight text-[#0F172A] sm:text-3xl"
        >
          {greeting(new Date().getHours())}{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="mt-1.5 text-sm text-[#475569]">
          Here is your care, your records and what is coming up.
        </p>
      </section>

      {profileError && (
        <Banner tone="error" title="We could not load your profile">
          {profileError}
        </Banner>
      )}

      <HealthSnapshot profile={profile} appointments={appointments} careTeam={careTeam} />

      <UpcomingAppointment appointment={upcoming} />

      {/* Two equal columns on desktop; stacked on mobile with activity first,
          since "what changed" is checked more often than "who is my team". */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <RecentActivity notifications={notifications} />
        <CareTeamPreview careTeam={careTeam} />
      </div>

      {/* ── Quick links ──
          Plain navigation, styled as such. These were the entire page before;
          now that real content carries the hierarchy, they can recede into a
          compact row rather than four large cards pretending to be data. */}
      <section aria-labelledby="modules-heading">
        <h2 id="modules-heading" className="text-sm font-semibold text-[#0F172A]">
          Go to
        </h2>
        <ul className="mt-3.5 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
          {MODULES.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <Link
                to={to}
                className="focus-ring group flex min-h-11 items-center gap-3 rounded-xl border border-[#E8EDF2] bg-white px-3.5 py-3 transition-colors hover:border-[#BFDBFE] hover:bg-[#FAFBFC]"
              >
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF]"
                >
                  <Icon size={16} className="text-[#1D4ED8]" />
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold text-[#0F172A]">
                  {label}
                </span>
                <ArrowRight
                  size={14}
                  aria-hidden="true"
                  className="flex-shrink-0 text-[#94A3B8] transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Emergency ──
          Still unmissable, but no longer the heaviest object on a page the
          patient sees every day. A permanent full-bleed red alarm above all
          their ordinary information trains people to stop seeing it — and
          raises anxiety for someone living with stroke risk. Kept distinct
          by colour and icon, sized proportionately, and always one tap away
          from the sidebar too. */}
      <section aria-labelledby="emergency-heading">
        <div className="rounded-xl border border-[#F0C8C0] bg-[#FBEAE7] p-4 sm:p-5">
          <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <h2
                id="emergency-heading"
                className="flex items-center gap-2 text-sm font-semibold text-[#A33A28]"
              >
                <Siren size={16} aria-hidden="true" />
                Think you are having a stroke?
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-[#7A3020]">
                Every minute counts. Call <strong>108</strong> immediately.
              </p>
            </div>

            <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row">
              <a
                href="tel:108"
                className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#DC2626] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#B91C1C]"
              >
                <Phone size={15} aria-hidden="true" /> Call 108
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
    </div>
  )
}
