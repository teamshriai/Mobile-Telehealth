import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, Video, Phone, User } from 'lucide-react'
import DataTable, { type Column } from '../common/DataTable'
import { EmptyState } from '../feedback/States'
import { formatTime } from '../clinic/format'
import type { DashboardClinicItem } from '../../types/domain'

/**
 * Today's clinic, as a worklist.
 *
 * ⚠️ This data was already being fetched and was being rendered as the single
 * number "15". A consultant's first question at 09:00 is not *how many* — it
 * is *who, when, and what for*, in order, with the ones already seen struck
 * off. The dashboard endpoint has returned the full list all along.
 *
 * Status carries an icon AND a word (§5.3), never colour alone — roughly 8% of
 * male clinicians have a colour-vision deficiency, and "did this patient
 * attend" is not a question to answer with a hue.
 *
 * Rows open the patient's chart rather than starting a consultation: opening
 * the record is reversible and starting a visit is not, so the click that is
 * easy to make by accident is the harmless one.
 */

interface ClinicWorklistProps {
  clinic: readonly DashboardClinicItem[]
  /** Highlights the next patient due. */
  nextId?: string | null
}

const MODE_ICON = {
  Video,
  Phone,
  InPerson: User,
} as const

/** Sentence-case wording for the appointment lifecycle. Never the raw enum. */
const STATUS_LABEL: Record<string, string> = {
  Requested: 'Requested',
  Confirmed: 'Confirmed',
  Completed: 'Seen',
  Cancelled: 'Cancelled',
  NoShow: 'Did not attend',
}

const STATUS_TONE: Record<string, string> = {
  Completed: 'bg-success-bg text-success-fg',
  NoShow: 'bg-warning-bg text-warning-fg',
  Cancelled: 'bg-surface-2 text-ink-subtle',
  Requested: 'bg-surface-2 text-ink-muted',
  Confirmed: 'bg-primary-50 text-primary-700',
}

const MODE_LABEL: Record<string, string> = {
  InPerson: 'In person',
  Video: 'Video',
  Phone: 'Phone',
}

export default function ClinicWorklist({ clinic, nextId }: ClinicWorklistProps) {
  const navigate = useNavigate()

  const columns = useMemo<Array<Column<DashboardClinicItem>>>(
    () => [
      {
        key: 'time',
        header: 'Time',
        card: 'subtitle',
        sortValue: (r) => r.scheduledAt,
        render: (r) => (
          <span
            className={`tabular-nums ${
              r.id === nextId ? 'font-semibold text-ink' : 'text-ink-muted'
            }`}
          >
            {formatTime(r.scheduledAt)}
          </span>
        ),
      },
      {
        key: 'patient',
        header: 'Patient',
        card: 'title',
        sortValue: (r) => r.patientName,
        render: (r) => (
          <span className="flex items-center gap-1.5">
            <span className="font-medium text-ink">{r.patientName}</span>
            {r.id === nextId && (
              <span className="rounded bg-primary-600 px-1.5 py-0.5 text-2xs font-semibold text-on-primary">
                Next
              </span>
            )}
          </span>
        ),
      },
      {
        key: 'reason',
        header: 'Reason',
        card: 'meta',
        hideBelow: 'lg',
        render: (r) => (
          <span className="text-ink-muted">
            {r.reason === null || r.reason === undefined || r.reason === '' ? (
              <span className="text-ink-subtle">Not stated</span>
            ) : (
              r.reason
            )}
          </span>
        ),
      },
      {
        key: 'mode',
        header: 'Mode',
        card: 'hidden',
        hideBelow: 'xl',
        render: (r) => {
          const Icon = MODE_ICON[r.mode as keyof typeof MODE_ICON] ?? User
          return (
            <span className="inline-flex items-center gap-1 text-ink-muted">
              <Icon size={13} aria-hidden="true" />
              {MODE_LABEL[r.mode] ?? r.mode}
            </span>
          )
        },
      },
      {
        key: 'status',
        header: 'Status',
        card: 'meta',
        sortValue: (r) => r.status,
        render: (r) => (
          <span
            className={`inline-flex rounded px-1.5 py-0.5 text-2xs font-semibold ${
              STATUS_TONE[r.status] ?? 'bg-surface-2 text-ink-muted'
            }`}
          >
            {STATUS_LABEL[r.status] ?? r.status}
          </span>
        ),
      },
    ],
    [nextId],
  )

  return (
    <DataTable
      caption="Today's clinic"
      rows={[...clinic]}
      columns={columns}
      rowKey={(r) => r.id}
      onRowActivate={(r) => navigate(`/patient/${r.shriPatientId}/chart`)}
      emptyState={
        <EmptyState
          icon={CalendarClock}
          title="No clinic booked today"
          description="Appointments scheduled for today appear here in time order, with the next patient marked."
        />
      }
    />
  )
}
