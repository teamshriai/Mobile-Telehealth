import { useEffect, useState } from 'react'
import { ShieldCheck, Power, UserPlus } from 'lucide-react'
import Card from '../../components/common/Card'
import StatusBadge from '../../components/common/StatusBadge'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import FormField from '../../components/onboarding/FormField'
import { Banner } from '../../components/feedback/States'
import MobileNumberField from '../../components/auth/MobileNumberField'
import { isValidMobile, mobileDigits } from '../../components/auth/mobileFormat'
import * as hospitalAdmin from '../../services/hospitalAdmin.service'
import type { HospitalAdminDoctorRow } from '../../types/domain'
import type { ApiError } from '../../types/api'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function HospitalAdminDoctorsPage() {
  const [doctors, setDoctors] = useState<HospitalAdminDoctorRow[] | null>(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Doctors</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Doctors affiliated with your hospital. Add accounts, verify credentials and manage
            access.
          </p>
        </div>
        <Button onClick={() => setAdding(true)} icon={<UserPlus size={15} />}>
          Add team member
        </Button>
      </div>

      {adding && (
        <AddDoctorDialog
          onClose={() => setAdding(false)}
          onCreated={() => { setAdding(false); load() }}
        />
      )}

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
            {/* ⚠️ This used to read "Doctors select your hospital during their own
                onboarding". That stopped being true when clinician
                self-registration was removed — a doctor cannot create their own
                account at all now, so telling an administrator to wait for one
                to appear would leave them waiting forever. */}
            No doctors yet. Use <span className="font-medium text-ink">Add team member</span> to create
            an account — they receive an email link to set their own password.
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

/* ── Provisioning ─────────────────────────────────────────────────────────── */

/**
 * ⚠️ THE ONLY WAY A DOCTOR ACCOUNT IS CREATED, now that clinician
 * self-registration is gone.
 *
 * There is deliberately NO password field. The server emails the new staff
 * member a single-use link to set their own password — so nobody ever has to
 * hand a colleague a credential, which is the step that usually ends up in a
 * chat message and stays there.
 */
function AddDoctorDialog({
  onClose, onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState({
    role: 'Doctor' as hospitalAdmin.ProvisionableRole,
    firstName: '', lastName: '', email: '', specialty: '', registrationNumber: '',
    yearsExperience: '',
  })
  const [mobile, setMobile] = useState('')
  const [mobileError, setMobileError] = useState<string | undefined>(undefined)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    setError('')
  }

  const submit = async () => {
    if (!isValidMobile(mobile)) {
      setMobileError('Enter a 10-digit mobile number starting 6, 7, 8 or 9.')
      return
    }
    if (form.firstName.trim() === '' || form.lastName.trim() === '' || form.email.trim() === '') {
      setError('Name and email are required.')
      return
    }
    if (form.specialty.trim() === '') {
      setError(isClinician ? 'Specialty is required.' : 'Job title is required.')
      return
    }
    // ⚠️ Required by `completeOnboarding` on the server. Omitting it is what
    // trapped provisioned clinicians on the onboarding screen.
    if (form.yearsExperience.trim() === '' || Number.isNaN(Number(form.yearsExperience))) {
      setError('Years of experience is required.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await hospitalAdmin.provisionStaff({
        role: form.role,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        mobile: mobileDigits(mobile),
        specialty: form.specialty.trim(),
        yearsExperience: Number(form.yearsExperience),
        registrationNumber:
          form.registrationNumber.trim() === '' ? undefined : form.registrationNumber.trim(),
      })
      onCreated()
    } catch (err) {
      // The server distinguishes an email clash from a mobile clash because
      // they need different corrections from the person reading this.
      setError((err as ApiError).message || 'Could not add this doctor.')
    } finally {
      setBusy(false)
    }
  }

  const isClinician = form.role === 'Doctor' || form.role === 'Resident'

  return (
    <Modal isOpen size="lg" title="Add a team member" onClose={onClose}>
      <div className="space-y-4">
        <Banner tone="info">
          We email them a link to set their own password, and they sign in with that email and
          password. You never set, see or share a password for them.
        </Banner>

        <FormField
          label="Role" name="role" as="select" required
          value={form.role} onChange={set('role')}
          hint="Hospital administrators are added by a system administrator, not here."
        >
          {hospitalAdmin.PROVISIONABLE_ROLES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </FormField>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="First name" name="firstName" required value={form.firstName} onChange={set('firstName')} />
          <FormField label="Last name" name="lastName" required value={form.lastName} onChange={set('lastName')} />
        </div>

        <FormField
          label="Work email" name="email" type="email" required
          value={form.email} onChange={set('email')}
          hint="Their sign-in address. The set-password link is sent here."
        />

        <MobileNumberField
          id="provision-mobile"
          label="Registered mobile number"
          value={mobile}
          onChange={(v) => { setMobile(v); setMobileError(undefined) }}
          error={mobileError}
          hint="This is the number the sign-in code is sent to. It must not already be in use."
          disabled={busy}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField
            label={isClinician ? 'Specialty' : 'Job title'}
            name="specialty" required value={form.specialty} onChange={set('specialty')}
          />
          <FormField
            label="Years of experience" name="yearsExperience" type="number" min={0} max={70}
            required value={form.yearsExperience} onChange={set('yearsExperience')}
          />
        </div>

        {isClinician && (
          <FormField
            label="Medical registration number" name="registrationNumber"
            value={form.registrationNumber} onChange={set('registrationNumber')}
            hint="Optional here; required before you verify their credentials."
          />
        )}

        {error !== '' && <Banner tone="error">{error}</Banner>}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => void submit()} loading={busy}>Create account</Button>
        </div>
      </div>
    </Modal>
  )
}
