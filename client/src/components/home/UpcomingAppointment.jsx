import { Link } from 'react-router-dom'
import { Video, MapPin, CalendarPlus, ArrowRight } from 'lucide-react'

/**
 * The next appointment, given real prominence.
 *
 * This is the single most actionable thing on the page: it is the one item
 * with a date attached that the patient has to do something about. It gets a
 * calendar block, the clinician's name, and the mode — the three things
 * someone actually checks.
 *
 * A "Join" button is deliberately NOT rendered unless the API supplies a
 * genuine `joinUrl`. The demo record has `joinUrl: null`, so showing a join
 * affordance would be a button that lies.
 */

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatTime(date) {
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
}

/** Whole days between today and the appointment, for the "in N days" line. */
function daysAway(date) {
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.round((startOfDay(date) - startOfDay(new Date())) / 86_400_000)
}

function relativeLabel(days) {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days > 1) return `In ${days} days`
  return null
}

export default function UpcomingAppointment({ appointment }) {
  if (!appointment) {
    // Deliberately compact. The generic EmptyState is built for a full page
    // column; used here it gave the "nothing to see" case more vertical room
    // than a real appointment gets, which reads as a broken layout.
    return (
      <section aria-labelledby="next-heading">
        <h2 id="next-heading" className="text-sm font-semibold text-[#0F172A]">
          Your next appointment
        </h2>
        <div className="mt-3.5 rounded-xl border border-[#E8EDF2] bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span
              aria-hidden="true"
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#F1F5F9]"
            >
              <CalendarPlus size={19} className="text-[#64748B]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#0F172A]">No appointments scheduled</p>
              <p className="mt-0.5 text-sm leading-relaxed text-[#64748B]">
                When you book a visit or video consultation, it will appear here.
              </p>
            </div>
            <Link
              to="/app/appointments"
              className="focus-ring inline-flex min-h-11 flex-shrink-0 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8]"
            >
              Book an appointment
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const when = new Date(appointment.scheduledAt)
  const days = daysAway(when)
  const relative = relativeLabel(days)
  const isVideo = appointment.isVideo === true
  const ModeIcon = isVideo ? Video : MapPin
  const where = isVideo
    ? (appointment.modeLabel ?? 'Video consultation')
    : (appointment.locationName ?? appointment.modeLabel ?? 'In person')

  return (
    <section aria-labelledby="next-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="next-heading" className="text-sm font-semibold text-[#0F172A]">
          Your next appointment
        </h2>
        <Link
          to="/app/appointments"
          className="focus-ring inline-flex min-h-11 items-center gap-1 rounded-lg px-1 text-sm font-semibold text-[#2563EB] hover:underline"
        >
          All appointments <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-3.5 rounded-xl border border-[#DBEAFE] bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* Calendar block — a date is read as a date faster than as prose. */}
          <div
            aria-hidden="true"
            className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-[#EFF6FF]"
          >
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#1D4ED8]">
              {MONTHS[when.getMonth()]}
            </span>
            <span className="text-2xl font-semibold leading-none text-[#0F172A]">
              {when.getDate()}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold text-[#0F172A]">
                {appointment.doctor?.name ?? 'Your clinician'}
              </p>
              {relative && (
                <span className="rounded-md bg-[#EFF6FF] px-2 py-0.5 text-xs font-semibold text-[#1D4ED8]">
                  {relative}
                </span>
              )}
            </div>

            {appointment.doctor?.specialty && (
              <p className="mt-0.5 text-sm text-[#64748B]">{appointment.doctor.specialty}</p>
            )}

            {/* Date and time spelled out for screen readers, since the
                calendar block above is aria-hidden. */}
            <p className="mt-2 text-sm text-[#475569]">
              {when.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              {' · '}{formatTime(when)}
            </p>

            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-[#475569]">
              <ModeIcon size={14} aria-hidden="true" className="flex-shrink-0 text-[#64748B]" />
              <span className="min-w-0">{where}</span>
            </p>

            {appointment.reason && (
              <p className="mt-2 text-sm leading-relaxed text-[#64748B]">{appointment.reason}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
