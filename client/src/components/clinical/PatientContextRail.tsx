import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CalendarClock, ClipboardList, Pill } from 'lucide-react'
import { Skeleton } from '../feedback/States'
import { formatDate } from '../clinic/format'
import { classifyAllergies } from './patientDisplay'
import { encounterTypeLabel } from './encounterLabels'
import * as problemService from '../../services/problem.service'
import * as clinicalPatientService from '../../services/clinicalPatient.service'
import type { ClinicalPatient, Problem } from '../../types/domain'
import type { EncounterListItem } from '../../services/clinicalPatient.service'

/**
 * `Z6` — the patient context rail.
 *
 * ⚠️ §5.2 specifies `Z6` on `ARC-02`, `ARC-25` and `ARC-07`, and none of those
 * screens had one. It is not decoration: it carries the three things a
 * clinician re-checks constantly while reading any part of a chart — what the
 * patient is allergic to, what they are actively being treated for, and when
 * they were last seen. Without it those answers live on a tab you have to
 * leave the current one to reach.
 *
 * ⚠️ It loads INDEPENDENTLY of the tab content and degrades on its own. A rail
 * that fails should never take the chart down with it, and a rail still
 * loading should never delay the clinical content behind it.
 *
 * ⚠️ SECTIONS, NOT CARDS. The parent supplies one bordered container and these
 * are divided by hairlines inside it — the same treatment as My Day's `Z6`.
 * Four separate bordered boxes made the rail read as a dashboard of unrelated
 * widgets, which is the opposite of what a clinician re-checking an allergy
 * mid-consultation needs. The one exception is the allergy section, which keeps
 * a tinted background because it is the only thing here that changes what may
 * safely be prescribed.
 */

interface PatientContextRailProps {
  patient: ClinicalPatient
}

export default function PatientContextRail({ patient }: PatientContextRailProps) {
  const [problems, setProblems] = useState<Problem[] | null>(null)
  const [encounters, setEncounters] = useState<EncounterListItem[] | null>(null)
  const [failed, setFailed] = useState<string[]>([])

  const load = useCallback(() => {
    setFailed([])
    // allSettled: one failing source degrades its own section, not the rail.
    void Promise.allSettled([
      problemService.listProblems(patient.id),
      clinicalPatientService.listEncountersForPatient(patient.shriPatientId),
    ]).then(([p, e]) => {
      const missing: string[] = []
      if (p.status === 'fulfilled') setProblems(p.value)
      else { setProblems([]); missing.push('problems') }
      if (e.status === 'fulfilled') setEncounters(e.value.results)
      else { setEncounters([]); missing.push('visits') }
      setFailed(missing)
    })
  }, [patient.id, patient.shriPatientId])

  useEffect(load, [load])

  const allergy = classifyAllergies(patient.knownAllergies)
  const active = (problems ?? []).filter((p) => p.status === 'Active')
  const lastVisit = (encounters ?? []).find((e) => e.status !== 'InProgress')
  const openVisit = (encounters ?? []).find((e) => e.status === 'InProgress')

  return (
    <div className="divide-y divide-border-soft">
      {/* ⚠️ PARTIAL (§1.5) — the failed region NAMES what is missing and offers
          a retry, rather than showing an empty section. An allergy rail that
          silently renders "None coded." when the request failed is telling a
          clinician something clinically false. */}
      {failed.length > 0 && (
        <p
          role="status"
          className="flex flex-wrap items-center gap-x-2 gap-y-1 bg-warning-bg px-5 py-2.5 text-2xs text-warning-fg"
        >
          <span>
            Could not load {failed.join(' or ')}. What is shown below is incomplete.
          </span>
          <button
            type="button"
            onClick={load}
            className="focus-ring rounded font-semibold underline underline-offset-2"
          >
            Retry
          </button>
        </p>
      )}
      {/* ── Allergies: first, because it changes what may be prescribed ── */}
      <section className={`p-5 ${allergy.kind === 'documented' ? 'bg-critical-bg' : ''}`}>
        <h3 className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-subtle">
          <AlertTriangle size={12} aria-hidden="true" />
          Allergies
        </h3>
        {allergy.kind === 'documented' ? (
          // ⚠️ Text, never an icon alone (§6485).
          <p className="mt-1 whitespace-pre-line text-xs font-semibold text-critical-fg">
            {allergy.text}
          </p>
        ) : allergy.kind === 'none' ? (
          <p className="mt-1 text-xs text-ink">No known allergies</p>
        ) : (
          <p className="mt-1 text-xs text-warning-fg">
            Not recorded — ask before prescribing
          </p>
        )}
      </section>

      {/* ── Active problems ─────────────────────────────────────────────── */}
      <section className="p-5">
        <h3 className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-subtle">
          <ClipboardList size={12} aria-hidden="true" />
          Active problems{active.length > 0 && ` (${active.length})`}
        </h3>
        {problems === null ? (
          <div className="mt-2 space-y-1.5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        ) : active.length === 0 ? (
          <p className="mt-1 text-xs text-ink-subtle">
            {/* ⚠️ Never "None coded." when the request failed — see the
                PARTIAL banner above. The two are clinically opposite. */}
            {failed.includes('problems') ? 'Not available.' : 'None coded.'}
          </p>
        ) : (
          <ul className="mt-1.5 space-y-1">
            {active.slice(0, 6).map((p) => (
              <li key={p.id} className="flex items-baseline gap-1.5 text-xs">
                <span className="font-mono text-2xs text-ink-subtle">{p.code}</span>
                <span className="min-w-0 flex-1 text-ink">{p.codeTitle}</span>
              </li>
            ))}
            {active.length > 6 && (
              <li className="text-2xs text-ink-subtle">+{active.length - 6} more</li>
            )}
          </ul>
        )}
      </section>

      {/* ── Current medication, as the patient reports it ───────────────── */}
      <section className="p-5">
        <h3 className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-subtle">
          <Pill size={12} aria-hidden="true" />
          Current medication
        </h3>
        <p className="mt-1 whitespace-pre-line text-xs text-ink">
          {patient.currentMedications === null || patient.currentMedications.trim() === '' ? (
            <span className="text-ink-subtle">Nothing recorded.</span>
          ) : (
            patient.currentMedications
          )}
        </p>
        <p className="mt-1.5 text-2xs text-ink-subtle">
          As recorded by the patient. Prescriptions issued here are on the Medications tab.
        </p>
      </section>

      {/* ── Visit context ───────────────────────────────────────────────── */}
      <section className="p-5">
        <h3 className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-subtle">
          <CalendarClock size={12} aria-hidden="true" />
          Visits
        </h3>
        {encounters === null ? (
          <Skeleton className="mt-2 h-3 w-full" />
        ) : (
          <dl className="mt-1.5 space-y-1 text-xs">
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-ink-muted">Total</dt>
              <dd className="tabular-nums text-ink">{encounters.length}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="shrink-0 text-ink-muted">Last seen</dt>
              <dd className="truncate text-right tabular-nums text-ink">
                {lastVisit === undefined ? '—' : formatDate(lastVisit.startedAt)}
              </dd>
            </div>
            {openVisit !== undefined && (
              <div className="mt-2 border-t border-border-soft pt-2">
                <p className="text-2xs text-ink-muted">Open now</p>
                <Link
                  to={`/encounter/${openVisit.visitId}/note`}
                  className="focus-ring mt-0.5 block truncate rounded text-xs font-medium text-primary-700 underline underline-offset-2"
                >
                  {encounterTypeLabel(openVisit.type)} · continue
                </Link>
              </div>
            )}
          </dl>
        )}
      </section>
    </div>
  )
}
