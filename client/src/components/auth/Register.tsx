import { useState, type ChangeEvent, type ComponentType, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Calendar,
  Phone,
  Check,
  Shield,
  HeartPulse,

} from 'lucide-react'
import { useAuth } from '../../app/useAuth'
import BrandMark from '../common/BrandMark'
import AuthShell from './AuthShell'
import type { RoleName } from '../../types/domain'
import type { ApiError } from '../../types/api'

interface RoleOption {
  value: RoleName
  label: string
  icon: ComponentType<{ size?: number; strokeWidth?: number }>
  description: string
}

/**
 * ⚠️ PATIENT ONLY. Doctor and Hospital Administrator were removed here.
 *
 * Self-registration as a clinician is not an onboarding convenience, it is an
 * authorization hole: anyone who could reach this page could mint an account
 * that the rest of the product treats as a prescriber. Nothing in a sign-up
 * form establishes a medical registration.
 *
 * Clinician and hospital-admin accounts are now created by a hospital
 * administrator (`POST /hospital-admin/doctors`), which binds a mobile number
 * to a named, registration-numbered profile inside a specific hospital. OTP
 * login then proves control of that handset — and only that.
 *
 * Admin was already absent for the same class of reason and stays absent.
 */
const ROLE_OPTIONS: RoleOption[] = [
  {
    value: 'Patient',
    label: 'Patient',
    icon: HeartPulse,
    description: 'Book visits, track your health, and message your care team.',
  },
]

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  }),
}

interface PasswordStrength {
  score: number
  label: string
  color: string
}

/* ─── Dot-grid SVG background ─── */
/* ─── Password strength checker ─── */
const getPasswordStrength = (password: string): PasswordStrength => {
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  const map: Record<number, { label: string; color: string }> = {
    1: { label: 'Weak', color: 'var(--color-critical-fg)' },
    2: { label: 'Fair', color: 'var(--color-warning-fg)' },
    3: { label: 'Good', color: 'var(--color-primary-500)' },
    4: { label: 'Strong', color: 'var(--color-success-fg)' },
  }
  return { score, ...(map[score] ?? { label: '', color: '' }) }
}

interface RegisterForm {
  role: RoleName | ''
  firstName: string
  lastName: string
  email: string
  dateOfBirth: string
  phoneNumber: string
  password: string
  confirmPassword: string
  agreed: boolean
}

interface RegisterErrors {
  firstName?: string
  lastName?: string
  email?: string
  dateOfBirth?: string
  phoneNumber?: string
  password?: string
  confirmPassword?: string
  agreed?: string
  global?: string
}

