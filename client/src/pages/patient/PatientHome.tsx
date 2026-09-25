import { useCallback, useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Pill, FolderHeart, Users, Siren, ArrowRight, Phone, NotebookPen, Mic } from 'lucide-react'
import { useAuth } from '../../app/useAuth'
import * as profileService from '../../services/profile.service'
import * as appointmentService from '../../services/appointment.service'
import * as careTeamService from '../../services/careteam.service'
import * as notificationService from '../../services/notification.service'
import * as portalService from '../../services/portal.service'
import { Banner, SkeletonText, Skeleton } from '../../components/feedback/States'
import HealthSnapshot from '../../components/home/HealthSnapshot'
import UpcomingAppointment from '../../components/home/UpcomingAppointment'
import RecentActivity from '../../components/home/RecentActivity'
import CareTeamPreview from '../../components/home/CareTeamPreview'
import MedsAndAllergies from '../../components/home/MedsAndAllergies'
import type { PatientProfile, Appointment, CareTeamMember, Notification } from '../../types/domain'

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

/* One pastel accent per tile (see `accent-*` in index.css) — matte, not
   saturated, per the brief. Mirrors the stat-tile colour meanings above
   (logistics/medication/attention/people) so the two sections read as one
   consistent system rather than two unrelated palettes. */
interface ModuleLink {
  to: string
  icon: ComponentType<{ size?: number; className?: string }>
  label: string
  bg: string
  fg: string
  hoverBorder: string
}

const MODULES: ModuleLink[] = [
  { to: '/app/appointments', icon: Calendar,    label: 'Appointments', bg: 'bg-accent-sky',  fg: 'text-accent-sky-fg',  hoverBorder: 'hover:border-accent-sky-fg/40' },
  { to: '/app/medicines',    icon: Pill,        label: 'Medicines',    bg: 'bg-accent-teal', fg: 'text-accent-teal-fg', hoverBorder: 'hover:border-accent-teal-fg/40' },
  { to: '/app/health',       icon: FolderHeart, label: 'My Health',    bg: 'bg-accent-clay', fg: 'text-accent-clay-fg', hoverBorder: 'hover:border-accent-clay-fg/40' },
  { to: '/app/my-doctors',   icon: Users,       label: 'My doctors', bg: 'bg-accent-sage', fg: 'text-accent-sage-fg', hoverBorder: 'hover:border-accent-sage-fg/40' },
  { to: '/app/health-notes', icon: NotebookPen, label: 'Health Notes', bg: 'bg-accent-sand', fg: 'text-accent-sand-fg', hoverBorder: 'hover:border-accent-sand-fg/40' },
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
] as const

const GRID = 'grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-4 xl:grid-cols-6 xl:auto-rows-[minmax(8rem,auto)]'

const spanFor = (key: string) => CELLS.find((c) => c.key === key)?.span ?? ''

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/** Earliest future appointment that has not been cancelled. */
function nextAppointment(appointments: Appointment[]): Appointment | null {
  const now = new Date()
  return (
    appointments
      .filter((a) => a.status !== 'Cancelled' && new Date(a.scheduledAt) > now)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0] ?? null
  )
}

/**
 * A cell whose own request failed. It keeps its grid span and shows a retry
 * rather than returning null — an absent cell would reflow every cell after it,
 * so one failed panel would visibly rearrange the whole dashboard.
 */
function CellError({ label, onRetry }: { label: string; onRetry: () => void }): ReactNode {
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

type FailedKey = 'profile' | 'appointments' | 'careTeam' | 'notifications'

export default function PatientHome() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [careTeam, setCareTeam] = useState<CareTeamMember[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [prescribed, setPrescribed] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(true)
  // Per-source, not one page-level flag: each cell degrades on its own.
  const [failed, setFailed] = useState<Partial<Record<FailedKey, boolean>>>({})

  const mark = useCallback((key: FailedKey, isFailed: boolean) => {
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

  // Signed prescriptions for the medicines cell. Best-effort: if this fails
  // the cell falls back to what the patient told us, labelled as such.
  const loadPrescribed = useCallback(
    () =>
      portalService
        .getMedications()
        .then((r) => setPrescribed(r.current.map((m) => `${m.name} ${m.dose} ${m.doseUnit}`)))
        .catch(() => setPrescribed(null)),
    [],
  )

  useEffect(() => {
    let cancelled = false
    void loadPrescribed()
    // allSettled, not all: a care-team outage must not take the whole
    // dashboard down with it.
    Promise.allSettled([loadProfile(), loadAppointments(), loadCareTeam(), loadNotifications()])
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [loadProfile, loadAppointments, loadCareTeam, loadNotifications, loadPrescribed])

  const firstName = profile?.firstName ?? user?.name?.split(' ')[0] ?? null
  const upcoming = nextAppointment(appointments)
  const allFailed = (['profile', 'appointments', 'careTeam', 'notifications'] as const).every((k) => failed[k])

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
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-muted">
            Here is your care, your records and what is coming up.
          </p>
          {/* Symptoms are easiest to describe while they are happening. */}
          <Link
            to="/app/health-notes?new=voice"
            className="focus-ring tap-target inline-flex items-center gap-1.5 rounded-lg border border-border-soft bg-surface-1 px-3 text-sm font-medium text-ink hover:bg-surface-2"
          >
            <Mic size={15} aria-hidden="true" /> Add a health note
          </Link>
        </div>
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
            : <UpcomingAppointment appointment={upcoming} appointments={appointments} />}
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
            ? <CellError label="My doctors" onRetry={loadCareTeam} />
            : <CareTeamPreview careTeam={careTeam} />}
        </div>

        <div className={spanFor('meds')}>
          {failed.profile
            ? <CellError label="Medicines and allergies" onRetry={loadProfile} />
            : <MedsAndAllergies profile={profile} prescribed={prescribed} />}
        </div>

        {/* Plain navigation, styled as such — it sits low in the grid because
            real content carries the hierarchy now. */}
        <section aria-labelledby="modules-heading" className={`flex h-full flex-col ${spanFor('links')}`}>
          <h2 id="modules-heading" className="text-sm font-semibold text-ink">Go to</h2>
          <ul className="mt-3.5 grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {MODULES.map(({ to, icon: Icon, label, bg, fg, hoverBorder }) => (
              <li key={to} className="aspect-square">
                <Link
                  to={to}
                  className={`focus-ring group flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border border-transparent bg-surface-1 p-3 text-center shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-md ${hoverBorder}`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${bg} transition-transform group-hover:scale-105`}
                  >
                    <Icon size={20} className={fg} />
                  </span>
                  <span className="min-w-0 text-sm font-semibold text-ink">{label}</span>
                  <ArrowRight
                    size={13}
                    aria-hidden="true"
                    className={`hidden -translate-y-0.5 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100 sm:block ${fg}`}
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
