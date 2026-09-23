import { useEffect, useState } from 'react'
import { ShieldCheck, Power } from 'lucide-react'
import Card from '../../components/common/Card'
import StatusBadge from '../../components/common/StatusBadge'
import Button from '../../components/common/Button'
import * as hospitalAdmin from '../../services/hospitalAdmin.service'
import type { HospitalAdminDoctorRow } from '../../types/domain'
import type { ApiError } from '../../types/api'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function HospitalAdminDoctorsPage() {
  const [doctors, setDoctors] = useState<HospitalAdminDoctorRow[] | null>(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = () => {
    hospitalAdmin
      .listDoctors()
      .then(setDoctors)
      .catch((err: ApiError) => setError(err.message || 'Could not load doctors.'))
  }
  useEffect(load, [])

  const verify = async (id: string) => {
    setBusyId(id)
    try {
      await hospitalAdmin.verifyDoctor(id)
      load()
    } finally {
      setBusyId(null)
    }
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    setBusyId(id)
    try {
      await hospitalAdmin.setDoctorActive(id, !isActive)
      load()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Doctors</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Doctors affiliated with your hospital. Verify credentials and manage account access.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-critical-bg px-3 py-2 text-xs text-critical-fg">
          {error}
        </p>
      )}

      {doctors === null ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : doctors.length === 0 ? (
        <Card padding="lg">
          <p className="text-sm text-ink-muted">
            No doctors have joined your hospital yet. Doctors select your hospital during their
            own onboarding — share your hospital's name with them to get started.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {doctors.map((doc) => (
            <Card key={doc.id} padding="lg">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">{doc.name}</p>
                  <p className="text-xs text-ink-subtle">
                    {doc.specialty ?? 'Specialty not set'} · {doc.yearsExperience ?? '—'} yrs experience
                  </p>
                  <p className="mt-0.5 text-xs text-ink-subtle">{doc.email}</p>
                  {doc.availability.length > 0 && (
                    <p className="mt-1.5 text-xs text-ink-muted">
                      Available: {doc.availability.map((a) => `${DAYS[a.dayOfWeek]} ${a.startTime}-${a.endTime}`).join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                  <StatusBadge variant={doc.isVerified ? 'success' : 'warning'}>
                    {doc.isVerified ? 'Verified' : 'Unverified'}
                  </StatusBadge>
                  <StatusBadge variant={doc.isActive ? 'success' : 'danger'}>
                    {doc.isActive ? 'Active' : 'Deactivated'}
                  </StatusBadge>
                </div>
              </div>
              <div className="mt-3 flex gap-2 border-t border-border-soft pt-3">
                {!doc.isVerified && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<ShieldCheck size={14} />}
                    loading={busyId === doc.id}
                    onClick={() => verify(doc.id)}
                  >
                    Verify credentials
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={doc.isActive ? 'outline' : 'primary'}
                  icon={<Power size={14} />}
                  loading={busyId === doc.id}
                  onClick={() => toggleActive(doc.id, doc.isActive)}
                >
                  {doc.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
