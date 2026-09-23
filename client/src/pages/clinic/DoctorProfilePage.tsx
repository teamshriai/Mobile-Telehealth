import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Check, ShieldAlert, ShieldCheck } from 'lucide-react'
import { formatDate } from '../../components/clinic/format'
import Button from '../../components/common/Button'
import FormField from '../../components/onboarding/FormField'
import * as doctorSelf from '../../services/doctorSelf.service'
import * as hospitalService from '../../services/hospital.service'
import type { DoctorProfile, Hospital } from '../../types/domain'
import type { ApiError } from '../../types/api'

export default function DoctorProfilePage() {
  const [form, setForm] = useState<DoctorProfile | null>(null)
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([doctorSelf.getOwnProfile(), hospitalService.listHospitals()])
      .then(([profile, list]) => {
        setForm(profile)
        setHospitals(list)
      })
      // Without this the page sits on "Loading your profile…" forever if
      // either request fails.
      .catch(() => setError('Could not load your profile. Please refresh.'))
  }, [])

  const set = (name: keyof DoctorProfile) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => (prev ? { ...prev, [name]: e.target.value } : prev))
    setSaved(false)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!form) return
    setSaving(true)
    setError('')
    try {
      const updated = await doctorSelf.updateOwnProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        specialty: form.specialty,
        qualifications: form.qualifications || undefined,
        yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : undefined,
        registrationNumber: form.registrationNumber || undefined,
        hprId: form.hprId || undefined,
        phoneNumber: form.phoneNumber || undefined,
        hospitalId: form.hospitalId || null,
      })
      setForm(updated)
      setSaved(true)
    } catch (err) {
      setError((err as ApiError).message || 'Could not save your profile.')
    } finally {
      setSaving(false)
    }
  }

  if (!form) {
    return (
      <div className="space-y-4">
        {error && (
          <p role="alert" className="rounded-xl bg-critical-bg px-3 py-2 text-xs text-critical-fg">
            {error}
          </p>
        )}
        {!error && (
          <p className="text-sm text-ink-subtle">Loading your profile…</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Profile
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Keep your professional details up to date.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-critical-bg px-3 py-2 text-xs text-critical-fg">
          {error}
        </p>
      )}

      <section className="rounded-xl border border-border-soft bg-surface-1 flex flex-wrap items-center gap-3 p-4">
        <span
          aria-hidden="true"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            form.isVerified ? 'bg-success-bg' : 'bg-warning-bg'
          }`}
        >
          {form.isVerified ? (
            <ShieldCheck size={17} className="text-success-fg" />
          ) : (
            <ShieldAlert size={17} className="text-warning-fg" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            {form.isVerified ? 'Credentials verified' : 'Verification pending'}
          </p>
          <p className="mt-0.5 text-xs text-ink-subtle">
            {form.isVerified
              ? `Checked by your hospital administrator${form.verifiedAt ? ` on ${formatDate(form.verifiedAt)}` : ''}.`
              : "This doesn't limit what you can do today — your hospital administrator verifies credentials when they review new doctors."}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-border-soft bg-surface-1 p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="First name" name="firstName" required value={form.firstName || ''} onChange={set('firstName')} />
            <FormField label="Last name" name="lastName" required value={form.lastName || ''} onChange={set('lastName')} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Specialty" name="specialty" required value={form.specialty || ''} onChange={set('specialty')} />
            <FormField label="Years of experience" name="yearsExperience" type="number" min="0" max="70" value={form.yearsExperience ?? ''} onChange={set('yearsExperience')} />
          </div>
          <FormField label="Qualifications" name="qualifications" value={form.qualifications || ''} onChange={set('qualifications')} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Medical council registration number" name="registrationNumber" value={form.registrationNumber || ''} onChange={set('registrationNumber')} />
            <FormField label="HPR ID" name="hprId" value={form.hprId || ''} onChange={set('hprId')} />
          </div>
          <FormField label="Phone number" name="phoneNumber" value={form.phoneNumber || ''} onChange={set('phoneNumber')} />
          <FormField as="select" label="Hospital" name="hospitalId" value={form.hospitalId || ''} onChange={set('hospitalId')}>
            <option value="">Independent practice</option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>{h.name}{h.city ? ` — ${h.city}` : ''}</option>
            ))}
          </FormField>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" loading={saving}>Save changes</Button>
            {saved && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-success-fg">
                <Check size={14} strokeWidth={3} /> Saved
              </span>
            )}
          </div>
        </form>
      </section>
    </div>
  )
}
