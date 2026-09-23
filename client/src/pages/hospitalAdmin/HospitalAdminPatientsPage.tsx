import { useEffect, useState } from 'react'
import Card from '../../components/common/Card'
import * as hospitalAdmin from '../../services/hospitalAdmin.service'
import type { HospitalAdminPatientRow } from '../../types/domain'
import type { ApiError } from '../../types/api'

/**
 * Derived list — patients with a care-team assignment or appointment at a
 * doctor belonging to this hospital. Name, last activity and assigned
 * doctor only; no clinical detail (see hospitalAdmin.repository.ts on the
 * server for why this is never a direct patient query).
 */
export default function HospitalAdminPatientsPage() {
  const [patients, setPatients] = useState<HospitalAdminPatientRow[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    hospitalAdmin
      .listPatients()
      .then(setPatients)
      .catch((err: ApiError) => setError(err.message || 'Could not load patients.'))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Patients</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Patients associated with your hospital's doctors.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-critical-bg px-3 py-2 text-xs text-critical-fg">
          {error}
        </p>
      )}

      <Card padding="none">
        {patients === null ? (
          <p className="p-5 text-sm text-ink-muted">Loading…</p>
        ) : patients.length === 0 ? (
          <p className="p-5 text-sm text-ink-muted">
            No patients associated with your hospital yet.
          </p>
        ) : (
          <ul className="divide-y divide-border-soft">
            {patients.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-3.5 text-sm">
                <span className="font-medium text-ink">{p.name}</span>
                <span className="text-xs text-ink-subtle">
                  {p.doctorName} · last seen {new Date(p.lastActivity).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
