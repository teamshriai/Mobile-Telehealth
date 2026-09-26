import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, History, Info, Pill } from 'lucide-react'
import * as portal from '../../services/portal.service'
import type { Medicine, MedicinesOverview, TodayDose } from '../../services/portal.service'
import { EmptyState, ErrorState, LoadingState } from '../../components/feedback/States'
import SourceBadge from '../../components/common/SourceBadge'
import IconTile from '../../components/common/IconTile'
import { useToast } from '../../components/common/useToast'
import { useAuth } from '../../app/useAuth'
import SummaryBar from '../../components/medicines/SummaryBar'
import QuickAccess from '../../components/medicines/QuickAccess'
import AiMedicineSummary from '../../components/medicines/AiMedicineSummary'
import TodaySchedule from '../../components/medicines/TodaySchedule'
import MedicineCard from '../../components/medicines/MedicineCard'
import MedicineListPrint from '../../components/medicines/MedicineListPrint'
import { formVisual, prescriberLine } from '../../components/medicines/medicineVisuals'
import type { ApiError } from '../../types/api'

/**
 * Medicines — what the patient's doctors PRESCRIBED, and what the patient
 * says they TOOK.
 *
 * ⚠️ TWO SOURCES, NEVER BLENDED. Every medicine, dose, direction and date is
 * from a signed prescription and is read-only here; changing a medicine is a
 * conversation with the doctor, which the page says. The dose ticks and the
 * 30-day figures are the patient's own log and are labelled as such. The
 * patient's free-text list from their health history sits in its own section,
 * marked as theirs, because it can legitimately disagree with the prescriptions.
 *
 * ⚠️ NOT BUILT, ON PURPOSE: an interaction checker, pill photos and pharmacy
 * ordering. Each needs a vetted drug database this product does not have, and
 * a guessed interaction or a wrong photo is a safety problem, not a gap.
 */

const reduceMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function jumpTo(id: string): void {
  const el = document.getElementById(id)
  if (el === null) return
  el.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' })
  // Move focus too, so keyboard and screen-reader users land where they asked.
  const target = el.querySelector<HTMLElement>('h2, h3') ?? el
  target.setAttribute('tabindex', '-1')
  target.focus({ preventScroll: true })
}

interface PastGroup {
  key: string
  latest: Medicine
  count: number
  firstStarted: string
}

/** Repeated courses of the same regimen read as one line with a count. */
function groupPast(past: Medicine[]): PastGroup[] {
  const groups = new Map<string, PastGroup>()
  for (const m of past) {
    const key = [m.name, m.dose, m.doseUnit, m.frequency, m.route].join('|')
    const g = groups.get(key)
    if (g === undefined) {
      groups.set(key, { key, latest: m, count: 1, firstStarted: m.startedAt })
      continue
    }
    g.count += 1
    if (m.startedAt > g.latest.startedAt) g.latest = m
    if (m.startedAt < g.firstStarted) g.firstStarted = m.startedAt
  }
  return [...groups.values()].sort((a, b) => (a.latest.startedAt < b.latest.startedAt ? 1 : -1))
}

function PastRow({ g }: { g: PastGroup }) {
  const m = g.latest
  const { icon } = formVisual(m.form)
  const ended =
    m.replacedAt !== null
      ? `Replaced by a newer prescription on ${portal.formatDay(m.replacedAt)}`
      : m.endsAt !== null
        ? `Course ended ${portal.formatDay(m.endsAt)}`
        : 'Course ended'
  return (
    <li className="flex items-start gap-3 py-3.5">
      <IconTile icon={icon} tone="gray" size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">
          {m.name} <span className="font-medium text-ink-muted">{m.dose} {m.doseUnit}</span>
          <span className="font-normal text-ink-subtle"> · {m.form}</span>
        </p>
        <p className="text-xs text-ink-muted">
          {m.frequencyInWords} · {m.routeInWords}
          {m.indication !== null && <> · for {m.indication.title}</>}
        </p>
        <p className="mt-0.5 text-xs text-ink-subtle">
          {ended} · {prescriberLine(m.prescriber)}
          {g.count > 1 && <> · {g.count} courses since {portal.formatDay(g.firstStarted)}</>}
        </p>
      </div>
    </li>
  )
}

