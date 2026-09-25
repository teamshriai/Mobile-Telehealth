import { useCallback, useEffect, useState } from 'react'
import { CalendarCheck2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import Card from '../../components/common/Card'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import StatusBadge, { type StatusBadgeVariant } from '../../components/common/StatusBadge'
import { Banner } from '../../components/feedback/States'
import * as hospitalAdmin from '../../services/hospitalAdmin.service'
import type { HospitalAdminAppointmentRow, HospitalAdminDoctorRow, AppointmentStatus } from '../../types/domain'
import type { ApiError } from '../../types/api'

/**
 * Appointments at this hospital — and the queue of patients' REQUESTS that
 * only a hospital administrator can approve.
 *
 * ⚠️ THE WORKFLOW. Patients request (a new visit or a new time). Each request
 * waits here. Approve checks the doctor's published hours, leave and
 * confirmed bookings on the server and refuses with the reason when the
 * doctor is not available; Decline tells the patient why. The availability
 * shown beside each request is a preview — the server re-checks on approve,
 * because the diary can change between loading this page and pressing it.
 */

const STATUS_VARIANT: Record<AppointmentStatus, StatusBadgeVariant> = {
  Requested: 'warning',
  Confirmed: 'primary',
  Completed: 'success',
  Cancelled: 'muted',
  NoShow: 'danger',
}

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  Requested: 'Awaiting approval',
  Confirmed: 'Confirmed',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
  NoShow: 'No-show',
}

const PAGE = 30

function when(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(iso))
}

