import { useEffect, useRef } from 'react'
import { CheckCircle2, Hospital, Video, Phone, MapPin } from 'lucide-react'
import Avatar from '../common/Avatar'
import type { Appointment } from '../../types/domain'

/**
 * "Request sent" — shown right after booking, until the patient closes it.
 *
 * ⚠️ IT SAYS "REQUEST", BECAUSE THAT IS WHAT IT IS. The appointment is the one
 * the server just returned: Requested, labelled "Awaiting confirmation" until
 * the hospital checks the doctor's availability and approves it (the patient
 * is then notified). Nothing here claims the visit is booked.
 *
 * Focus moves to the heading when it appears, so a screen-reader user hears
 * that the request went through rather than being left on a vanished form.
 */
interface BookingConfirmationProps {
  appointment: Appointment
  onDone: () => void
}

const WHEN = new Intl.DateTimeFormat('en-IN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Kolkata',
})

export default function BookingConfirmation({ appointment, onDone }: BookingConfirmationProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => { headingRef.current?.focus() }, [])

  const ModeIcon = appointment.isVideo ? Video : appointment.mode === 'Phone' ? Phone : MapPin
  const doctor = appointment.doctor

  return (
    <section
      aria-labelledby="booking-confirmation-title"
      data-testid="booking-confirmation"
      className="rounded-xl border border-success-fg/30 bg-surface-1 p-5 shadow-card"
    >
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-success-bg text-success-fg">
          <CheckCircle2 size={20} />
        </span>
        <div className="min-w-0">
          <h2 id="booking-confirmation-title" ref={headingRef} tabIndex={-1} className="text-base font-semibold text-ink outline-none">
            Request sent
          </h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            The hospital will confirm it once they have checked the doctor’s availability. You’ll get a notification when they do.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-lg border border-border-soft bg-surface-2 p-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {doctor ? (
            <Avatar name={doctor.name} src={doctor.photoUrl} size="lg" />
          ) : (
            <span aria-hidden="true" className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-surface-1 text-ink-subtle">
              <Hospital size={20} />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">{doctor?.name ?? 'A doctor will be assigned'}</p>
            {doctor?.specialty && <p className="text-xs text-ink-muted">{doctor.specialty}</p>}
            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
              <ModeIcon size={14} aria-hidden="true" className="flex-shrink-0 text-ink-subtle" />
              <span className="min-w-0">{WHEN.format(new Date(appointment.scheduledAt))} · {appointment.modeLabel}</span>
            </p>
          </div>
        </div>
        <span className="self-start rounded-full bg-warning-bg px-2.5 py-0.5 text-xs font-semibold text-warning-fg sm:self-center">
          {appointment.statusLabel}
        </span>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onDone}
          className="focus-ring tap-target rounded-lg border border-border-soft px-4 text-sm font-medium text-ink hover:bg-surface-2"
        >
          Done
        </button>
      </div>
    </section>
  )
}
