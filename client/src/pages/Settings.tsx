import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactElement, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Lock,
  Bell,
  Eye,
  Shield,
  Globe,
  Moon,
  Sun,
  ChevronRight,
  Check,
  Mail,
  Phone,
  Volume2,
  Monitor,
  Trash2,
  AlertTriangle,
  Key,
  Calendar,
  Loader2,
  type LucideIcon,
} from 'lucide-react'
import SectionTitle from '../components/common/SectionTitle'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Avatar from '../components/common/Avatar'
import Modal from '../components/common/Modal'
import { useTheme } from '../app/useTheme'
import * as authService from '../services/auth.service'
import * as profileService from '../services/profile.service'
import { useAuth } from '../app/useAuth'
import { useAccessibility } from '../app/useAccessibility'
import type { PatientProfile, PreferencesDto, User as DomainUser } from '../types/domain'
import type { ApiError } from '../types/api'
import type { AccessibilityKey } from '../app/accessibilityContextObject'
import type { Theme } from '../app/themeContextObject'
import IconTile from '../components/common/IconTile'
import type { IconTone } from '../components/common/iconTones'

/* ── Page animation ── */
const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
}

type SectionId =
  | 'profile' | 'security' | 'notifications' | 'privacy'
  | 'accessibility' | 'language' | 'appearance'

/* ── Settings sections ──
   'devices' (Connected Devices / wearables) was removed — there is no real
   integration target for it, and a fake "connected" list is exactly the
   kind of thing this cleanup pass exists to remove. */
const SECTIONS: Array<{ id: SectionId; label: string; icon: LucideIcon; hue: IconTone }> = [
  { id: 'profile',       label: 'Profile',           icon: User,   hue: 'blue' },
  { id: 'security',      label: 'Security',          icon: Lock,   hue: 'green' },
  { id: 'notifications', label: 'Notifications',     icon: Bell,   hue: 'red' },
  { id: 'privacy',       label: 'Privacy',           icon: Shield, hue: 'indigo' },
  { id: 'accessibility', label: 'Accessibility',     icon: Eye,    hue: 'teal' },
  { id: 'language',      label: 'Language & Region', icon: Globe,  hue: 'orange' },
  { id: 'appearance',    label: 'Appearance',        icon: Moon,   hue: 'violet' },
]

type PreferenceCategory = keyof PreferencesDto

