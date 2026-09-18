import { useCallback, useEffect, useState } from 'react'
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
import MedsAndAllergies from '../../components/home/MedsAndAllergies.jsx'

/**
 * Patient portal Home — a bento grid.
 *
 * Rules this page holds to, unchanged from the previous revision:
 *  - Every number is COUNTED from a real record. Nothing is scored or predicted.
 *  - No motivational clinical reassurance. The product does not know how anyone
 *    is doing, so it does not say.
 *  - A section that has no data renders a calm empty state, never a blank box.
 *  - A failure in one panel must not blank the page.
 *
 * On the grid: the cells are placed by plain auto-placement. There is no
 * `col-start`, no `grid-flow-dense` and no `order-*`, so source order is
 * visual order is tab order at every breakpoint. Reordering visually would
 * decouple the two and break both keyboard and screen-reader navigation, which
 * is not a trade a bento layout is worth.
 *
 * On the breakpoints: PatientLayout is `lg:pl-[248px]` inside a 1280px cap, so
 * usable width is 720px at md and 728px at lg — the sidebar eats the entire lg
 * gain. The grid therefore steps at `md` and `xl` and ignores `lg` entirely.
 */

const MODULES = [
  { to: '/app/appointments', icon: Calendar,    label: 'Appointments' },
  { to: '/app/medicines',    icon: Pill,        label: 'Medicines' },
  { to: '/app/health',       icon: FolderHeart, label: 'My Health' },
  { to: '/app/care-team',    icon: Users,       label: 'My Care Team' },
]

/**
 * One source of truth for the bento: the skeleton and the real grid are both
 * driven from this, so the placeholder cannot drift out of alignment with the
 * content and cause a layout jump when the requests resolve.
 */
const CELLS = [
  { key: 'appointment', span: 'sm:col-span-2 md:col-span-4 xl:col-span-4 xl:row-span-2', skeleton: 'h-56' },
  { key: 'snapshot',    span: 'sm:col-span-2 md:col-span-4 xl:col-span-2 xl:row-span-2', skeleton: 'h-56' },
  { key: 'activity',    span: 'sm:col-span-2 md:col-span-2 md:row-span-2 xl:col-span-4 xl:row-span-2', skeleton: 'h-64' },
  { key: 'careteam',    span: 'sm:col-span-1 md:col-span-2 xl:col-span-2', skeleton: 'h-40' },
  { key: 'meds',        span: 'sm:col-span-1 md:col-span-2 xl:col-span-2', skeleton: 'h-40' },
  { key: 'links',       span: 'sm:col-span-2 md:col-span-4 xl:col-span-4', skeleton: 'h-28' },
  { key: 'emergency',   span: 'sm:col-span-2 md:col-span-4 xl:col-span-2', skeleton: 'h-28' },
]

const GRID = 'grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-4 xl:grid-cols-6 xl:auto-rows-[minmax(8rem,auto)]'

const spanFor = (key) => CELLS.find((c) => c.key === key)?.span ?? ''

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

/**
 * A cell whose own request failed. It keeps its grid span and shows a retry
 * rather than returning null — an absent cell would reflow every cell after it,
 * so one failed panel would visibly rearrange the whole dashboard.
 */
function CellError({ label, onRetry }) {
  return (
    <section className="flex h-full flex-col">
      <h2 className="text-sm font-semibold text-ink">{label}</h2>
      <div className="mt-3.5 flex-1 rounded-xl border border-border bg-surface-1 p-4 shadow-card">
        <Banner tone="error" title={`We could not load ${label.toLowerCase()}`}>
          <button
            type="button"
            onClick={onRetry}
            className="focus-ring mt-1 rounded font-semibold underline underline-offset-2"
          >
            Try again
          </button>
        </Banner>
      </div>
    </section>
  )
}

