import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Star, Building2, CalendarPlus, BadgeCheck } from 'lucide-react'
import * as careTeamService from '../../services/careteam.service'
import { LoadingState, EmptyState, ErrorState } from '../../components/feedback/States'
import type { CareTeamMember } from '../../types/domain'
import type { ApiError } from '../../types/api'

/**
 * My Care Team — real data from GET /care-team.
 *
 * A patient with no assignment sees a genuine empty state, not a fabricated
 * list — care-team assignment is a clinical act performed by staff, which
 * this portal does not (and should not) let a patient trigger themselves.
 */
export default function CareTeamPage() {
  const [members, setMembers] = useState<CareTeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    return careTeamService
      .listCareTeam()
      .then(setMembers)
      // The error object, not just its message: ErrorState reads requestId
      // off it to show the support reference.
      .catch((err: ApiError) => setError(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">My doctors</h1>
        <p className="mt-1.5 text-sm text-ink-muted">The doctors looking after you. Book a visit with any of them.</p>
      </div>

      {loading ? (
        <LoadingState label="Loading your doctors…" />
      ) : error ? (
        <ErrorState description={error} onRetry={load} />
      ) : members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No doctors assigned yet"
          description="When your hospital assigns doctors to your care, they will appear here and you can book a visit with them."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {members.map((m) => (
            <li key={m.id} className="rounded-xl border border-border-soft bg-surface-1 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                    {m.doctor.name}
                    {m.isPrimary && (
                      <span title="Primary clinician">
                        <Star size={13} aria-hidden="true" className="fill-warning-fg text-warning-fg" />
                        <span className="sr-only">Primary clinician</span>
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-muted">{m.careRole}</p>
                  {m.doctor.specialty && (
                    <p className="mt-0.5 text-xs text-ink-subtle">{m.doctor.specialty}</p>
                  )}
                </div>
              </div>

              {m.doctor.qualifications && (
                <p className="mt-2 text-xs text-ink-subtle">{m.doctor.qualifications}</p>
              )}
              {m.doctor.isVerified && (
                <p className="mt-1 flex items-center gap-1 text-xs text-success-fg">
                  <BadgeCheck size={13} aria-hidden="true" /> Registration verified by the hospital
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border-soft pt-3">
                {m.doctor.hospitalName ? (
                  <p className="flex items-center gap-1.5 text-xs text-ink-subtle">
                    <Building2 size={13} aria-hidden="true" />
                    {m.doctor.hospitalName}
                  </p>
                ) : <span />}
                {/* Books from this clinician's real published slots. */}
                <Link
                  to={`/app/appointments?doctor=${encodeURIComponent(m.doctor.id)}`}
                  className="focus-ring tap-target inline-flex items-center gap-1.5 rounded-lg border border-border-soft px-3 text-sm font-medium text-primary-700 hover:bg-surface-2"
                >
                  <CalendarPlus size={15} aria-hidden="true" /> Book a visit
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
