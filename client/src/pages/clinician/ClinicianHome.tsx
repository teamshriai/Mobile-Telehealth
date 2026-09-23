import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, ChevronDown, FileCheck2, Info,
  RefreshCw, Stethoscope, Users, FlaskConical, Activity,
} from 'lucide-react'
import { useAuth } from '../../app/useAuth'
import { usePatientContext } from '../../app/usePatientContext'
import * as doctorSelf from '../../services/doctorSelf.service'
import * as clinicalPatientService from '../../services/clinicalPatient.service'
import * as clinicalNoteService from '../../services/clinicalNote.service'
import { formatDate, formatDayDate, formatTime, greetingFor, initials } from '../../components/clinic/format'
import Drawer from '../../components/common/Drawer'
import ClinicCalendar from '../../components/clinical/ClinicCalendar'
import ClinicWorklist from '../../components/clinical/ClinicWorklist'
import VisitTrend from '../../components/clinical/VisitTrend'
import { Skeleton, Banner } from '../../components/feedback/States'
import type {
  DoctorDashboard, DashboardNeedsAttentionRow, ClinicianEncounter, CosignQueueItem,
} from '../../types/domain'

/**
 * `S-06-01` · Clinician Home / My Day — `ARC-20` dashboard, compact density.
 *
 * "The consultant's day, ranked by who needs them first."
 *
 * ⚠️ AI-OFF IS THE SHIPPED STATE. The atlas puts two AI capabilities on this
 * screen — `AI-613` worklist prioritisation and `AI-201` deterioration risk —
 * and §4.8 says every `◆` affordance is HIDDEN, not greyed, when AI is off.
 * So there is no "Sorted by AI acuity" control here and no NEWS2 risk band:
 * the sort control names the DETERMINISTIC order, which is the one that
 * actually exists. The needs-attention ranking below is a documented integer
 * score over real records (see the server's doctorDashboard.service), not a
 * model output — which is why it can be shown at all.
 *
 * Responsive per ARC-20: ≥1440 four columns · 1024–1439 two · <768 one.
 * Keyboard: `r` refreshes.
 */

type SortMode = 'acuity' | 'chronological'

