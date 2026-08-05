import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Lock,
  Bell,
  Eye,
  Shield,
  Smartphone,
  Globe,
  Moon,
  Sun,
  ChevronRight,
  Check,
  Fingerprint,
  Mail,
  Phone,
  Volume2,
  Monitor,
  Trash2,
  Download,
  AlertTriangle,
  Key,
  Calendar,
} from 'lucide-react'
import SectionTitle from '../components/common/SectionTitle.jsx'
import Card from '../components/common/Card.jsx'
import Button from '../components/common/Button.jsx'
import Avatar from '../components/common/Avatar.jsx'
import Modal from '../components/common/Modal.jsx'
import { mockPatient } from '../data/mockPatients.js'

/* ── Page animation ── */
const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
}

/* ── Settings sections ── */
const SECTIONS = [
  { id: 'profile',       label: 'Profile',           icon: User },
  { id: 'security',      label: 'Security',          icon: Lock },
  { id: 'notifications', label: 'Notifications',     icon: Bell },
  { id: 'privacy',       label: 'Privacy',           icon: Shield },
  { id: 'accessibility', label: 'Accessibility',     icon: Eye },
  { id: 'devices',       label: 'Connected Devices', icon: Smartphone },
  { id: 'language',      label: 'Language & Region', icon: Globe },
  { id: 'appearance',    label: 'Appearance',        icon: Moon },
]

