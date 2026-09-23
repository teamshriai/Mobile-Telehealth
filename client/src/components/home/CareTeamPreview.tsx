import { Link } from 'react-router-dom'
import { ArrowRight, UserPlus } from 'lucide-react'
import Avatar from '../common/Avatar'
import type { CareTeamMember } from '../../types/domain'

/**
 * A compact view of who is actually looking after this patient.
 *
 * Reuses the shared Avatar rather than a Home-specific one, so initials and
 * colour assignment stay consistent with My Care Team and the topbar.
 *
 * Shows at most three. Beyond that the list stops being a glance and starts
 * being the Care Team page, which already exists one tap away.
 */
export default function CareTeamPreview({ careTeam = [] }: { careTeam?: CareTeamMember[] }) {
  const members = careTeam.slice(0, 3)

  return (
    <section aria-labelledby="careteam-heading" className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3">
        <h2 id="careteam-heading" className="text-sm font-semibold text-ink">
          Your care team
        </h2>
        {careTeam.length > 0 && (
          <Link
            to="/app/care-team"
            className="focus-ring inline-flex min-h-11 items-center gap-1 rounded-lg px-1 text-sm font-semibold text-primary-700 hover:underline"
          >
            View all <ArrowRight size={14} aria-hidden="true" />
          </Link>
        )}
      </div>

      <div className="mt-3.5 flex-1 rounded-xl border border-border bg-surface-1 p-4 shadow-card">
        {members.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <span
              aria-hidden="true"
              className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-2"
            >
              <UserPlus size={18} className="text-ink-subtle" />
            </span>
            <p className="text-sm leading-relaxed text-ink-subtle">
              No clinicians assigned yet. Your hospital will add them to your care team.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                <Avatar name={m.doctor?.name ?? '?'} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <p className="truncate text-sm font-semibold text-ink">
                      {m.doctor?.name}
                    </p>
                    {m.isPrimary && (
                      <span className="rounded bg-success-bg px-1.5 py-0.5 text-[11px] font-semibold text-success-fg">
                        Primary
                      </span>
                    )}
                  </div>
                  {/* The care role is what the patient needs ("who do I ring
                      about physio?"), so it leads over the specialty. */}
                  <p className="truncate text-sm text-ink-subtle">
                    {m.careRole ?? m.doctor?.specialty}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
