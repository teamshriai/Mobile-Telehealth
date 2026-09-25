import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Save } from 'lucide-react'
import Tabs from '../../components/common/Tabs'
import { ConditionsPanel, InstructionsPanel, VisitsPanel } from './myHealth/RecordPanels'
import * as profileService from '../../services/profile.service'
import type { HealthHistoryUpdate } from '../../services/profile.service'
import { LoadingState, ErrorState, Banner } from '../../components/feedback/States'
import type { PatientProfile } from '../../types/domain'
import type { ApiError } from '../../types/api'

/**
 * My Health — the patient's longitudinal record, in four tabs:
 *
 *  - Conditions, Visits, Instructions: what the CARE TEAM recorded and signed
 *    (read-only, GET /me/*). Every item carries a SourceBadge naming who.
 *  - Your history: what the PATIENT told us, editable — the original Phase 3
 *    health-history form, unchanged below.
 *
 * ⚠️ The two halves are separated on purpose. Mixing "you said you are
 * allergic to penicillin" with "your consultant recorded hypothyroidism" in
 * one list would make the patient's own words look like clinical findings.
 *
 * Health history view/edit is backed by the Phase 3 health-history
 * fields added to PatientProfile.
 *
 * Documents/records/reports are DEFERRED to Phase 4 (per the phase plan — no
 * Document model or object storage exists). That section states plainly that
 * it is not available rather than showing a fake upload flow, which is
 * exactly the pattern Phase 1 found and removed elsewhere (a fake progress
 * bar that discarded the file).
 */

interface Option {
  value: string
  label: string
}

const SMOKING: Option[] = [
  { value: '', label: 'Prefer not to say' },
  { value: 'Never', label: 'Never smoked' },
  { value: 'Former', label: 'Former smoker' },
  { value: 'Current', label: 'Current smoker' },
  { value: 'Occasional', label: 'Occasional' },
]
const ALCOHOL: Option[] = [
  { value: '', label: 'Prefer not to say' },
  { value: 'Never', label: 'Never' },
  { value: 'Occasional', label: 'Occasional' },
  { value: 'Moderate', label: 'Moderate' },
  { value: 'Heavy', label: 'Heavy' },
]
const TOBACCO: Option[] = [
  { value: '', label: 'Prefer not to say' },
  { value: 'Never', label: 'Never' },
  { value: 'Former', label: 'Former user' },
  { value: 'Current', label: 'Current user' },
]
const ACTIVITY: Option[] = [
  { value: '', label: 'Prefer not to say' },
  { value: 'Sedentary', label: 'Sedentary' },
  { value: 'Light', label: 'Light activity' },
  { value: 'Moderate', label: 'Moderate activity' },
  { value: 'Active', label: 'Active' },
  { value: 'VeryActive', label: 'Very active' },
]

interface TextAreaProps {
  id: string
  label: string
  hint?: string
  value: string | null | undefined
  onChange: (value: string) => void
}

function TextArea({ id, label, hint, value, onChange }: TextAreaProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      {hint && <p className="mb-1.5 text-xs text-ink-subtle">{hint}</p>}
      <textarea
        id={id}
        rows={2}
        maxLength={1000}
        value={value ?? ''}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
        className="focus-ring w-full rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-sm text-ink"
      />
    </div>
  )
}

interface SelectProps {
  id: string
  label: string
  value: string | null | undefined
  onChange: (value: string | null) => void
  options: Option[]
}

