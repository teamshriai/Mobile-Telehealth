import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Download,
  Info,
  Sparkles,
  Stethoscope,
  Users,
  Video,
  Phone,
  MapPin,
  X,
} from 'lucide-react'
import { formatDayDate, formatTime, greetingFor, initials } from '../../components/clinic/format.js'
import { useAuth } from '../../app/AuthContext.jsx'
import * as doctorSelf from '../../services/doctorSelf.service.js'

/**
 * Doctor portal home — "My Day".
 *
 * Structured after UI_ATLAS S-06-01 and the reference dashboard design: the
 * day's numbers, the clinic list, the short list of patients who need
 * something beyond the routine, a consultations trend, the weekly
 * availability switches and a grounded assistant panel.
 *
 * ⚠️ TWO RULES THIS SCREEN HOLDS TO
 *
 * 1. Every figure is COUNTED from a real record. There is no deterioration
 *    score here because this product stores no vitals — the "needs
 *    attention" band comes from an urgent stroke assessment, an open
 *    encounter, recorded symptoms and appointment timing, and the Why?
 *    drawer shows exactly those signals rather than a narrative.
 * 2. The assistant panel is NOT a chatbot. The Doctor role does not hold
 *    `ai:use:own` (see server/src/config/permissions.ts), so there is no
 *    endpoint behind a message box and drawing one would be a prop. It is a
 *    real summary plus real deep links.
 */

const MODE_ICON = { Video, Phone, InPerson: MapPin }

const STATUS_STYLE = {
  Completed: 'bg-success-bg text-success-fg',
  Confirmed: 'bg-surface-2 text-primary-700',
  Requested: 'bg-warning-bg text-warning-fg',
  NoShow: 'bg-critical-bg text-critical-fg',
  Cancelled: 'bg-surface-2 text-ink-subtle',
}

const BAND_STYLE = {
  High: 'bg-critical-bg text-critical-fg',
  Medium: 'bg-warning-bg text-warning-fg',
  Low: 'bg-info-bg text-info-fg',
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <section className="rounded-xl border border-border-soft bg-surface-1 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-ink-subtle">{label}</span>
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2"
        >
          <Icon size={15} className="text-primary-700" />
        </span>
      </div>
      <p className="mt-2 text-3xl font-semibold leading-none tracking-tight text-ink">
        {value}
      </p>
      <p className="mt-1.5 text-xs text-ink-subtle">{sub}</p>
    </section>
  )
}

/** Plain CSS bars — deliberately no charting library. The client bundle is
 *  already 323 kB and one chart is not worth another 100. */
function TrendChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.total))
  return (
    // No `items-end` on this row: that would override the default stretch and
    // collapse each column to content height, leaving the bars' percentage
    // heights resolving against nothing — which renders an axis and no bars.
    <div className="flex h-40 gap-2" role="img" aria-label="Consultations by month">
      {data.map((m) => (
        <div key={m.month} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <span className="text-[11px] font-medium tabular-nums text-ink-subtle">
            {m.total}
          </span>
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-md bg-primary-600 opacity-85"
              style={{ height: `${Math.max(4, (m.total / max) * 100)}%` }}
            />
          </div>
          <span className="truncate text-[11px] text-ink-subtle">
            {m.label}
          </span>
        </div>
      ))}
    </div>
  )
}

/** The atlas requires a mandatory explainability surface wherever a ranking
 *  is shown. Since the ranking is deterministic, this shows the actual
 *  signals and how they combined — no generated prose. */
function WhyDrawer({ row, onClose }) {
  if (row === null) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`Why ${row.name} is flagged`}>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-scrim"
      />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border-soft bg-surface-1 p-5 shadow-card-lg sm:max-w-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">{row.name}</h2>
            <p className="mt-0.5 text-xs text-ink-subtle">
              {row.careRole}
              {row.isPrimary ? ' · Primary' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring tap-target rounded-lg text-ink-muted"
          >
            <X size={18} aria-hidden="true" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-ink-muted">
          This ranking is deterministic — it is a sort order computed from records already in this
          patient&apos;s file, not a predicted risk score. The product stores no vitals, so no
          deterioration score is calculated.
        </p>

        <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
          Signals used
        </h3>
        <ul className="mt-2 space-y-2">
          {row.signals.map((s) => (
            <li
              key={s}
              className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-ink"
            >
              {s}
            </li>
          ))}
        </ul>

        {!row.hasAssessment && (
          <p className="mt-4 rounded-lg bg-warning-bg px-3 py-2 text-xs text-warning-fg">
            No stroke assessment on record for this patient. The band above reflects the other
            signals only.
          </p>
        )}

        <Link
          to="/clinic/patients"
          className="focus-ring mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-on-primary"
        >
          Open my patients <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}

