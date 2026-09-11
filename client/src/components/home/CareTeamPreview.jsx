import { Link } from 'react-router-dom'
import { ArrowRight, UserPlus } from 'lucide-react'
import Avatar from '../common/Avatar.jsx'

/**
 * A compact view of who is actually looking after this patient.
 *
 * Reuses the shared Avatar rather than a Home-specific one, so initials and
 * colour assignment stay consistent with My Care Team and the topbar.
 *
 * Shows at most three. Beyond that the list stops being a glance and starts
 * being the Care Team page, which already exists one tap away.
 */
export default function CareTeamPreview({ careTeam = [] }) {
  const members = careTeam.slice(0, 3)

  return (
    <section aria-labelledby="careteam-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="careteam-heading" className="text-sm font-semibold text-[#0F172A]">
          Your care team
        </h2>
        {careTeam.length > 0 && (
          <Link
            to="/app/care-team"
            className="focus-ring inline-flex min-h-11 items-center gap-1 rounded-lg px-1 text-sm font-semibold text-[#2563EB] hover:underline"
          >
            View all <ArrowRight size={14} aria-hidden="true" />
          </Link>
        )}
      </div>

      <div className="mt-3.5 rounded-xl border border-[#E8EDF2] bg-white p-4">
        {members.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <span
              aria-hidden="true"
              className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#F1F5F9]"
            >
              <UserPlus size={18} className="text-[#64748B]" />
            </span>
            <p className="text-sm leading-relaxed text-[#64748B]">
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
                    <p className="truncate text-sm font-semibold text-[#0F172A]">
                      {m.doctor?.name}
                    </p>
                    {m.isPrimary && (
                      <span className="rounded bg-[#E6F4F1] px-1.5 py-0.5 text-[11px] font-semibold text-[#2F6B5E]">
                        Primary
                      </span>
                    )}
                  </div>
                  {/* The care role is what the patient needs ("who do I ring
                      about physio?"), so it leads over the specialty. */}
                  <p className="truncate text-sm text-[#64748B]">
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