export default function Settings() {
  const [activeSection,  setActiveSection]  = useState('profile')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  const patient = mockPatient

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
              {activeSection === 'profile'       && <ProfileSection patient={patient} />}
              {activeSection === 'security'      && <SecuritySection />}
              {activeSection === 'notifications' && <NotificationsSection />}
              {activeSection === 'privacy'       && <PrivacySection onDelete={() => setDeleteModalOpen(true)} />}
              {activeSection === 'accessibility' && <AccessibilitySection />}
              {activeSection === 'devices'       && <DevicesSection />}
              {activeSection === 'language'      && <LanguageSection />}
              {activeSection === 'appearance'    && <AppearanceSection />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Delete account modal ── */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Account"
        subtitle="This action is permanent and cannot be reversed."
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" icon={<Trash2 size={13} />}>
              Delete Account
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-2xl
                          bg-[#FEE2E2] border border-[#FECACA]">
            <AlertTriangle size={16} className="text-[#DC2626] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[#7F1D1D] leading-relaxed">
              Deleting your account will permanently remove all your medical
              records, timeline events, reports, and AI insights from OncoTrace AI.
              This cannot be undone.
            </p>
          </div>
          <p className="text-sm text-[#64748B]">
            Please contact your care team before deleting your account to
            ensure continuity of care.
          </p>
        </div>
      </Modal>
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
        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
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
   TOGGLE SWITCH — renamed from Toggle to avoid
   conflict with any lucide-react export
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
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
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
        className="w-full px-4 py-3 rounded-xl border border-[#E8EDF2]
                   bg-white text-sm text-[#0F172A] placeholder-[#94A3B8]
                   focus:outline-none focus:border-[#2563EB]
                   focus:ring-4 focus:ring-[#2563EB]/10
                   hover:border-[#94A3B8] transition-all duration-200"
      />
    </div>
  )
}

/* ─────────────────────────────────────────────
   PROFILE SECTION
───────────────────────────────────────────── */
function ProfileSection({ patient }) {
  const [form, setForm] = useState({
    firstName: patient.personalInfo.firstName,
    lastName:  patient.personalInfo.lastName,
    email:     patient.personalInfo.email,
    phone:     patient.personalInfo.phone,
  })
  const [saved, setSaved] = useState(false)

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setSaved(false)
  }

  const handleSave = () => {
    setTimeout(() => setSaved(true), 400)
  }

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Profile Settings"
        subtitle="Update your personal information"
      />

      {/* Avatar block */}
      <Card variant="default" padding="lg">
        <div className="flex items-center gap-5">
          <Avatar name={patient.personalInfo.fullName} size="xl" rounded="xl" />
          <div>
            <p className="text-sm font-bold text-[#0F172A]">Profile Photo</p>
            <p className="text-xs text-[#64748B] mt-0.5 mb-3">
              Used across your patient portal
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm">Upload Photo</Button>
              <Button variant="ghost"     size="sm">Remove</Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Form */}
      <Card variant="default" padding="lg">
        <p className="text-sm font-bold text-[#0F172A] mb-5">
          Personal Details
        </p>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SettingsInput
              label="First Name"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
            />
            <SettingsInput
              label="Last Name"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
            />
          </div>
          <SettingsInput
            label="Email Address"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
          />
          <SettingsInput
            label="Phone Number"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
          />

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-[#94A3B8]">
              Changes are saved to your patient profile.
            </p>
            <Button
              variant={saved ? 'success' : 'primary'}
              size="sm"
              icon={saved ? <Check size={13} /> : null}
              onClick={handleSave}
            >
              {saved ? 'Saved!' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Patient ID */}
      <Card variant="ghost" padding="md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#94A3B8]
                          uppercase tracking-widest">
              Patient ID
            </p>
            <p className="text-sm font-bold text-[#0F172A] mt-0.5 font-mono">
              {patient.id}
            </p>
          </div>
          <Button variant="ghost" size="xs">Copy</Button>
        </div>
      </Card>
    </div>
  )
}

/* ─────────────────────────────────────────────
   SECURITY SECTION
───────────────────────────────────────────── */
function SecuritySection() {
  const [twoFA,        setTwoFA]        = useState(true)
  const [biometric,    setBiometric]    = useState(false)
  const [sessionAlert, setSessionAlert] = useState(true)

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Security"
        subtitle="Manage your account security settings"
      />

      {/* Password */}
      <Card variant="default" padding="lg">
        <p className="text-sm font-bold text-[#0F172A] mb-5">Password</p>
        <div className="space-y-4">
          <SettingsInput
            label="Current Password"
            type="password"
            value="••••••••••"
            onChange={() => {}}
          />
          <SettingsInput
            label="New Password"
            type="password"
            value=""
            placeholder="Enter new password"
            onChange={() => {}}
          />
          <SettingsInput
            label="Confirm Password"
            type="password"
            value=""
            placeholder="Repeat new password"
            onChange={() => {}}
          />
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              icon={<Key size={13} />}
            >
              Update Password
            </Button>
          </div>
        </div>
      </Card>

      {/* Auth toggles */}
      <Card variant="default" padding="lg">
        <p className="text-sm font-bold text-[#0F172A] mb-1">
          Authentication
        </p>
        <SettingsRow
          icon={Smartphone}
          label="Two-Factor Authentication"
          sub="Require a verification code on login"
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          control={
            <ToggleSwitch
              enabled={twoFA}
              onToggle={() => setTwoFA((v) => !v)}
            />
          }
        />
        <SettingsRow
          icon={Fingerprint}
          label="Biometric Login"
          sub="Use Face ID or fingerprint to sign in"
          iconBg="#EDE9FE"
          iconColor="#7C3AED"
          control={
            <ToggleSwitch
              enabled={biometric}
              onToggle={() => setBiometric((v) => !v)}
            />
          }
        />
        <SettingsRow
          icon={AlertTriangle}
          label="Suspicious Login Alerts"
          sub="Get notified of unrecognised access"
          iconBg="#FEF3C7"
          iconColor="#D97706"
          control={
            <ToggleSwitch
              enabled={sessionAlert}
              onToggle={() => setSessionAlert((v) => !v)}
            />
          }
        />
      </Card>

      {/* Active sessions */}
      <Card variant="default" padding="lg">
        <p className="text-sm font-bold text-[#0F172A] mb-4">
          Active Sessions
        </p>
        <div className="space-y-3">
          {[
            {
              device:  'MacBook Pro 16"',
              location:'San Francisco, CA',
              time:    'Active now',
              current: true,
            },
            {
              device:  'iPhone 15 Pro',
              location:'San Francisco, CA',
              time:    '2 hours ago',
              current: false,
            },
            {
              device:  'Chrome — Windows',
              location:'San Jose, CA',
              time:    'Yesterday',
              current: false,
            },
          ].map((session) => (
            <div
              key={session.device}
              className="flex items-center justify-between p-3.5 rounded-xl
                         bg-[#F8FAFC] border border-[#E8EDF2]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F1F5F9]
                                flex items-center justify-center">
                  <Monitor size={14} className="text-[#64748B]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-[#0F172A]">
                      {session.device}
                    </p>
                    {session.current && (
                      <span className="px-1.5 py-0.5 rounded-md
                                       bg-[#DCFCE7] text-[#16A34A]
                                       text-[9px] font-bold">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#94A3B8]">
                    {session.location} · {session.time}
                  </p>
                </div>
              </div>
              {!session.current && (
                <button className="text-xs text-[#DC2626] font-semibold
                                   hover:text-[#B91C1C] transition-colors">
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

/* ─────────────────────────────────────────────
   NOTIFICATIONS SECTION
───────────────────────────────────────────── */
function NotificationsSection() {
  const [settings, setSettings] = useState({
    apptReminders:   true,
    labResults:      true,
    aiInsights:      true,
    reportReviews:   true,
    emailNotifs:     true,
    smsNotifs:       false,
    pushNotifs:      true,
    marketingEmails: false,
    weeklyDigest:    true,
  })

  const toggle = (key) =>
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Notifications"
        subtitle="Control how and when you receive alerts"
      />

      {/* Clinical alerts */}
      <Card variant="default" padding="lg">
        <p className="text-sm font-bold text-[#0F172A] mb-1">
          Clinical Alerts
        </p>
        <SettingsRow
          icon={Calendar}
          label="Appointment Reminders"
          sub="24h and 2h before appointments"
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          control={
            <ToggleSwitch
              enabled={settings.apptReminders}
              onToggle={() => toggle('apptReminders')}
            />
          }
        />
        <SettingsRow
          icon={Bell}
          label="Lab Results Available"
          sub="When new results are ready to view"
          iconBg="#DCFCE7"
          iconColor="#16A34A"
          control={
            <ToggleSwitch
              enabled={settings.labResults}
              onToggle={() => toggle('labResults')}
            />
          }
        />
        <SettingsRow
          icon={Bell}
          label="AI Insights Generated"
          sub="When new AI recommendations are ready"
          iconBg="#EDE9FE"
          iconColor="#7C3AED"
          control={
            <ToggleSwitch
              enabled={settings.aiInsights}
              onToggle={() => toggle('aiInsights')}
            />
          }
        />
        <SettingsRow
          icon={Bell}
          label="Report Reviews"
          sub="When a physician reviews your report"
          iconBg="#FEF3C7"
          iconColor="#D97706"
          control={
            <ToggleSwitch
              enabled={settings.reportReviews}
              onToggle={() => toggle('reportReviews')}
            />
          }
        />
      </Card>

      {/* Delivery channels */}
      <Card variant="default" padding="lg">
        <p className="text-sm font-bold text-[#0F172A] mb-1">
          Delivery Channels
        </p>
        <SettingsRow
          icon={Mail}
          label="Email Notifications"
          sub="Sent to anand.k@oncotrace.ai"
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          control={
            <ToggleSwitch
              enabled={settings.emailNotifs}
              onToggle={() => toggle('emailNotifs')}
            />
          }
        />
        <SettingsRow
          icon={Phone}
          label="SMS Notifications"
          sub="Sent to +1 (415) 882-4471"
          iconBg="#DCFCE7"
          iconColor="#16A34A"
          control={
            <ToggleSwitch
              enabled={settings.smsNotifs}
              onToggle={() => toggle('smsNotifs')}
            />
          }
        />
        <SettingsRow
          icon={Volume2}
          label="Push Notifications"
          sub="In-browser alerts when portal is open"
          iconBg="#FEF3C7"
          iconColor="#D97706"
          control={
            <ToggleSwitch
              enabled={settings.pushNotifs}
              onToggle={() => toggle('pushNotifs')}
            />
          }
        />
      </Card>

      {/* Digest */}
      <Card variant="default" padding="lg">
        <p className="text-sm font-bold text-[#0F172A] mb-1">
          Digest &amp; Marketing
        </p>
        <SettingsRow
          icon={Mail}
          label="Weekly Health Digest"
          sub="Summary of your health activity each week"
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          control={
            <ToggleSwitch
              enabled={settings.weeklyDigest}
              onToggle={() => toggle('weeklyDigest')}
            />
          }
        />
        <SettingsRow
          icon={Mail}
          label="Research &amp; Updates"
          sub="Clinical trial matches and platform news"
          iconBg="#F1F5F9"
          iconColor="#64748B"
          control={
            <ToggleSwitch
              enabled={settings.marketingEmails}
              onToggle={() => toggle('marketingEmails')}
            />
          }
        />
      </Card>
    </div>
  )
}

/* ─────────────────────────────────────────────
   PRIVACY SECTION
───────────────────────────────────────────── */
function PrivacySection({ onDelete }) {
  const [settings, setSettings] = useState({
    dataSharing: false,
    researchOpt: true,
    analytics:   true,
    thirdParty:  false,
  })

  const toggle = (key) =>
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Privacy"
        subtitle="Control your data sharing preferences"
      />

      <Card variant="default" padding="lg">
        <p className="text-sm font-bold text-[#0F172A] mb-1">
          Data Sharing
        </p>
        <SettingsRow
          icon={Shield}
          label="Share with Care Team"
          sub="Allow your physicians to access your data"
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          control={
            <ToggleSwitch
              enabled={settings.dataSharing}
              onToggle={() => toggle('dataSharing')}
            />
          }
        />
        <SettingsRow
          icon={Globe}
          label="Anonymized Research"
          sub="Contribute anonymized data to cancer research"
          iconBg="#DCFCE7"
          iconColor="#16A34A"
          control={
            <ToggleSwitch
              enabled={settings.researchOpt}
              onToggle={() => toggle('researchOpt')}
            />
          }
        />
        <SettingsRow
          icon={Monitor}
          label="Platform Analytics"
          sub="Help improve OncoTrace AI with usage data"
          iconBg="#EDE9FE"
          iconColor="#7C3AED"
          control={
            <ToggleSwitch
              enabled={settings.analytics}
              onToggle={() => toggle('analytics')}
            />
          }
        />
        <SettingsRow
          icon={AlertTriangle}
          label="Third-Party Integrations"
          sub="Allow connected apps to access your data"
          iconBg="#FEF3C7"
          iconColor="#D97706"
          control={
            <ToggleSwitch
              enabled={settings.thirdParty}
              onToggle={() => toggle('thirdParty')}
            />
          }
        />
      </Card>

      {/* Data management */}
      <Card variant="default" padding="lg">
        <p className="text-sm font-bold text-[#0F172A] mb-1">
          Data Management
        </p>
        <div className="space-y-3 mt-4">
          <div className="flex items-center justify-between p-4 rounded-2xl
                          bg-[#F8FAFC] border border-[#E8EDF2]">
            <div>
              <p className="text-sm font-semibold text-[#0F172A]">
                Export My Data
              </p>
              <p className="text-xs text-[#64748B] mt-0.5">
                Download all your records in FHIR-compliant format
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<Download size={13} />}
            >
              Export
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl
                          bg-[#FEE2E2] border border-[#FECACA]">
            <div>
              <p className="text-sm font-semibold text-[#7F1D1D]">
                Delete Account
              </p>
              <p className="text-xs text-[#991B1B] mt-0.5">
                Permanently delete your account and all data
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 size={13} />}
              onClick={onDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

/* ─────────────────────────────────────────────
   ACCESSIBILITY SECTION
───────────────────────────────────────────── */
function AccessibilitySection() {
  const [settings, setSettings] = useState({
    largeText:       false,
    highContrast:    false,
    reduceMotion:    false,
    screenReader:    false,
    keyboardNav:     true,
    focusIndicators: true,
  })

  const toggle = (key) =>
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Accessibility"
        subtitle="Customize your portal experience"
      />

      <Card variant="default" padding="lg">
        <p className="text-sm font-bold text-[#0F172A] mb-1">Display</p>
        <SettingsRow
          icon={Eye}
          label="Large Text"
          sub="Increase font size across the portal"
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          control={
            <ToggleSwitch
              enabled={settings.largeText}
              onToggle={() => toggle('largeText')}
            />
          }
        />
        <SettingsRow
          icon={Monitor}
          label="High Contrast"
          sub="Enhance visibility for readability"
          iconBg="#F1F5F9"
          iconColor="#64748B"
          control={
            <ToggleSwitch
              enabled={settings.highContrast}
              onToggle={() => toggle('highContrast')}
            />
          }
        />
        <SettingsRow
          icon={Eye}
          label="Reduce Motion"
          sub="Minimize animations and transitions"
          iconBg="#FEF3C7"
          iconColor="#D97706"
          control={
            <ToggleSwitch
              enabled={settings.reduceMotion}
              onToggle={() => toggle('reduceMotion')}
            />
          }
        />
      </Card>

      <Card variant="default" padding="lg">
        <p className="text-sm font-bold text-[#0F172A] mb-1">
          Interaction
        </p>
        <SettingsRow
          icon={Eye}
          label="Screen Reader Support"
          sub="Optimise for assistive technologies"
          iconBg="#EDE9FE"
          iconColor="#7C3AED"
          control={
            <ToggleSwitch
              enabled={settings.screenReader}
              onToggle={() => toggle('screenReader')}
            />
          }
        />
        <SettingsRow
          icon={Key}
          label="Keyboard Navigation"
          sub="Full keyboard control of portal"
          iconBg="#DCFCE7"
          iconColor="#16A34A"
          control={
            <ToggleSwitch
              enabled={settings.keyboardNav}
              onToggle={() => toggle('keyboardNav')}
            />
          }
        />
        <SettingsRow
          icon={Eye}
          label="Focus Indicators"
          sub="Show visible focus rings on elements"
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          control={
            <ToggleSwitch
              enabled={settings.focusIndicators}
              onToggle={() => toggle('focusIndicators')}
            />
          }
        />
      </Card>
    </div>
  )
}

/* ─────────────────────────────────────────────
   DEVICES SECTION
───────────────────────────────────────────── */
function DevicesSection() {
  const devices = [
    {
      name:   'Apple Watch Series 9',
      type:   'Wearable',
      status: 'connected',
      last:   '2 min ago',
    },
    {
      name:   'iPhone 15 Pro',
      type:   'Mobile',
      status: 'connected',
      last:   '5 min ago',
    },
    {
      name:   'Withings Body+',
      type:   'Scale',
      status: 'connected',
      last:   '1 day ago',
    },
    {
      name:   'Dexcom G7',
      type:   'CGM',
      status: 'inactive',
      last:   '7 days ago',
    },
  ]

  /* SVG icons for devices — no emoji */
  const DeviceIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="1" width="10" height="14" rx="2"
        stroke="#64748B" strokeWidth="1.5" />
      <circle cx="7" cy="12" r="1" fill="#64748B" />
    </svg>
  )

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Connected Devices"
        subtitle="Manage health devices synced to OncoTrace AI"
      />

      <Card variant="default" padding="lg">
        <div className="space-y-3">
          {devices.map((device) => (
            <div
              key={device.name}
              className="flex items-center justify-between p-4 rounded-2xl
                         bg-[#F8FAFC] border border-[#E8EDF2]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-[#E8EDF2]
                                flex items-center justify-center">
                  <DeviceIcon />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-[#0F172A]">
                      {device.name}
                    </p>
                    <span
                      className={`
                        px-2 py-0.5 rounded-full text-[9px] font-bold
                        ${device.status === 'connected'
                          ? 'bg-[#DCFCE7] text-[#16A34A]'
                          : 'bg-[#F1F5F9] text-[#94A3B8]'
                        }
                      `}
                    >
                      {device.status === 'connected' ? 'Connected' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-[#94A3B8]">
                    {device.type} · Last sync: {device.last}
                  </p>
                </div>
              </div>
              <button
                className="text-xs text-[#DC2626] font-semibold
                           hover:text-[#B91C1C] transition-colors"
              >
                Disconnect
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-[#F1F5F9]">
          <Button
            variant="secondary"
            size="sm"
            icon={<Smartphone size={13} />}
            fullWidth
          >
            Connect New Device
          </Button>
        </div>
      </Card>
    </div>
  )
}

/* ─────────────────────────────────────────────
   LANGUAGE SECTION
───────────────────────────────────────────── */
function LanguageSection() {
  const [language,   setLanguage]   = useState('en')
  const [timezone,   setTimezone]   = useState('America/Los_Angeles')
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY')

  const languages = [
    { code: 'en', label: 'English (US)' },
    { code: 'es', label: 'Spanish' },
    { code: 'fr', label: 'French' },
    { code: 'hi', label: 'Hindi' },
    { code: 'zh', label: 'Chinese (Simplified)' },
  ]

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Language & Region"
        subtitle="Set your preferred language and locale"
      />

      <Card variant="default" padding="lg">
        <div className="space-y-5">

          {/* Language */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#0F172A] block">
              Display Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#E8EDF2]
                         bg-white text-sm text-[#0F172A]
                         focus:outline-none focus:border-[#2563EB]
                         focus:ring-4 focus:ring-[#2563EB]/10"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#0F172A] block">
              Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#E8EDF2]
                         bg-white text-sm text-[#0F172A]
                         focus:outline-none focus:border-[#2563EB]
                         focus:ring-4 focus:ring-[#2563EB]/10"
            >
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>

          {/* Date format */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#0F172A] block">
              Date Format
            </label>
            <div className="flex gap-3">
              {['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'].map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setDateFormat(fmt)}
                  className={`
                    flex-1 py-2.5 rounded-xl border text-xs font-semibold
                    transition-all duration-200
                    ${dateFormat === fmt
                      ? 'bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]'
                      : 'bg-white border-[#E8EDF2] text-[#64748B] hover:border-[#94A3B8]'
                    }
                  `}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="primary" size="sm">
              Save Preferences
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

/* ─────────────────────────────────────────────
   APPEARANCE SECTION
───────────────────────────────────────────── */
function AppearanceSection() {
  const [theme,       setTheme]       = useState('light')
  const [accentColor, setAccentColor] = useState('#2563EB')
  const [density,     setDensity]     = useState('comfortable')

  const ACCENT_COLORS = [
    '#2563EB', '#7C3AED', '#16A34A',
    '#DC2626', '#D97706', '#0EA5E9',
  ]

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Appearance"
        subtitle="Customize the look of your portal"
      />

      {/* Theme */}
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
              className={`
                flex flex-col items-center gap-2 p-4 rounded-2xl border
                transition-all duration-200
                ${theme === id
                  ? 'bg-[#EFF6FF] border-[#2563EB]'
                  : 'bg-[#F8FAFC] border-[#E8EDF2] hover:border-[#94A3B8]'
                }
              `}
            >
              <Icon
                size={20}
                className={theme === id ? 'text-[#2563EB]' : 'text-[#64748B]'}
              />
              <span
                className={`text-xs font-semibold
                  ${theme === id ? 'text-[#2563EB]' : 'text-[#64748B]'}`}
              >
                {label}
              </span>
              {theme === id && (
                <div className="w-4 h-4 rounded-full bg-[#2563EB]
                                flex items-center justify-center">
                  <Check size={10} className="text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          ))}
        </div>
      </Card>

      {/* Accent color */}
      <Card variant="default" padding="lg">
        <p className="text-sm font-bold text-[#0F172A] mb-4">Accent Color</p>
        <div className="flex gap-3">
          {ACCENT_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setAccentColor(color)}
              className="w-9 h-9 rounded-xl transition-all duration-200
                         flex items-center justify-center"
              style={{
                backgroundColor: color,
                boxShadow: accentColor === color
                  ? `0 0 0 3px white, 0 0 0 5px ${color}`
                  : 'none',
              }}
            >
              {accentColor === color && (
                <Check size={14} className="text-white" strokeWidth={3} />
              )}
            </button>
          ))}
        </div>
      </Card>

      {/* Density */}
      <Card variant="default" padding="lg">
        <p className="text-sm font-bold text-[#0F172A] mb-4">
          Content Density
        </p>
        <div className="flex gap-3">
          {['compact', 'comfortable', 'spacious'].map((d) => (
            <button
              key={d}
              onClick={() => setDensity(d)}
              className={`
                flex-1 py-2.5 rounded-xl border text-xs font-semibold capitalize
                transition-all duration-200
                ${density === d
                  ? 'bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]'
                  : 'bg-white border-[#E8EDF2] text-[#64748B] hover:border-[#94A3B8]'
                }
              `}
            >
              {d}
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}