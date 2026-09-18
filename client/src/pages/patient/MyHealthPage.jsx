import { useEffect, useState } from 'react'
import { FileText, Save } from 'lucide-react'
import * as profileService from '../../services/profile.service'
import { LoadingState, ErrorState, Banner } from '../../components/feedback/States.jsx'

/**
 * My Health — health history view/edit, backed by the Phase 3 health-history
 * fields added to PatientProfile.
 *
 * Documents/records/reports are DEFERRED to Phase 4 (per the phase plan — no
 * Document model or object storage exists). That section states plainly that
 * it is not available rather than showing a fake upload flow, which is
 * exactly the pattern Phase 1 found and removed elsewhere (a fake progress
 * bar that discarded the file).
 */

const SMOKING = [
  { value: '', label: 'Prefer not to say' },
  { value: 'Never', label: 'Never smoked' },
  { value: 'Former', label: 'Former smoker' },
  { value: 'Current', label: 'Current smoker' },
  { value: 'Occasional', label: 'Occasional' },
]
const ALCOHOL = [
  { value: '', label: 'Prefer not to say' },
  { value: 'Never', label: 'Never' },
  { value: 'Occasional', label: 'Occasional' },
  { value: 'Moderate', label: 'Moderate' },
  { value: 'Heavy', label: 'Heavy' },
]
const TOBACCO = [
  { value: '', label: 'Prefer not to say' },
  { value: 'Never', label: 'Never' },
  { value: 'Former', label: 'Former user' },
  { value: 'Current', label: 'Current user' },
]
const ACTIVITY = [
  { value: '', label: 'Prefer not to say' },
  { value: 'Sedentary', label: 'Sedentary' },
  { value: 'Light', label: 'Light activity' },
  { value: 'Moderate', label: 'Moderate activity' },
  { value: 'Active', label: 'Active' },
  { value: 'VeryActive', label: 'Very active' },
]

function TextArea({ id, label, hint, value, onChange }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      {hint && <p className="mb-1.5 text-xs text-ink-subtle">{hint}</p>}
      <textarea
        id={id}
        rows={2}
        maxLength={1000}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="focus-ring w-full rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-sm text-ink"
      />
    </div>
  )
}

function Select({ id, label, value, onChange, options }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      <select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="focus-ring w-full rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-sm text-ink"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

const FIELD_KEYS = [
  'knownAllergies', 'currentMedications', 'existingDiseases',
  'familyHistory', 'previousSurgeries',
  'smokingStatus', 'alcoholStatus', 'tobaccoStatus', 'physicalActivity', 'occupation',
]

export default function MyHealthPage() {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    profileService.getProfile()
      .then((res) => {
        if (cancelled) return
        setProfile(res.profile)
        const f = {}
        FIELD_KEYS.forEach((k) => { f[k] = res.profile?.[k] ?? null })
        setForm(f)
      })
      .catch((err) => { if (!cancelled) setLoadError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      const res = await profileService.updateHealthHistory(form)
      setProfile(res.profile)
      setSaved(true)
    } catch (err) {
      setSaveError(err.fieldErrors ? Object.values(err.fieldErrors).flat()[0] : err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">My Health</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          A record of your medical history that your care team can rely on.
        </p>
      </div>

      {loading ? (
        <LoadingState label="Loading your health information…" />
      ) : loadError ? (
        <ErrorState description={loadError} />
      ) : !profile ? (
        <ErrorState title="Profile not set up" description="Complete your profile before adding health history." />
      ) : (
        <form onSubmit={handleSave} className="space-y-5">
          <section className="rounded-xl border border-border-soft bg-surface-1 p-5">
            <h2 className="text-base font-semibold text-ink">Medical history</h2>
            <p className="mt-1 text-sm text-ink-muted">
              This is your own summary in your own words — it helps your care team, but it does
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
            <p className="mt-1 text-sm text-ink-muted">Helps your care team give you better advice.</p>

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
                onChange={(e) => update('occupation', e.target.value)}
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

      {/* Documents: deferred to Phase 4 — no Document model or file storage
          exists. An honest state, not a fake upload. */}
      <section className="rounded-xl border border-border-soft bg-surface-1 p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <FileText size={17} aria-hidden="true" className="text-ink-subtle" />
          Reports and documents
        </h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-muted">
          Uploading scans, discharge summaries and lab reports is not available yet. We would
          rather wait until it works properly than show you an upload that does not really save
          your file.
        </p>
      </section>
    </div>
  )
}
