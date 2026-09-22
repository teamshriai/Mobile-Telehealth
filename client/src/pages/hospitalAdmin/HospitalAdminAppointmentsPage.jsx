import { useEffect, useState } from 'react'
import Card from '../../components/common/Card.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import * as hospitalAdmin from '../../services/hospitalAdmin.service.js'

const STATUS_VARIANT = {
  Requested: 'warning',
  Confirmed: 'primary',
  Completed: 'success',
  Cancelled: 'muted',
  NoShow: 'danger',
}

/** Read-only operational view — volume and status, not a booking tool. */
export default function HospitalAdminAppointmentsPage() {
  const [appointments, setAppointments] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    hospitalAdmin
      .listAppointments()
      .then(setAppointments)
      .catch((err) => setError(err.message || 'Could not load appointments.'))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Appointments</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Operational view across your hospital's doctors.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-critical-bg px-3 py-2 text-xs text-critical-fg">
          {error}
        </p>
      )}

      <Card padding="none">
        {appointments === null ? (
          <p className="p-5 text-sm text-ink-muted">Loading…</p>
        ) : appointments.length === 0 ? (
          <p className="p-5 text-sm text-ink-muted">No appointments recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border-soft">
            {appointments.map((a) => (
              <li key={a.id} className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {a.patientName} <span className="text-ink-subtle">with</span> {a.doctorName}
                  </p>
                  <p className="text-xs text-ink-subtle">
                    {new Date(a.scheduledAt).toLocaleString()} · {a.mode}
                  </p>
                </div>
                <StatusBadge variant={STATUS_VARIANT[a.status] ?? 'muted'}>{a.status}</StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
