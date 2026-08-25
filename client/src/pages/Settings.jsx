import { useEffect, useState } from 'react'
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
} from 'lucide-react'
import SectionTitle from '../components/common/SectionTitle.jsx'
import Card from '../components/common/Card.jsx'
import Button from '../components/common/Button.jsx'
import Avatar from '../components/common/Avatar.jsx'
import Modal from '../components/common/Modal.jsx'
import { useTheme } from '../hooks/useTheme.js'
import * as authService from '../services/auth.service.js'
import * as profileService from '../services/profile.service.js'

/* ── Page animation ── */
const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
}

/* ── Settings sections ──
   'devices' (Connected Devices / wearables) was removed — there is no real
   integration target for it, and a fake "connected" list is exactly the
   kind of thing this cleanup pass exists to remove. */
const SECTIONS = [
  { id: 'profile',       label: 'Profile',           icon: User },
  { id: 'security',      label: 'Security',          icon: Lock },
  { id: 'notifications', label: 'Notifications',     icon: Bell },
  { id: 'privacy',       label: 'Privacy',           icon: Shield },
  { id: 'accessibility', label: 'Accessibility',     icon: Eye },
  { id: 'language',      label: 'Language & Region', icon: Globe },
  { id: 'appearance',    label: 'Appearance',        icon: Moon },
]