function Select({ id, label, value, onChange, options }: SelectProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      <select
        id={id}
        value={value ?? ''}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value || null)}
        className="focus-ring w-full rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-sm text-ink"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function HealthHistoryPanel() {
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [form, setForm] = useState<HealthHistoryUpdate | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    profileService.getProfile()
      .then((res) => {
        if (cancelled) return
        setProfile(res.profile)
        setForm({
          knownAllergies: res.profile?.knownAllergies ?? null,
          currentMedications: res.profile?.currentMedications ?? null,
          existingDiseases: res.profile?.existingDiseases ?? null,
          familyHistory: res.profile?.familyHistory ?? null,
          previousSurgeries: res.profile?.previousSurgeries ?? null,
          smokingStatus: res.profile?.smokingStatus ?? null,
          alcoholStatus: res.profile?.alcoholStatus ?? null,
          tobaccoStatus: res.profile?.tobaccoStatus ?? null,
          physicalActivity: res.profile?.physicalActivity ?? null,
          occupation: res.profile?.occupation ?? null,
        })
      })
      .catch((err: ApiError) => { if (!cancelled) setLoadError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const update = (key: keyof HealthHistoryUpdate, value: string | null) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
    setSaved(false)
  }

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!form) return
    setSaving(true)
    setSaveError(null)
    try {
      const res = await profileService.updateHealthHistory(form)
      setProfile(res.profile)
      setSaved(true)
    } catch (err) {
      const apiErr = err as ApiError
      setSaveError(apiErr.fieldErrors ? String(Object.values(apiErr.fieldErrors).flat()[0]) : apiErr.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {loading ? (
        <LoadingState label="Loading your health information…" />
      ) : loadError ? (
        <ErrorState description={loadError} />
      ) : !profile || !form ? (
        <ErrorState title="Profile not set up" description="Complete your profile before adding health history." />
      ) : (
        <form onSubmit={handleSave} className="space-y-5">
          <section className="rounded-xl border border-border-soft bg-surface-1 p-5">
            <h2 className="text-base font-semibold text-ink">Medical history</h2>
            <p className="mt-1 text-sm text-ink-muted">
              This is your own summary in your own words — it helps your doctors, but it does
              not replace a clinical record.
            </p>

            <div className="mt-4 space-y-4">
              <TextArea id="allergies" label="Known allergies" hint="e.g. Penicillin, sulfa drugs"
                value={form.knownAllergies} onChange={(v) => update('knownAllergies', v)} />
              <TextArea id="medications" label="Current medications" hint="Name, dose and how often"
                value={form.currentMedications} onChange={(v) => update('currentMedications', v)} />
              <TextArea id="conditions" label="Existing conditions"
                value={form.existingDiseases} onChange={(v) => update('existingDiseases', v)} />
              <TextArea id="surgeries" label="Previous surgeries or procedures"
                value={form.previousSurgeries} onChange={(v) => update('previousSurgeries', v)} />
              <TextArea id="family" label="Family history"
                hint="Conditions that run in your immediate family"
                value={form.familyHistory} onChange={(v) => update('familyHistory', v)} />
            </div>
          </section>

          <section className="rounded-xl border border-border-soft bg-surface-1 p-5">
            <h2 className="text-base font-semibold text-ink">Lifestyle</h2>
            <p className="mt-1 text-sm text-ink-muted">Helps your doctors give you better advice.</p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select id="smoking" label="Smoking" options={SMOKING}
                value={form.smokingStatus} onChange={(v) => update('smokingStatus', v)} />
              <Select id="alcohol" label="Alcohol" options={ALCOHOL}
                value={form.alcoholStatus} onChange={(v) => update('alcoholStatus', v)} />
              <Select id="tobacco" label="Tobacco (smokeless)" options={TOBACCO}
                value={form.tobaccoStatus} onChange={(v) => update('tobaccoStatus', v)} />
              <Select id="activity" label="Physical activity" options={ACTIVITY}
                value={form.physicalActivity} onChange={(v) => update('physicalActivity', v)} />
            </div>

            <div className="mt-4">
              <label htmlFor="occupation" className="mb-1.5 block text-sm font-medium text-ink">
                Occupation
              </label>
              <input
                id="occupation"
                type="text"
                maxLength={100}
                value={form.occupation ?? ''}
                onChange={(e: ChangeEvent<HTMLInputElement>) => update('occupation', e.target.value)}
                className="focus-ring w-full rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-sm text-ink"
              />
            </div>
          </section>

          {saveError && <Banner tone="error">{saveError}</Banner>}
          {saved && <Banner tone="success">Your health information has been saved.</Banner>}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="focus-ring tap-target inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 text-sm font-semibold text-on-primary hover:bg-primary-700 disabled:opacity-60"
            >
              <Save size={15} aria-hidden="true" />
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      )}

    </div>
  )
}

const TABS = [
  { id: 'conditions', label: 'Conditions' },
  { id: 'visits', label: 'Visits' },
  { id: 'instructions', label: 'Instructions' },
  { id: 'history', label: 'Your history' },
]

export default function MyHealthPage() {
  const [params, setParams] = useSearchParams()
  const requested = params.get('tab')
  const active = TABS.some((t) => t.id === requested) ? (requested as string) : 'conditions'

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">My Health</h1>
        <p className="mt-1.5 max-w-prose text-sm text-ink-muted">
          What your doctors have recorded about you, and the history you have told us yourself.
        </p>
      </div>

      <Tabs
        label="My Health sections"
        tabs={TABS}
        activeId={active}
        onChange={(id) => setParams({ tab: id }, { replace: true })}
      >
        {active === 'conditions' && <ConditionsPanel />}
        {active === 'visits' && <VisitsPanel />}
        {active === 'instructions' && <InstructionsPanel />}
        {active === 'history' && <HealthHistoryPanel />}
      </Tabs>
    </div>
  )
}
