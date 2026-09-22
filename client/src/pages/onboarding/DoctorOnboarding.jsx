import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button.jsx'
import FormField from '../../components/onboarding/FormField.jsx'
import OnboardingShell from '../../components/onboarding/OnboardingShell.jsx'
import { useAuth } from '../../app/AuthContext.jsx'
import * as doctorSelf from '../../services/doctorSelf.service.js'
import * as hospitalService from '../../services/hospital.service.js'

/**
 * Doctor onboarding. Required covers exactly what a Hospital Admin needs to
 * find and place this doctor: specialty, experience, and a hospital choice
 * (a real Hospital, or explicitly independent). Availability is a real
 * feature but lives in the Doctor portal itself (`/clinic/availability`),
 * not crammed into this three-tier stepper — it is not a one-time
 * onboarding fact, it changes constantly.
 */
export default function DoctorOnboarding() {
  const navigate = useNavigate()
  const { reloadUser } = useAuth()
  const [tier, setTier] = useState('required')
  const [unlocked, setUnlocked] = useState(['required'])
  const [form, setForm] = useState(null)
  const [hospitals, setHospitals] = useState([])
  const [affiliation, setAffiliation] = useState('hospital') // 'hospital' | 'independent'
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([doctorSelf.getOwnProfile(), hospitalService.listHospitals()]).then(
      ([profile, hospitalList]) => {
        setForm(profile ?? {})
        setHospitals(hospitalList)
        setAffiliation(profile?.hospitalId ? 'hospital' : 'independent')
        if (profile?.onboardingCompletedAt) setUnlocked(['required', 'recommended', 'optional'])
      },
    )
  }, [])

  const set = (name) => (e) => setForm((prev) => ({ ...prev, [name]: e.target.value }))

  if (form === null) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-ink-muted">
        Loading your profile…
      </div>
    )
  }

  const finishRequired = async () => {
    setSaving(true)
    setError('')
    try {
      await doctorSelf.updateOwnProfile({
        specialty: form.specialty,
        yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : undefined,
        hospitalId: affiliation === 'hospital' ? form.hospitalId || undefined : null,
        hospitalName: affiliation === 'independent' ? form.hospitalName || 'Independent practice' : undefined,
      })
      await doctorSelf.completeOnboarding()
      await reloadUser()
      setUnlocked(['required', 'recommended', 'optional'])
      setTier('recommended')
    } catch (err) {
      setError(err.message || 'Could not save your details. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const saveRecommended = async () => {
    setSaving(true)
    setError('')
    try {
      await doctorSelf.updateOwnProfile({
        qualifications: form.qualifications || undefined,
        registrationNumber: form.registrationNumber || undefined,
        phoneNumber: form.phoneNumber || undefined,
      })
      setTier('optional')
    } catch (err) {
      setError(err.message || 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const finish = async (skip) => {
    if (!skip && form.hprId) {
      setSaving(true)
      setError('')
      try {
        await doctorSelf.updateOwnProfile({ hprId: form.hprId })
      } catch (err) {
        setError(err.message || 'Could not save. Please try again.')
        setSaving(false)
        return
      }
      setSaving(false)
    }
    navigate('/clinic', { replace: true })
  }

  return (
    <OnboardingShell
      title="Set up your clinician profile"
      subtitle="Hospitals and patients find you by specialty and affiliation — let's get those right first."
      activeTier={tier}
      unlockedTiers={unlocked}
      onSelectTier={setTier}
      footer={
        tier === 'required' ? (
          <Button onClick={finishRequired} loading={saving} disabled={!form.specialty || !form.yearsExperience}>
            Continue
          </Button>
        ) : tier === 'recommended' ? (
          <>
            <Button variant="ghost" onClick={() => setTier('optional')} disabled={saving}>
              Skip for now
            </Button>
            <Button onClick={saveRecommended} loading={saving}>
              Continue
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => finish(true)} disabled={saving}>
              Skip and go to my dashboard
            </Button>
            <Button onClick={() => finish(false)} loading={saving}>
              Finish setup
            </Button>
          </>
        )
      }
    >
      {error && (
        <p role="alert" className="mb-4 rounded-md bg-critical-bg px-3 py-2 text-xs text-critical-fg">
          {error}
        </p>
      )}

      {tier === 'required' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Specialty" name="specialty" required placeholder="e.g. Neurology" value={form.specialty || ''} onChange={set('specialty')} />
            <FormField label="Years of experience" name="yearsExperience" type="number" min="0" max="70" required value={form.yearsExperience ?? ''} onChange={set('yearsExperience')} />
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink-muted">Where do you practice?</span>
            <div role="radiogroup" aria-label="Hospital affiliation" className="flex gap-2">
              <button
                type="button"
                role="radio"
                aria-checked={affiliation === 'hospital'}
                onClick={() => setAffiliation('hospital')}
                className={`focus-ring flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${affiliation === 'hospital' ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-border-soft text-ink-muted hover:bg-surface-2'}`}
              >
                A hospital on Stroke AI
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={affiliation === 'independent'}
                onClick={() => setAffiliation('independent')}
                className={`focus-ring flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${affiliation === 'independent' ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-border-soft text-ink-muted hover:bg-surface-2'}`}
              >
                Independent practice
              </button>
            </div>
          </div>

          {affiliation === 'hospital' ? (
            <FormField as="select" label="Hospital" name="hospitalId" required value={form.hospitalId || ''} onChange={set('hospitalId')}>
              <option value="">Select a hospital…</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}{h.city ? ` — ${h.city}` : ''}
                </option>
              ))}
            </FormField>
          ) : (
            <FormField
              label="Practice name"
              name="hospitalName"
              placeholder="e.g. Anand Neuro Clinic"
              value={form.hospitalName || ''}
              onChange={set('hospitalName')}
            />
          )}
        </div>
      )}

      {tier === 'recommended' && (
        <div className="space-y-4">
          <FormField label="Qualifications" name="qualifications" placeholder="e.g. MBBS, DM (Neurology)" value={form.qualifications || ''} onChange={set('qualifications')} />
          <FormField label="Medical council registration number" name="registrationNumber" value={form.registrationNumber || ''} onChange={set('registrationNumber')} />
          <FormField label="Phone number" name="phoneNumber" value={form.phoneNumber || ''} onChange={set('phoneNumber')} />
        </div>
      )}

      {tier === 'optional' && (
        <div className="space-y-4">
          <FormField
            label="ABDM Healthcare Professional Registry (HPR) ID"
            name="hprId"
            value={form.hprId || ''}
            onChange={set('hprId')}
          />
          <p className="text-xs text-ink-subtle">
            You can set your weekly availability any time from your dashboard once you're in.
          </p>
        </div>
      )}
    </OnboardingShell>
  )
}