export default function MedicinesPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [data, setData] = useState<MedicinesOverview | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [showPast, setShowPast] = useState(false)

  /** `quiet`: refresh behind the current view (after a tap) without a spinner. */
  const load = useCallback(async (quiet = false): Promise<void> => {
    if (!quiet) {
      setError(null)
      setData(null)
    }
    try {
      setData(await portal.getMedicinesOverview())
    } catch (err) {
      if (!quiet) setError(err as ApiError)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const timesByItem = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const d of data?.today ?? []) map.set(d.itemId, [...(map.get(d.itemId) ?? []), d.at])
    return map
  }, [data])

  const pastGroups = useMemo(() => groupPast(data?.past ?? []), [data])

  const onLog = async (dose: TodayDose, status: 'Taken' | 'Skipped'): Promise<void> => {
    setBusyKey(dose.key)
    try {
      await portal.logDose(dose.itemId, dose.at, status)
      await load(true)
    } catch (err) {
      toast.notify((err as ApiError).message || 'Could not save that. Please try again.', 'error')
    } finally {
      setBusyKey(null)
    }
  }

  const onUndo = async (dose: TodayDose): Promise<void> => {
    if (dose.logId === null) return
    setBusyKey(dose.key)
    try {
      await portal.undoDose(dose.logId)
      await load(true)
    } catch (err) {
      toast.notify((err as ApiError).message || 'Could not undo that. Please try again.', 'error')
    } finally {
      setBusyKey(null)
    }
  }

  const jumpToRefills = (): void => {
    const current = data?.current ?? []
    const target =
      current.find((m) => m.refill !== null && (m.refill.status === 'Requested' || m.refill.status === 'Forwarded')) ??
      current.find((m) => m.supplyDaysLeft !== null && m.supplyDaysLeft <= 7) ??
      current[0]
    jumpTo(target !== undefined ? `medicine-${target.id}` : 'current')
  }

  const hasAny = data !== null && (data.current.length > 0 || data.past.length > 0)

  return (
    <div className="space-y-6" data-testid="medicines-page">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Medicines</h1>
          <p className="mt-1.5 max-w-prose text-sm text-ink-muted">
            What your doctors have prescribed, today&rsquo;s doses and refills. To change a dose or stop a medicine, talk to
            the doctor who prescribed it.
          </p>
        </div>
        {data !== null && hasAny && (
          <QuickAccess
            remainingToday={data.summary.today.total - data.summary.today.taken - data.summary.today.skipped}
            refillsDue={data.summary.refillsDueSoon}
            onToday={() => jumpTo('today')}
            onRefills={jumpToRefills}
          />
        )}
      </div>

      {data === null && error === null ? (
        <LoadingState label="Loading your medicines…" />
      ) : error !== null ? (
        <ErrorState description={error} onRetry={() => void load()} />
      ) : data !== null && !hasAny ? (
        <EmptyState
          icon={Pill}
          title="No prescriptions yet"
          description="When a doctor signs a prescription for you, it will appear here with how and when to take it."
        />
      ) : data !== null ? (
        <>
          <SummaryBar summary={data.summary} />
          <AiMedicineSummary hasCurrent={data.current.length > 0} />

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
            <div className="min-w-0 xl:col-start-2 xl:row-start-1">
              <TodaySchedule
                doses={data.today}
                asNeeded={data.current.filter((m) => m.schedule === 'as_needed')}
                busyKey={busyKey}
                onLog={(d, s) => void onLog(d, s)}
                onUndo={(d) => void onUndo(d)}
              />
            </div>

            <section id="current" aria-labelledby="meds-current" className="min-w-0 scroll-mt-24 space-y-3 xl:col-start-1 xl:row-start-1">
              <h2 id="meds-current" className="text-lg font-semibold tracking-tight text-ink">
                Current medicines <span className="font-normal text-ink-subtle">({data.current.length})</span>
              </h2>
              {data.current.length === 0 ? (
                <p className="rounded-2xl border border-border-soft bg-surface-1 p-5 text-sm text-ink-muted">
                  No current prescriptions. Your past medicines are below.
                </p>
              ) : (
                <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-1">
                  {data.current.map((m) => (
                    <li key={m.id} className="min-w-0">
                      <MedicineCard medicine={m} times={timesByItem.get(m.id) ?? []} onChanged={() => void load(true)} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {pastGroups.length > 0 && (
            <section aria-labelledby="meds-past" className="rounded-2xl border border-border-soft bg-surface-1 shadow-card">
              <h2 id="meds-past" className="m-0">
                <button
                  type="button"
                  onClick={() => setShowPast((v) => !v)}
                  aria-expanded={showPast}
                  aria-controls="meds-past-list"
                  className="focus-ring flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left sm:px-5"
                >
                  <IconTile icon={History} tone="gray" size="sm" />
                  <span className="min-w-0 flex-1 text-base font-semibold text-ink">
                    Past medicines <span className="font-normal text-ink-subtle">({data.past.length})</span>
                  </span>
                  <ChevronDown size={18} aria-hidden="true" className={`text-ink-subtle transition-transform ${showPast ? 'rotate-180' : ''}`} />
                </button>
              </h2>
              {showPast && (
                <ul id="meds-past-list" className="divide-y divide-border-soft border-t border-border-soft px-4 sm:px-5">
                  {pastGroups.map((g) => <PastRow key={g.key} g={g} />)}
                </ul>
              )}
            </section>
          )}
        </>
      ) : null}

      {data !== null && data.selfReported !== null && (
        <section aria-labelledby="meds-own" className="rounded-2xl border border-border-soft bg-surface-1 p-4 sm:p-5">
          <h2 id="meds-own" className="text-sm font-semibold text-ink">Medicines you told us about</h2>
          <p className="mt-1 whitespace-pre-line text-sm text-ink">{data.selfReported}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SourceBadge kind="patient" />
            <Link to="/app/health?tab=history" className="focus-ring rounded px-1 text-xs font-medium text-primary-700 hover:underline">
              Edit
            </Link>
          </div>
        </section>
      )}

      {data !== null && hasAny && (
        <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-subtle">
          <Info size={14} aria-hidden="true" className="mt-0.5 flex-shrink-0" />
          Prescriptions are shown exactly as your doctors signed them. The portal cannot tell whether a medicine was bought or
          taken — only what you mark here, which counts a dose you took but did not mark as missed.
        </p>
      )}

      {data !== null && (
        <MedicineListPrint
          patientName={user?.name ?? null}
          current={data.current}
          timesByItem={timesByItem}
          allergies={data.summary.allergies}
          selfReported={data.selfReported}
        />
      )}
    </div>
  )
}
