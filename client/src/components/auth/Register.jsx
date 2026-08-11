import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Calendar,
  Phone,
  Check,
  Shield
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: (index) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  }),
}

/* ─── Dot-grid SVG background ─── */
function DotGrid() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="dots"
          x="0"
          y="0"
          width="24"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1.5" cy="1.5" r="1.2" fill="#b0bec5" fillOpacity="0.4" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dots)" />
    </svg>
  )
}

/* ─── Password strength checker ─── */
const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  const map = {
    1: { label: 'Weak', color: '#DC2626' },
    2: { label: 'Fair', color: '#F59E0B' },
    3: { label: 'Good', color: '#3B82F6' },
    4: { label: 'Strong', color: '#16A34A' },
  }
  return { score, ...map[score] }
}

export default function Register() {
  const navigate = useNavigate()
  const { register, loading, error: authError } = useAuth()
  const [form, setForm] = useState({
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
  const [errors, setErrors] = useState({})
  const [successBanner, setSuccessBanner] = useState('')

  const strength = getPasswordStrength(form.password)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    let formattedValue = value
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
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const validate = () => {
    const newErrors = {}
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

  const handleSubmit = async (e) => {
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
      const result = await register(form)
      if (result && result.success) {
        setSuccessBanner('Account created successfully! Redirecting to sign in page...')
        window.scrollTo({ top: 0, behavior: 'smooth' })

        setTimeout(() => {
          navigate('/login', {
            replace: true,
            state: { message: 'Account created successfully! Please sign in with your credentials.' },
          })
        }, 1500)
        return
      }

      if (result && result.fieldErrors) {
        const mapped = {}
        Object.entries(result.fieldErrors).forEach(([field, messages]) => {
          mapped[field] = Array.isArray(messages) ? messages[0] : messages
        })
        setErrors(mapped)
      }
    } catch (err) {
      setErrors({ global: err.message || 'Registration failed. Please try again.' })
    }
  }

  return (
    <main
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden font-sans p-3 sm:p-4 lg:p-6"
      style={{ background: '#f0f4f8' }}
    >
      {/* ── Dot-grid background ── */}
      <DotGrid />

      {/* ── Gradient blobs ── */}
      <motion.div
        className="absolute rounded-full blur-3xl opacity-40 pointer-events-none
                   w-64 h-64 sm:w-80 sm:h-80 lg:w-[420px] lg:h-[420px]
                   -top-20 -left-20"
        style={{
          background: 'radial-gradient(circle, #a78bfa 0%, #818cf8 40%, #6366f1 100%)',
        }}
        animate={{ scale: [1, 1.08, 1], x: [0, 10, 0], y: [0, -6, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="absolute rounded-full blur-3xl opacity-35 pointer-events-none
                   w-52 h-52 sm:w-64 sm:h-64 lg:w-[340px] lg:h-[340px]
                   -bottom-14 -right-14"
        style={{
          background: 'radial-gradient(circle, #2dd4bf 0%, #38bdf8 50%, #6366f1 100%)',
        }}
        animate={{ scale: [1, 1.12, 1], x: [0, -12, 0], y: [0, 8, 0] }}
        transition={{ duration: 10, delay: 1, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="absolute rounded-full blur-3xl opacity-25 pointer-events-none
                   w-36 h-36 sm:w-48 sm:h-48 lg:w-64 lg:h-64
                   top-1/2 -right-8"
        style={{
          background: 'radial-gradient(circle, #f9a8d4 0%, #fbcfe8 100%)',
        }}
        animate={{ scale: [1, 1.06, 1], y: [0, -10, 0] }}
        transition={{ duration: 7, delay: 2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ── Main registration card (two-column layout) ── */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[1100px]
                   bg-white rounded-lg shadow-2xl border border-white/80
                   overflow-hidden"
        style={{
          boxShadow:
            '0 6px 32px 0 rgba(99,102,241,0.08), 0 2px 6px 0 rgba(0,0,0,0.04)',
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* ── LEFT SECTION (Info Panel) - Hidden on mobile ── */}
          <div
            className="hidden lg:flex relative px-10 py-12 xl:px-12 xl:py-14
                        flex-col justify-between overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%)',
            }}
          >
            <div className="relative z-10">
              {/* Brand */}
              <div className="flex items-center gap-3 mb-10">
                <div className="w-11 h-11 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0 bg-white">
                  <img
                    src="/oncotraceai.webp"
                    alt="CareFlow"
                    className="h-7 w-7 object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                </div>
                <span className="text-xl font-bold tracking-tight text-white">
                  CareFlow
                </span>
              </div>

              {/* Main content */}
              <div className="space-y-5">
                <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
                  Join CareFlow Today
                </h1>
                <p className="text-base text-indigo-100 leading-relaxed">
                  Create your account to access advanced healthcare management, AI-powered insights, and comprehensive patient care tools.
                </p>

                {/* Benefits list */}
                <div className="space-y-3 pt-4">
                  {[
                    'Secure patient records management',
                    'AI-powered health analytics',
                    'Real-time care coordination',
                    'HIPAA compliant platform',
                  ].map((benefit, i) => (
                    <motion.div
                      key={benefit}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.1, duration: 0.4 }}
                      className="flex items-center gap-2.5"
                    >
                      <div className="w-5 h-5 rounded-full bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
                        <Check size={12} className="text-white" strokeWidth={3} />
                      </div>
                      <p className="text-indigo-100 text-sm">{benefit}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT SECTION (Registration Form) ── */}
          <div className="px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12 xl:px-14 xl:py-14 flex flex-col justify-center overflow-y-auto max-h-[92vh] lg:max-h-[780px]">
            {/* Mobile logo - only visible on mobile */}
            <div className="lg:hidden flex items-center justify-center mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shadow-md flex-shrink-0 bg-gradient-to-br from-indigo-500 to-indigo-600">
                  <img
                    src="/oncotraceai.webp"
                    alt="CareFlow"
                    className="h-6 w-6 object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                </div>
                <span className="text-lg font-bold tracking-tight text-gray-900">
                  CareFlow
                </span>
              </div>
            </div>

            {/* Heading */}
            <div className="mb-6 sm:mb-7">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-gray-900">
                Create your account
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-gray-600">
                Get started with your healthcare journey
              </p>
            </div>

            {/* Confirmation success banner */}
            {successBanner && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50 border border-emerald-200 rounded-md px-4 py-3 text-xs sm:text-sm text-emerald-800 flex items-center gap-2.5 mb-5 shadow-sm font-medium"
                role="status"
              >
                <Check size={16} className="text-emerald-600 flex-shrink-0" strokeWidth={2.5} />
                <span>{successBanner}</span>
              </motion.div>
            )}

            {/* API-level error banner */}
            {(authError?.message || errors.global) && !successBanner && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-50 border border-red-200 rounded-md px-4 py-3 text-xs sm:text-sm text-red-700 mb-5 font-medium"
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

              {/* Email */}
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

              {/* DOB */}
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

              {/* Mobile Number */}
              <motion.div custom={4} variants={fadeIn} initial="initial" animate="animate">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">
                    Mobile number
                  </label>
                  <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    India (+91)
                  </span>
                </div>
                <div className="relative group">
                  <Phone
                    size={16}
                    strokeWidth={2}
                    className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-gray-400
                               transition-colors group-focus-within:text-indigo-500 pointer-events-none z-10"
                  />
                  <div className="absolute left-9 sm:left-10 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none z-10 text-xs sm:text-sm font-semibold text-gray-700">
                    <span>🇮🇳</span>
                    <span>+91</span>
                    <span className="text-gray-300 font-normal">|</span>
                  </div>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={form.phoneNumber}
                    onChange={handleChange}
                    placeholder="98765 43210"
                    inputMode="numeric"
                    maxLength={11}
                    autoComplete="tel-national"
                    className={`w-full border bg-white rounded-lg pl-24 sm:pl-28 pr-4 py-2 sm:py-2.5
                               text-sm text-gray-900 placeholder:text-gray-400
                               focus:outline-none focus:ring-2 focus:border-transparent
                               focus:bg-white transition-all duration-200 hover:border-gray-300
                               ${errors.phoneNumber
                        ? 'border-red-300 focus:ring-red-400'
                        : 'border-gray-200 focus:ring-indigo-400'
                      }`}
                  />
                </div>
                {errors.phoneNumber ? (
                  <p className="mt-1 text-xs text-red-600">{errors.phoneNumber}</p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">
                    Enter your 10-digit Indian mobile number
                  </p>
                )}
              </motion.div>

              {/* Password */}
              <motion.div custom={5} variants={fadeIn} initial="initial" animate="animate">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Password</label>
                </div>
                <div className="relative group">
                  <Lock
                    size={16}
                    strokeWidth={2}
                    className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-gray-400
                               transition-colors group-focus-within:text-indigo-500 pointer-events-none"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    className={`w-full border bg-white rounded-lg pl-9 sm:pl-10 pr-10 py-2 sm:py-2.5
                               text-sm text-gray-900 placeholder:text-gray-400
                               focus:outline-none focus:ring-2 focus:border-transparent
                               focus:bg-white transition-all duration-200 hover:border-gray-300
                               ${errors.password
                        ? 'border-red-300 focus:ring-red-400'
                        : 'border-gray-200 focus:ring-indigo-400'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
                              strength.score >= level ? strength.color : '#E5E7EB',
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
                  <p className="mt-1 text-xs text-red-600">{errors.password}</p>
                )}
              </motion.div>

              {/* Confirm Password */}
              <motion.div custom={6} variants={fadeIn} initial="initial" animate="animate">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">
                    Confirm password
                  </label>
                </div>
                <div className="relative group">
                  <Lock
                    size={16}
                    strokeWidth={2}
                    className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-gray-400
                               transition-colors group-focus-within:text-indigo-500 pointer-events-none"
                  />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    className={`w-full border bg-white rounded-lg pl-9 sm:pl-10 pr-10 py-2 sm:py-2.5
                               text-sm text-gray-900 placeholder:text-gray-400
                               focus:outline-none focus:ring-2 focus:border-transparent
                               focus:bg-white transition-all duration-200 hover:border-gray-300
                               ${errors.confirmPassword
                        ? 'border-red-300 focus:ring-red-400'
                        : 'border-gray-200 focus:ring-indigo-400'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
                        <Check size={16} className="text-green-600" strokeWidth={2.5} />
                      </div>
                    )}
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>
                )}
              </motion.div>

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
                      className={`w-4.5 h-4.5 rounded flex items-center justify-center
                                  border-2 transition-all duration-200
                                  ${form.agreed
                          ? 'bg-indigo-600 border-indigo-600'
                          : 'bg-white border-gray-300 group-hover:border-indigo-400'
                        }`}
                    >
                      {form.agreed && (
                        <Check size={11} className="text-white" strokeWidth={3} />
                      )}
                    </div>
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                    I agree to the{' '}
                    <Link
                      to="/terms"
                      className="text-indigo-600 font-medium hover:text-indigo-700 hover:underline transition-colors"
                    >
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link
                      to="/privacy"
                      className="text-indigo-600 font-medium hover:text-indigo-700 hover:underline transition-colors"
                    >
                      Privacy Policy
                    </Link>
                  </span>
                </label>
                {errors.agreed && (
                  <p className="text-xs text-red-600 pl-7">{errors.agreed}</p>
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
                className="group relative w-full text-white px-4 py-2.5 sm:py-2.5 lg:py-3 text-sm font-semibold rounded-lg
                           transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed
                           flex items-center justify-center gap-2 shadow-md hover:shadow-lg mt-1"
                style={{
                  background: loading
                    ? '#818cf8'
                    : 'linear-gradient(90deg, #6366f1 0%, #4f46e5 100%)',
                }}
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
              className="mt-4 lg:mt-5 text-center text-xs sm:text-sm text-gray-600"
            >
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                Sign in
              </Link>
            </motion.p>

            {/* Mobile footer info */}
            <div className="lg:hidden mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <Shield size={13} strokeWidth={2} />
                <span>HIPAA-compliant and secure</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </main>
  )
}

/* ─── InputField Component ─── */
function InputField({
  index,
  label,
  icon: Icon,
  action,
  rightElement,
  error,
  ...inputProps
}) {
  return (
    <motion.div custom={index} variants={fadeIn} initial="initial" animate="animate">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs sm:text-sm font-medium text-gray-700">{label}</label>
        {action}
      </div>
      <div className="relative group">
        <Icon
          size={16}
          strokeWidth={2}
          className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-gray-400
                     transition-colors group-focus-within:text-indigo-500 pointer-events-none"
        />
        <input
          {...inputProps}
          className={`w-full border bg-white rounded-lg pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5
                     text-sm text-gray-900 placeholder:text-gray-400
                     focus:outline-none focus:ring-2 focus:border-transparent
                     focus:bg-white transition-all duration-200 hover:border-gray-300
                     ${error
              ? 'border-red-300 focus:ring-red-400'
              : 'border-gray-200 focus:ring-indigo-400'
            }`}
        />
        {rightElement}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
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