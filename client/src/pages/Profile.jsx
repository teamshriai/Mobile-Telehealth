import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { User, Phone, MapPin, Shield, Edit3, X, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import * as profileService from '../services/profile.service'
import { useAuth } from '../app/AuthContext.jsx'
import { LoadingState, ErrorState, EmptyState, Banner } from '../components/feedback/States.jsx'

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] },
})

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

const MARITAL_STATUS_OPTIONS = [
  { value: 'Single', label: 'Single' },
  { value: 'Married', label: 'Married' },
  { value: 'Divorced', label: 'Divorced' },
  { value: 'Widowed', label: 'Widowed' },
  { value: 'Separated', label: 'Separated' },
  { value: 'PreferNotToDisclose', label: 'Prefer not to disclose' },
]

/** Editable field values are always strings ('' for empty) so controlled
 * inputs never flip between controlled/uncontrolled as data loads. */
function toFormState(profile) {
  return {
    firstName: profile?.firstName ?? '',
    middleName: profile?.middleName ?? '',
    lastName: profile?.lastName ?? '',
    dateOfBirth: profile?.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '',
    gender: profile?.gender ?? '',
    bloodGroup: profile?.bloodGroup ?? '',
    maritalStatus: profile?.maritalStatus ?? '',
    abhaId: profile?.abhaId ?? '',
    passportNumber: profile?.passportNumber ?? '',
    aadhaarLast4: '', // never pre-filled from aadhaarMasked — user re-enters to change it
    phoneNumber: profile?.phoneNumber ?? '',
    alternatePhone: profile?.alternatePhone ?? '',
    addressLine1: profile?.addressLine1 ?? '',
    addressLine2: profile?.addressLine2 ?? '',
    village: profile?.village ?? '',
    city: profile?.city ?? '',
    district: profile?.district ?? '',
    state: profile?.state ?? '',
    country: profile?.country ?? 'India',
    postalCode: profile?.postalCode ?? '',
    emergencyContactName: profile?.emergencyContactName ?? '',
    emergencyContactPhone: profile?.emergencyContactPhone ?? '',
    emergencyContactRelation: profile?.emergencyContactRelation ?? '',
  }
}

/** Only send fields that are non-empty, and only aadhaarLast4 if the user
 * actually typed something — omitting it leaves the stored value untouched. */
