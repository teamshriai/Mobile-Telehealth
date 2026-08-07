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
  CreditCard,
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
          <circle cx="1.5" cy="1.5" r="1.2" fill="#b0bec5" fillOpacity="0.55" />
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
    aadhaar: '',
    password: '',
    confirmPassword: '',
    agreed: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState({})

  const strength = getPasswordStrength(form.password)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    const formattedValue =
      name === 'aadhaar'
        ? value
            .replace(/\D/g, '')
            .slice(0, 12)
            .replace(/(\d{4})(?=\d)/g, '$1 ')
            .trim()
        : value
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
    if (!form.aadhaar) newErrors.aadhaar = 'Aadhaar number is required'
    else if (form.aadhaar.replace(/\s/g, '').length !== 12) {
      newErrors.aadhaar = 'Enter a valid 12-digit Aadhaar number'
    }
    if (!form.password) newErrors.password = 'Password is required'
    else if (form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }
    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    if (!form.agreed) newErrors.agreed = 'You must accept the terms and conditions'
    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const result = await register(form)
    if (result.success) {
      navigate('/', { replace: true })
      return
    }

    // Map backend field errors
    if (result.fieldErrors) {
      const mapped = {}
      Object.entries(result.fieldErrors).forEach(([field, messages]) => {
        mapped[field] = Array.isArray(messages) ? messages[0] : messages
      })
      setErrors((prev) => ({ ...prev, ...mapped }))
    }
  }

  return (
    <main
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden font-sans p-4"
      style={{ background: '#f0f4f8' }}
    >
      {/* ── Dot-grid background ── */}
      <DotGrid />

      {/* ── Gradient blobs ── */}
      <motion.div
        className="absolute rounded-full blur-3xl opacity-50 pointer-events-none
                   w-72 h-72 sm:w-96 sm:h-96 lg:w-[460px] lg:h-[460px]
                   -top-24 -left-24"
        style={{
          background: 'radial-gradient(circle, #a78bfa 0%, #818cf8 40%, #6366f1 100%)',
        }}
        animate={{ scale: [1, 1.1, 1], x: [0, 12, 0], y: [0, -8, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="absolute rounded-full blur-3xl opacity-45 pointer-events-none
                   w-56 h-56 sm:w-72 sm:h-72 lg:w-[380px] lg:h-[380px]
                   -bottom-16 -right-16"
        style={{
          background: 'radial-gradient(circle, #2dd4bf 0%, #38bdf8 50%, #6366f1 100%)',
        }}
        animate={{ scale: [1, 1.15, 1], x: [0, -14, 0], y: [0, 10, 0] }}
        transition={{ duration: 10, delay: 1, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="absolute rounded-full blur-3xl opacity-30 pointer-events-none
                   w-40 h-40 sm:w-56 sm:h-56 lg:w-72 lg:h-72
                   top-1/2 -right-10"
        style={{
          background: 'radial-gradient(circle, #f9a8d4 0%, #fbcfe8 100%)',
        }}
        animate={{ scale: [1, 1.08, 1], y: [0, -12, 0] }}
        transition={{ duration: 7, delay: 2, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="absolute rounded-full blur-3xl opacity-25 pointer-events-none
                   w-36 h-36 sm:w-48 sm:h-48
                   bottom-10 left-10"
        style={{
          background: 'radial-gradient(circle, #86efac 0%, #34d399 100%)',
        }}
        animate={{ scale: [1, 1.12, 1], x: [0, 10, 0] }}
        transition={{ duration: 8, delay: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ── Main registration card (two-column layout) ── */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[1200px]
                   bg-white rounded-2xl shadow-2xl border border-white/80
                   overflow-hidden"
        style={{
          boxShadow:
            '0 8px 40px 0 rgba(99,102,241,0.10), 0 2px 8px 0 rgba(0,0,0,0.06)',
        }}
      >
        {/* Card top accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl z-20"
          style={{
            background: 'linear-gradient(90deg, #6366f1 0%, #38bdf8 50%, #2dd4bf 100%)',
          }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[700px]">
          {/* ── LEFT SECTION (Info Panel) ── */}
          <div
            className="relative px-8 py-10 sm:px-12 sm:py-14 lg:px-14 lg:py-16 
                        flex flex-col justify-between overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%)',
            }}
          >
            {/* Decorative overlay pattern */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />

            <div className="relative z-10">
              {/* Brand */}
              <div className="flex items-center gap-3 mb-12">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 bg-white">
                  <img
                    src="/oncotraceai.webp"
                    alt="CareFlow"
                    className="h-8 w-8 object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                </div>
                <span className="text-2xl font-bold tracking-tight text-white">
                  CareFlow
                </span>
              </div>

              {/* Main content */}
              <div className="space-y-6">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
                  Join CareFlow Today
                </h1>
                <p className="text-lg text-indigo-100 leading-relaxed">
                  Create your account to access advanced healthcare management, AI-powered insights, and comprehensive patient care tools.
                </p>

                {/* Benefits list */}
                <div className="space-y-4 pt-4">
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
                      className="flex items-center gap-3"
                    >
                      <div className="w-6 h-6 rounded-full bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
                        <Check size={14} className="text-white" strokeWidth={3} />
                      </div>
                      <p className="text-indigo-100 text-sm">{benefit}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="relative z-10">
              <p className="text-indigo-200 text-xs">
                Trusted by over 10,000+ healthcare professionals worldwide
              </p>
            </div>
          </div>

          {/* ── RIGHT SECTION (Registration Form) ── */}
          <div className="px-8 py-10 sm:px-12 sm:py-14 lg:px-14 lg:py-16 flex flex-col justify-center overflow-y-auto max-h-[700px]">
            {/* Heading */}
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 leading-tight">
                Create your account
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Get started with your healthcare journey
              </p>
            </div>

            {/* API-level error banner */}
            {authError?.message && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 mb-5"
                role="alert"
              >
                {authError.message}
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Name row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              {/* Aadhaar */}
              <motion.div custom={4} variants={fadeIn} initial="initial" animate="animate">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-800">
                    Aadhaar number
                  </label>
                </div>
                <div className="relative group">
                  <CreditCard
                    size={17}
                    strokeWidth={2}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400
                               transition-colors group-focus-within:text-indigo-500 pointer-events-none"
                  />
                  <input
                    type="text"
                    name="aadhaar"
                    value={form.aadhaar}
                    onChange={handleChange}
                    placeholder="1234 5678 9012"
                    inputMode="numeric"
                    autoComplete="off"
                    className={`w-full border bg-gray-50 rounded-xl pl-11 pr-4 py-3
                               text-sm text-gray-900 placeholder:text-gray-400
                               focus:outline-none focus:ring-2 focus:border-transparent
                               focus:bg-white transition-all duration-200
                               ${
                                 errors.aadhaar
                                   ? 'border-red-300 focus:ring-red-400'
                                   : 'border-gray-200 focus:ring-indigo-400'
                               }`}
                  />
                </div>
                {errors.aadhaar ? (
                  <p className="mt-1.5 text-xs text-red-600">{errors.aadhaar}</p>
                ) : (
                  <p className="mt-1.5 text-xs text-gray-500">
                    Required for identity verification. Not stored in browser.
                  </p>
                )}
              </motion.div>

              {/* Password */}
              <motion.div custom={5} variants={fadeIn} initial="initial" animate="animate">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-800">Password</label>
                </div>
                <div className="relative group">
                  <Lock
                    size={17}
                    strokeWidth={2}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400
                               transition-colors group-focus-within:text-indigo-500 pointer-events-none"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    className={`w-full border bg-gray-50 rounded-xl pl-11 pr-11 py-3
                               text-sm text-gray-900 placeholder:text-gray-400
                               focus:outline-none focus:ring-2 focus:border-transparent
                               focus:bg-white transition-all duration-200
                               ${
                                 errors.password
                                   ? 'border-red-300 focus:ring-red-400'
                                   : 'border-gray-200 focus:ring-indigo-400'
                               }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff size={17} strokeWidth={2} />
                    ) : (
                      <Eye size={17} strokeWidth={2} />
                    )}
                  </button>
                </div>

                {/* Strength bar */}
                {form.password && (
                  <div className="mt-2 space-y-1.5">
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
                  <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>
                )}
              </motion.div>

              {/* Confirm Password */}
              <motion.div custom={6} variants={fadeIn} initial="initial" animate="animate">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-800">
                    Confirm password
                  </label>
                </div>
                <div className="relative group">
                  <Lock
                    size={17}
                    strokeWidth={2}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400
                               transition-colors group-focus-within:text-indigo-500 pointer-events-none"
                  />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    className={`w-full border bg-gray-50 rounded-xl pl-11 pr-11 py-3
                               text-sm text-gray-900 placeholder:text-gray-400
                               focus:outline-none focus:ring-2 focus:border-transparent
                               focus:bg-white transition-all duration-200
                               ${
                                 errors.confirmPassword
                                   ? 'border-red-300 focus:ring-red-400'
                                   : 'border-gray-200 focus:ring-indigo-400'
                               }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={17} strokeWidth={2} />
                    ) : (
                      <Eye size={17} strokeWidth={2} />
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
                  <p className="mt-1.5 text-xs text-red-600">{errors.confirmPassword}</p>
                )}
              </motion.div>

              {/* Terms checkbox */}
              <motion.div
                custom={7}
                variants={fadeIn}
                initial="initial"
                animate="animate"
                className="space-y-1"
              >
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5">
                    <input
                      type="checkbox"
                      name="agreed"
                      checked={form.agreed}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center
                                  border-2 transition-all duration-200
                                  ${
                                    form.agreed
                                      ? 'bg-indigo-600 border-indigo-600'
                                      : 'bg-white border-gray-300 group-hover:border-indigo-400'
                                  }`}
                    >
                      {form.agreed && (
                        <Check size={12} className="text-white" strokeWidth={3} />
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-600 leading-relaxed">
                    I agree to the{' '}
                    <Link
                      to="/terms"
                      className="text-indigo-600 font-medium hover:text-indigo-800 hover:underline transition-colors"
                    >
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link
                      to="/privacy"
                      className="text-indigo-600 font-medium hover:text-indigo-800 hover:underline transition-colors"
                    >
                      Privacy Policy
                    </Link>
                  </span>
                </label>
                {errors.agreed && (
                  <p className="text-xs text-red-600 pl-8">{errors.agreed}</p>
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
                whileHover={{ scale: loading ? 1 : 1.015 }}
                whileTap={{ scale: loading ? 1 : 0.985 }}
                className="group relative w-full text-white px-4 py-3.5 text-sm font-semibold rounded-xl
                           transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed
                           flex items-center justify-center gap-2 shadow-md"
                style={{
                  background: loading
                    ? '#818cf8'
                    : 'linear-gradient(90deg, #6366f1 0%, #38bdf8 100%)',
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
                      className="transition-transform group-hover:translate-x-1"
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
              className="mt-6 text-center text-sm text-gray-500"
            >
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Sign in
              </Link>
            </motion.p>
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
        <label className="text-sm font-medium text-gray-800">{label}</label>
        {action}
      </div>
      <div className="relative group">
        <Icon
          size={17}
          strokeWidth={2}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400
                     transition-colors group-focus-within:text-indigo-500 pointer-events-none"
        />
        <input
          {...inputProps}
          className={`w-full border bg-gray-50 rounded-xl pl-11 pr-4 py-3
                     text-sm text-gray-900 placeholder:text-gray-400
                     focus:outline-none focus:ring-2 focus:border-transparent
                     focus:bg-white transition-all duration-200
                     ${
                       error
                         ? 'border-red-300 focus:ring-red-400'
                         : 'border-gray-200 focus:ring-indigo-400'
                     }`}
        />
        {rightElement}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
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