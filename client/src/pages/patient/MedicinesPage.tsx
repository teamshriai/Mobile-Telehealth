import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Info, Pill } from 'lucide-react'
import * as portal from '../../services/portal.service'
import * as profileService from '../../services/profile.service'
import type { Medication } from '../../services/portal.service'
import { EmptyState, ErrorState, LoadingState } from '../../components/feedback/States'
import SourceBadge from '../../components/common/SourceBadge'
import MedicationCard from './MedicationCard'
import type { ApiError } from '../../types/api'

/**
 * Medicines — what the patient's clinicians have PRESCRIBED and signed.
 *
 * ⚠️ READ-ONLY, BY DESIGN. Prescribing is a clinical act; this page shows it
 * and never offers to change it. Refill requests arrive with secure messaging
 * (a later phase) and are therefore absent here, not greyed out.
 *
 * The patient's own free-text "current medications" from their health
 * history is shown separately and labelled as theirs, because the two can
 * legitimately disagree (a medicine bought over the counter, one another
 * hospital prescribed) and a patient must be able to see which is which.
 */
export default function MedicinesPage() {
  const [meds, setMeds] = useState<{ current: Medication[]; past: Medication[] } | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(true)
  const [ownList, setOwnList] = useState<string | null>(null)
  const [showPast, setShowPast] = useState(false)

  const load = () => {
    setLoading(true)
    setError(null)
    portal.getMedications()
      .then(setMeds)
      .catch((err: ApiError) => setError(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // The patient-reported list is secondary; if it fails the page still works.
    profileService.getProfile().then((r) => setOwnList(r.profile?.currentMedications ?? null)).catch(() => {})
  }, [])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Medicines</h1>
        <p className="mt-1.5 max-w-prose text-sm text-ink-muted">
          Medicines your doctors have prescribed. To change a dose or stop a medicine, talk to the
          doctor who prescribed it.
        </p>
      </div>

      {loading ? (
        <LoadingState label="Loading your medicines…" />
      ) : error !== null ? (
        <ErrorState description={error} onRetry={load} />
      ) : meds === null || (meds.current.length === 0 && meds.past.length === 0) ? (
        <EmptyState
          icon={Pill}
          title="No prescriptions yet"
          description="When a doctor signs a prescription for you, it will appear here with how and when to take it."
        />
      ) : (
        <>
          <section aria-labelledby="meds-current" className="space-y-3">
            <h2 id="meds-current" className="text-base font-semibold text-ink">
              Current <span className="font-normal text-ink-subtle">({meds.current.length})</span>
            </h2>
            {meds.current.length === 0 ? (
              <p className="text-sm text-ink-muted">No current prescriptions. Your past prescriptions are below.</p>
            ) : (
              <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {meds.current.map((m) => <li key={m.id}><MedicationCard m={m} /></li>)}
              </ul>
            )}
          </section>

          {meds.past.length > 0 && (
            <section aria-labelledby="meds-past" className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 id="meds-past" className="text-base font-semibold text-ink">
                  Past <span className="font-normal text-ink-subtle">({meds.past.length})</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setShowPast((v) => !v)}
                  aria-expanded={showPast}
                  className="focus-ring tap-target rounded-lg px-3 text-sm font-medium text-primary-700 hover:bg-surface-2"
                >
                  {showPast ? 'Hide' : 'Show'}
                </button>
              </div>
              {showPast && (
                <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {meds.past.map((m) => <li key={m.id}><MedicationCard m={m} /></li>)}
                </ul>
              )}
            </section>
          )}
        </>
      )}

      {ownList !== null && ownList.trim() !== '' && (
        <section aria-labelledby="meds-own" className="rounded-xl border border-border-soft bg-surface-1 p-4">
          <h2 id="meds-own" className="text-sm font-semibold text-ink">Medicines you told us about</h2>
          <p className="mt-1 whitespace-pre-line text-sm text-ink">{ownList}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <SourceBadge kind="patient" />
            <Link to="/app/health?tab=history" className="focus-ring rounded text-xs font-medium text-primary-700 hover:underline">
              Edit
            </Link>
          </div>
        </section>
      )}

      <p className="flex items-start gap-2 text-xs text-ink-subtle">
        <Info size={14} aria-hidden="true" className="mt-0.5 flex-shrink-0" />
        This list shows what was prescribed. It cannot tell whether a medicine was bought or taken.
      </p>
    </div>
  )
}