export default function ClinicianHome() {
  const { user, can } = useAuth()
  const { setPatient } = usePatientContext()
  const navigate = useNavigate()

  const [dashboard, setDashboard] = useState<DoctorDashboard | null>(null)
  const [openEncounters, setOpenEncounters] = useState<ClinicianEncounter[]>([])
  const [cosignQueue, setCosignQueue] = useState<CosignQueueItem[]>([])
  const [error, setError] = useState('')
  const [why, setWhy] = useState<DashboardNeedsAttentionRow | null>(null)
  const [sort, setSort] = useState<SortMode>('acuity')

  /**
   * The day the calendar is pointing at. Defaults to today.
   *
   * ⚠️ Selecting another day does NOT navigate — only today's clinic is
   * loaded, and pretending otherwise would be a dead control. What it does is
   * answer "how busy is that day", which is what the shading already shows and
   * what a consultant looking a week ahead actually wants. The summary line
   * below the calendar states it in words rather than leaving the click to
   * feel like it did nothing.
   */
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [refreshedAt, setRefreshedAt] = useState<Date>(new Date())

  // This screen is not patient-scoped (Z3 is n/a here per the atlas), so it
  // must actively clear any banner left by the screen the user came from.
  useEffect(() => { setPatient(null) }, [setPatient])

  // Capability, never role name (§3.2). A Resident simply lacks this.
  const canCosign = can('note:cosign:assigned')

  const load = useCallback(() => {
    setError('')
    doctorSelf.getDashboard().then(setDashboard).catch(() => setError('Could not load your day.'))
    clinicalPatientService.listOpenEncounters().then(setOpenEncounters).catch(() => setOpenEncounters([]))
    /**
     * ⚠️ Gated on the CAPABILITY, not requested and then forgiven.
     *
     * A previous version always fired this and swallowed the 403 into an empty
     * array. That was wrong twice: it sent a request the session was known to
     * be refused, and it then rendered "0 · Nothing pending" — which tells a
     * clinician that nothing is awaiting co-sign when the truth is that they
     * cannot see the queue at all. A zero a user cannot distinguish from "not
     * permitted" is a lie told in a number.
     */
    if (canCosign) {
      clinicalNoteService.listCosignQueue().then(setCosignQueue).catch(() => setCosignQueue([]))
    }
    setRefreshedAt(new Date())
  }, [canCosign])

  useEffect(load, [load])

  // `r` refreshes (ARC-20 keyboard map). Ignored while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'r' && !e.metaKey && !e.ctrlKey) load()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [load])

  const needsAttention = useMemo(() => {
    if (dashboard === null) return []
    const rows = [...dashboard.needsAttention]
    // ⚠️ The deterministic order is always one click away (§10.1's
    // reversibility rule) — and here it is also the DEFAULT, because the
    // alternative ranking would be an AI one and AI is off.
    if (sort === 'chronological') {
      return rows.sort((a, b) => a.name.localeCompare(b.name))
    }
    return rows.sort((a, b) => b.score - a.score)
  }, [dashboard, sort])

  if (dashboard === null && error !== '') {
    return (
      <div className="rounded-xl border border-border-soft bg-surface-1 p-5">
        <Banner tone="error" title="Could not load your day">
          <button type="button" onClick={load} className="focus-ring mt-1 rounded font-semibold underline">
            Try again
          </button>
        </Banner>
      </div>
    )
  }

  if (dashboard === null) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {['h-40 xl:col-span-4', 'h-28', 'h-28', 'h-28', 'h-28'].map((h, i) => (
          <Skeleton key={i} className={`w-full ${h}`} rounded="rounded-xl" />
        ))}
      </div>
    )
  }

  const { today, counts } = dashboard

  const selectedDayLabel = (() => {
    const entry = dashboard.dailyLoad.find((d) => d.date === selectedDay)
    const [y, m, d] = selectedDay.split('-').map(Number)
    const when = new Date(y, (m ?? 1) - 1, d ?? 1)
    const pretty = formatDate(when)
    if (entry === undefined || entry.total === 0) return `${pretty} — no clinic booked.`
    const seenPart =
      entry.completed > 0 ? ` · ${entry.completed} seen` : ''
    return `${pretty} — ${entry.total} appointment${entry.total === 1 ? '' : 's'}${seenPart}.`
  })()

  return (
    <div className="space-y-4">
      {/* ── Z4 · title, scope, refresh state ──────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            {greetingFor(new Date())}, Dr {user?.name?.split(' ').slice(-1)[0] ?? ''}
          </h1>
          <p className="mt-0.5 text-xs text-ink-muted">
            {formatDayDate(today.date)} · Data as of {formatTime(refreshedAt)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* ⚠️ The sort is NAMED, always. A clinician who cannot tell what
              order a list is in stops trusting the list (§10.1). */}
          <label className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
            <span className="sr-only">Sort the needs-attention list</span>
            <span aria-hidden="true">Sorted by</span>
            <span className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortMode)}
                className="focus-ring appearance-none rounded-lg border border-border bg-surface-1 py-1.5 pl-2.5 pr-7 text-xs font-medium text-ink"
              >
                <option value="acuity">clinical signals</option>
                <option value="chronological">patient name</option>
              </select>
              <ChevronDown size={13} aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-subtle" />
            </span>
          </label>

          <button
            type="button"
            onClick={load}
            className="focus-ring tap-target inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-1 px-3 text-xs font-medium text-ink-muted hover:bg-surface-2"
          >
            <RefreshCw size={13} aria-hidden="true" />
            Refresh
            <kbd className="ml-0.5 rounded border border-border-soft bg-surface-2 px-1 font-mono text-2xs">r</kbd>
          </button>
        </div>
      </div>

      {error !== '' && <Banner tone="warning">{error}</Banner>}

      {/* ⚠️ Z5 + Z6. The rail is not decoration — §5.2 specifies Z6 as
          "AI panel, context, timeline", and the calendar and week chart are
          the context a consultant actually asks for. Below xl it falls under
          the worklist rather than squeezing it, because the worklist is the
          job and the rail is the context. */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="min-w-0 space-y-4">

      {/* ── Z5 · needs attention, pinned at the top ──────────────────────── */}
      <section aria-labelledby="needs-attention" className="rounded-xl border border-border-soft bg-surface-1">
        <div className="flex items-center justify-between gap-3 border-b border-border-soft px-4 py-2.5">
          <h2 id="needs-attention" className="text-sm font-semibold text-ink">
            Needs attention{needsAttention.length > 0 && ` (${needsAttention.length})`}
          </h2>
        </div>

        {needsAttention.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs leading-relaxed text-ink-subtle">
            Nothing flagged. Patients appear here when an assessment is marked urgent, an
            encounter is left open, or a request goes unanswered.
          </p>
        ) : (
          <ul className="divide-y divide-border-soft">
            {needsAttention.map((row) => (
              <li key={row.patientId} className="clinical-row flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-2xs font-bold text-primary-700"
                >
                  {initials(row.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{row.name}</span>
                  <span className="block truncate text-xs text-ink-subtle">
                    {row.careRole}{row.isPrimary ? ' · Primary' : ''}
                  </span>
                </span>

                {/* ⚠️ Reason CHIPS, in words. Colour is never the only
                    carrier (§5.3) — each chip states the actual signal. */}
                <span className="flex flex-wrap gap-1">
                  {row.signals.slice(0, 2).map((signal) => (
                    <span key={signal} className="rounded bg-warning-bg px-1.5 py-0.5 text-2xs font-medium text-warning-fg">
                      {signal}
                    </span>
                  ))}
                </span>

                <button
                  type="button"
                  onClick={() => setWhy(row)}
                  className="focus-ring inline-flex items-center gap-1 rounded px-1 text-xs font-semibold text-primary-700 hover:underline"
                >
                  <Info size={12} aria-hidden="true" /> Why?
                </button>

                <Link
                  to={`/patient/${row.shriPatientId}/chart`}
                  className="focus-ring inline-flex items-center gap-1 rounded px-1 text-xs font-semibold text-primary-700 hover:underline"
                >
                  Open chart
                  <ArrowRight size={12} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Z5 · today's clinic ───────────────────────────────────────────
          ⚠️ This list was already being fetched and was being shown as the
          single number on the "Clinic today" tile. A consultant's first
          question is who and when, not how many. */}
      <section className="rounded-xl border border-border-soft bg-surface-1">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-soft px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">
            Today&rsquo;s clinic{today.total > 0 && ` (${today.total})`}
          </h2>
          <p className="text-2xs text-ink-muted">
            {today.seen} seen · {today.remaining} to come
          </p>
        </div>
        <div className="p-2">
          <ClinicWorklist clinic={today.clinic} nextId={today.next?.id ?? null} />
        </div>
      </section>

      {/* ── Z5 · C-24 tile grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* ⚠️ No "Clinic today" tile. It used to carry the count, the seen/
            remaining split and an "Open next patient" link — every one of
            which the worklist above now states, in the same words, twenty
            pixels higher. A tile that repeats the table beneath it is the
            decorative card this screen is meant to avoid. The remaining tiles
            each answer a question the worklist does not. */}
        <Tile
          icon={Stethoscope}
          label="Inpatients"
          value="—"
          sub="Ward rounds are a separate module"
          boundary="Inpatient care (M-08) is not in this release."
        />
        <Tile
          icon={Activity}
          label="Consultations open"
          value={openEncounters.length}
          sub={openEncounters.length === 0 ? 'Nothing left open' : 'Not yet closed'}
          action={
            openEncounters[0] !== undefined
              ? { label: 'Resume', onClick: () => navigate(`/encounter/${openEncounters[0].visitId}/note`) }
              : undefined
          }
        />
        {/* Absent rather than zeroed for a clinician who cannot counter-sign
            — GP-02: a module you cannot enter does not appear. */}
        {canCosign && (
          <Tile
            icon={FileCheck2}
            label="Awaiting co-sign"
            value={cosignQueue.length}
            sub={cosignQueue.length === 0 ? 'Nothing pending' : 'Authored by a colleague'}
            action={cosignQueue.length > 0 ? { label: 'Open queue', onClick: () => navigate('/clinician/cosign') } : undefined}
          />
        )}
        <Tile
          icon={Users}
          label="Under your care"
          value={counts.panelPatients}
          sub={`${counts.upcoming} upcoming appointment${counts.upcoming === 1 ? '' : 's'}`}
          action={{ label: 'View panel', onClick: () => navigate('/clinician/patients') }}
        />
      </div>

      {/* ⚠️ A module that is not built still gets a designed surface.
          Results review is M-09. A dashed "TODO" box makes a product look
          unfinished; a considered card that names the boundary and says when
          it arrives makes the same admission look deliberate. What it must
          never do is show "0 results" — that is a clinical claim, and a false
          one: not knowing and none are different things. */}
      <section className="overflow-hidden rounded-xl border border-border-soft bg-surface-1">
        <div className="flex items-start gap-3 border-l-2 border-l-info-fg/50 p-4">
          <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-info-bg">
            <FlaskConical size={16} aria-hidden="true" className="text-info-fg" />
          </span>
          <div className="min-w-0">
            <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
              Results review
              <span className="rounded bg-surface-2 px-1.5 py-0.5 text-2xs font-medium text-ink-muted">
                Separate module
              </span>
            </h2>
            <p className="mt-1 max-w-prose text-xs leading-relaxed text-ink-muted">
              Laboratory and imaging results are ordered and reviewed in Orders &amp; Results,
              which is not part of this release. Nothing is shown here rather than an empty
              inbox — an empty inbox would say there is nothing to review, which is not the
              same as not knowing.
            </p>
            <p className="mt-1.5 text-2xs text-ink-subtle">
              Until then, check results in your laboratory system.
            </p>
          </div>
        </div>
      </section>

      </div>

      {/* ── Z6 · context rail ─────────────────────────────────────────────── */}
      <aside aria-label="Clinic context" className="space-y-4">
        <div className="rounded-xl border border-border-soft bg-surface-1 p-4">
          <ClinicCalendar
            load={dashboard.dailyLoad}
            selected={selectedDay}
            onSelect={setSelectedDay}
          />
          <p className="mt-3 border-t border-border-soft pt-2.5 text-2xs text-ink-muted">
            {selectedDayLabel}
          </p>
        </div>

        <div className="rounded-xl border border-border-soft bg-surface-1 p-4">
          <VisitTrend load={dashboard.dailyLoad} />
        </div>
      </aside>

      </div>

      {/* ── C-42-style explainability drawer ─────────────────────────────── */}
      <Drawer
        open={why !== null}
        onClose={() => setWhy(null)}
        title={why === null ? '' : `Why ${why.name} is flagged`}
      >
        {why !== null && (
          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-ink-muted">
              This ordering is <strong className="font-semibold">deterministic</strong> — a sort
              computed from records already in this patient&apos;s file, not a predicted risk
              score. This product stores no vital signs, so no deterioration score is
              calculated and none is shown.
            </p>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                Signals used
              </h3>
              <ul className="mt-2 space-y-1.5">
                {why.signals.map((s) => (
                  <li key={s} className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-ink">{s}</li>
                ))}
              </ul>
            </div>

            {!why.hasAssessment && (
              <p className="rounded-lg bg-warning-bg px-3 py-2 text-xs text-warning-fg">
                No stroke assessment on record for this patient. The ordering above reflects the
                other signals only — it is not a score of zero.
              </p>
            )}

            <Link
              to="/clinician/patients"
              className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-on-primary"
            >
              Open my patients <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        )}
      </Drawer>
    </div>
  )
}

interface TileProps {
  icon: ComponentType<{ size?: number; className?: string }>
  label: string
  /** A string for a tile that has no number to show — see `boundary`. */
  value: number | string
  sub: string
  action?: { label: string; onClick: () => void }
  /**
   * Marks the tile as a cross-module integration point rather than owned
   * content.
   *
   * ⚠️ Such a tile shows an em-dash, never a zero. "0 inpatients" is a claim
   * that the consultant has none; the truth is that this release cannot see
   * them, and the two are clinically opposite. The sentence says which.
   */
  boundary?: string
}

function Tile({ icon: Icon, label, value, sub, action, boundary }: TileProps) {
  return (
    <section
      className={`flex flex-col rounded-xl border bg-surface-1 p-4 ${
        boundary === undefined ? 'border-border-soft' : 'border-dashed border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-ink-subtle">{label}</span>
        <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-2">
          <Icon size={14} className="text-primary-700" />
        </span>
      </div>
      <p
        className={`mt-2 text-2xl font-semibold leading-none tracking-tight tabular-nums ${
          boundary === undefined ? 'text-ink' : 'text-ink-subtle'
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-ink-subtle">{sub}</p>
      {boundary !== undefined && (
        <p className="mt-2 border-t border-border-soft pt-2 text-2xs leading-relaxed text-ink-subtle">
          {boundary}
        </p>
      )}
      {action !== undefined && (
        <button
          type="button"
          onClick={action.onClick}
          className="focus-ring mt-3 inline-flex items-center gap-1 self-start rounded text-xs font-semibold text-primary-700 hover:underline"
        >
          {action.label} <ArrowRight size={12} aria-hidden="true" />
        </button>
      )}
    </section>
  )
}
