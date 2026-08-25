import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { User, Phone, MapPin, Shield, Edit3, X, Check, Loader2 } from 'lucide-react'
import * as profileService from '../services/profile.service'
import * as authService from '../services/auth.service'

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

  const storedUser = authService.getStoredUser()

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
    return (
      <div className="flex min-h-full items-center justify-center bg-[#FAFBFC] p-6">
        <div role="status" className="flex items-center gap-2.5 text-sm text-[#64748B]">
          <Loader2 size={18} className="animate-spin" />
          Loading your profile…
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex min-h-full items-center justify-center bg-[#FAFBFC] p-6">
        <div className="max-w-sm text-center">
          <p className="text-sm font-semibold text-[#0F172A]">Something went wrong</p>
          <p className="mt-1.5 text-sm text-[#64748B]">{loadError}</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-full items-center justify-center bg-[#FAFBFC] p-6">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF]">
            <User size={20} className="text-[#2563EB]" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-semibold text-[#0F172A]">Your patient profile hasn't been completed yet.</p>
          <p className="mt-1.5 text-sm text-[#64748B]">Contact support if you believe this is unexpected.</p>
        </div>
      </div>
    )
  }

  const fullName = [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(' ')
  const initials = `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase()

  return (
    <div className="p-6 min-h-full bg-[#FAFBFC]">
      <motion.div {...fade(0)} className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]" style={{ fontFamily: '"DM Sans",sans-serif' }}>
            Patient Profile
          </h1>
          <p className="text-sm text-[#64748B] mt-1">Personal, identification, contact, and address information</p>
        </div>
        {!editing && (
          <button
            onClick={startEditing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-[#64748B] bg-white border border-[#E8EDF2] hover:border-[#BFDBFE] transition-all shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit
          </button>
        )}
      </motion.div>

      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          role="status"
          className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          <Check size={16} className="flex-shrink-0" />
          {successMessage}
        </motion.div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Identity card */}
          <motion.div {...fade(0.05)} className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-[#E8EDF2] p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] text-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg"
                style={{ background: 'linear-gradient(135deg,#7C3AED,#2563EB)' }}
              >
                {initials || <User size={28} />}
              </div>
              <h2 className="text-lg font-bold text-[#0F172A]" style={{ fontFamily: '"DM Sans",sans-serif' }}>
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
                  <div key={item.label} className="flex justify-between items-center gap-3">
                    <span className="text-[11px] text-[#94A3B8] flex-shrink-0">{item.label}</span>
                    <span className="text-[11px] font-semibold text-[#0F172A] text-right min-w-0 flex-1 truncate">{item.value}</span>
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
              <motion.div {...fade(0.22)} className="flex items-center justify-end gap-3 pb-2">
                {saveError && <p className="mr-auto text-sm text-red-600">{saveError}</p>}
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-[#64748B] bg-white border border-[#E8EDF2] hover:border-[#CBD5E1] transition-all disabled:opacity-60"
                >
                  <X size={14} />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
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
    <motion.div {...fade(delay)} className="bg-white rounded-2xl border border-[#E8EDF2] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <p className="flex items-center gap-2 text-xs font-bold text-[#0F172A] mb-4 uppercase tracking-wider" style={{ fontFamily: '"DM Sans",sans-serif' }}>
        {Icon && <Icon size={13} className="text-[#94A3B8]" />}
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
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <label htmlFor={name} className="block text-[11px] font-medium text-[#94A3B8] mb-1">
        {label}
        {required && editing && <span className="text-red-500"> *</span>}
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
            className={`w-full rounded-xl border px-3 py-2 text-sm text-[#0F172A] bg-[#FAFBFC]
                       focus:outline-none focus:ring-2 focus:border-transparent transition-all
                       ${error ? 'border-red-300 focus:ring-red-400' : 'border-[#E8EDF2] focus:ring-[#93C5FD]'}`}
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </>
      ) : (
        <p className="text-sm font-semibold text-[#0F172A] break-words">{displayValue ?? (value || '—')}</p>
      )}
    </div>
  )
}

function SelectField({ label, name, value, editing, onChange, options, displayValue }) {
  return (
    <div>
      <label htmlFor={name} className="block text-[11px] font-medium text-[#94A3B8] mb-1">
        {label}
      </label>
      {editing ? (
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          className="w-full rounded-xl border border-[#E8EDF2] bg-[#FAFBFC] px-3 py-2 text-sm text-[#0F172A]
                     focus:outline-none focus:ring-2 focus:ring-[#93C5FD] focus:border-transparent transition-all"
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
