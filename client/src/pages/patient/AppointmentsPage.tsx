import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Calendar, Video, Phone, MapPin, Clock, X, Plus, Stethoscope, CalendarClock, Camera } from 'lucide-react'
import Modal from '../../components/common/Modal'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import SlotPicker from '../../components/appointments/SlotPicker'
import DeviceCheck from '../../components/appointments/DeviceCheck'
import MiniCalendar from '../../components/appointments/MiniCalendar'
import { dayKey } from '../../components/appointments/calendarDays'
import * as appointmentService from '../../services/appointment.service'
import type { AppointmentScope, RequestAppointmentPayload } from '../../services/appointment.service'
import * as doctorService from '../../services/doctor.service'
import { LoadingState, EmptyState, ErrorState, Banner } from '../../components/feedback/States'
import type { Appointment, AppointmentMode, AppointmentStatus, BookableDoctor } from '../../types/domain'
import type { ApiError } from '../../types/api'

/**
 * Appointments — real data, real booking, real cancellation.
 *
 * Phase 1 found appointment booking was a bare `setTimeout(600)` that
 * confirmed a visit no doctor ever received. This page calls the Phase 3
 * appointment API end to end: POST /appointments really writes a row and
 * really triggers a notification; PATCH /:id/cancel really cancels it.
 *
 * Video appointments show their schedule with an honest "no joining link yet"
 * state (`appointment.joinUrl` is null server-side — no video provider is
 * integrated) rather than a Join button that does nothing.
 */

const MODE_ICON: Record<AppointmentMode, ComponentType<{ size?: number; className?: string }>> = {
  InPerson: MapPin,
  Video,
  Phone,
}

const STATUS_TONE: Record<AppointmentStatus, string> = {
  Requested: 'bg-warning-bg text-warning-fg',
  Confirmed: 'bg-success-bg text-success-fg',
  Completed: 'bg-surface-2 text-ink-muted',
  Cancelled: 'bg-surface-2 text-ink-subtle',
  NoShow: 'bg-critical-bg text-critical-fg',
}

interface AppointmentCardProps {
  appointment: Appointment
  onCancel: (appointment: Appointment) => void
  onReschedule: (appointment: Appointment) => void
  onCheckDevices: () => void
  cancelling: boolean
}

