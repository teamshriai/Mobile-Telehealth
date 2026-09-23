import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Check } from 'lucide-react'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormField from '../../components/onboarding/FormField'
import * as hospitalAdmin from '../../services/hospitalAdmin.service'
import type { Hospital } from '../../types/domain'
import type { ApiError } from '../../types/api'

export default function HospitalAdminHospitalPage() {
  const [form, setForm] = useState<Hospital | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    hospitalAdmin
      .getOwnHospital()
      .then(setForm)
      .catch((err: ApiError) => setError(err.message || 'Could not load your hospital.'))
  }, [])

  const set = (name: keyof Hospital) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => (prev ? { ...prev, [name]: e.target.value } : prev))
    setSaved(false)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!form) return
    setSaving(true)
    setError('')
    try {
      const updated = await hospitalAdmin.updateOwnHospital({
        name: form.name,
        city: form.city || undefined,
        state: form.state || undefined,
      })
      setForm(updated)
      setSaved(true)
    } catch (err) {
      setError((err as ApiError).message || 'Could not save your hospital.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Hospital profile</h1>
        <p className="mt-1 text-sm text-ink-muted">Basic details about your hospital.</p>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-critical-bg px-3 py-2 text-xs text-critical-fg">
          {error}
        </p>
      )}

      {form === null && !error ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : form ? (
        <Card padding="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Hospital name" name="name" required value={form.name || ''} onChange={set('name')} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="City" name="city" value={form.city || ''} onChange={set('city')} />
              <FormField label="State" name="state" value={form.state || ''} onChange={set('state')} />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" loading={saving}>Save changes</Button>
              {saved && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-success-fg">
                  <Check size={14} strokeWidth={3} /> Saved
                </span>
              )}
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  )
}