export default function HospitalAdminAppointmentsPage() {
  const [rows, setRows] = useState<HospitalAdminAppointmentRow[] | null>(null)
  const [doctors, setDoctors] = useState<HospitalAdminDoctorRow[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rowError, setRowError] = useState<Record<string, string>>({})
  const [assign, setAssign] = useState<Record<string, string>>({})
  const [toDecline, setToDecline] = useState<HospitalAdminAppointmentRow | null>(null)
  const [declineReason, setDeclineReason] = useState('')
  // ⚠️ A hospital accumulates thousands of visits; rendering all of them made
  // this page a long, slow scroll. The most recent come first, a page at a time.
  const [shownCount, setShownCount] = useState(PAGE)

  const load = useCallback(() => {
    hospitalAdmin
      .listAppointments()
      .then(setRows)
      .catch((err: ApiError) => setError(err.message || 'Could not load appointments.'))
  }, [])

  useEffect(() => {
    load()
    hospitalAdmin.listDoctors().then((d) => setDoctors(d.filter((x) => x.isActive))).catch(() => {})
  }, [load])

  const now = Date.now()
  const pending = (rows ?? []).filter((r) => r.status === 'Requested' && new Date(r.scheduledAt).getTime() > now)
  const others = (rows ?? []).filter((r) => !pending.includes(r))

  const approve = async (r: HospitalAdminAppointmentRow) => {
    setBusyId(r.id)
    setRowError((e) => ({ ...e, [r.id]: '' }))
    try {
      await hospitalAdmin.approveAppointment(r.id, r.doctorId === null ? assign[r.id] : undefined)
      setNotice(`Approved: ${r.patientName}, ${when(r.scheduledAt)}. The patient has been notified.`)
      load()
    } catch (err) {
      setRowError((e) => ({ ...e, [r.id]: (err as ApiError).message }))
    } finally {
      setBusyId(null)
    }
  }

  const decline = async () => {
    if (toDecline === null) return
    await hospitalAdmin.declineAppointment(toDecline.id, declineReason.trim())
    setNotice(`Declined: ${toDecline.patientName}. The patient has been asked to choose another time.`)
    setToDecline(null)
    setDeclineReason('')
    load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Appointments</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Approve patients’ requests after checking the doctor’s availability, and see every visit at your hospital.
        </p>
      </div>

      {error && <Banner tone="error">{error}</Banner>}
      {notice !== null && <Banner tone="success">{notice}</Banner>}

      <section aria-labelledby="requests-heading" className="space-y-3">
        <h2 id="requests-heading" className="flex items-center gap-2 text-base font-semibold text-ink">
          <CalendarCheck2 size={18} aria-hidden="true" className="text-warning-fg" />
          Requests awaiting approval {rows !== null && <span className="font-normal text-ink-subtle">({pending.length})</span>}
        </h2>
        <Card padding="none">
          {rows === null ? (
            <p className="p-5 text-sm text-ink-muted">Loading…</p>
          ) : pending.length === 0 ? (
            <p className="p-5 text-sm text-ink-muted">No requests waiting. New patient requests will appear here.</p>
          ) : (
            <ul className="divide-y divide-border-soft">
              {pending.map((r) => (
                <li key={r.id} className="space-y-3 px-5 py-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{r.patientName}</p>
                      <p className="text-sm text-ink-muted">
                        {when(r.scheduledAt)} · {r.mode === 'InPerson' ? 'In person' : r.mode === 'Video' ? 'Video' : 'Phone'} · {r.durationMins} min
                      </p>
                      <p className="text-sm text-ink-muted">{r.doctorId === null ? 'No doctor chosen — assign one to approve' : `With ${r.doctorName}`}</p>
                    </div>
                    {r.availability !== null && (
                      <p className={`inline-flex items-center gap-1.5 text-xs font-medium ${r.availability.ok ? 'text-success-fg' : 'text-critical-fg'}`}>
                        {r.availability.ok
                          ? <><CheckCircle2 size={14} aria-hidden="true" /> Doctor available</>
                          : <><AlertTriangle size={14} aria-hidden="true" /> {r.availability.reason}</>}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                    {r.doctorId === null && (
                      <label className="flex min-w-0 flex-1 items-center gap-2 text-sm text-ink sm:max-w-sm">
                        <span className="flex-shrink-0">Doctor</span>
                        <select
                          value={assign[r.id] ?? ''}
                          onChange={(e) => setAssign((a) => ({ ...a, [r.id]: e.target.value }))}
                          className="focus-ring min-h-11 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm text-ink"
                        >
                          <option value="">Choose a doctor…</option>
                          {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}{d.specialty ? ` — ${d.specialty}` : ''}</option>)}
                        </select>
                      </label>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setToDecline(r); setDeclineReason('') }}
                        disabled={busyId === r.id}
                        className="focus-ring inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border-soft px-4 text-sm font-medium text-ink-muted hover:bg-surface-2 disabled:opacity-60 sm:flex-none"
                      >
                        <XCircle size={15} aria-hidden="true" /> Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => void approve(r)}
                        disabled={busyId === r.id || (r.doctorId === null && !assign[r.id])}
                        className="focus-ring inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-on-primary hover:bg-primary-700 disabled:opacity-60 sm:flex-none"
                      >
                        <CheckCircle2 size={15} aria-hidden="true" /> {busyId === r.id ? 'Approving…' : 'Approve'}
                      </button>
                    </div>
                  </div>
                  {rowError[r.id] && <p role="alert" className="text-sm text-critical-fg">{rowError[r.id]}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section aria-labelledby="all-heading" className="space-y-3">
        <h2 id="all-heading" className="text-base font-semibold text-ink">All appointments</h2>
        <Card padding="none">
          {rows === null ? (
            <p className="p-5 text-sm text-ink-muted">Loading…</p>
          ) : others.length === 0 ? (
            <p className="p-5 text-sm text-ink-muted">No appointments recorded yet.</p>
          ) : (
            <ul className="divide-y divide-border-soft">
              {others.slice(0, shownCount).map((a) => (
                <li key={a.id} className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {a.patientName} <span className="text-ink-subtle">with</span> {a.doctorName}
                    </p>
                    <p className="text-xs text-ink-subtle">{when(a.scheduledAt)} · {a.mode}</p>
                  </div>
                  <StatusBadge variant={STATUS_VARIANT[a.status] ?? 'muted'}>{STATUS_LABEL[a.status] ?? a.status}</StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        {others.length > shownCount && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShownCount((n) => n + PAGE)}
              className="focus-ring min-h-11 rounded-lg border border-border-soft px-4 text-sm font-medium text-ink-muted hover:bg-surface-2"
            >
              Show more ({others.length - shownCount} older)
            </button>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={toDecline !== null}
        title="Decline this request?"
        consequence="The patient is told the request could not be approved and asked to choose another time. The reason you give is stored with the appointment."
        confirmLabel="Decline request"
        destructive
        confirmDisabled={declineReason.trim().length < 3}
        onConfirm={decline}
        onCancel={() => setToDecline(null)}
      >
        <label htmlFor="decline-reason" className="block text-sm font-medium text-ink">Reason</label>
        <textarea
          id="decline-reason"
          rows={2}
          maxLength={300}
          value={declineReason}
          onChange={(e) => setDeclineReason(e.target.value)}
          placeholder="e.g. Dr. Iyer is on leave that week"
          className="focus-ring mt-1.5 w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-ink"
        />
      </ConfirmDialog>
    </div>
  )
}