function AppointmentCard({ appointment, onCancel, onReschedule, onCheckDevices, cancelling }: AppointmentCardProps) {
  const Icon = MODE_ICON[appointment.mode] ?? MapPin
  const when = new Date(appointment.scheduledAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  })

  return (
    <li className="rounded-xl border border-border-soft bg-surface-1 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <Clock size={15} aria-hidden="true" className="text-ink-subtle" />
              {when}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[appointment.status] ?? STATUS_TONE.Requested}`}>
              {appointment.statusLabel}
            </span>
          </div>

          <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-muted">
            <Icon size={14} aria-hidden="true" />
            {appointment.modeLabel}
          </p>

          {appointment.doctor && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
              <Stethoscope size={14} aria-hidden="true" />
              {appointment.doctor.name}
              {appointment.doctor.specialty && ` — ${appointment.doctor.specialty}`}
            </p>
          )}

          {appointment.reason && (
            <p className="mt-2 text-sm leading-relaxed text-ink">{appointment.reason}</p>
          )}

          {/* Honest state: no video provider is integrated, so no Join button
              is ever shown — only what a patient can actually rely on. */}
          {appointment.isVideo && !appointment.cancelledAt && (
            <p className="mt-2 text-xs italic text-ink-subtle">
              The joining link will appear here closer to the appointment time.
            </p>
          )}

          {appointment.locationName && !appointment.isVideo && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
              <MapPin size={14} aria-hidden="true" />
              {appointment.locationName}
            </p>
          )}

          {appointment.cancelReason && (
            <p className="mt-2 text-xs text-ink-subtle">Reason for cancellation: {appointment.cancelReason}</p>
          )}
        </div>

        <div className="flex flex-shrink-0 flex-col gap-2 sm:items-end">
          {/* Reschedule sits beside Cancel — the two decisions about this
              visit — sharing one row even on a phone. */}
          {(appointment.canReschedule || appointment.canCancel) && (
            <div className="grid grid-cols-2 gap-2 sm:flex">
              {appointment.canReschedule && (
                <button
                  type="button"
                  onClick={() => onReschedule(appointment)}
                  className="focus-ring tap-target inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary-600/30 px-3 text-sm font-medium text-primary-700 hover:bg-primary-50/50"
                >
                  <CalendarClock size={14} aria-hidden="true" /> Reschedule
                </button>
              )}
              {appointment.canCancel && (
                <button
                  type="button"
                  onClick={() => onCancel(appointment)}
                  disabled={cancelling}
                  className="focus-ring tap-target inline-flex items-center justify-center gap-1.5 rounded-lg border border-border-soft px-3 text-sm font-medium text-ink-muted transition-colors hover:border-critical-fg/30 hover:bg-critical-bg hover:text-critical-fg disabled:opacity-50"
                >
                  <X size={14} aria-hidden="true" />
                  {cancelling ? 'Cancelling…' : 'Cancel'}
                </button>
              )}
            </div>
          )}
          {appointment.isVideo && appointment.canCancel && (
            <button
              type="button"
              onClick={onCheckDevices}
              className="focus-ring inline-flex min-h-11 items-center gap-1.5 self-start rounded-lg px-1 text-sm font-medium text-ink-muted hover:text-ink sm:self-end"
            >
              <Camera size={14} aria-hidden="true" /> Check camera &amp; mic
            </button>
          )}
        </div>
      </div>
    </li>
  )
}

/** A free date + time, for requests that have no doctor (and so no diary) yet. */
function PreferredTime({ onChange }: { onChange: (iso: string | null) => void }) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  useEffect(() => {
    onChange(date && time ? new Date(`${date}T${time}`).toISOString() : null)
  }, [date, time, onChange])
  const todayStr = new Date().toISOString().slice(0, 10)
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="move-date" className="mb-1.5 block text-sm font-medium text-ink">Preferred date</label>
        <input id="move-date" type="date" min={todayStr} value={date} onChange={(e) => setDate(e.target.value)}
          className="focus-ring w-full rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-sm text-ink" />
      </div>
      <div>
        <label htmlFor="move-time" className="mb-1.5 block text-sm font-medium text-ink">Preferred time</label>
        <input id="move-time" type="time" value={time} onChange={(e) => setTime(e.target.value)}
          className="focus-ring w-full rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-sm text-ink" />
      </div>
    </div>
  )
}

interface BookingFormProps {
  doctors: BookableDoctor[]
  initialDoctorId: string
  onSubmit: (payload: RequestAppointmentPayload) => void
  onClose: () => void
  submitting: boolean
  error: string | null
}

function BookingForm({ doctors, initialDoctorId, onSubmit, onClose, submitting, error }: BookingFormProps) {
  const [doctorId, setDoctorId] = useState(initialDoctorId)
  const [slot, setSlot] = useState<string | null>(null)
  const [mode, setMode] = useState<AppointmentMode>('InPerson')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [reason, setReason] = useState('')

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!reason.trim()) return
    // ⚠️ With a named clinician the patient picks a REAL slot from their
    // published diary; only "no preference" is a free-text time request.
    if (doctorId !== '') {
      if (slot === null) return
      onSubmit({ scheduledAt: slot, doctorId, mode, reason: reason.trim() })
      return
    }
    if (!date || !time) return
    // Combine the patient's local date+time into an absolute instant. Using
    // Date's local-time constructor (not a manual ISO concat) means DST and
    // the browser's own timezone are handled by the platform, not by us.
    const scheduledAt = new Date(`${date}T${time}`).toISOString()
    onSubmit({ scheduledAt, doctorId: doctorId || null, mode, reason: reason.trim() })
  }

  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border-soft bg-surface-1 p-5">
      <h2 className="text-base font-semibold text-ink">Request an appointment</h2>
      <p className="mt-1 text-sm text-ink-muted">
        {doctorId !== ''
          ? 'Choose one of this doctor’s free times. This sends a request — the hospital confirms it after checking the doctor’s availability.'
          : 'This sends a request with your preferred time. The hospital will assign a doctor and confirm a time.'}
      </p>

      {error && (
        <Banner tone="error" className="mt-3">{error}</Banner>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="appt-doctor" className="mb-1.5 block text-sm font-medium text-ink">
            Clinician <span className="font-normal text-ink-subtle">(optional)</span>
          </label>
          <select
            id="appt-doctor"
            value={doctorId}
            onChange={(e) => { setDoctorId(e.target.value); setSlot(null) }}
            className="focus-ring w-full rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-sm text-ink"
          >
            <option value="">No preference — the hospital will assign a doctor</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="appt-mode" className="mb-1.5 block text-sm font-medium text-ink">
            How would you like to meet?
          </label>
          <select
            id="appt-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as AppointmentMode)}
            className="focus-ring w-full rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-sm text-ink"
          >
            <option value="InPerson">In person</option>
            <option value="Video">Video consultation</option>
            <option value="Phone">Phone call</option>
          </select>
        </div>

        {doctorId !== '' ? (
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-sm font-medium text-ink">Choose a time</p>
            <SlotPicker doctorId={doctorId} value={slot} onChange={setSlot} />
          </div>
        ) : (<>
        <div>
          <label htmlFor="appt-date" className="mb-1.5 block text-sm font-medium text-ink">
            Preferred date
          </label>
          <input
            id="appt-date"
            type="date"
            required
            min={todayStr}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="focus-ring w-full rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-sm text-ink"
          />
        </div>

        <div>
          <label htmlFor="appt-time" className="mb-1.5 block text-sm font-medium text-ink">
            Preferred time
          </label>
          <input
            id="appt-time"
            type="time"
            required
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="focus-ring w-full rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-sm text-ink"
          />
        </div>
        </>)}

        <div className="sm:col-span-2">
          <label htmlFor="appt-reason" className="mb-1.5 block text-sm font-medium text-ink">
            Reason for visit
          </label>
          <textarea
            id="appt-reason"
            required
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Follow-up on speech therapy progress"
            className="focus-ring w-full rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-sm text-ink"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="focus-ring tap-target rounded-lg border border-border px-4 text-sm font-semibold text-ink-muted hover:bg-surface-2"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || (doctorId !== '' && slot === null)}
          className="focus-ring tap-target rounded-lg bg-primary-600 px-4 text-sm font-semibold text-on-primary hover:bg-primary-700 disabled:opacity-60"
        >
          {submitting ? 'Sending request…' : 'Send request'}
        </button>
      </div>
    </form>
  )
}

const TABS: Array<{ key: 'upcoming' | 'past'; label: string }> = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
]

export default function AppointmentsPage() {
  const [params, setParams] = useSearchParams()
  // `?doctor=<id>` arrives from "Book with" on My Care Team.
  const preselectedDoctor = params.get('doctor') ?? ''
  // `?day=YYYY-MM-DD` arrives from a day clicked on the Home calendar, and
  // `?new=1` from its "Request an appointment". Read once, then cleared.
  const dayParam = params.get('day')
  const initialDay = dayParam !== null && /^\d{4}-\d{2}-\d{2}$/.test(dayParam) ? dayParam : null
  const [scope, setScope] = useState<'upcoming' | 'past'>(() =>
    initialDay !== null && initialDay < dayKey(new Date()) ? 'past' : 'upcoming',
  )
  const pendingDay = useRef<string | null>(initialDay)
  const [toCancel, setToCancel] = useState<Appointment | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [toMove, setToMove] = useState<Appointment | null>(null)
  const [newSlot, setNewSlot] = useState<string | null>(null)
  const [moveError, setMoveError] = useState<string | null>(null)
  const [moving, setMoving] = useState(false)
  const [deviceCheck, setDeviceCheck] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [day, setDay] = useState<string | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [doctors, setDoctors] = useState<BookableDoctor[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<ApiError | null>(null)
  const [showForm, setShowForm] = useState(preselectedDoctor !== '' || params.get('new') === '1')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const load = useCallback((nextScope: AppointmentScope) => {
    setLoading(true)
    setLoadError(null)
    return appointmentService
      .listAppointments(nextScope)
      .then(setAppointments)
      // Keep the error object so ErrorState can show its support reference.
      .catch((err: ApiError) => setLoadError(err))
      .finally(() => setLoading(false))
  }, [])

  // A day handed over in the URL applies to the first load only; switching
  // between Upcoming and Past afterwards starts from "all days" again.
  useEffect(() => {
    load(scope)
    setDay(pendingDay.current)
    pendingDay.current = null
  }, [scope, load])

  useEffect(() => {
    if (!params.has('day') && !params.has('new')) return
    const next = new URLSearchParams(params)
    next.delete('day')
    next.delete('new')
    setParams(next, { replace: true })
  }, [params, setParams])

  useEffect(() => {
    let cancelled = false
    doctorService.listDoctors().then((d) => { if (!cancelled) setDoctors(d) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const handleBook = async (payload: RequestAppointmentPayload) => {
    setSubmitting(true)
    setFormError(null)
    try {
      await appointmentService.requestAppointment(payload)
      setShowForm(false)
      await load(scope === 'upcoming' ? 'upcoming' : scope)
      if (scope !== 'upcoming') setScope('upcoming')
    } catch (err) {
      const apiErr = err as ApiError
      setFormError(apiErr.fieldErrors && !Array.isArray(apiErr.fieldErrors) ? Object.values(apiErr.fieldErrors).flat()[0] : apiErr.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ⚠️ Cancelling is confirmed first: it releases a slot someone else may
  // take at once, so a mis-tap is not cheap to undo.
  const handleCancel = async () => {
    const appointment = toCancel
    if (appointment === null) return
    setCancellingId(appointment.id)
    try {
      await appointmentService.cancelAppointment(appointment.id, cancelReason.trim() || null)
      setToCancel(null)
      setCancelReason('')
      setNotice('Appointment cancelled.')
      await load(scope)
    } catch (err) {
      setLoadError(err as ApiError)
    } finally {
      setCancellingId(null)
    }
  }

  const handleMove = async () => {
    if (toMove === null || newSlot === null) return
    setMoving(true)
    setMoveError(null)
    try {
      await appointmentService.rescheduleAppointment(toMove.id, newSlot)
      setToMove(null)
      setNewSlot(null)
      setNotice('Reschedule requested. The hospital will confirm the new time after checking the doctor’s availability.')
      await load(scope)
    } catch (err) {
      setMoveError((err as ApiError).message)
    } finally {
      setMoving(false)
    }
  }

  const shown = day === null ? appointments : appointments.filter((a) => dayKey(a.scheduledAt) === day)

  const emptyCopy = useMemo(() => ({
    upcoming: {
      title: 'No upcoming appointments',
      description: 'When you request a visit, it appears here as “Awaiting confirmation” until the hospital approves it.',
    },
    past: {
      title: 'No past appointments yet',
      description: 'Completed and cancelled visits will show up here.',
    },
  }), [])

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Appointments</h1>
          <p className="mt-1.5 text-sm text-ink-muted">Your visits and video consultations.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="focus-ring tap-target inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-on-primary hover:bg-primary-700"
        >
          <Plus size={16} aria-hidden="true" />
          {showForm ? 'Close' : 'Request appointment'}
        </button>
      </div>

      {notice !== null && <Banner tone="success">{notice}</Banner>}

      {showForm && (
        <BookingForm
          doctors={doctors}
          initialDoctorId={preselectedDoctor}
          onSubmit={handleBook}
          onClose={() => { setShowForm(false); if (preselectedDoctor !== '') setParams({}, { replace: true }) }}
          submitting={submitting}
          error={formError}
        />
      )}

      <div className="flex gap-1 border-b border-border-soft" role="tablist" aria-label="Appointment period">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={scope === tab.key}
            onClick={() => setScope(tab.key)}
            className={`focus-ring -mb-px min-h-11 border-b-2 px-3 text-sm font-medium transition-colors ${
              scope === tab.key
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-ink-subtle hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[18rem_1fr]">
        {/* The calendar reflects the tab you are on; tap a day to show only
            that day's visits, tap it again to show them all. */}
        <div className="rounded-xl border border-border-soft bg-surface-1 p-4 lg:sticky lg:top-36">
          <MiniCalendar
            label={scope === 'upcoming' ? 'Upcoming appointments' : 'Past appointments'}
            marks={appointments
              .filter((a) => a.status !== 'Cancelled')
              .map((a) => ({ at: a.scheduledAt, confirmed: a.status === 'Confirmed' || a.status === 'Completed' }))}
            initialMonth={appointments[0] !== undefined ? dayKey(appointments[0].scheduledAt) : undefined}
            selected={day}
            onSelect={setDay}
          />
          {day !== null && (
            <button type="button" onClick={() => setDay(null)} className="focus-ring mt-3 rounded text-xs font-medium text-primary-700 hover:underline">
              Show all days
            </button>
          )}
        </div>

        <div className="min-w-0">
      {loading ? (
        <LoadingState label="Loading your appointments…" />
      ) : loadError ? (
        <ErrorState description={loadError} onRetry={() => load(scope)} />
      ) : appointments.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={emptyCopy[scope].title}
          description={emptyCopy[scope].description}
          action={
            scope === 'upcoming' && !showForm ? (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="focus-ring tap-target rounded-lg bg-primary-600 px-4 text-sm font-semibold text-on-primary hover:bg-primary-700"
              >
                Request your first appointment
              </button>
            ) : undefined
          }
        />
      ) : (
        shown.length === 0 ? (
          <p className="rounded-xl border border-border-soft bg-surface-1 p-4 text-sm text-ink-muted">
            No appointments on this day.
          </p>
        ) : (
        <ul className="space-y-3">
          {shown.map((a) => (
            <AppointmentCard
              key={a.id}
              appointment={a}
              onCancel={(appt) => { setToCancel(appt); setCancelReason('') }}
              onReschedule={(appt) => { setToMove(appt); setNewSlot(null); setMoveError(null) }}
              onCheckDevices={() => setDeviceCheck(true)}
              cancelling={cancellingId === a.id}
            />
          ))}
        </ul>
        )
      )}

        </div>
      </div>

      <ConfirmDialog
        open={toCancel !== null}
        title="Cancel this appointment?"
        consequence="The time will be released and may be booked by someone else. You can request a new appointment at any time."
        confirmLabel="Cancel appointment"
        cancelLabel="Keep it"
        destructive
        onConfirm={handleCancel}
        onCancel={() => setToCancel(null)}
      >
        <label htmlFor="cancel-reason" className="block text-sm font-medium text-ink">
          Reason <span className="font-normal text-ink-subtle">(optional — helps the clinic offer the slot to someone else)</span>
        </label>
        <textarea
          id="cancel-reason"
          rows={2}
          maxLength={300}
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          className="focus-ring mt-1.5 w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-ink"
        />
      </ConfirmDialog>

      <Modal
        isOpen={toMove !== null}
        onClose={moving ? undefined : () => setToMove(null)}
        title="Reschedule appointment"
        size="lg"
      >
        {toMove !== null && (
          <div className="space-y-4">
            <p className="text-sm text-ink-muted">
              {toMove.doctor !== null
                ? `Choose a new time with ${toMove.doctor.name}.`
                : 'Choose a new preferred time.'}{' '}
              This sends a reschedule request; the hospital confirms it after checking the doctor’s availability.
            </p>
            {toMove.doctor !== null ? (
              <SlotPicker doctorId={toMove.doctor.id} value={newSlot} onChange={setNewSlot} excludeInstant={toMove.scheduledAt} />
            ) : (
              <PreferredTime onChange={setNewSlot} />
            )}
            {moveError !== null && <Banner tone="error">{moveError}</Banner>}
            <div className="flex justify-end gap-2 border-t border-border-soft pt-4">
              <button type="button" onClick={() => setToMove(null)} disabled={moving} className="focus-ring tap-target rounded-lg px-4 text-sm font-medium text-ink-muted hover:bg-surface-2">
                Keep current time
              </button>
              <button type="button" onClick={() => void handleMove()} disabled={moving || newSlot === null} className="focus-ring tap-target rounded-lg bg-primary-600 px-5 text-sm font-semibold text-on-primary hover:bg-primary-700 disabled:opacity-60">
                {moving ? 'Sending…' : 'Request new time'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <DeviceCheck open={deviceCheck} onClose={() => setDeviceCheck(false)} />
    </div>
  )
}