function toCsv(rows) {
  const head = ['Time', 'Patient', 'Mode', 'Status', 'Reason']
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  return [
    head.join(','),
    ...rows.map((r) =>
      [formatTime(r.scheduledAt), r.patientName, r.mode, r.status, r.reason ?? ''].map(esc).join(','),
    ),
  ].join('\n')
}

export default function DoctorHome() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [data, setData] = useState(null)
  const [slots, setSlots] = useState(null)
  const [error, setError] = useState('')
  const [why, setWhy] = useState(null)

  const load = useCallback(() => {
    doctorSelf.getOwnProfile().then(setProfile).catch(() => setError('Could not load your profile.'))
    doctorSelf.getDashboard().then(setData).catch(() => setError('Could not load your dashboard.'))
    doctorSelf
      .listAvailability()
      .then((r) => setSlots(r.slots))
      .catch(() => setSlots([]))
  }, [])

  useEffect(load, [load])

  const toggleSlot = async (slot) => {
    // Optimistic: the switch must feel immediate. On failure we put it back
    // and say so, rather than leaving the UI disagreeing with the server.
    setSlots((prev) =>
      prev.map((s) => (s.id === slot.id ? { ...s, isActive: !s.isActive } : s)),
    )
    try {
      await doctorSelf.setAvailabilitySlotActive(slot.id, !slot.isActive)
    } catch {
      setSlots((prev) =>
        prev.map((s) => (s.id === slot.id ? { ...s, isActive: slot.isActive } : s)),
      )
      setError('Could not update that slot. Please try again.')
    }
  }

  const exportCsv = () => {
    const blob = new Blob([toCsv(data?.today.clinic ?? [])], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clinic-list-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const hospital = profile?.hospital?.name ?? profile?.hospitalName ?? null
  const now = useMemo(() => new Date(), [])

  if (error && data === null) {
    return (
      <div className="rounded-xl border border-border-soft bg-surface-1 p-5">
        <p role="alert" className="text-sm text-critical-fg">{error}</p>
        <button
          type="button"
          onClick={load}
          className="focus-ring mt-3 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-on-primary"
        >
          Try again
        </button>
      </div>
    )
  }

  if (profile === null || data === null) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
        {['h-28', 'h-28', 'h-64', 'h-64', 'h-56', 'h-56'].map((h, i) => (
          <div key={i} className={`skeleton ${h} xl:col-span-4`} />
        ))}
      </div>
    )
  }

  const { today, counts, needsAttention, trend } = data

  return (
    <div className="space-y-5">
      {/* ── Greeting row ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {greetingFor(now)}, Dr {profile.lastName || user?.email}.
          </h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            {profile.specialty ?? 'Specialty not set'}
            {hospital ? ` · ${hospital}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface-1 px-3.5 text-sm font-medium text-ink-muted">
            <CalendarClock size={15} aria-hidden="true" />
            {formatDayDate(today.date)}
          </span>
          <button
            type="button"
            onClick={exportCsv}
            disabled={today.clinic.length === 0}
            className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Download size={15} aria-hidden="true" /> Export list
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-critical-bg px-3 py-2 text-xs text-critical-fg">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
        {/* ── Stat cards ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 md:col-span-2 xl:col-span-2">
          <StatCard
            icon={Stethoscope}
            label="Clinic today"
            value={today.total}
            sub={`${today.seen} seen · ${today.remaining} to come`}
          />
          <StatCard
            icon={Users}
            label="Under your care"
            value={counts.panelPatients}
            sub={`${counts.upcoming} upcoming appointment${counts.upcoming === 1 ? '' : 's'}`}
          />
        </div>

        {/* ── Today's clinic ─────────────────────────────────────────────── */}
        <section className="rounded-xl border border-border-soft bg-surface-1 p-4 md:col-span-2 xl:col-span-4" aria-labelledby="clinic-today">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="clinic-today" className="text-sm font-semibold text-ink">
              Today&apos;s clinic
            </h2>
            <span className="text-xs tabular-nums text-ink-subtle">
              {today.seen}/{today.total}
            </span>
          </div>

          <div
            className="mb-3 h-1.5 overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-valuenow={today.seen}
            aria-valuemin={0}
            aria-valuemax={today.total}
            aria-label="Patients seen so far today"
          >
            <div
              className="h-full rounded-full bg-primary-600"
              style={{ width: `${today.total === 0 ? 0 : (today.seen / today.total) * 100}%` }}
            />
          </div>

          {today.clinic.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-subtle">
              No clinic booked today. Your next session appears here once appointments are
              scheduled.
            </p>
          ) : (
            <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
              {today.clinic.map((a) => {
                const Icon = MODE_ICON[a.mode] ?? MapPin
                return (
                  <li
                    key={a.id}
                    className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-surface-2"
                  >
                    <span className="w-11 shrink-0 text-xs font-semibold tabular-nums text-ink">
                      {formatTime(a.scheduledAt)}
                    </span>
                    <span
                      aria-hidden="true"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-2"
                    >
                      <Icon size={13} className="text-primary-700" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {a.patientName}
                      </span>
                      {a.reason && (
                        <span className="block truncate text-xs text-ink-subtle">
                          {a.reason}
                        </span>
                      )}
                    </span>
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[a.status] ?? ''}`}
                    >
                      {a.status}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* ── Needs attention ────────────────────────────────────────────── */}
        <section className="rounded-xl border border-border-soft bg-surface-1 p-4 md:col-span-2 xl:col-span-3" aria-labelledby="needs-attention">
          <h2 className="mb-3 text-sm font-semibold text-ink">Needs attention {needsAttention.length > 0 && `(${needsAttention.length})`}</h2>

          {needsAttention.length === 0 ? (
            <p className="py-6 text-center text-sm leading-relaxed text-ink-subtle">
              Nothing flagged. Patients appear here when an assessment is marked urgent, an
              encounter is still open, or a request goes unanswered.
            </p>
          ) : (
            <ul className="space-y-2">
              {needsAttention.map((row) => (
                <li key={row.patientId} className="rounded-xl bg-surface-2 p-2.5">
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-[11px] font-bold text-on-primary"
                    >
                      {initials(row.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {row.name}
                      </span>
                      <span className="block truncate text-xs text-ink-subtle">
                        {row.signals[0]}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold ${BAND_STYLE[row.band] ?? ''}`}
                    >
                      {row.band}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWhy(row)}
                    className="focus-ring mt-1.5 inline-flex items-center gap-1 rounded text-xs font-semibold text-primary-700 hover:underline"
                  >
                    <Info size={12} aria-hidden="true" /> Why?
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── AI insight ─────────────────────────────────────────────────── */}
        <section className="rounded-xl bg-primary-600 text-on-primary p-4 md:col-span-2 xl:col-span-3">
          <div className="flex items-center gap-2">
            <Sparkles size={15} aria-hidden="true" />
            <h2 className="text-sm font-semibold">Today at a glance</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-on-primary/90">
            {needsAttention.length > 0 ? (
              <>
                <strong className="font-semibold text-on-primary">
                  {needsAttention.length} patient{needsAttention.length === 1 ? '' : 's'}
                </strong>{' '}
                {needsAttention.length === 1 ? 'needs' : 'need'} review beyond the routine, and{' '}
                <strong className="font-semibold text-on-primary">{today.remaining}</strong> of your{' '}
                {today.total} clinic slots are still to come.
              </>
            ) : (
              <>
                Nothing flagged for review. <strong className="font-semibold text-on-primary">{today.remaining}</strong>{' '}
                of your {today.total} clinic slots are still to come.
              </>
            )}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-on-primary/75">
            Counted from your records — {counts.openEncounters} open encounter
            {counts.openEncounters === 1 ? '' : 's'}, {counts.urgentAssessments} assessment
            {counts.urgentAssessments === 1 ? '' : 's'} flagged urgent.
          </p>
          <Link
            to="/clinic/patients"
            className="focus-ring mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-on-primary/20 px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-on-primary/30"
          >
            Review patients <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>

        {/* ── Trend ──────────────────────────────────────────────────────── */}
        <section className="rounded-xl border border-border-soft bg-surface-1 p-4 md:col-span-2 xl:col-span-5" aria-labelledby="trend">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="trend" className="text-sm font-semibold text-ink">Consultations</h2>
            <span className="text-xs text-ink-subtle">Last {trend.length} months</span>
          </div>
          <TrendChart data={trend} />
        </section>

        {/* ── Weekly availability ────────────────────────────────────────── */}
        <section className="rounded-xl border border-border-soft bg-surface-1 p-4 md:col-span-1 xl:col-span-4" aria-labelledby="availability">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="availability" className="text-sm font-semibold text-ink">Weekly availability</h2>
            <Link
              to="/clinic/availability"
              className="focus-ring rounded text-xs font-semibold text-primary-700 hover:underline"
            >
              Manage
            </Link>
          </div>

          {slots === null ? (
            <p className="text-sm text-ink-subtle">Loading…</p>
          ) : slots.length === 0 ? (
            <p className="py-4 text-sm text-ink-subtle">
              No hours set yet.{' '}
              <Link to="/clinic/availability" className="font-semibold text-primary-700 hover:underline">
                Add your first slot
              </Link>
              .
            </p>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-y-auto pr-1">
              {slots.map((slot) => (
                <li key={slot.id} className="flex items-center gap-3 rounded-lg px-1 py-1.5">
                  <span className="w-9 shrink-0 text-xs font-semibold text-ink">
                    {DAY_LABELS[slot.dayOfWeek]}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs tabular-nums text-ink-subtle">
                    {slot.startTime}–{slot.endTime}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={slot.isActive}
                    aria-label={`${DAY_LABELS[slot.dayOfWeek]} ${slot.startTime} to ${slot.endTime}`}
                    onClick={() => toggleSlot(slot)}
                    className={`focus-ring relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                      slot.isActive
                        ? 'bg-primary-600'
                        : 'bg-surface-3'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-surface-1 shadow transition-[left] ${
                        slot.isActive ? 'left-[1.125rem]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Assistant (grounded, not a chatbot — see file header) ──────── */}
        <section className="rounded-xl border border-border-soft bg-surface-1 p-4 md:col-span-1 xl:col-span-3" aria-labelledby="assistant">
          <h2 className="mb-3 text-sm font-semibold text-ink">Quick actions</h2>
          <p className="mb-3 text-xs leading-relaxed text-ink-subtle">
            Jump straight to the part of your day you need.
          </p>
          <ul className="space-y-1.5">
            {[
              { to: '/clinic/patients', icon: Users, label: 'My patients', sub: `${counts.panelPatients} on your care team` },
              { to: '/clinic/availability', icon: CalendarClock, label: 'Availability', sub: 'Hours and leave' },
              { to: '/clinic/profile', icon: Stethoscope, label: 'My profile', sub: profile.isVerified ? 'Credentials verified' : 'Pending verification' },
            ].map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="focus-ring group flex min-h-11 items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors hover:bg-surface-2"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2"
                  >
                    <item.icon size={14} className="text-primary-700" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {item.label}
                    </span>
                    <span className="block truncate text-xs text-ink-subtle">
                      {item.sub}
                    </span>
                  </span>
                  <ArrowRight
                    size={14}
                    aria-hidden="true"
                    className="shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            ))}
          </ul>

          {!profile.isVerified && (
            <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-warning-bg px-2.5 py-2 text-xs text-warning-fg">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
              Your credentials are awaiting verification by your hospital administrator. This does
              not limit what you can do today.
            </p>
          )}
        </section>
      </div>

      <WhyDrawer row={why} onClose={() => setWhy(null)} />
    </div>
  )
}