export default function Settings() {
  const [activeSection, setActiveSection] = useState('profile')
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const storedUser = authService.getStoredUser()

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
  const savePreferences = async (category, values) => {
    const previous = profile
    setProfile((prev) => ({
      ...prev,
      preferences: {
        ...prev?.preferences,
        [category]: { ...prev?.preferences?.[category], ...values },
      },
    }))
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
        <div role="status" className="flex items-center gap-2.5 text-sm text-[#64748B]">
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
      className="max-w-[1100px] mx-auto"
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
            <nav className="space-y-1 p-2">
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
function SideNavItem({ section, isActive, onClick }) {
  const { label, icon: Icon } = section
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
        text-left transition-all duration-200 group
        ${isActive
          ? 'bg-[#EFF6FF] text-[#2563EB]'
          : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
        }
      `}
    >
      <div
        className={`
          w-8 h-8 rounded-lg flex items-center justify-center transition-colors
          ${isActive
            ? 'bg-[#DBEAFE]'
            : 'bg-[#F1F5F9] group-hover:bg-[#E8EDF2]'
          }
        `}
      >
        <Icon
          size={15}
          className={isActive ? 'text-[#2563EB]' : 'text-[#64748B]'}
        />
      </div>
      <span className="text-sm font-medium">{label}</span>
      {isActive && (
        <ChevronRight size={13} className="ml-auto text-[#2563EB]" />
      )}
    </button>
  )
}

/* ─────────────────────────────────────────────
   TOGGLE SWITCH
───────────────────────────────────────────── */
function ToggleSwitch({ enabled, onToggle }) {
  return (
    <motion.button
      onClick={onToggle}
      className={`
        relative w-11 h-6 rounded-full transition-colors duration-300 flex-shrink-0
        ${enabled ? 'bg-[#2563EB]' : 'bg-[#E8EDF2]'}
      `}
    >
      <motion.div
        animate={{ x: enabled ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
      />
    </motion.button>
  )
}

/* ─────────────────────────────────────────────
   SETTINGS ROW
───────────────────────────────────────────── */
function SettingsRow({
  icon: Icon,
  label,
  sub,
  control,
  iconBg    = '#F1F5F9',
  iconColor = '#64748B',
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4
                    border-b border-[#F1F5F9] last:border-0">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: iconBg }}
        >
          <Icon size={15} style={{ color: iconColor }} />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#0F172A]">{label}</p>
          {sub && (
            <p className="text-xs text-[#64748B] mt-0.5">{sub}</p>
          )}
        </div>
      </div>
      <div className="flex-shrink-0">{control}</div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   SETTINGS INPUT
───────────────────────────────────────────── */
function SettingsInput({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  disabled,
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[#0F172A]">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-4 py-3 rounded-lg border bg-white text-sm text-[#0F172A]
                   placeholder-[#94A3B8] focus:outline-none focus:ring-4
                   hover:border-[#94A3B8] transition-all duration-200 disabled:opacity-60
                   ${error
                     ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
                     : 'border-[#E8EDF2] focus:border-[#2563EB] focus:ring-[#2563EB]/10'
                   }`}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

/* ─────────────────────────────────────────────
   PROFILE SECTION — summary + link to the real
   Profile page (this used to be a second, fake,
   out-of-sync profile editor).
───────────────────────────────────────────── */
function ProfileSection({ storedUser, profile }) {
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
            <p className="text-base font-bold text-[#0F172A] truncate">{fullName || 'Patient'}</p>
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-xs text-[#64748B]">
                <Mail size={12} />
                <span className="truncate">{storedUser?.email || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#64748B]">
                <Phone size={12} className="flex-shrink-0" />
                <span className="truncate">{profile?.phoneNumber || 'Not provided'}</span>
              </div>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={() => navigate('/dashboard/profile')}>
            Edit in Profile
          </Button>
        </div>
      </Card>

      <p className="text-xs text-[#94A3B8]">
        Personal, identification, and address details are managed on the{' '}
        <button onClick={() => navigate('/dashboard/profile')} className="font-medium text-[#2563EB] hover:underline">
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
function SecuritySection() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [globalError, setGlobalError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const next = {}
    if (!form.currentPassword) next.currentPassword = 'Current password is required'
    if (!form.newPassword) next.newPassword = 'New password is required'
    else if (form.newPassword.length < 8) next.newPassword = 'Must be at least 8 characters'
    if (form.newPassword !== form.confirmPassword) next.confirmPassword = 'Passwords do not match'
    return next
  }

  const handleSubmit = async (e) => {
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
      if (err.fieldErrors?.newPassword) {
        setErrors((prev) => ({ ...prev, newPassword: err.fieldErrors.newPassword[0] }))
      } else if (err.status === 401) {
        setErrors((prev) => ({ ...prev, currentPassword: 'Current password is incorrect' }))
      } else {
        setGlobalError(err.message || 'Could not change your password. Please try again.')
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
        <p className="text-sm font-bold text-[#0F172A] mb-5">Change Password</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {globalError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700" role="alert">
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
          <p className="text-xs text-[#94A3B8]">
            Changing your password signs you out of this session — you'll need to sign in again.
          </p>
        </form>
      </Card>

      <Card variant="ghost" padding="md">
        <div className="flex items-start gap-3">
          <Shield size={16} className="text-[#94A3B8] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#94A3B8] leading-relaxed">
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

function NotificationsSection({ storedUser, profile, onSave }) {
  const settings = { ...NOTIFICATION_DEFAULTS, ...profile?.preferences?.notifications }
  const toggle = (key) => onSave('notifications', { [key]: !settings[key] })

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Notifications"
        subtitle="Control how and when you receive alerts"
      />

      <Card variant="default" padding="lg">
        <p className="text-sm font-bold text-[#0F172A] mb-1">Clinical Alerts</p>
        <SettingsRow icon={Calendar} label="Appointment Reminders" sub="24h and 2h before appointments"
          iconBg="#EFF6FF" iconColor="#2563EB"
          control={<ToggleSwitch enabled={settings.apptReminders} onToggle={() => toggle('apptReminders')} />} />
        <SettingsRow icon={Bell} label="Lab Results Available" sub="When new results are ready to view"
          iconBg="#DCFCE7" iconColor="#16A34A"
          control={<ToggleSwitch enabled={settings.labResults} onToggle={() => toggle('labResults')} />} />
        <SettingsRow icon={Bell} label="AI Insights Generated" sub="When new AI recommendations are ready"
          iconBg="#EFF6FF" iconColor="#2563EB"
          control={<ToggleSwitch enabled={settings.aiInsights} onToggle={() => toggle('aiInsights')} />} />
        <SettingsRow icon={Bell} label="Report Reviews" sub="When a physician reviews your report"
          iconBg="#FEF3C7" iconColor="#D97706"
          control={<ToggleSwitch enabled={settings.reportReviews} onToggle={() => toggle('reportReviews')} />} />
      </Card>

      <Card variant="default" padding="lg">
        <p className="text-sm font-bold text-[#0F172A] mb-1">Delivery Channels</p>
        <SettingsRow icon={Mail} label="Email Notifications" sub={storedUser?.email ? `Sent to ${storedUser.email}` : undefined}
          iconBg="#EFF6FF" iconColor="#2563EB"
          control={<ToggleSwitch enabled={settings.emailNotifs} onToggle={() => toggle('emailNotifs')} />} />
        <SettingsRow icon={Phone} label="SMS Notifications" sub={profile?.phoneNumber ? `Sent to ${profile.phoneNumber}` : 'No mobile number on file'}
          iconBg="#DCFCE7" iconColor="#16A34A"
          control={<ToggleSwitch enabled={settings.smsNotifs} onToggle={() => toggle('smsNotifs')} />} />
        <SettingsRow icon={Volume2} label="Push Notifications" sub="In-browser alerts when portal is open"
          iconBg="#FEF3C7" iconColor="#D97706"
          control={<ToggleSwitch enabled={settings.pushNotifs} onToggle={() => toggle('pushNotifs')} />} />
      </Card>

      <Card variant="default" padding="lg">
        <p className="text-sm font-bold text-[#0F172A] mb-1">Digest &amp; Marketing</p>
        <SettingsRow icon={Mail} label="Weekly Health Digest" sub="Summary of your health activity each week"
          iconBg="#EFF6FF" iconColor="#2563EB"
          control={<ToggleSwitch enabled={settings.weeklyDigest} onToggle={() => toggle('weeklyDigest')} />} />
        <SettingsRow icon={Mail} label="Research &amp; Updates" sub="Clinical trial matches and platform news"
          iconBg="#F1F5F9" iconColor="#64748B"
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

function PrivacySection({ profile, onSave }) {
  const navigate = useNavigate()
  const settings = { ...PRIVACY_DEFAULTS, ...profile?.preferences?.privacy }
  const toggle = (key) => onSave('privacy', { [key]: !settings[key] })

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
      navigate('/landing', { replace: true })
    } catch (err) {
      setDeleteError(err.message || 'Could not delete your account. Please try again.')
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
        <p className="text-sm font-bold text-[#0F172A] mb-1">Data Sharing</p>
        <SettingsRow icon={Shield} label="Share with Care Team" sub="Allow your physicians to access your data"
          iconBg="#EFF6FF" iconColor="#2563EB"
          control={<ToggleSwitch enabled={settings.dataSharing} onToggle={() => toggle('dataSharing')} />} />
        <SettingsRow icon={Globe} label="Anonymized Research" sub="Contribute anonymized data to stroke care research"
          iconBg="#DCFCE7" iconColor="#16A34A"
          control={<ToggleSwitch enabled={settings.researchOpt} onToggle={() => toggle('researchOpt')} />} />
        <SettingsRow icon={Monitor} label="Platform Analytics" sub="Help improve Stroke AI with usage data"
          iconBg="#EFF6FF" iconColor="#2563EB"
          control={<ToggleSwitch enabled={settings.analytics} onToggle={() => toggle('analytics')} />} />
        <SettingsRow icon={AlertTriangle} label="Third-Party Integrations" sub="Allow connected apps to access your data"
          iconBg="#FEF3C7" iconColor="#D97706"
          control={<ToggleSwitch enabled={settings.thirdParty} onToggle={() => toggle('thirdParty')} />} />
      </Card>

      <Card variant="default" padding="lg">
        <p className="text-sm font-bold text-[#0F172A] mb-1">Data Management</p>
        <div className="mt-4">
          <div className="flex items-center justify-between p-4 rounded-lg
                          bg-[#FEE2E2] border border-[#FECACA]">
            <div>
              <p className="text-sm font-semibold text-[#7F1D1D]">Delete Account</p>
              <p className="text-xs text-[#991B1B] mt-0.5">
                Permanently delete your account and all data
              </p>
            </div>
            <Button variant="danger" size="sm" icon={<Trash2 size={13} />} onClick={() => setDeleteModalOpen(true)}>
              Delete
            </Button>
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
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 size={13} />}
              loading={deleting}
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete Account'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-lg
                          bg-[#FEE2E2] border border-[#FECACA]">
            <AlertTriangle size={16} className="text-[#DC2626] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[#7F1D1D] leading-relaxed">
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
   ACCESSIBILITY SECTION — real, persisted preferences.
───────────────────────────────────────────── */
const ACCESSIBILITY_DEFAULTS = {
  largeText: false, highContrast: false, reduceMotion: false,
  screenReader: false, keyboardNav: true, focusIndicators: true,
}

function AccessibilitySection({ profile, onSave }) {
  const settings = { ...ACCESSIBILITY_DEFAULTS, ...profile?.preferences?.accessibility }
  const toggle = (key) => onSave('accessibility', { [key]: !settings[key] })

  return (
    <div className="space-y-5">
      <SectionTitle title="Accessibility" subtitle="Customize your portal experience" />

      <Card variant="default" padding="lg">
        <p className="text-sm font-bold text-[#0F172A] mb-1">Display</p>
        <SettingsRow icon={Eye} label="Large Text" sub="Increase font size across the portal"
          iconBg="#EFF6FF" iconColor="#2563EB"
          control={<ToggleSwitch enabled={settings.largeText} onToggle={() => toggle('largeText')} />} />
        <SettingsRow icon={Monitor} label="High Contrast" sub="Enhance visibility for readability"
          iconBg="#F1F5F9" iconColor="#64748B"
          control={<ToggleSwitch enabled={settings.highContrast} onToggle={() => toggle('highContrast')} />} />
        <SettingsRow icon={Eye} label="Reduce Motion" sub="Minimize animations and transitions"
          iconBg="#FEF3C7" iconColor="#D97706"
          control={<ToggleSwitch enabled={settings.reduceMotion} onToggle={() => toggle('reduceMotion')} />} />
      </Card>

      <Card variant="default" padding="lg">
        <p className="text-sm font-bold text-[#0F172A] mb-1">Interaction</p>
        <SettingsRow icon={Eye} label="Screen Reader Support" sub="Optimise for assistive technologies"
          iconBg="#EFF6FF" iconColor="#2563EB"
          control={<ToggleSwitch enabled={settings.screenReader} onToggle={() => toggle('screenReader')} />} />
        <SettingsRow icon={Key} label="Keyboard Navigation" sub="Full keyboard control of portal"
          iconBg="#DCFCE7" iconColor="#16A34A"
          control={<ToggleSwitch enabled={settings.keyboardNav} onToggle={() => toggle('keyboardNav')} />} />
        <SettingsRow icon={Eye} label="Focus Indicators" sub="Show visible focus rings on elements"
          iconBg="#EFF6FF" iconColor="#2563EB"
          control={<ToggleSwitch enabled={settings.focusIndicators} onToggle={() => toggle('focusIndicators')} />} />
      </Card>
    </div>
  )
}

/* ─────────────────────────────────────────────
   LANGUAGE SECTION — real, persisted preferences.
───────────────────────────────────────────── */
const LANGUAGE_DEFAULTS = { language: 'en', timezone: 'America/Los_Angeles', dateFormat: 'MM/DD/YYYY' }
const LANGUAGES = [
  { code: 'en', label: 'English (US)' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'hi', label: 'Hindi' },
  { code: 'zh', label: 'Chinese (Simplified)' },
]

function LanguageSection({ profile, onSave }) {
  const settings = { ...LANGUAGE_DEFAULTS, ...profile?.preferences?.language }
  const update = (key, value) => onSave('language', { [key]: value })

  return (
    <div className="space-y-5">
      <SectionTitle title="Language & Region" subtitle="Set your preferred language and locale" />

      <Card variant="default" padding="lg">
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#0F172A] block">Display Language</label>
            <select
              value={settings.language}
              onChange={(e) => update('language', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-[#E8EDF2] bg-white text-sm text-[#0F172A]
                         focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#0F172A] block">Timezone</label>
            <select
              value={settings.timezone}
              onChange={(e) => update('timezone', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-[#E8EDF2] bg-white text-sm text-[#0F172A]
                         focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
            >
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="Asia/Kolkata">India Standard Time (IST)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#0F172A] block">Date Format</label>
            <div className="flex gap-3">
              {['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'].map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => update('dateFormat', fmt)}
                  className={`flex-1 py-2.5 rounded-lg border text-xs font-semibold transition-all duration-200
                    ${settings.dateFormat === fmt
                      ? 'bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]'
                      : 'bg-white border-[#E8EDF2] text-[#64748B] hover:border-[#94A3B8]'
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
   system) via useTheme, persisted to localStorage.
   Accent Color and Density were removed: nothing
   in the app reads either setting, so persisting
   them would just be a different flavor of fake
   functionality.
───────────────────────────────────────────── */
function AppearanceSection() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-5">
      <SectionTitle title="Appearance" subtitle="Customize the look of your portal" />

      <Card variant="default" padding="lg">
        <p className="text-sm font-bold text-[#0F172A] mb-4">Theme</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'light',  label: 'Light',  icon: Sun },
            { id: 'dark',   label: 'Dark',   icon: Moon },
            { id: 'system', label: 'System', icon: Monitor },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTheme(id)}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all duration-200
                ${theme === id
                  ? 'bg-[#EFF6FF] border-[#2563EB]'
                  : 'bg-[#F8FAFC] border-[#E8EDF2] hover:border-[#94A3B8]'
                }`}
            >
              <Icon size={20} className={theme === id ? 'text-[#2563EB]' : 'text-[#64748B]'} />
              <span className={`text-xs font-semibold ${theme === id ? 'text-[#2563EB]' : 'text-[#64748B]'}`}>
                {label}
              </span>
              {theme === id && (
                <div className="w-4 h-4 rounded-full bg-[#2563EB] flex items-center justify-center">
                  <Check size={10} className="text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-[#94A3B8]">
          Saved to this device. Most of the portal is currently designed for light mode —
          dark mode support is still being rolled out across pages.
        </p>
      </Card>
    </div>
  )
}
