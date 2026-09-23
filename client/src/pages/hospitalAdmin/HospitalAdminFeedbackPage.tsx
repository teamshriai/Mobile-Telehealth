import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import Card from '../../components/common/Card'
import StatusBadge from '../../components/common/StatusBadge'
import * as hospitalAdmin from '../../services/hospitalAdmin.service'
import type { Feedback } from '../../types/domain'
import type { ApiError } from '../../types/api'

function Rating({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={14}
          className={n <= value ? 'fill-warning-fg text-warning-fg' : 'text-border-soft'}
        />
      ))}
    </span>
  )
}

interface FeedbackData {
  feedback: Feedback[]
  averageRating: number | null
  count: number
}

export default function HospitalAdminFeedbackPage() {
  const [data, setData] = useState<FeedbackData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    hospitalAdmin
      .listFeedback()
      .then(setData)
      .catch((err: ApiError) => setError(err.message || 'Could not load feedback.'))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Feedback</h1>
          <p className="mt-1 text-sm text-ink-muted">
            What patients say about your doctors and hospital service.
          </p>
        </div>
        {data?.averageRating != null && (
          <StatusBadge variant="primary" size="md">
            <Rating value={Math.round(data.averageRating)} /> {data.averageRating} avg · {data.count} reviews
          </StatusBadge>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-critical-bg px-3 py-2 text-xs text-critical-fg">
          {error}
        </p>
      )}

      <Card padding="none">
        {data === null && !error ? (
          <p className="p-5 text-sm text-ink-muted">Loading…</p>
        ) : data?.feedback.length === 0 ? (
          <p className="p-5 text-sm text-ink-muted">No feedback submitted yet.</p>
        ) : data ? (
          <ul className="divide-y divide-border-soft">
            {data.feedback.map((f) => (
              <li key={f.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <Rating value={f.rating} />
                  <span className="text-xs text-ink-subtle">
                    {new Date(f.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium text-ink-muted">
                  {f.category.replace(/([A-Z])/g, ' $1').trim()}
                  {f.doctorName ? ` · ${f.doctorName}` : ''}
                </p>
                {f.comment && <p className="mt-1.5 text-sm text-ink">{f.comment}</p>}
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </div>
  )
}