export default function Register() {
  const navigate = useNavigate()
  const { register, loading, error: authError } = useAuth()
  const [step, setStep] = useState<'role' | 'form'>('role')
  const [form, setForm] = useState<RegisterForm>({
    role: '',
    firstName: '',
    lastName: '',
    email: '',
    dateOfBirth: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    agreed: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<RegisterErrors>({})
  const [successBanner, setSuccessBanner] = useState('')

  const selectedRole = ROLE_OPTIONS.find((r) => r.value === form.role)

  const chooseRole = (value: RoleName) => {
    setForm((prev) => ({ ...prev, role: value }))
    setStep('form')
  }

  const strength = getPasswordStrength(form.password)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    let formattedValue: string = value
    if (name === 'phoneNumber') {
      let raw = value.replace(/\D/g, '')
      if (raw.startsWith('91') && raw.length > 10) {
        raw = raw.slice(2)
      }
      raw = raw.slice(0, 10)
      if (raw.length > 5) {
        formattedValue = `${raw.slice(0, 5)} ${raw.slice(5)}`
      } else {
        formattedValue = raw
      }
    }
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : formattedValue,
    }))
    // Clear field error on change
    if (errors[name as keyof RegisterErrors]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const validate = (): RegisterErrors => {
    const newErrors: RegisterErrors = {}
    if (!form.firstName.trim()) newErrors.firstName = 'First name is required'
    if (!form.lastName.trim()) newErrors.lastName = 'Last name is required'
    if (!form.email.trim()) newErrors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Enter a valid email address'
    }
    if (!form.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required'
    if (!form.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Mobile number is required'
    } else {
      const rawDigits = form.phoneNumber.replace(/\D/g, '')
      if (rawDigits.length !== 10) {
        newErrors.phoneNumber = 'Enter a valid 10-digit mobile number'
      } else if (!/^[6-9]\d{9}$/.test(rawDigits)) {
        newErrors.phoneNumber = 'Indian mobile number must start with 6, 7, 8, or 9'
      }
    }
    if (!form.password) newErrors.password = 'Password is required'
    else if (form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    } else if (
      !/[A-Z]/.test(form.password) ||
      !/[a-z]/.test(form.password) ||
      !/\d/.test(form.password) ||
      !/[^A-Za-z0-9]/.test(form.password)
    ) {
      newErrors.password = 'Password must include uppercase, lowercase, number & special char (!@#$%^&*)'
    }
    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    if (!form.agreed) newErrors.agreed = 'You must accept the terms and conditions'
    return newErrors
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrors({})
    setSuccessBanner('')
    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    try {
      const result = await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        dateOfBirth: form.dateOfBirth,
        phoneNumber: form.phoneNumber,
        password: form.password,
        role: form.role as RoleName,
        agreed: form.agreed,
      })
      if (result.success) {
        // Registration signs the user in (the API returns a session), so
        // sending them to /login would ask them to authenticate again for no
        // reason — and RequireAnonymous would bounce them straight back.
        // A fresh registration always has onboarding to complete — sending
        // it straight to the onboarding flow avoids a pointless bounce
        // through the portal home, which RequireAuth would redirect away
        // from anyway (see guards.tsx's needsOnboarding check).
        setSuccessBanner("Account created. Let's finish setting up your profile…")
        window.scrollTo({ top: 0, behavior: 'smooth' })

        setTimeout(() => {
          navigate('/onboarding', { replace: true })
        }, 900)
        return
      }

      if (result.fieldErrors && !Array.isArray(result.fieldErrors)) {
        const mapped: Record<string, string> = {}
        Object.entries(result.fieldErrors).forEach(([field, messages]) => {
          mapped[field] = Array.isArray(messages) ? messages[0] : messages
        })
        setErrors(mapped)
      }
    } catch (err) {
      setErrors({ global: (err as ApiError).message || 'Registration failed. Please try again.' })
    }
  }

  if (step === 'role') {
    return (
      <AuthShell>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-[640px] bg-surface-1 rounded-lg shadow-2xl border border-surface-1/80 overflow-hidden"
          style={{ boxShadow: '0 6px 32px 0 rgba(26,46,59,0.08), 0 2px 6px 0 rgba(0,0,0,0.04)' }}
        >
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-600 via-accent-clay-fg to-accent-sage-fg" />

          <div className="px-6 py-8 sm:px-10 sm:py-10">
            <div className="flex items-center gap-2.5 mb-6">
              <BrandMark size={18} />
              <span className="text-lg font-bold tracking-tight text-ink">Stroke AI</span>
            </div>

            <h1 className="text-2xl md:text-[28px] font-bold tracking-tight text-ink">
              Which of these describes you?
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              We'll set up the right kind of account and onboarding for you.
            </p>

            <div role="radiogroup" aria-label="Account type" className="mt-6 space-y-3">
              {ROLE_OPTIONS.map((option, index) => {
                const Icon = option.icon
                return (
                  <motion.button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={form.role === option.value}
                    custom={index}
                    variants={fadeIn}
                    initial="initial"
                    animate="animate"
                    onClick={() => chooseRole(option.value)}
                    className="focus-ring group flex w-full items-center gap-4 rounded-lg border border-border-soft bg-surface-1 px-4 py-4 text-left transition-all duration-150 hover:border-primary-700/50 hover:bg-primary-50/40"
                  >
                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                      <Icon size={20} strokeWidth={2} />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-semibold text-ink">{option.label}</span>
                      <span className="mt-0.5 block text-xs text-ink-muted">{option.description}</span>
                    </span>
                    <ArrowRight
                      size={16}
                      strokeWidth={2}
                      className="text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-primary-700"
                    />
                  </motion.button>
                )
              })}
            </div>

            <p className="mt-6 text-center text-xs sm:text-sm text-ink-muted">
              Already have an account?{' '}
              <Link to="/login?as=patient" className="font-semibold hover:opacity-80 transition-opacity text-primary-700">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>

      {/* ── Main registration card — horizontal rectangle: identity left, form right ── */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[960px]
                   bg-surface-1 rounded-lg shadow-2xl border border-surface-1/80
                   overflow-hidden"
        style={{
          boxShadow:
            '0 6px 32px 0 rgba(26,46,59,0.08), 0 2px 6px 0 rgba(0,0,0,0.04)',
        }}
      >
        {/* Card top accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-0.5 rounded-t-lg z-10 bg-gradient-to-r from-primary-600 via-accent-clay-fg to-accent-sage-fg"
        />

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.3fr] md:max-h-[820px]">
          {/* ── LEFT: identity / heading ── */}
          <div className="px-6 py-8 sm:px-10 sm:py-10 md:py-12 md:border-r md:border-border-soft flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-8">
                <BrandMark size={18} />
                <span className="text-lg font-bold tracking-tight text-ink">
                  Stroke AI
                </span>
              </div>

              <button
                type="button"
                onClick={() => setStep('role')}
                className="focus-ring mb-5 inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-2xs font-medium text-primary-700 transition-colors hover:bg-primary-100"
              >
                <ArrowLeft size={11} strokeWidth={2.5} />
                {selectedRole?.label ?? 'Change account type'}
              </button>

              <h2 className="text-2xl md:text-[28px] font-bold tracking-tight text-ink">
                Create your account
              </h2>
              <p className="mt-2 text-sm text-ink-muted">
                {form.role === 'Doctor'
                  ? 'Set up your clinician profile'
                  : form.role === 'HospitalAdmin'
                    ? "Set up your hospital's account"
                    : 'Get started with your healthcare journey'}
              </p>
            </div>

            <div className="hidden md:flex items-center gap-2 text-xs text-ink-subtle mt-10">
              <Shield size={13} strokeWidth={2} />
              <span>Your data is encrypted and private</span>
            </div>
          </div>

          {/* ── RIGHT: form ── */}
          <div className="px-6 py-8 sm:px-10 sm:py-10 md:py-12 md:overflow-y-auto">
            {/* Confirmation success banner */}
            {successBanner && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-success-bg border border-success-fg/25 rounded-md px-4 py-3 text-xs sm:text-sm text-success-fg flex items-center gap-2.5 mb-5 shadow-sm font-medium"
                role="status"
              >
                <Check size={16} className="text-success-fg flex-shrink-0" strokeWidth={2.5} />
                <span>{successBanner}</span>
              </motion.div>
            )}

            {/* API-level error banner */}
            {(authError?.message || errors.global) && !successBanner && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-critical-bg border border-critical-fg/25 rounded-md px-4 py-3 text-xs sm:text-sm text-critical-fg mb-5 font-medium"
                role="alert"
              >
                {authError?.message || errors.global}
              </motion.div>
            )}

            {/* Form - Added generous spacing above first field */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-4.5 pt-3 sm:pt-4" noValidate>
              {/* Name row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-4.5">
                <InputField
                  index={0}
                  label="First name"
                  icon={User}
                  type="text"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  placeholder="Anand"
                  autoComplete="given-name"
                  error={errors.firstName}
                />

                <InputField
                  index={1}
                  label="Last name"
                  icon={User}
                  type="text"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  placeholder="Krishnamurthy"
                  autoComplete="family-name"
                  error={errors.lastName}
                />
              </div>

              {/* Email + DOB row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-4.5">
                <InputField
                  index={2}
                  label="Email address"
                  icon={Mail}
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                  error={errors.email}
                />

                <InputField
                  index={3}
                  label="Date of birth"
                  icon={Calendar}
                  type="date"
                  name="dateOfBirth"
                  value={form.dateOfBirth}
                  onChange={handleChange}
                  autoComplete="bday"
                  error={errors.dateOfBirth}
                />
              </div>

              {/* Mobile Number */}
              <motion.div custom={4} variants={fadeIn} initial="initial" animate="animate">
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="register-phoneNumber"
                    className="text-xs sm:text-sm font-medium text-ink-muted"
                  >
                    Mobile number
                  </label>
                  <span className="text-2xs font-medium px-2 py-0.5 rounded-full border text-primary-700 bg-primary-50 border-primary-200">
                    India (+91)
                  </span>
                </div>
                <div className="relative group">
                  <Phone
                    size={16}
                    strokeWidth={2}
                    className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle
                               transition-colors group-focus-within:text-primary-700 pointer-events-none z-10"
                  />
                  <div className="absolute left-9 sm:left-10 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none z-10 text-xs sm:text-sm font-semibold text-ink-muted">
                    <span>🇮🇳</span>
                    <span>+91</span>
                    <span className="text-ink-subtle font-normal">|</span>
                  </div>
                  <input
                    id="register-phoneNumber"
                    type="tel"
                    name="phoneNumber"
                    value={form.phoneNumber}
                    onChange={handleChange}
                    placeholder="98765 43210"
                    inputMode="numeric"
                    maxLength={11}
                    autoComplete="tel-national"
                    aria-invalid={errors.phoneNumber ? 'true' : undefined}
                    aria-describedby="register-phoneNumber-hint"
                    className={`w-full border bg-surface-1 rounded-lg pl-24 sm:pl-28 pr-4 py-2 sm:py-2.5
                               text-sm text-ink placeholder:text-ink-subtle
                               focus:outline-none focus:ring-2 focus:border-transparent
                               focus:bg-surface-1 transition-all duration-200 hover:border-border
                               ${errors.phoneNumber
                        ? 'border-critical-fg/40 focus:ring-critical-fg/40'
                        : 'border-border-soft focus:ring-primary-700/35'
                      }`}
                  />
                </div>
                {errors.phoneNumber ? (
                  <p id="register-phoneNumber-hint" role="alert" className="mt-1 text-xs text-critical-fg">
                    {errors.phoneNumber}
                  </p>
                ) : (
                  <p id="register-phoneNumber-hint" className="mt-1 text-xs text-ink-subtle">
                    Enter your 10-digit Indian mobile number
                  </p>
                )}
              </motion.div>

              {/* Password + Confirm password row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-4.5">
              <motion.div custom={5} variants={fadeIn} initial="initial" animate="animate">
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="register-password" className="text-xs sm:text-sm font-medium text-ink-muted">Password</label>
                </div>
                <div className="relative group">
                  <Lock
                    size={16}
                    strokeWidth={2}
                    className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle
                               transition-colors group-focus-within:text-primary-700 pointer-events-none"
                  />
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    aria-invalid={errors.password ? 'true' : undefined}
                    aria-describedby={errors.password ? 'register-password-error' : undefined}
                    className={`w-full border bg-surface-1 rounded-lg pl-9 sm:pl-10 pr-10 py-2 sm:py-2.5
                               text-sm text-ink placeholder:text-ink-subtle
                               focus:outline-none focus:ring-2 focus:border-transparent
                               focus:bg-surface-1 transition-all duration-200 hover:border-border
                               ${errors.password
                        ? 'border-critical-fg/40 focus:ring-critical-fg/40'
                        : 'border-border-soft focus:ring-primary-700/35'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink-muted transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff size={16} strokeWidth={2} />
                    ) : (
                      <Eye size={16} strokeWidth={2} />
                    )}
                  </button>
                </div>

                {/* Strength bar */}
                {form.password && (
                  <div className="mt-1.5 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className="flex-1 h-1 rounded-full transition-all duration-300"
                          style={{
                            backgroundColor:
                              strength.score >= level ? strength.color : 'var(--color-surface-3)',
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-xs font-medium" style={{ color: strength.color }}>
                      {strength.label} password
                    </p>
                  </div>
                )}
                {errors.password && (
                  <p id="register-password-error" role="alert" className="mt-1 text-xs text-critical-fg">{errors.password}</p>
                )}
              </motion.div>

              {/* Confirm Password */}
              <motion.div custom={6} variants={fadeIn} initial="initial" animate="animate">
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="register-confirmPassword" className="text-xs sm:text-sm font-medium text-ink-muted">
                    Confirm password
                  </label>
                </div>
                <div className="relative group">
                  <Lock
                    size={16}
                    strokeWidth={2}
                    className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle
                               transition-colors group-focus-within:text-primary-700 pointer-events-none"
                  />
                  <input
                    id="register-confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    aria-invalid={errors.confirmPassword ? 'true' : undefined}
                    aria-describedby={errors.confirmPassword ? 'register-confirmPassword-error' : undefined}
                    className={`w-full border bg-surface-1 rounded-lg pl-9 sm:pl-10 pr-10 py-2 sm:py-2.5
                               text-sm text-ink placeholder:text-ink-subtle
                               focus:outline-none focus:ring-2 focus:border-transparent
                               focus:bg-surface-1 transition-all duration-200 hover:border-border
                               ${errors.confirmPassword
                        ? 'border-critical-fg/40 focus:ring-critical-fg/40'
                        : 'border-border-soft focus:ring-primary-700/35'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink-muted transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={16} strokeWidth={2} />
                    ) : (
                      <Eye size={16} strokeWidth={2} />
                    )}
                  </button>
                  {/* Match indicator */}
                  {form.confirmPassword &&
                    form.password === form.confirmPassword &&
                    !errors.confirmPassword && (
                      <div className="absolute right-11 top-1/2 -translate-y-1/2">
                        <Check size={16} className="text-success-fg" strokeWidth={2.5} />
                      </div>
                    )}
                </div>
                {errors.confirmPassword && (
                  <p id="register-confirmPassword-error" role="alert" className="mt-1 text-xs text-critical-fg">{errors.confirmPassword}</p>
                )}
              </motion.div>
              </div>

              {/* Terms checkbox */}
              <motion.div
                custom={7}
                variants={fadeIn}
                initial="initial"
                animate="animate"
                className="space-y-1 pt-1"
              >
                <label className="flex items-start gap-2.5 cursor-pointer group">
                  <div className="relative mt-0.5">
                    <input
                      type="checkbox"
                      name="agreed"
                      checked={form.agreed}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div
                      className={`w-4.5 h-4.5 rounded flex items-center justify-center border-2 transition-all duration-200
                                  ${form.agreed ? '' : 'bg-surface-1 border-border group-hover:border-primary-700'}`}
                      style={
                        form.agreed
                          ? { background: 'var(--color-primary-600)', borderColor: 'var(--color-primary-600)' }
                          : undefined
                      }
                    >
                      {form.agreed && (
                        <Check size={11} className="text-on-primary" strokeWidth={3} />
                      )}
                    </div>
                  </div>
                  <span className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                    I agree to the{' '}
                    <Link
                      to="/terms"
                      className="font-medium hover:underline transition-colors text-primary-700"
                    >
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link
                      to="/privacy"
                      className="font-medium hover:underline transition-colors text-primary-700"
                    >
                      Privacy Policy
                    </Link>
                  </span>
                </label>
                {errors.agreed && (
                  <p className="text-xs text-critical-fg pl-7">{errors.agreed}</p>
                )}
              </motion.div>

              {/* Submit */}
              <motion.button
                custom={8}
                variants={fadeIn}
                initial="initial"
                animate="animate"
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.01 }}
                whileTap={{ scale: loading ? 1 : 0.99 }}
                className="group relative w-full text-on-primary px-4 py-2.5 sm:py-2.5 lg:py-3 text-sm font-semibold rounded-full
                           transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed
                           flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:opacity-90 mt-1"
                style={{ background: loading ? 'var(--color-ink-subtle)' : 'var(--color-primary-600)' }}
              >
                {loading ? (
                  <Spinner />
                ) : (
                  <>
                    Create account
                    <ArrowRight
                      size={16}
                      strokeWidth={2.5}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </>
                )}
              </motion.button>
            </form>

            {/* Login link */}
            <motion.p
              custom={9}
              variants={fadeIn}
              initial="initial"
              animate="animate"
              className="mt-4 lg:mt-5 text-center text-xs sm:text-sm text-ink-muted"
            >
              Already have an account?{' '}
              <Link
                to="/login?as=patient"
                className="font-semibold hover:opacity-80 transition-opacity text-primary-700"
              >
                Sign in
              </Link>
            </motion.p>

            {/* Footer info — mobile only; desktop shows it in the left column */}
            <div className="md:hidden mt-4 pt-4 border-t border-border-soft">
              <div className="flex items-center justify-center gap-2 text-xs text-ink-subtle">
                <Shield size={13} strokeWidth={2} />
                <span>Your data is encrypted and private</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AuthShell>
  )
}

/* ─── InputField Component ───
 * Bug fix: the <label> had no `htmlFor`/the <input> no `id` (no programmatic
 * name association), and a validation error rendered as a plain, unlinked
 * <p> — the input had no `aria-invalid`/`aria-describedby` and the error
 * text no `role="alert"`. A screen-reader user got no indication a field
 * was invalid, or why, after a failed submit. Fixed by deriving a stable id
 * from `name` (every caller already passes one) and wiring the three
 * attributes through. */
interface RegisterInputFieldProps {
  index: number
  label: string
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  action?: ReactNode
  rightElement?: ReactNode
  error?: string
  name: string
  type: string
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  autoComplete?: string
}

function InputField({
  index,
  label,
  icon: Icon,
  action,
  rightElement,
  error,
  ...inputProps
}: RegisterInputFieldProps) {
  const inputId = `register-${inputProps.name}`
  const errorId = `${inputId}-error`
  return (
    <motion.div custom={index} variants={fadeIn} initial="initial" animate="animate">
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={inputId} className="text-xs sm:text-sm font-medium text-ink-muted">
          {label}
        </label>
        {action}
      </div>
      <div className="relative group">
        <Icon
          size={16}
          strokeWidth={2}
          className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle
                     transition-colors group-focus-within:text-primary-700 pointer-events-none"
        />
        <input
          id={inputId}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          {...inputProps}
          className={`w-full border bg-surface-1 rounded-lg pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5
                     text-sm text-ink placeholder:text-ink-subtle
                     focus:outline-none focus:ring-2 focus:border-transparent
                     focus:bg-surface-1 transition-all duration-200 hover:border-border
                     ${error
              ? 'border-critical-fg/40 focus:ring-critical-fg/40'
              : 'border-border-soft focus:ring-primary-700/35'
            }`}
        />
        {rightElement}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-critical-fg">
          {error}
        </p>
      )}
    </motion.div>
  )
}

/* ─── Spinner Component ─── */
function Spinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Loading"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}
