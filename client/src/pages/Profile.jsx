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

  return (
    <div className="space-y-5">
      <motion.div {...fade(0)} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A] sm:text-3xl">Profile</h1>
          <p className="mt-1.5 text-sm text-[#475569]">Personal, identification, contact, and address information.</p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={startEditing}
            className="focus-ring tap-target inline-flex items-center justify-center gap-2 self-start rounded-lg border border-[#E8EDF2] bg-white px-4 text-sm font-medium text-[#475569] transition-colors hover:border-[#BFDBFE] hover:bg-[#F8FAFC] sm:self-auto"
          >
            <Edit3 size={14} aria-hidden="true" />
            Edit
          </button>
        )}
      </motion.div>

      {/* Health history (allergies, medications, conditions, lifestyle) is a
          separate task with different sensitivity — it lives on My Health,
          not mixed into this identity/contact form. */}
      <Banner tone="info">
        Looking for allergies, medications, or other health information?{' '}
        <Link to="/app/health" className="font-semibold underline underline-offset-2">
          Go to My Health
        </Link>
        .
      </Banner>

      {successMessage && <Banner tone="success">{successMessage}</Banner>}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Identity card */}
          <motion.div {...fade(0.05)} className="lg:col-span-1">
            <div className="rounded-xl border border-[#E8EDF2] bg-white p-6 text-center shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_1px_2px_0_rgba(15,23,42,0.06)]">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg"
                style={{ background: 'linear-gradient(135deg,#7C3AED,#2563EB)' }}
              >
                {initials || <User size={28} />}
              </div>
              <h2 className="text-lg font-semibold text-[#0F172A]">
                {fullName || 'Unnamed patient'}
              </h2>
              <p className="text-sm text-[#64748B] mt-0.5">
                Age {profile.age} {profile.gender ? `· ${genderLabel(profile.gender)}` : ''}
              </p>
              <div className="mt-4 pt-4 border-t border-[#F1F5F9] text-left space-y-2">
                {[
                  { label: 'Email', value: storedUser?.email ?? '—' },
                  { label: 'Date of birth', value: formatDate(profile.dateOfBirth) },
                  { label: 'Blood group', value: bloodGroupLabel(profile.bloodGroup) },
                  { label: 'Marital status', value: profile.maritalStatus ?? '—' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3">
                    <span className="flex-shrink-0 text-xs text-[#64748B]">{item.label}</span>
                    <span className="min-w-0 flex-1 truncate text-right text-sm font-semibold text-[#0F172A]">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Details */}
          <div className="lg:col-span-2 space-y-4">
            <Section title="Personal Information" delay={0.08}>
              <FieldGrid>
                <TextField label="First name" name="firstName" value={form.firstName} editing={editing} onChange={handleChange} error={fieldErrors.firstName} required />
                <TextField label="Middle name" name="middleName" value={form.middleName} editing={editing} onChange={handleChange} error={fieldErrors.middleName} />
                <TextField label="Last name" name="lastName" value={form.lastName} editing={editing} onChange={handleChange} error={fieldErrors.lastName} required />
                <TextField label="Date of birth" name="dateOfBirth" type="date" value={form.dateOfBirth} editing={editing} onChange={handleChange} error={fieldErrors.dateOfBirth} displayValue={formatDate(profile.dateOfBirth)} />
                <SelectField label="Gender" name="gender" value={form.gender} editing={editing} onChange={handleChange} options={GENDER_OPTIONS} displayValue={genderLabel(profile.gender)} />
                <SelectField label="Blood group" name="bloodGroup" value={form.bloodGroup} editing={editing} onChange={handleChange} options={BLOOD_GROUP_OPTIONS} displayValue={bloodGroupLabel(profile.bloodGroup)} />
                <SelectField label="Marital status" name="maritalStatus" value={form.maritalStatus} editing={editing} onChange={handleChange} options={MARITAL_STATUS_OPTIONS} displayValue={profile.maritalStatus ?? '—'} />
              </FieldGrid>
            </Section>

            <Section title="Identification" delay={0.11} icon={Shield}>
              <FieldGrid>
                <TextField label="ABHA ID" name="abhaId" value={form.abhaId} editing={editing} onChange={handleChange} error={fieldErrors.abhaId} />
                <TextField label="Passport number" name="passportNumber" value={form.passportNumber} editing={editing} onChange={handleChange} error={fieldErrors.passportNumber} />
                <TextField
                  label="Aadhaar (last 4 digits)"
                  name="aadhaarLast4"
                  value={form.aadhaarLast4}
                  editing={editing}
                  onChange={handleChange}
                  error={fieldErrors.aadhaarLast4}
                  placeholder={profile.aadhaarMasked ? profile.aadhaarMasked : 'Not provided'}
                  displayValue={profile.aadhaarMasked ?? '—'}
                  maxLength={4}
                />
              </FieldGrid>
            </Section>

            <Section title="Contact Information" delay={0.14} icon={Phone}>
              <FieldGrid>
                <TextField label="Mobile number" name="phoneNumber" value={form.phoneNumber} editing={editing} onChange={handleChange} error={fieldErrors.phoneNumber} />
                <TextField label="Alternate contact" name="alternatePhone" value={form.alternatePhone} editing={editing} onChange={handleChange} error={fieldErrors.alternatePhone} />
                <TextField label="Email" name="email" value={storedUser?.email ?? ''} editing={false} onChange={() => {}} displayValue={storedUser?.email ?? '—'} />
              </FieldGrid>
            </Section>

            <Section title="Address" delay={0.17} icon={MapPin}>
              <FieldGrid>
                <TextField label="Address line 1" name="addressLine1" value={form.addressLine1} editing={editing} onChange={handleChange} error={fieldErrors.addressLine1} wide />
                <TextField label="Address line 2" name="addressLine2" value={form.addressLine2} editing={editing} onChange={handleChange} error={fieldErrors.addressLine2} wide />
                <TextField label="Village" name="village" value={form.village} editing={editing} onChange={handleChange} error={fieldErrors.village} />
                <TextField label="City" name="city" value={form.city} editing={editing} onChange={handleChange} error={fieldErrors.city} />
                <TextField label="District" name="district" value={form.district} editing={editing} onChange={handleChange} error={fieldErrors.district} />
                <TextField label="State" name="state" value={form.state} editing={editing} onChange={handleChange} error={fieldErrors.state} />
                <TextField label="Country" name="country" value={form.country} editing={editing} onChange={handleChange} error={fieldErrors.country} />
                <TextField label="PIN code" name="postalCode" value={form.postalCode} editing={editing} onChange={handleChange} error={fieldErrors.postalCode} maxLength={6} />
              </FieldGrid>
            </Section>

            <Section title="Emergency Contact" delay={0.2} icon={Shield}>
              <FieldGrid>
                <TextField label="Name" name="emergencyContactName" value={form.emergencyContactName} editing={editing} onChange={handleChange} error={fieldErrors.emergencyContactName} />
                <TextField label="Phone" name="emergencyContactPhone" value={form.emergencyContactPhone} editing={editing} onChange={handleChange} error={fieldErrors.emergencyContactPhone} />
                <TextField label="Relation" name="emergencyContactRelation" value={form.emergencyContactRelation} editing={editing} onChange={handleChange} error={fieldErrors.emergencyContactRelation} />
              </FieldGrid>
            </Section>

            {editing && (
              <motion.div {...fade(0.22)} className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-end">
                {saveError && (
                  <p role="alert" className="text-sm text-[#A33A28] sm:mr-auto">{saveError}</p>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={saving}
                    className="focus-ring tap-target flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#E8EDF2] bg-white px-4 text-sm font-medium text-[#475569] transition-colors hover:border-[#CBD5E1] disabled:opacity-60 sm:flex-none"
                  >
                    <X size={14} aria-hidden="true" />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="focus-ring tap-target flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#2563EB] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                  >
                    <Check size={14} aria-hidden="true" />
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
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
function Section({ title, delay, icon: Icon, children }) {
  return (
    <motion.div {...fade(delay)} className="rounded-xl border border-[#E8EDF2] bg-white p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_1px_2px_0_rgba(15,23,42,0.06)]">
      <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0F172A]">
        {Icon && <Icon size={13} className="text-[#64748B]" />}
        {title}
      </p>
      {children}
    </motion.div>
  )
}

function FieldGrid({ children }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
}

function TextField({ label, name, value, editing, onChange, error, type = 'text', wide, required, placeholder, maxLength, displayValue }) {
  const errorId = error ? `${name}-error` : undefined
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <label htmlFor={name} className="mb-1 block text-xs font-medium text-[#64748B]">
        {label}
        {required && editing && <span className="text-[#A33A28]"> *</span>}
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
            className={`focus-ring w-full min-h-11 rounded-lg border bg-[#FAFBFC] px-3 py-2 text-sm text-[#0F172A] transition-colors
                       ${error ? 'border-[#F0C8C0]' : 'border-[#E8EDF2]'}`}
          />
          {error && (
            <p id={errorId} role="alert" className="mt-1 text-xs text-[#A33A28]">{error}</p>
          )}
        </>
      ) : (
        <p className="break-words text-sm font-semibold text-[#0F172A]">{displayValue ?? (value || '—')}</p>
      )}
    </div>
  )
}

function SelectField({ label, name, value, editing, onChange, options, displayValue }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs font-medium text-[#64748B]">
        {label}
      </label>
      {editing ? (
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          className="focus-ring w-full min-h-11 rounded-lg border border-[#E8EDF2] bg-[#FAFBFC] px-3 py-2 text-sm text-[#0F172A] transition-colors"
        >
          <option value="">—</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <p className="text-sm font-semibold text-[#0F172A]">{displayValue}</p>
      )}
    </div>
  )
}
