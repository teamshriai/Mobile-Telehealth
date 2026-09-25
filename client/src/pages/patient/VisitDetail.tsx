import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, Stethoscope } from 'lucide-react'
import * as portal from '../../services/portal.service'
import type { VisitSummary } from '../../services/portal.service'
import { ErrorState, LoadingState } from '../../components/feedback/States'
import SourceBadge from '../../components/common/SourceBadge'
import MedicationCard from './MedicationCard'
import type { ApiError } from '../../types/api'

/**
 * A signed visit, as the patient sees it: who, when, where, what was decided.
 *
 * ⚠️ NOT THE CLINICAL NOTE. The note's body was written for colleagues and is
 * not released to patients (a policy decision the hospital has not taken).
 * The server does not send it, so this page cannot show it by accident.
 */
export default function VisitDetail() {
  const { visitId = '' } = useParams()
  const [visit, setVisit] = useState<VisitSummary | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    portal.getVisit(visitId)
      .then(setVisit)
      .catch((err: ApiError) => setError(err))
      .finally(() => setLoading(false))
  }, [visitId])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-5">
      <Link to="/app/health?tab=visits" className="focus-ring inline-flex items-center gap-1.5 rounded text-sm text-ink-muted hover:text-ink">
        <ArrowLeft size={15} aria-hidden="true" /> All visits
      </Link>

      {loading ? (
        <LoadingState label="Loading this visit…" />
      ) : error !== null ? (
        // A heading even on failure: a page with no <h1> is a page a screen
        // reader user cannot orient on.
        <>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Visit summary</h1>
          <ErrorState
            title={error.status === 404 ? 'Visit not found' : 'Could not load this visit'}
            description={error}
            onRetry={error.status === 404 ? undefined : load}
          />
        </>
      ) : visit !== null && (
        <>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {portal.VISIT_TYPE_LABEL[visit.type] ?? visit.type}
            </h1>
            <p className="mt-1.5 text-sm text-ink-muted">{portal.formatDay(visit.startedAt)}</p>
            {visit.location !== null && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
                <MapPin size={14} aria-hidden="true" /> {visit.location}
              </p>
            )}
          </div>

          <section aria-labelledby="visit-who" className="rounded-xl border border-border-soft bg-surface-1 p-4">
            <h2 id="visit-who" className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <Stethoscope size={15} aria-hidden="true" /> Seen by
            </h2>
            <ul className="mt-2 space-y-1">
              {visit.seenBy.map((s, idx) => (
                <li key={idx} className="text-sm text-ink">
                  {s.name ?? 'Your clinician'}
                  {s.registrationNumber !== null && <span className="text-ink-subtle"> · Reg. {s.registrationNumber}</span>}
                  {s.signedAt !== null && <span className="text-ink-subtle"> · signed {portal.formatDay(s.signedAt)}</span>}
                </li>
              ))}
            </ul>
            {visit.reasonForVisit !== null && (
              <p className="mt-3 text-sm text-ink"><span className="text-ink-subtle">Reason for visit: </span>{visit.reasonForVisit}</p>
            )}
          </section>

          <section aria-labelledby="visit-dx" className="space-y-2">
            <h2 id="visit-dx" className="text-base font-semibold text-ink">Diagnoses recorded</h2>
            {visit.diagnoses.length === 0 ? (
              <p className="text-sm text-ink-muted">No new diagnosis was recorded at this visit.</p>
            ) : (
              <ul className="space-y-2">
                {visit.diagnoses.map((d) => (
                  <li key={d.id} className="rounded-xl border border-border-soft bg-surface-1 p-4">
                    <p className="text-sm font-semibold text-ink">{d.title}</p>
                    <p className="mt-0.5 text-xs text-ink-subtle">ICD-10 {d.code} · {d.status === 'Active' ? 'current' : 'resolved'}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="visit-rx" className="space-y-2">
            <h2 id="visit-rx" className="text-base font-semibold text-ink">Medicines prescribed</h2>
            {visit.medications.length === 0 ? (
              <p className="text-sm text-ink-muted">No medicines were prescribed at this visit.</p>
            ) : (
              <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {visit.medications.map((m) => <li key={m.id}><MedicationCard m={m} /></li>)}
              </ul>
            )}
          </section>

          <section aria-labelledby="visit-ins" className="space-y-2">
            <h2 id="visit-ins" className="text-base font-semibold text-ink">Instructions given</h2>
            {visit.instructions.length === 0 ? (
              <p className="text-sm text-ink-muted">No written instructions were issued at this visit.</p>
            ) : (
              <ul className="space-y-2">
                {visit.instructions.map((i) => (
                  <li key={i.id} className="rounded-xl border border-border-soft bg-surface-1 p-4">
                    <p className="text-sm font-semibold text-ink" lang={i.language}>{i.title}</p>
                    <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-ink-muted" lang={i.language}>{i.body}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <SourceBadge kind="clinician" by={i.issuedByName} />
                      <Link to="/app/health?tab=instructions" className="focus-ring rounded text-xs font-medium text-primary-700 hover:underline">
                        Read in full
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
