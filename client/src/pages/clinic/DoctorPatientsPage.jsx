import { useCallback, useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { LoadingState, EmptyState, ErrorState } from '../../components/feedback/States.jsx'
import { formatDate, initials } from '../../components/clinic/format.js'
import * as doctorSelf from '../../services/doctorSelf.service.js'

/**
 * The doctor's own active care team — name, care role, and last visit only.
 *
 * No clinical detail here by design; the full record lives behind
 * careRelationship.service's row check, which this list deliberately does not
 * go through (it reads care-team membership, not the record itself).
 */
export default function DoctorPatientsPage() {
  const [patients, setPatients] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    setError(null)
    doctorSelf
      .listOwnPatients()
      .then(setPatients)
      // Previously unhandled, which left the page on "Loading…" forever when
      // the request failed.
      .catch(setError)
  }, [])

  useEffect(load, [load])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">My patients</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Patients currently on your active care team
          {patients !== null && patients.length > 0 ? ` · ${patients.length} in total` : ''}.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-border-soft bg-surface-1">
          <ErrorState title="Could not load your patients" description={error} onRetry={load} />
        </div>
      ) : patients === null ? (
        <div className="rounded-xl border border-border-soft bg-surface-1">
          <LoadingState label="Loading your patients…" />
        </div>
      ) : patients.length === 0 ? (
        <div className="rounded-xl border border-border-soft bg-surface-1">
          <EmptyState
            icon={Users}
            title="No patients yet"
            description="Patients appear here once your hospital administrator assigns them to your care team."
          />
        </div>
      ) : (
        <ul className="space-y-2">
          {patients.map((p) => (
            <li
              key={p.patientId}
              className="flex flex-col gap-2 rounded-xl border border-border-soft bg-surface-1 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-700"
                >
                  {initials(p.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                  <p className="truncate text-xs text-ink-subtle">
                    {p.careRole}
                    {p.isPrimary ? ' · Primary' : ''} · since {formatDate(p.since)}
                  </p>
                </div>
              </div>
              <span className="flex-shrink-0 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
                {p.lastAppointment
                  ? `Last seen ${formatDate(p.lastAppointment.scheduledAt)}`
                  : 'No visits with you yet'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