export default function Settings() {
  const [activeSection, setActiveSection] = useState<SectionId>('profile')
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [loading, setLoading] = useState(true)
  // From AuthContext, not localStorage — the user object is no longer persisted.
  const { user: storedUser } = useAuth()

  useEffect(() => {
    let cancelled = false
    profileService
      .getProfile()
      .then((res) => {
        if (!cancelled) setProfile(res.profile)
      })
      .catch(() => {
        /* Sections below handle a null profile as an empty state individually. */
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  /** Shared by every section that persists a preferences category — updates
   * local state optimistically, then persists; reverts on failure so the UI
   * never shows a toggle as "on" when the save actually failed. */
  const savePreferences = async (category: PreferenceCategory, values: Record<string, unknown>) => {
    const previous = profile
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            preferences: {
              ...prev.preferences,
              [category]: { ...prev.preferences?.[category], ...values },
            },
          }
        : prev,
    )
    try {
      const res = await profileService.updatePreferences({ [category]: values })
      setProfile(res.profile)
    } catch {
      setProfile(previous)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div role="status" className="flex items-center gap-2.5 text-sm text-ink-subtle">
          <Loader2 size={18} className="animate-spin" />
          Loading settings…
        </div>
      </div>
    )
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      {/* ── Page header ── */}
      <div className="mb-8">
        <SectionTitle
          title="Settings"
          subtitle="Manage your account preferences and privacy"
          size="xl"
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">

        {/* ── Left sidebar nav ── */}
        <div className="lg:w-64 flex-shrink-0">
          <Card variant="default" padding="sm">
            <nav className="space-y-1 p-2" role="tablist" aria-label="Settings sections" aria-orientation="vertical">
              {SECTIONS.map((section) => (
                <SideNavItem
                  key={section.id}
                  section={section}
                  isActive={activeSection === section.id}
                  onClick={() => setActiveSection(section.id)}
                />
              ))}
            </nav>
          </Card>
        </div>

        {/* ── Right content panel ── */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              {activeSection === 'profile'       && <ProfileSection storedUser={storedUser} profile={profile} />}
              {activeSection === 'security'      && <SecuritySection />}
              {activeSection === 'notifications' && <NotificationsSection storedUser={storedUser} profile={profile} onSave={savePreferences} />}
              {activeSection === 'privacy'       && <PrivacySection profile={profile} onSave={savePreferences} />}
              {activeSection === 'accessibility' && <AccessibilitySection profile={profile} onSave={savePreferences} />}
              {activeSection === 'language'      && <LanguageSection profile={profile} onSave={savePreferences} />}
              {activeSection === 'appearance'    && <AppearanceSection />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────
   SIDEBAR NAV ITEM
───────────────────────────────────────────── */
interface SideNavItemProps {
  section: { id: SectionId; label: string; icon: LucideIcon; hue: IconTone }
  isActive: boolean
  onClick: () => void
}

function SideNavItem({ section, isActive, onClick }: SideNavItemProps) {
  const { label, icon, hue } = section
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={`
        focus-ring group flex w-full min-h-11 items-center gap-3 rounded-lg px-3 py-2.5
        text-left transition-colors duration-200
        ${isActive
          ? 'bg-primary-50 text-primary-700'
          : 'text-ink-subtle hover:bg-surface-2 hover:text-ink'
        }
      `}
    >
      <IconTile icon={icon} tone={hue} size="sm" />
      <span className="text-sm font-medium">{label}</span>
      {isActive && (
        <ChevronRight size={13} className="ml-auto text-primary-700" />
      )}
    </button>
  )
}

/* ─────────────────────────────────────────────
   TOGGLE SWITCH
───────────────────────────────────────────── */
interface ToggleSwitchProps {
  enabled: boolean
  onToggle: () => void
  label?: string
}

function ToggleSwitch({ enabled, onToggle, label }: ToggleSwitchProps) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      className={`
        focus-ring tap-target relative w-11 rounded-full transition-colors duration-300 flex-shrink-0
        ${enabled ? 'bg-primary-600' : 'bg-surface-3'}
      `}
      style={{ height: '1.5rem' }}
    >
      <motion.div
        animate={{ x: enabled ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 bg-surface-1 rounded-full shadow-sm"
      />
    </motion.button>
  )
}

/* ─────────────────────────────────────────────
   SETTINGS ROW
───────────────────────────────────────────── */
/* Token class pairs rather than inline hex, so the row icons follow the
   theme. `tone` replaced the old iconBg/iconColor prop pair: two free-form
   colour strings per call site was how the saturated one-off greens and
   ambers got in here in the first place. */
const ROW_TONES = {
  muted:   'bg-surface-2 text-ink-subtle',
  primary: 'bg-primary-50 text-primary-700',
  success: 'bg-success-bg text-success-fg',
  warning: 'bg-warning-bg text-warning-fg',
}

type RowTone = keyof typeof ROW_TONES

interface SettingsRowProps {
  icon: LucideIcon
  label: string
  sub?: string
  control?: ReactElement
  tone?: RowTone
}

function SettingsRow({
  icon: Icon,
  label,
  sub,
  control,
  tone = 'muted',
}: SettingsRowProps) {
  // The row's own label doubles as the accessible name for a ToggleSwitch
  // control — every ToggleSwitch in this file is used exactly this way, so
  // this is the one place that fixes all 22 otherwise-unlabelled toggles.
  const namedControl: ReactNode =
    control?.type === ToggleSwitch
      ? { ...control, props: { ...(control.props as object), label } }
      : control

  return (
    <div className="flex items-center justify-between gap-4 border-b border-border-soft py-4 last:border-0">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
            ROW_TONES[tone] ?? ROW_TONES.muted
          }`}
        >
          <Icon size={15} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{label}</p>
          {sub && (
            <p className="mt-0.5 truncate text-xs text-ink-subtle">{sub}</p>
          )}
        </div>
      </div>
      <div className="flex-shrink-0">{namedControl}</div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   SETTINGS INPUT
───────────────────────────────────────────── */
interface SettingsInputProps {
  label: string
  name: string
  type?: string
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  error?: string
  disabled?: boolean
}

function SettingsInput({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  disabled,
}: SettingsInputProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-4 py-3 rounded-lg border bg-surface-1 text-sm text-ink
                   placeholder-ink-subtle focus:outline-none focus:ring-4
                   hover:border-border-strong transition-all duration-200 disabled:opacity-60
                   ${error
                     ? 'border-critical-fg/30 focus:border-critical-fg focus:ring-critical-fg/10'
                     : 'border-border-soft focus:border-primary-600 focus:ring-primary-600/10'
                   }`}
      />
      {error && <p role="alert" className="text-xs text-critical-fg">{error}</p>}
    </div>
  )
}

/* ─────────────────────────────────────────────
   PROFILE SECTION — summary + link to the real
   Profile page (this used to be a second, fake,
   out-of-sync profile editor).
───────────────────────────────────────────── */
function ProfileSection({ storedUser, profile }: { storedUser: DomainUser | null; profile: PatientProfile | null }) {
  const navigate = useNavigate()
  const fullName = profile ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') : storedUser?.name

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Profile"
        subtitle="Your identity, contact, and address information"
      />

      <Card variant="default" padding="lg">
        <div className="flex items-center gap-5">
          <Avatar name={fullName || 'Patient'} size="xl" rounded="xl" />
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-ink truncate">{fullName || 'Patient'}</p>
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-xs text-ink-subtle">
                <Mail size={12} />
                <span className="truncate">{storedUser?.email || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-ink-subtle">
                <Phone size={12} className="flex-shrink-0" />
                <span className="truncate">{profile?.phoneNumber || 'Not provided'}</span>
              </div>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={() => navigate('/app/profile')}>
            Edit in Profile
          </Button>
        </div>
      </Card>

      <p className="text-xs text-ink-subtle">
        Personal, identification, and address details are managed on the{' '}
        <button onClick={() => navigate('/app/profile')} className="font-medium text-primary-700 hover:underline">
          Profile
        </button>{' '}
        page — everything you enter there is stored encrypted.
      </p>
    </div>
  )
}

/* ─────────────────────────────────────────────
   SECURITY SECTION — real password change.
   2FA/Biometric/Active-Sessions removed for now:
   there is no real backend behind them yet
   (planned as a dedicated follow-up build).
───────────────────────────────────────────── */
interface SecurityForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

function SecuritySection() {
  const navigate = useNavigate()
  const [form, setForm] = useState<SecurityForm>({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [errors, setErrors] = useState<Partial<SecurityForm>>({})
  const [saving, setSaving] = useState(false)
  const [globalError, setGlobalError] = useState('')

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof SecurityForm]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validate = (): Partial<SecurityForm> => {
    const next: Partial<SecurityForm> = {}
    if (!form.currentPassword) next.currentPassword = 'Current password is required'
    if (!form.newPassword) next.newPassword = 'New password is required'
    else if (form.newPassword.length < 8) next.newPassword = 'Must be at least 8 characters'
    if (form.newPassword !== form.confirmPassword) next.confirmPassword = 'Passwords do not match'
    return next
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setGlobalError('')
    const nextErrors = validate()
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    setSaving(true)
    try {
      await authService.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })
      navigate('/login', {
        replace: true,
        state: { message: 'Password changed successfully. Please sign in again.' },
      })
    } catch (err) {
      const apiErr = err as ApiError
      const fieldErrors = apiErr.fieldErrors
      const newPasswordErrors =
        fieldErrors && !Array.isArray(fieldErrors) ? fieldErrors.newPassword : undefined
      if (newPasswordErrors) {
        setErrors((prev) => ({ ...prev, newPassword: newPasswordErrors[0] }))
      } else if (apiErr.status === 401) {
        setErrors((prev) => ({ ...prev, currentPassword: 'Current password is incorrect' }))
      } else {
        setGlobalError(apiErr.message || 'Could not change your password. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Security"
        subtitle="Manage your account security settings"
      />

      <Card variant="default" padding="lg">
        <p className="text-sm font-bold text-ink mb-5">Change Password</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {globalError && (
            <div className="rounded-lg border border-critical-fg/30 bg-critical-bg px-3.5 py-2.5 text-sm text-critical-fg" role="alert">
              {globalError}
            </div>
          )}
          <SettingsInput
            label="Current Password"
            name="currentPassword"
            type="password"
            value={form.currentPassword}
            onChange={handleChange}
            error={errors.currentPassword}
            disabled={saving}
          />
          <SettingsInput
            label="New Password"
            name="newPassword"
            type="password"
            value={form.newPassword}
            onChange={handleChange}
            placeholder="Min. 8 characters, upper/lowercase, number, symbol"
            error={errors.newPassword}
            disabled={saving}
          />
          <SettingsInput
            label="Confirm New Password"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="Repeat new password"
            error={errors.confirmPassword}
            disabled={saving}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={saving}
              icon={<Key size={13} />}
            >
              {saving ? 'Updating…' : 'Update Password'}
            </Button>
          </div>
          <p className="text-xs text-ink-subtle">
            Changing your password signs you out of this session — you'll need to sign in again.
          </p>
        </form>
      </Card>

      <Card variant="ghost" padding="md">
        <div className="flex items-start gap-3">
          <Shield size={16} className="text-ink-subtle flex-shrink-0 mt-0.5" />
          <p className="text-xs text-ink-subtle leading-relaxed">
            Two-factor authentication and active-session management are planned for a
            future update — they aren't implemented yet, so they're not shown here rather
            than presenting a control that wouldn't actually do anything.
          </p>
        </div>
      </Card>
    </div>
  )
}

/* ─────────────────────────────────────────────
   NOTIFICATIONS SECTION — real, persisted preferences.
───────────────────────────────────────────── */
const NOTIFICATION_DEFAULTS = {
  apptReminders: true, labResults: true, aiInsights: true, reportReviews: true,
  emailNotifs: true, smsNotifs: false, pushNotifs: true,
  marketingEmails: false, weeklyDigest: true,
}

type NotificationSettings = typeof NOTIFICATION_DEFAULTS

interface PreferenceSectionProps {
  profile: PatientProfile | null
  onSave: (category: PreferenceCategory, values: Record<string, unknown>) => void
}

function NotificationsSection({ storedUser, profile, onSave }: PreferenceSectionProps & { storedUser: DomainUser | null }) {
  const settings: NotificationSettings = { ...NOTIFICATION_DEFAULTS, ...(profile?.preferences?.notifications as Partial<NotificationSettings> | undefined) }
  const toggle = (key: keyof NotificationSettings) => onSave('notifications', { [key]: !settings[key] })

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Notifications"
        subtitle="Control how and when you receive alerts"
      />

      <Card variant="default" padding="lg">
        <p className="text-sm font-bold text-ink mb-1">Clinical Alerts</p>
        <SettingsRow icon={Calendar} label="Appointment Reminders" sub="24h and 2h before appointments"
          tone="primary"
          control={<ToggleSwitch enabled={settings.apptReminders} onToggle={() => toggle('apptReminders')} />} />
        <SettingsRow icon={Bell} label="Lab Results Available" sub="When new results are ready to view"
          tone="success"
          control={<ToggleSwitch enabled={settings.labResults} onToggle={() => toggle('labResults')} />} />
        <SettingsRow icon={Bell} label="AI Insights Generated" sub="When new AI recommendations are ready"
          tone="primary"
          control={<ToggleSwitch enabled={settings.aiInsights} onToggle={() => toggle('aiInsights')} />} />
        <SettingsRow icon={Bell} label="Report Reviews" sub="When a physician reviews your report"
          tone="warning"
          control={<ToggleSwitch enabled={settings.reportReviews} onToggle={() => toggle('reportReviews')} />} />
      </Card>

      <Card variant="default" padding="lg">
        <p className="text-sm font-bold text-ink mb-1">Delivery Channels</p>
        <SettingsRow icon={Mail} label="Email Notifications" sub={storedUser?.email ? `Sent to ${storedUser.email}` : undefined}
          tone="primary"
          control={<ToggleSwitch enabled={settings.emailNotifs} onToggle={() => toggle('emailNotifs')} />} />
        <SettingsRow icon={Phone} label="SMS Notifications" sub={profile?.phoneNumber ? `Sent to ${profile.phoneNumber}` : 'No mobile number on file'}
          tone="success"
          control={<ToggleSwitch enabled={settings.smsNotifs} onToggle={() => toggle('smsNotifs')} />} />
        <SettingsRow icon={Volume2} label="Push Notifications" sub="In-browser alerts when portal is open"
          tone="warning"
          control={<ToggleSwitch enabled={settings.pushNotifs} onToggle={() => toggle('pushNotifs')} />} />
      </Card>

      <Card variant="default" padding="lg">
        <p className="text-sm font-bold text-ink mb-1">Digest &amp; Marketing</p>
        <SettingsRow icon={Mail} label="Weekly Health Digest" sub="Summary of your health activity each week"
          tone="primary"
          control={<ToggleSwitch enabled={settings.weeklyDigest} onToggle={() => toggle('weeklyDigest')} />} />
        <SettingsRow icon={Mail} label="Research &amp; Updates" sub="Clinical trial matches and platform news"
          tone="muted"
          control={<ToggleSwitch enabled={settings.marketingEmails} onToggle={() => toggle('marketingEmails')} />} />
      </Card>
    </div>
  )
}

/* ─────────────────────────────────────────────
   PRIVACY SECTION — real, persisted preferences.
   "Export My Data" (fabricated FHIR claim) removed.
───────────────────────────────────────────── */
const PRIVACY_DEFAULTS = { dataSharing: false, researchOpt: true, analytics: true, thirdParty: false }
type PrivacySettings = typeof PRIVACY_DEFAULTS

function PrivacySection({ profile, onSave }: PreferenceSectionProps) {
  const navigate = useNavigate()
  const settings: PrivacySettings = { ...PRIVACY_DEFAULTS, ...(profile?.preferences?.privacy as Partial<PrivacySettings> | undefined) }
  const toggle = (key: keyof PrivacySettings) => onSave('privacy', { [key]: !settings[key] })

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!password) {
      setDeleteError('Enter your password to confirm.')
      return
    }
    setDeleting(true)
    setDeleteError('')
    try {
      await authService.deleteAccount(password)
      navigate('/login', { replace: true })
    } catch (err) {
      setDeleteError((err as ApiError).message || 'Could not delete your account. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Privacy"
        subtitle="Control your data sharing preferences"
      />

      <Card variant="default" padding="lg">
        <p className="text-sm font-bold text-ink mb-1">Data Sharing</p>
        <SettingsRow icon={Shield} label="Share with my doctors" sub="Allow your physicians to access your data"
          tone="primary"
          control={<ToggleSwitch enabled={settings.dataSharing} onToggle={() => toggle('dataSharing')} />} />
        <SettingsRow icon={Globe} label="Anonymized Research" sub="Contribute anonymized data to stroke care research"
          tone="success"
          control={<ToggleSwitch enabled={settings.researchOpt} onToggle={() => toggle('researchOpt')} />} />
        <SettingsRow icon={Monitor} label="Platform Analytics" sub="Help improve Stroke AI with usage data"
          tone="primary"
          control={<ToggleSwitch enabled={settings.analytics} onToggle={() => toggle('analytics')} />} />
        <SettingsRow icon={AlertTriangle} label="Third-Party Integrations" sub="Allow connected apps to access your data"
          tone="warning"
          control={<ToggleSwitch enabled={settings.thirdParty} onToggle={() => toggle('thirdParty')} />} />
      </Card>

      <Card variant="default" padding="lg">
        <p className="mb-1 text-sm font-bold text-ink">Data Management</p>
        <div className="mt-4">
          {/* Uses the critical palette, not emergency red — red is reserved
              for the emergency action, so an ordinary (if serious) account
              action does not compete with it visually. */}
          <div className="flex flex-col gap-3 rounded-lg border border-critical-fg/30 bg-critical-bg p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-critical-fg">Delete Account</p>
              <p className="mt-0.5 text-xs text-warning-fg">
                Permanently delete your account and all data
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              className="focus-ring tap-target inline-flex items-center justify-center gap-1.5 self-start rounded-lg border border-critical-fg/30 bg-surface-1 px-3.5 text-sm font-semibold text-critical-fg transition-colors hover:bg-critical-bg sm:self-auto"
            >
              <Trash2 size={14} aria-hidden="true" />
              Delete
            </button>
          </div>
        </div>
      </Card>

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setPassword(''); setDeleteError('') }}
        title="Delete Account"
        subtitle="This action is permanent and cannot be reversed."
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDeleteModalOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="focus-ring tap-target inline-flex items-center justify-center gap-1.5 rounded-lg bg-critical-fg px-4 text-sm font-semibold text-on-primary transition-colors hover:opacity-90 disabled:opacity-60"
            >
              <Trash2 size={14} aria-hidden="true" />
              {deleting ? 'Deleting…' : 'Delete Account'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-critical-fg/30 bg-critical-bg p-4">
            <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 flex-shrink-0 text-critical-fg" />
            <p className="text-sm leading-relaxed text-critical-fg">
              Deleting your account will deactivate it immediately and remove your access.
              This cannot be undone from the portal — contact support if you change your mind.
            </p>
          </div>
          <SettingsInput
            label="Confirm your password"
            name="deletePassword"
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setDeleteError('') }}
            error={deleteError}
            disabled={deleting}
          />
        </div>
      </Modal>
    </div>
  )
}

/* ─────────────────────────────────────────────
   ACCESSIBILITY SECTION

   Every switch here changes the portal immediately — AccessibilityContext
   sets a data-* attribute on <html> and index.css does the rest.

   Three earlier switches were removed rather than kept: "Screen Reader
   Support", "Keyboard Navigation" and "Focus Indicators". The portal has
   full keyboard operability and visible focus rings unconditionally, and
   nothing about screen-reader output is toggleable — so those controls
   could only ever have been decorative, and one of them ("Keyboard
   Navigation", defaulting to on) implied a user could switch keyboard
   access OFF. Deleting a promise the product cannot keep is the fix.
───────────────────────────────────────────── */
const ACCESSIBILITY_DEFAULTS: Record<AccessibilityKey, boolean> = {
  largeText: false, highContrast: false, reduceMotion: false,
}

function AccessibilitySection({ profile, onSave }: PreferenceSectionProps) {
  const { applyLocal } = useAccessibility()
  const settings: Record<AccessibilityKey, boolean> = {
    ...ACCESSIBILITY_DEFAULTS,
    ...(profile?.preferences?.accessibility as Partial<Record<AccessibilityKey, boolean>> | undefined),
  }

  const toggle = (key: AccessibilityKey) => {
    const next = !settings[key]
    // Apply first, persist second: the point of a display setting is that you
    // see the effect while deciding whether you want it.
    applyLocal(key, next)
    onSave('accessibility', { [key]: next })
  }

  return (
    <div className="space-y-5">
      <SectionTitle title="Accessibility" subtitle="Customize your portal experience" />

      <Card variant="default" padding="lg">
        <p className="text-sm font-bold text-ink mb-1">Display</p>
        <SettingsRow icon={Eye} label="Large Text" sub="Increase font size across the portal"
          tone="primary"
          control={<ToggleSwitch enabled={settings.largeText} onToggle={() => toggle('largeText')} />} />
        <SettingsRow icon={Monitor} label="High Contrast" sub="Darken text and strengthen borders"
          tone="muted"
          control={<ToggleSwitch enabled={settings.highContrast} onToggle={() => toggle('highContrast')} />} />
        <SettingsRow icon={Eye} label="Reduce Motion" sub="Minimize animations and transitions"
          tone="warning"
          control={<ToggleSwitch enabled={settings.reduceMotion} onToggle={() => toggle('reduceMotion')} />} />
      </Card>

      <Card variant="default" padding="lg">
        <p className="text-sm font-bold text-ink mb-1">Always on</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          Full keyboard navigation, visible focus indicators and screen-reader
          landmarks are built into every page and cannot be switched off.
        </p>
      </Card>
    </div>
  )
}

/* ─────────────────────────────────────────────
   LANGUAGE SECTION — real, persisted preferences.
───────────────────────────────────────────── */
// India-first defaults: this is an India-deployed product (108/112 emergency
// numbers, +91 phone validation elsewhere in the app) — Pacific Time /
// MM/DD/YYYY as the out-of-the-box experience was a leftover from the
// pre-rebrand codebase.
const LANGUAGE_DEFAULTS = { language: 'en', timezone: 'Asia/Kolkata', dateFormat: 'DD/MM/YYYY' }
type LanguageSettings = typeof LANGUAGE_DEFAULTS
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ta', label: 'Tamil (தமிழ்)' },
  { code: 'ml', label: 'Malayalam (മലയാളം)' },
  { code: 'hi', label: 'Hindi (हिन्दी)' },
]
const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']

