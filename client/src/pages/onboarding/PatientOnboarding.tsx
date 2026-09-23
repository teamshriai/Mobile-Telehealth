import { useEffect, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import FormField from '../../components/onboarding/FormField'
import OnboardingShell from '../../components/onboarding/OnboardingShell'
import { useAuth } from '../../app/useAuth'
import * as profileService from '../../services/profile.service'
import type { PatientProfile } from '../../types/domain'
import type { ApiError } from '../../types/api'

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
  { value: 'PreferNotToDisclose', label: 'Prefer not to disclose' },
]

const BLOOD_GROUP_OPTIONS = [
  { value: 'A_Positive', label: 'A+' },
  { value: 'A_Negative', label: 'A−' },
  { value: 'B_Positive', label: 'B+' },
  { value: 'B_Negative', label: 'B−' },
  { value: 'AB_Positive', label: 'AB+' },
  { value: 'AB_Negative', label: 'AB−' },
  { value: 'O_Positive', label: 'O+' },
  { value: 'O_Negative', label: 'O−' },
  { value: 'Unknown', label: 'Unknown' },
]

type Tier = 'required' | 'recommended' | 'optional'
type OnboardingForm = Partial<PatientProfile>

/**
 * Patient onboarding.
 *
 * Required is usually a one-screen confirmation: name/DOB/phone are already
 * collected at registration, so most patients pass through it immediately.
 * Recommended and Optional progressively surface the rest of
 * PatientProfile, reusing the same PATCH endpoints the Profile/My Health
 * pages already use — no new patient-facing endpoint was needed beyond the
 * onboarding-complete gate itself.
 */
export default function PatientOnboarding() {
  const navigate = useNavigate()
  const { reloadUser } = useAuth()
  const [tier, setTier] = useState<Tier>('required')
  const [unlocked, setUnlocked] = useState<Tier[]>(['required'])
  const [form, setForm] = useState<OnboardingForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    profileService.getProfile().then(({ profile }) => {
      setForm(profile ?? {})
      if (profile?.onboardingCompletedAt) setUnlocked(['required', 'recommended', 'optional'])
    })
  }, [])

  const set = (name: keyof OnboardingForm) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => (prev ? { ...prev, [name]: e.target.value } : prev))

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
      await profileService.updateProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        dateOfBirth: form.dateOfBirth,
        phoneNumber: form.phoneNumber,
      })
      await profileService.completeOnboarding()
      await reloadUser()
      setUnlocked(['required', 'recommended', 'optional'])
      setTier('recommended')
    } catch (err) {
      setError((err as ApiError).message || 'Could not save your details. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const saveRecommended = async () => {
    setSaving(true)
    setError('')
    try {
      await profileService.updateProfile({
        bloodGroup: form.bloodGroup || null,
        addressLine1: form.addressLine1 || null,
        city: form.city || null,
        state: form.state || null,
        postalCode: form.postalCode || null,
        emergencyContactName: form.emergencyContactName || null,
        emergencyContactPhone: form.emergencyContactPhone || null,
      })
      await profileService.updateHealthHistory({
        knownAllergies: form.knownAllergies || null,
        currentMedications: form.currentMedications || null,
        existingDiseases: form.existingDiseases || null,
      })
      setTier('optional')
    } catch (err) {
      setError((err as ApiError).message || 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const finish = async (skip: boolean) => {
    if (!skip) {
      setSaving(true)
      setError('')
      try {
        await profileService.updateHealthHistory({
          familyHistory: form.familyHistory || null,
          previousSurgeries: form.previousSurgeries || null,
        })
        await profileService.updateProfile({ gender: form.gender || null })
      } catch (err) {
        setError((err as ApiError).message || 'Could not save. Please try again.')
        setSaving(false)
        return
      }
      setSaving(false)
    }
    navigate('/app', { replace: true })
  }

  return (
    <OnboardingShell
      title="Welcome to Stroke AI"
      subtitle="A few details to get you started — the rest can wait."
      activeTier={tier}
      unlockedTiers={unlocked}
      onSelectTier={(t) => setTier(t as Tier)}
      footer={
        tier === 'required' ? (
          <Button onClick={finishRequired} loading={saving}>
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
            <FormField label="First name" name="firstName" required value={form.firstName || ''} onChange={set('firstName')} />
            <FormField label="Last name" name="lastName" required value={form.lastName || ''} onChange={set('lastName')} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Date of birth"
              name="dateOfBirth"
              type="date"
              required
              value={form.dateOfBirth ? form.dateOfBirth.slice(0, 10) : ''}
              onChange={set('dateOfBirth')}
            />
            <FormField label="Mobile number" name="phoneNumber" required value={form.phoneNumber || ''} onChange={set('phoneNumber')} />
          </div>
        </div>
      )}

      {tier === 'recommended' && (
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            This helps your care team reach you and respond faster in an emergency.
          </p>
          <FormField as="select" label="Blood group" name="bloodGroup" value={form.bloodGroup || ''} onChange={set('bloodGroup')}>
            <option value="">Not specified</option>
            {BLOOD_GROUP_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </FormField>
          <FormField label="Address" name="addressLine1" value={form.addressLine1 || ''} onChange={set('addressLine1')} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="City" name="city" value={form.city || ''} onChange={set('city')} />
            <FormField label="State" name="state" value={form.state || ''} onChange={set('state')} />
            <FormField label="PIN code" name="postalCode" value={form.postalCode || ''} onChange={set('postalCode')} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Emergency contact name" name="emergencyContactName" value={form.emergencyContactName || ''} onChange={set('emergencyContactName')} />
            <FormField label="Emergency contact phone" name="emergencyContactPhone" value={form.emergencyContactPhone || ''} onChange={set('emergencyContactPhone')} />
          </div>
          <FormField label="Known allergies" name="knownAllergies" hint="e.g. Penicillin — leave blank if none known" value={form.knownAllergies || ''} onChange={set('knownAllergies')} />
          <FormField label="Current medications" name="currentMedications" value={form.currentMedications || ''} onChange={set('currentMedications')} />
          <FormField label="Existing conditions" name="existingDiseases" value={form.existingDiseases || ''} onChange={set('existingDiseases')} />
        </div>
      )}

      {tier === 'optional' && (
        <div className="space-y-4">
          <FormField as="select" label="Gender" name="gender" value={form.gender || ''} onChange={set('gender')}>
            <option value="">Prefer not to say</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </FormField>
          <FormField label="Family history" name="familyHistory" value={form.familyHistory || ''} onChange={set('familyHistory')} />
          <FormField label="Previous surgeries" name="previousSurgeries" value={form.previousSurgeries || ''} onChange={set('previousSurgeries')} />
        </div>
      )}
    </OnboardingShell>
  )
}
