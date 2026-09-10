import { useCallback, useEffect, useMemo, useState } from 'react'
import { Calendar, Video, Phone, MapPin, Clock, X, Plus, Stethoscope } from 'lucide-react'
import * as appointmentService from '../../services/appointment.service'
import * as doctorService from '../../services/doctor.service'
import { LoadingState, EmptyState, ErrorState, Banner } from '../../components/feedback/States.jsx'

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

const MODE_ICON = { InPerson: MapPin, Video: Video, Phone: Phone }

function AppointmentCard({ appointment, onCancel, cancelling }) {
  const Icon = MODE_ICON[appointment.mode] ?? MapPin
  const when = new Date(appointment.scheduledAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  })

  const STATUS_TONE = {
    Requested: 'bg-[#FBF0E2] text-[#8A5A1B]',
    Confirmed: 'bg-[#E6F0EE] text-[#2F6B5E]',
    Completed: 'bg-[#F1F5F9] text-[#475569]',
    Cancelled: 'bg-[#F1F5F9] text-[#64748B]',
    NoShow: 'bg-[#FBEAE7] text-[#A33A28]',
  }

  return (
    <li className="rounded-xl border border-[#E8EDF2] bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-[#0F172A]">
              <Clock size={15} aria-hidden="true" className="text-[#64748B]" />
              {when}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[appointment.status] ?? STATUS_TONE.Requested}`}>
              {appointment.statusLabel}
            </span>
          </div>

          <p className="mt-2 flex items-center gap-1.5 text-sm text-[#475569]">
            <Icon size={14} aria-hidden="true" />
            {appointment.modeLabel}
          </p>

          {appointment.doctor && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-[#475569]">
              <Stethoscope size={14} aria-hidden="true" />
              {appointment.doctor.name}
              {appointment.doctor.specialty && ` — ${appointment.doctor.specialty}`}
            </p>
          )}

          {appointment.reason && (
            <p className="mt-2 text-sm leading-relaxed text-[#0F172A]">{appointment.reason}</p>
          )}

          {/* Honest state: no video provider is integrated, so no Join button
              is ever shown — only what a patient can actually rely on. */}
          {appointment.isVideo && !appointment.cancelledAt && (
            <p className="mt-2 text-xs italic text-[#64748B]">
              The joining link will appear here closer to the appointment time.
            </p>
          )}

          {appointment.cancelReason && (
            <p className="mt-2 text-xs text-[#64748B]">Reason for cancellation: {appointment.cancelReason}</p>
          )}
        </div>

        {appointment.canCancel && (
          <button
            type="button"
            onClick={() => onCancel(appointment)}
            disabled={cancelling}
            className="focus-ring tap-target inline-flex flex-shrink-0 items-center gap-1.5 self-start rounded-lg border border-[#E8EDF2] px-3 text-sm font-medium text-[#475569] transition-colors hover:border-[#F0C8C0] hover:bg-[#FBEAE7] hover:text-[#A33A28] disabled:opacity-50 sm:self-auto"
          >
            <X size={14} aria-hidden="true" />
            {cancelling ? 'Cancelling…' : 'Cancel'}
          </button>
        )}
      </div>
    </li>
  )
}

function BookingForm({ doctors, onSubmit, onClose, submitting, error }) {
  const [doctorId, setDoctorId] = useState('')
  const [mode, setMode] = useState('InPerson')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [reason, setReason] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!date || !time || !reason.trim()) return
    // Combine the patient's local date+time into an absolute instant. Using
    // Date's local-time constructor (not a manual ISO concat) means DST and
    // the browser's own timezone are handled by the platform, not by us.
    const scheduledAt = new Date(`${date}T${time}`).toISOString()
    onSubmit({ scheduledAt, doctorId: doctorId || null, mode, reason: reason.trim() })
  }

  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-[#E8EDF2] bg-white p-5">
      <h2 className="text-base font-semibold text-[#0F172A]">Request an appointment</h2>
      <p className="mt-1 text-sm text-[#475569]">
        Your care team will confirm the exact time. This is a request, not a booking.
      </p>

      {error && (
        <Banner tone="error" className="mt-3">{error}</Banner>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="appt-doctor" className="mb-1.5 block text-sm font-medium text-[#0F172A]">
            Clinician <span className="font-normal text-[#64748B]">(optional)</span>
          </label>
          <select
            id="appt-doctor"
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            className="focus-ring w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2.5 text-sm text-[#0F172A]"
          >
            <option value="">No preference — care team will assign</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="appt-mode" className="mb-1.5 block text-sm font-medium text-[#0F172A]">
            How would you like to meet?
          </label>
          <select
            id="appt-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="focus-ring w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2.5 text-sm text-[#0F172A]"
          >
            <option value="InPerson">In person</option>
            <option value="Video">Video consultation</option>
            <option value="Phone">Phone call</option>
          </select>
        </div>

        <div>
          <label htmlFor="appt-date" className="mb-1.5 block text-sm font-medium text-[#0F172A]">
            Preferred date
          </label>
          <input
            id="appt-date"
            type="date"
            required
            min={todayStr}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="focus-ring w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2.5 text-sm text-[#0F172A]"
          />
        </div>

        <div>
          <label htmlFor="appt-time" className="mb-1.5 block text-sm font-medium text-[#0F172A]">
            Preferred time
          </label>
          <input
            id="appt-time"
            type="time"
            required
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="focus-ring w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2.5 text-sm text-[#0F172A]"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="appt-reason" className="mb-1.5 block text-sm font-medium text-[#0F172A]">
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
            className="focus-ring w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2.5 text-sm text-[#0F172A]"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="focus-ring tap-target rounded-lg border border-[#CBD5E1] px-4 text-sm font-semibold text-[#475569] hover:bg-[#F1F5F9]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="focus-ring tap-target rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60"
        >
          {submitting ? 'Sending request…' : 'Send request'}
        </button>
      </div>
    </form>
  )
}

const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
]

export default function AppointmentsPage() {
  const [scope, setScope] = useState('upcoming')
  const [appointments, setAppointments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const [cancellingId, setCancellingId] = useState(null)

  const load = useCallback((nextScope) => {
    setLoading(true)
    setLoadError(null)
    return appointmentService
      .listAppointments(nextScope)
      .then(setAppointments)
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(scope) }, [scope, load])

  useEffect(() => {
    let cancelled = false
    doctorService.listDoctors().then((d) => { if (!cancelled) setDoctors(d) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const handleBook = async (payload) => {
    setSubmitting(true)
    setFormError(null)
    try {
      await appointmentService.requestAppointment(payload)
      setShowForm(false)
      await load(scope === 'upcoming' ? 'upcoming' : scope)
      if (scope !== 'upcoming') setScope('upcoming')
    } catch (err) {
      setFormError(err.fieldErrors ? Object.values(err.fieldErrors).flat()[0] : err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async (appointment) => {
    setCancellingId(appointment.id)
    try {
      await appointmentService.cancelAppointment(appointment.id, null)
      await load(scope)
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setCancellingId(null)
    }
  }

  const emptyCopy = useMemo(() => ({
    upcoming: {
      title: 'No upcoming appointments',
      description: 'When you request a visit, it will appear here until your care team confirms it.',
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
          <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A] sm:text-3xl">Appointments</h1>
          <p className="mt-1.5 text-sm text-[#475569]">Your visits and video consultations.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="focus-ring tap-target inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
        >
          <Plus size={16} aria-hidden="true" />
          {showForm ? 'Close' : 'Request appointment'}
        </button>
      </div>

      {showForm && (
        <BookingForm
          doctors={doctors}
          onSubmit={handleBook}
          onClose={() => setShowForm(false)}
          submitting={submitting}
          error={formError}
        />
      )}

      <div className="flex gap-1 border-b border-[#E8EDF2]" role="tablist" aria-label="Appointment period">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={scope === tab.key}
            onClick={() => setScope(tab.key)}
            className={`focus-ring -mb-px min-h-11 border-b-2 px-3 text-sm font-medium transition-colors ${
              scope === tab.key
                ? 'border-[#2563EB] text-[#2563EB]'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
                className="focus-ring tap-target rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
              >
                Request your first appointment
              </button>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {appointments.map((a) => (
            <AppointmentCard
              key={a.id}
              appointment={a}
              onCancel={handleCancel}
              cancelling={cancellingId === a.id}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