export default function PatientHome() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [careTeam, setCareTeam] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  // Per-source, not one page-level flag: each cell degrades on its own.
  const [failed, setFailed] = useState({})

  const mark = useCallback((key, isFailed) => {
    setFailed((current) => {
      if (Boolean(current[key]) === isFailed) return current
      const next = { ...current }
      if (isFailed) next[key] = true
      else delete next[key]
      return next
    })
  }, [])

  const loadProfile = useCallback(
    () =>
      profileService
        .getProfile()
        .then((r) => { setProfile(r?.profile ?? null); mark('profile', false) })
        .catch(() => mark('profile', true)),
    [mark],
  )

  // 'upcoming', not the default 'all'. Both consumers on this page (the next
  // appointment and HealthSnapshot's count) filter to exactly future,
  // non-cancelled — so fetching the patient's entire appointment history to
  // render one card was pure waste, and 'upcoming' is covered end-to-end by
  // the existing [patientId, status, scheduledAt] index.
  const loadAppointments = useCallback(
    () =>
      appointmentService
        .listAppointments('upcoming')
        .then((r) => { setAppointments(r ?? []); mark('appointments', false) })
        .catch(() => mark('appointments', true)),
    [mark],
  )

  const loadCareTeam = useCallback(
    () =>
      careTeamService
        .listCareTeam()
        .then((r) => { setCareTeam(r ?? []); mark('careTeam', false) })
        .catch(() => mark('careTeam', true)),
    [mark],
  )

  const loadNotifications = useCallback(
    () =>
      notificationService
        .listNotifications(4)
        .then((r) => { setNotifications(r ?? []); mark('notifications', false) })
        .catch(() => mark('notifications', true)),
    [mark],
  )

  useEffect(() => {
    let cancelled = false
    // allSettled, not all: a care-team outage must not take the whole
    // dashboard down with it.
    Promise.allSettled([loadProfile(), loadAppointments(), loadCareTeam(), loadNotifications()])
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [loadProfile, loadAppointments, loadCareTeam, loadNotifications])

  const firstName = profile?.firstName ?? user?.name?.split(' ')[0] ?? null
  const upcoming = nextAppointment(appointments)
  const allFailed = ['profile', 'appointments', 'careTeam', 'notifications'].every((k) => failed[k])

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonText lines={2} className="max-w-sm" />
        <div className={GRID}>
          {CELLS.map((c) => (
            <div key={c.key} className={c.span}>
              <Skeleton className={`w-full ${c.skeleton}`} rounded="rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Contextual, not motivational. It states what the page contains; it
          does not tell the patient how their recovery is going, because the
          product has no basis for saying so. */}
      <section aria-labelledby="home-heading">
        <h1 id="home-heading" className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {greeting(new Date().getHours())}{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Here is your care, your records and what is coming up.
        </p>
      </section>

      {allFailed && (
        <Banner tone="error" title="We could not load your dashboard">
          Check your connection and try again.
        </Banner>
      )}

      <div className={GRID}>
        <div className={spanFor('appointment')}>
          {failed.appointments
            ? <CellError label="Next appointment" onRetry={loadAppointments} />
            : <UpcomingAppointment appointment={upcoming} />}
        </div>

        <div className={spanFor('snapshot')}>
          {failed.profile
            ? <CellError label="Your snapshot" onRetry={loadProfile} />
            : <HealthSnapshot profile={profile} appointments={appointments} careTeam={careTeam} />}
        </div>

        <div className={spanFor('activity')}>
          {failed.notifications
            ? <CellError label="Recent activity" onRetry={loadNotifications} />
            : <RecentActivity notifications={notifications} />}
        </div>

        <div className={spanFor('careteam')}>
          {failed.careTeam
            ? <CellError label="Your care team" onRetry={loadCareTeam} />
            : <CareTeamPreview careTeam={careTeam} />}
        </div>

        <div className={spanFor('meds')}>
          {failed.profile
            ? <CellError label="Medicines and allergies" onRetry={loadProfile} />
            : <MedsAndAllergies profile={profile} />}
        </div>

        {/* Plain navigation, styled as such — it sits low in the grid because
            real content carries the hierarchy now. */}
        <section aria-labelledby="modules-heading" className={`flex h-full flex-col ${spanFor('links')}`}>
          <h2 id="modules-heading" className="text-sm font-semibold text-ink">Go to</h2>
          <ul className="mt-3.5 grid flex-1 grid-cols-2 gap-3 md:grid-cols-4">
            {MODULES.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="focus-ring group flex h-full min-h-11 items-center gap-2.5 rounded-xl border border-border bg-surface-1 px-3 py-3 shadow-card transition-colors hover:border-primary-300 hover:bg-primary-50"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent-sky"
                  >
                    <Icon size={16} className="text-accent-sky-fg" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold text-ink">{label}</span>
                  <ArrowRight
                    size={14}
                    aria-hidden="true"
                    className="hidden flex-shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5 sm:block"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Deliberately a short, wide strip and deliberately last: a permanent
            full-bleed red alarm above a patient's ordinary information trains
            people to stop seeing it, and raises anxiety for someone living with
            stroke risk. It is still distinct by colour, icon and wording, it is
            in the thumb zone on a phone, and the sidebar carries a second
            permanent route to it. Never sticky, never animated. */}
        <section aria-labelledby="emergency-heading" className={`flex h-full flex-col ${spanFor('emergency')}`}>
          <h2 id="emergency-heading" className="flex items-center gap-1.5 text-sm font-semibold text-critical-fg">
            <Siren size={15} aria-hidden="true" />
            Think you are having a stroke?
          </h2>
          <div className="mt-3.5 flex flex-1 flex-col justify-center gap-3 rounded-xl border border-critical-fg/30 bg-critical-bg p-4">
            <p className="text-sm leading-relaxed text-critical-fg">
              Every minute counts. Call <strong>108</strong> immediately.
            </p>
            <div className="flex flex-col gap-2 min-[380px]:flex-row">
              <a
                href="tel:108"
                className="focus-ring inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-danger px-4 text-sm font-semibold text-on-danger transition-opacity hover:opacity-90"
              >
                <Phone size={15} aria-hidden="true" /> Call 108
              </a>
              <Link
                to="/app/emergency"
                className="focus-ring inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-critical-fg/40 bg-surface-1 px-4 text-sm font-semibold text-critical-fg transition-colors hover:bg-critical-bg"
              >
                Check symptoms
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
