import { useEffect, useState } from 'react'
import { Users, Star, Building2 } from 'lucide-react'
import * as careTeamService from '../../services/careteam.service'
import { LoadingState, EmptyState, ErrorState } from '../../components/feedback/States.jsx'

/**
 * My Care Team — real data from GET /care-team.
 *
 * A patient with no assignment sees a genuine empty state, not a fabricated
 * list — care-team assignment is a clinical act performed by staff, which
 * this portal does not (and should not) let a patient trigger themselves.
 */
export default function CareTeamPage() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = () => {
    setLoading(true)
    setError(null)
    return careTeamService
      .listCareTeam()
      .then(setMembers)
      // The error object, not just its message: ErrorState reads requestId
      // off it to show the support reference.
      .catch((err) => setError(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">My Care Team</h1>
        <p className="mt-1.5 text-sm text-ink-muted">The clinicians looking after your recovery.</p>
      </div>

      {loading ? (
        <LoadingState label="Loading your care team…" />
      ) : error ? (
        <ErrorState description={error} onRetry={load} />
      ) : members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No care team assigned yet"
          description="Once your care team assigns clinicians to your case, they will appear here along with how to reach them."
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

              {m.doctor.hospitalName && (
                <p className="mt-3 flex items-center gap-1.5 border-t border-border-soft pt-3 text-xs text-ink-subtle">
                  <Building2 size={13} aria-hidden="true" />
                  {m.doctor.hospitalName}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
