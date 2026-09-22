import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button.jsx'
import FormField from '../../components/onboarding/FormField.jsx'
import OnboardingShell from '../../components/onboarding/OnboardingShell.jsx'
import { useAuth } from '../../app/AuthContext.jsx'
import * as hospitalAdmin from '../../services/hospitalAdmin.service.js'
import * as hospitalService from '../../services/hospital.service.js'

/**
 * Hospital Admin onboarding. Required is entirely about establishing which
 * hospital this account manages — either creating a new one (this account
 * becomes its first admin) or joining one that already exists on the
 * platform. Nothing else in the Hospital Admin dashboard is reachable
 * without this, since every management endpoint scopes to it server-side.
 */
export default function HospitalAdminOnboarding() {
  const navigate = useNavigate()
  const { reloadUser } = useAuth()
  const [tier, setTier] = useState('required')
  const [unlocked, setUnlocked] = useState(['required'])
  const [form, setForm] = useState(null)
  const [hospitals, setHospitals] = useState([])
  const [mode, setMode] = useState('create') // 'create' | 'join'
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([hospitalAdmin.getOwnProfile(), hospitalService.listHospitals()]).then(
      ([profile, hospitalList]) => {
        setForm(profile ?? {})
        setHospitals(hospitalList)
        setMode(profile?.hospitalId ? 'join' : 'create')
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
      if (!form.hospitalId) {
        if (mode === 'create') {
          await hospitalAdmin.createHospital({
            name: form.newHospitalName,
            city: form.newHospitalCity || undefined,
            state: form.newHospitalState || undefined,
          })
        } else {
          await hospitalAdmin.joinHospital(form.selectedHospitalId)
        }
      }
      await hospitalAdmin.completeOnboarding()
      await reloadUser()
      setUnlocked(['required', 'recommended', 'optional'])
      setTier('recommended')
    } catch (err) {
      setError(err.message || 'Could not set up your hospital. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const saveRecommended = async () => {
    setSaving(true)
    setError('')
    try {
      await hospitalAdmin.updateOwnProfile({
        jobTitle: form.jobTitle || undefined,
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
    if (!skip && form.department) {
      setSaving(true)
      setError('')
      try {
        await hospitalAdmin.updateOwnProfile({ department: form.department })
      } catch (err) {
        setError(err.message || 'Could not save. Please try again.')
        setSaving(false)
        return
      }
      setSaving(false)
    }
    navigate('/hospital-admin', { replace: true })
  }

  const alreadyLinked = Boolean(form.hospitalId)

  return (
    <OnboardingShell
      title="Set up your hospital"
      subtitle="Everything you manage here — doctors, patients, appointments — is scoped to one hospital."
      activeTier={tier}
      unlockedTiers={unlocked}
      onSelectTier={setTier}
      footer={
        tier === 'required' ? (
          <Button
            onClick={finishRequired}
            loading={saving}
            disabled={!alreadyLinked && (mode === 'create' ? !form.newHospitalName : !form.selectedHospitalId)}
          >
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
        alreadyLinked ? (
          <p className="text-sm text-ink-muted">
            You're already linked to <strong className="text-ink">{form.hospital?.name}</strong>. Continue to the next step.
          </p>
        ) : (
          <div className="space-y-4">
            <div role="radiogroup" aria-label="Hospital setup" className="flex gap-2">
              <button
                type="button"
                role="radio"
                aria-checked={mode === 'create'}
                onClick={() => setMode('create')}
                className={`focus-ring flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${mode === 'create' ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-border-soft text-ink-muted hover:bg-surface-2'}`}
              >
                My hospital isn't listed yet
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={mode === 'join'}
                onClick={() => setMode('join')}
                className={`focus-ring flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${mode === 'join' ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-border-soft text-ink-muted hover:bg-surface-2'}`}
              >
                Join an existing hospital
              </button>
            </div>

            {mode === 'create' ? (
              <>
                <FormField label="Hospital name" name="newHospitalName" required value={form.newHospitalName || ''} onChange={set('newHospitalName')} />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField label="City" name="newHospitalCity" value={form.newHospitalCity || ''} onChange={set('newHospitalCity')} />
                  <FormField label="State" name="newHospitalState" value={form.newHospitalState || ''} onChange={set('newHospitalState')} />
                </div>
              </>
            ) : (
              <FormField as="select" label="Hospital" name="selectedHospitalId" required value={form.selectedHospitalId || ''} onChange={set('selectedHospitalId')}>
                <option value="">Select a hospital…</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}{h.city ? ` — ${h.city}` : ''}
                  </option>
                ))}
              </FormField>
            )}
          </div>
        )
      )}

      {tier === 'recommended' && (
        <div className="space-y-4">
          <FormField label="Job title" name="jobTitle" placeholder="e.g. Hospital Administrator" value={form.jobTitle || ''} onChange={set('jobTitle')} />
          <FormField label="Phone number" name="phoneNumber" value={form.phoneNumber || ''} onChange={set('phoneNumber')} />
        </div>
      )}

      {tier === 'optional' && (
        <div className="space-y-4">
          <FormField label="Department" name="department" value={form.department || ''} onChange={set('department')} />
        </div>
      )}
    </OnboardingShell>
  )
}
