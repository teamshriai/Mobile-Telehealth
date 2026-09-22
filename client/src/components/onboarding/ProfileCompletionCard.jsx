import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Card from '../common/Card.jsx'

/**
 * Progressive-completion nudge for a portal home page. Never a gate — the
 * user already passed the Required tier to get here. `percent` is computed
 * client-side from fields already present in `profile` (see each portal's
 * home page), not a server round-trip.
 */
export default function ProfileCompletionCard({ percent, missingLabels = [] }) {
  if (percent >= 100) return null

  return (
    <Card variant="default" padding="lg" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <div className="h-2 w-28 overflow-hidden rounded-full bg-surface-3" role="presentation">
            <div
              className="h-full rounded-full bg-primary-600 transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-ink">{percent}% complete</span>
        </div>
        {missingLabels.length > 0 && (
          <p className="mt-2 text-xs text-ink-muted">
            Still missing: {missingLabels.slice(0, 3).join(', ')}
            {missingLabels.length > 3 ? `, +${missingLabels.length - 3} more` : ''}
          </p>
        )}
      </div>
      <Link
        to="/onboarding"
        className="focus-ring inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary-50 px-3.5 py-2 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-100"
      >
        Complete your profile <ArrowRight size={14} strokeWidth={2.5} />
      </Link>
    </Card>
  )
}