function LanguageSection({ profile, onSave }: PreferenceSectionProps) {
  const settings: LanguageSettings = { ...LANGUAGE_DEFAULTS, ...(profile?.preferences?.language as Partial<LanguageSettings> | undefined) }
  const update = (key: keyof LanguageSettings, value: string) => onSave('language', { [key]: value })

  return (
    <div className="space-y-5">
      <SectionTitle title="Language & Region" subtitle="Set your preferred language and locale" />

      <Card variant="default" padding="lg">
        <div className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="settings-language" className="block text-sm font-medium text-ink">Display Language</label>
            <select
              id="settings-language"
              value={settings.language}
              onChange={(e) => update('language', e.target.value)}
              className="focus-ring w-full min-h-11 rounded-lg border border-border-soft bg-surface-1 px-4 py-3 text-sm text-ink"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="settings-timezone" className="block text-sm font-medium text-ink">Timezone</label>
            <select
              id="settings-timezone"
              value={settings.timezone}
              onChange={(e) => update('timezone', e.target.value)}
              className="focus-ring w-full min-h-11 rounded-lg border border-border-soft bg-surface-1 px-4 py-3 text-sm text-ink"
            >
              <option value="Asia/Kolkata">India Standard Time (IST)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-ink">Date Format</span>
            {/* grid rather than an unwrapped flex row — three ~10-char labels
                in a flex-1 row clip below ~360px; the grid keeps every option
                fully readable down to a 320px viewport. */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {DATE_FORMATS.map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => update('dateFormat', fmt)}
                  aria-pressed={settings.dateFormat === fmt}
                  className={`focus-ring tap-target rounded-lg border text-xs font-semibold transition-colors
                    ${settings.dateFormat === fmt
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-border-soft bg-surface-1 text-ink-subtle hover:border-border-strong'
                    }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

/* ─────────────────────────────────────────────
   APPEARANCE SECTION — real theme (light/dark/
   system) via ThemeContext. Applied instantly from
   localStorage and synced to the account, so the
   choice follows the patient to another device.
   Accent Color and Density were removed: nothing
   in the app reads either setting, so persisting
   them would just be a different flavor of fake
   functionality.
───────────────────────────────────────────── */
function AppearanceSection() {
  const { theme, setTheme } = useTheme()

  const THEME_OPTIONS: Array<{ id: Theme; label: string; icon: LucideIcon }> = [
    { id: 'light',  label: 'Light',  icon: Sun },
    { id: 'dark',   label: 'Dark',   icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ]

  return (
    <div className="space-y-5">
      <SectionTitle title="Appearance" subtitle="Customize the look of your portal" />

      <Card variant="default" padding="lg">
        <p className="text-sm font-bold text-ink mb-4">Theme</p>
        <div className="grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTheme(id)}
              aria-pressed={theme === id}
              className={`focus-ring flex flex-col items-center gap-2 p-4 rounded-lg border transition-all duration-200
                ${theme === id
                  ? 'bg-primary-50 border-primary-600'
                  : 'bg-surface-2 border-border-soft hover:border-border-strong'
                }`}
            >
              <Icon size={20} className={theme === id ? 'text-primary-700' : 'text-ink-subtle'} />
              <span className={`text-xs font-semibold ${theme === id ? 'text-primary-700' : 'text-ink-subtle'}`}>
                {label}
              </span>
              {theme === id && (
                <div className="w-4 h-4 rounded-full bg-primary-600 flex items-center justify-center">
                  <Check size={10} className="text-on-primary" strokeWidth={3} />
                </div>
              )}
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-ink-subtle">
          Applied straight away on this device and saved to your account, so it follows you
          when you sign in somewhere else. System matches your device's own setting.
        </p>
      </Card>
    </div>
  )
}