function toUpdatePayload(form) {
  const payload = {}
  for (const [key, value] of Object.entries(form)) {
    if (key === 'aadhaarLast4' && value === '') continue
    payload[key] = value === '' ? null : value
  }
  return payload
}

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState(() => toFormState(null))
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState('')

  // From AuthContext, not localStorage — the user object is no longer persisted.
  const { user: storedUser, reloadUser } = useAuth()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError('')

    profileService
      .getProfile()
      .then((res) => {
        if (cancelled) return
        setProfile(res.profile)
        setForm(toFormState(res.profile))
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || 'Could not load your profile. Please try again.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const startEditing = () => {
    setSuccessMessage('')
    setSaveError('')
    setFieldErrors({})
    setEditing(true)
  }

  const cancelEditing = () => {
    setForm(toFormState(profile))
    setFieldErrors({})
    setSaveError('')
    setEditing(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setSaveError('')
    setFieldErrors({})

    try {
      const res = await profileService.updateProfile(toUpdatePayload(form))
      setProfile(res.profile)
      setForm(toFormState(res.profile))
      setEditing(false)
      setSuccessMessage('Profile updated successfully.')
      // A name change here should be reflected immediately in the topbar's
      // account menu, not just after the next login.
      reloadUser()
      window.setTimeout(() => setSuccessMessage(''), 4000)
    } catch (err) {
      if (err.fieldErrors) {
        const mapped = {}
        Object.entries(err.fieldErrors).forEach(([field, messages]) => {
          mapped[field] = Array.isArray(messages) ? messages[0] : messages
        })
        setFieldErrors(mapped)
      }
      setSaveError(err.message || 'Could not save your changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <LoadingState label="Loading your profile…" />
  }

  if (loadError) {
    return <ErrorState title="Something went wrong" description={loadError} onRetry={() => window.location.reload()} />
  }

  if (!profile) {
    return (
      <EmptyState
        icon={User}
        title="Your patient profile hasn't been completed yet"
        description="Contact support if you believe this is unexpected."
      />
    )
  }

  const fullName = [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(' ')
  const initials = `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase()

  // The facts someone opens this page to read, promoted out of the form so
  // they are answerable at a glance without scanning labelled rows.
  const facts = [
    { label: 'Age', value: profile.age ? `${profile.age}` : '—' },
    { label: 'Gender', value: genderLabel(profile.gender) },
    { label: 'Blood group', value: bloodGroupLabel(profile.bloodGroup) },
    { label: 'Born', value: formatDate(profile.dateOfBirth) },
  ].filter((f) => f.value && f.value !== '—')

  return (
    <div className="space-y-5">
      <motion.div
        {...fade(0)}
        className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Profile</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Your identity and contact details.{' '}
            {/* Health history lives on My Health — different task, different
                sensitivity. This used to be a full-width banner; as a sentence
                it says the same thing without another box. */}
            <Link
              to="/app/health"
              className="focus-ring rounded font-semibold text-primary-700 underline underline-offset-2"
            >
              Allergies and medicines are in My Health
            </Link>
            .
          </p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={startEditing}
            className="focus-ring tap-target inline-flex items-center justify-center gap-2 self-start rounded-lg border border-border bg-surface-1 px-4 text-sm font-medium text-ink-muted shadow-card transition-colors hover:border-border-strong hover:bg-surface-2 sm:self-auto"
          >
            <Edit3 size={14} aria-hidden="true" />
            Edit
          </button>
        )}
      </motion.div>

      {successMessage && <Banner tone="success">{successMessage}</Banner>}

      {/* One container, not seven. The previous version put the identity card
          and five field groups in six separate bordered boxes, which made a
          single flat form read as a pile of unrelated widgets. Groups are now
          separated by a rule and a label inside one surface. */}
      <form onSubmit={handleSubmit}>
        <motion.div
          {...fade(0.05)}
          className="overflow-hidden rounded-2xl border border-border bg-surface-1 shadow-card"
        >
          {/* ── Identity header ── */}
          <div className="flex flex-col gap-4 border-b border-border-soft bg-surface-2 p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-6">
            <div
              aria-hidden="true"
              className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full text-xl font-bold text-on-primary shadow-card sm:h-20 sm:w-20 sm:text-2xl"
              style={{
                background:
                  'linear-gradient(135deg, var(--color-therapy-fg), var(--color-primary-600))',
              }}
            >
              {initials || <User size={26} />}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-semibold text-ink sm:text-xl">
                {fullName || 'Unnamed patient'}
              </h2>
              <p className="mt-0.5 truncate text-sm text-ink-muted">
                {storedUser?.email ?? '—'}
              </p>

              <ul className="mt-3 flex flex-wrap gap-1.5">
                {facts.map((f) => (
                  <li
                    key={f.label}
                    className="rounded-full bg-accent-sky px-2.5 py-1 text-xs font-medium text-accent-sky-fg"
                  >
                    {/* Label kept as words, not an icon: "O+" alone is
                        ambiguous, and this is clinical data. */}
                    <span className="opacity-75">{f.label}</span>{' '}
                    <span className="font-semibold">{f.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <FieldGroup title="Personal" icon={User}>
            <TextField label="First name" name="firstName" value={form.firstName} editing={editing} onChange={handleChange} error={fieldErrors.firstName} required />
            <TextField label="Middle name" name="middleName" value={form.middleName} editing={editing} onChange={handleChange} error={fieldErrors.middleName} />
            <TextField label="Last name" name="lastName" value={form.lastName} editing={editing} onChange={handleChange} error={fieldErrors.lastName} required />
            <TextField label="Date of birth" name="dateOfBirth" type="date" value={form.dateOfBirth} editing={editing} onChange={handleChange} error={fieldErrors.dateOfBirth} displayValue={formatDate(profile.dateOfBirth)} />
            <SelectField label="Gender" name="gender" value={form.gender} editing={editing} onChange={handleChange} options={GENDER_OPTIONS} displayValue={genderLabel(profile.gender)} />
            <SelectField label="Blood group" name="bloodGroup" value={form.bloodGroup} editing={editing} onChange={handleChange} options={BLOOD_GROUP_OPTIONS} displayValue={bloodGroupLabel(profile.bloodGroup)} />
            <SelectField label="Marital status" name="maritalStatus" value={form.maritalStatus} editing={editing} onChange={handleChange} options={MARITAL_STATUS_OPTIONS} displayValue={profile.maritalStatus ?? '—'} />
          </FieldGroup>

          <FieldGroup title="Identification" icon={Shield}>
            <TextField label="ABHA ID" name="abhaId" value={form.abhaId} editing={editing} onChange={handleChange} error={fieldErrors.abhaId} />
            <TextField label="Passport number" name="passportNumber" value={form.passportNumber} editing={editing} onChange={handleChange} error={fieldErrors.passportNumber} />
            <TextField label="Aadhaar (last 4 digits)" name="aadhaarLast4" value={form.aadhaarLast4} editing={editing} onChange={handleChange} error={fieldErrors.aadhaarLast4} placeholder={profile.aadhaarMasked ? profile.aadhaarMasked : 'Not provided'} displayValue={profile.aadhaarMasked ?? '—'} maxLength={4} />
          </FieldGroup>

          <FieldGroup title="Contact" icon={Phone}>
            <TextField label="Mobile number" name="phoneNumber" value={form.phoneNumber} editing={editing} onChange={handleChange} error={fieldErrors.phoneNumber} />
            <TextField label="Alternate contact" name="alternatePhone" value={form.alternatePhone} editing={editing} onChange={handleChange} error={fieldErrors.alternatePhone} />
            <TextField label="Email" name="email" value={storedUser?.email ?? ''} editing={false} onChange={() => {}} displayValue={storedUser?.email ?? '—'} />
          </FieldGroup>

          <FieldGroup title="Address" icon={MapPin}>
            <TextField label="Address line 1" name="addressLine1" value={form.addressLine1} editing={editing} onChange={handleChange} error={fieldErrors.addressLine1} wide />
            <TextField label="Address line 2" name="addressLine2" value={form.addressLine2} editing={editing} onChange={handleChange} error={fieldErrors.addressLine2} wide />
            <TextField label="Village" name="village" value={form.village} editing={editing} onChange={handleChange} error={fieldErrors.village} />
            <TextField label="City" name="city" value={form.city} editing={editing} onChange={handleChange} error={fieldErrors.city} />
            <TextField label="District" name="district" value={form.district} editing={editing} onChange={handleChange} error={fieldErrors.district} />
            <TextField label="State" name="state" value={form.state} editing={editing} onChange={handleChange} error={fieldErrors.state} />
            <TextField label="Country" name="country" value={form.country} editing={editing} onChange={handleChange} error={fieldErrors.country} />
            <TextField label="PIN code" name="postalCode" value={form.postalCode} editing={editing} onChange={handleChange} error={fieldErrors.postalCode} maxLength={6} />
          </FieldGroup>

          <FieldGroup title="Emergency contact" icon={Shield} last>
            <TextField label="Name" name="emergencyContactName" value={form.emergencyContactName} editing={editing} onChange={handleChange} error={fieldErrors.emergencyContactName} />
            <TextField label="Phone" name="emergencyContactPhone" value={form.emergencyContactPhone} editing={editing} onChange={handleChange} error={fieldErrors.emergencyContactPhone} />
            <TextField label="Relation" name="emergencyContactRelation" value={form.emergencyContactRelation} editing={editing} onChange={handleChange} error={fieldErrors.emergencyContactRelation} />
          </FieldGroup>
        </motion.div>

        {/* Sticky while editing: the form is long enough that Save scrolled off
            screen, which is how half-finished edits get abandoned. */}
        {editing && (
          <div className="sticky bottom-0 z-10 mt-4 rounded-xl border border-border bg-surface-1/95 p-3 shadow-card-lg backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              {saveError && (
                <p role="alert" className="text-sm text-critical-fg sm:mr-auto">{saveError}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={saving}
                  className="focus-ring tap-target flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-1 px-4 text-sm font-medium text-ink-muted transition-colors hover:border-border-strong disabled:opacity-60 sm:flex-none"
                >
                  <X size={14} aria-hidden="true" />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="focus-ring tap-target flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                >
                  <Check size={14} aria-hidden="true" />
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

/* ─── Helpers ─── */
function genderLabel(value) {
  return GENDER_OPTIONS.find((o) => o.value === value)?.label ?? '—'
}
function bloodGroupLabel(value) {
  return BLOOD_GROUP_OPTIONS.find((o) => o.value === value)?.label ?? '—'
}
function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
}

/* ─── Layout components ─── */

/**
 * A labelled band inside the single profile card. Deliberately not a card of
 * its own: the page is one form, and wrapping each group in its own border was
 * what made it read as a stack of unrelated panels.
 */
function FieldGroup({ title, icon: Icon, last, children }) {
  return (
    <section className={last ? 'p-5 sm:p-6' : 'border-b border-border-soft p-5 sm:p-6'}>
      <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-subtle">
        {Icon && <Icon size={13} aria-hidden="true" />}
        {title}
      </h3>
      {/* Widens with the viewport so the form uses the space the layout gives
          it rather than leaving half the row empty on a desktop. */}
      <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {children}
      </div>
    </section>
  )
}

function TextField({ label, name, value, editing, onChange, error, type = 'text', wide, required, placeholder, maxLength, displayValue }) {
  const errorId = error ? `${name}-error` : undefined
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <label htmlFor={name} className="mb-1 block text-xs font-medium text-ink-subtle">
        {label}
        {required && editing && <span className="text-critical-fg"> *</span>}
      </label>
      {editing ? (
        <>
          <input
            id={name}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            maxLength={maxLength}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
            className={`focus-ring w-full min-h-11 rounded-lg border bg-bg px-3 py-2 text-sm text-ink transition-colors
                       ${error ? 'border-critical-fg/30' : 'border-border-soft'}`}
          />
          {error && (
            <p id={errorId} role="alert" className="mt-1 text-xs text-critical-fg">{error}</p>
          )}
        </>
      ) : (
        <p className="break-words text-sm font-semibold text-ink">{displayValue ?? (value || '—')}</p>
      )}
    </div>
  )
}

function SelectField({ label, name, value, editing, onChange, options, displayValue }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs font-medium text-ink-subtle">
        {label}
      </label>
      {editing ? (
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          className="focus-ring w-full min-h-11 rounded-lg border border-border-soft bg-bg px-3 py-2 text-sm text-ink transition-colors"
        >
          <option value="">—</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <p className="text-sm font-semibold text-ink">{displayValue}</p>
      )}
    </div>
  )
}
