import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, ArrowRight, Check } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const containerVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
}

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
}

// Password strength checker
const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  const map = {
    1: { label: 'Weak',    color: '#DC2626' },
    2: { label: 'Fair',    color: '#F59E0B' },
    3: { label: 'Good',    color: '#3B82F6' },
    4: { label: 'Strong',  color: '#16A34A' },
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
  const [errors, setErrors] = useState({})

  const strength = getPasswordStrength(form.password)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    const formattedValue = name === 'aadhaar'
      ? value.replace(/\D/g, '').slice(0, 12).replace(/(\d{4})(?=\d)/g, '$1 ').trim()
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
    if (!form.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required'
    if (!form.aadhaar) newErrors.aadhaar = 'Aadhaar number is required'
    if (form.aadhaar.replace(/\s/g, '').length !== 12) newErrors.aadhaar = 'Enter your 12-digit Aadhaar number'
    if (!form.password) newErrors.password = 'Password is required'
    if (form.password.length < 8) newErrors.password = 'Password must be at least 8 characters'
    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    if (!form.agreed) newErrors.agreed = 'You must accept the terms'
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

    // Attempt to map backend field errors back onto the form.
    // result will be falsy for success; on failure useAuth stores the error.
    // If the hook returned field-level errors from Zod, merge them in.
    if (result.fieldErrors) {
      const mapped = {}
      Object.entries(result.fieldErrors).forEach(([field, messages]) => {
        mapped[field] = Array.isArray(messages) ? messages[0] : messages
      })
      setErrors((prev) => ({ ...prev, ...mapped }))
    }
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">

      {/* ── Left branding panel ── */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative hidden min-h-screen flex-col justify-between overflow-hidden p-10 xl:p-14 lg:flex"
        style={{
          background: 'linear-gradient(145deg, #0F172A 0%, #1E3A8A 60%, #1D4ED8 100%)',
        }}
      >
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Glow */}
        <div
          className="absolute top-[-80px] right-[-60px] w-[400px] h-[400px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #3B82F6 0%, transparent 70%)' }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 9 C4 6.239 6.239 4 9 4 C11.761 4 14 6.239 14 9"
                stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="9" cy="9" r="2" fill="white" />
              <path d="M9 11 L9 14" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <span
            className="text-base font-bold tracking-tight text-white"
            style={{ fontFamily: 'DM Sans, Inter, sans-serif' }}
          >
            OncoTrace AI
          </span>
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <p className="text-[#93C5FD] text-sm font-medium tracking-widest uppercase">
              Getting started
            </p>
            <h2
              className="text-3xl font-bold text-white leading-tight"
              style={{ fontFamily: 'DM Sans, Inter, sans-serif', letterSpacing: '-0.02em' }}
            >
              Begin your precision
              <br />
              oncology journey.
            </h2>
            <p className="text-[#93C5FD] text-sm leading-relaxed">
              Create your secure patient account to access personalized
              AI insights, genomic reports, and real-time treatment tracking.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {[
              'Create your secure account',
              'Complete your medical profile',
              'Upload your first report',
              'Receive AI-powered insights',
            ].map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 border border-white/20
                                flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-semibold">{i + 1}</span>
                </div>
                <p className="text-[#CBD5E1] text-sm">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-[#475569] text-xs">
          OncoTrace AI — HIPAA Compliant Platform v2.4.1
        </p>
      </motion.div>

      {/* ── Right form panel ── */}
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="flex min-h-screen flex-col items-center justify-center overflow-y-auto bg-[#F5F8FD] px-4 py-8 sm:px-6 lg:px-10 xl:px-14"
      >
        <div className="w-full max-w-[460px] space-y-7 rounded-[28px] border border-slate-200/70 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">

          {/* Header */}
          <motion.div variants={itemVariants} className="space-y-1">
            <h2
              className="text-2xl font-bold text-[#0F172A]"
              style={{ fontFamily: 'DM Sans, Inter, sans-serif', letterSpacing: '-0.02em' }}
            >
              Create your account
            </h2>
            <p className="text-[#64748B] text-sm">
              Join thousands of patients managing their care with AI.
            </p>
          </motion.div>

          {/* API-level error banner */}
          {authError?.message && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700"
            >
              {authError.message}
            </motion.p>
          )}

          {/* Form */}
          <motion.form
            variants={itemVariants}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                label="First name"
                name="firstName"
                type="text"
                value={form.firstName}
                onChange={handleChange}
                placeholder="Anand"
                error={errors.firstName}
              />
              <FormField
                label="Last name"
                name="lastName"
                type="text"
                value={form.lastName}
                onChange={handleChange}
                placeholder="Krishnamurthy"
                error={errors.lastName}
              />
            </div>

            {/* Email */}
            <FormField
              label="Email address"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              error={errors.email}
            />

            {/* DOB */}
            <FormField
              label="Date of birth"
              name="dateOfBirth"
              type="date"
              value={form.dateOfBirth}
              onChange={handleChange}
              error={errors.dateOfBirth}
            />

            <div className="space-y-1.5">
              <FormField
                label="Aadhaar number"
                name="aadhaar"
                type="text"
                value={form.aadhaar}
                onChange={handleChange}
                placeholder="1234 5678 9012"
                error={errors.aadhaar}
                inputMode="numeric"
                autoComplete="off"
              />
              <p className="text-[11px] leading-4 text-[#64748B]">Required for identity verification. This demo does not save your Aadhaar number in browser storage.</p>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#0F172A]">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min. 8 characters"
                  className={`w-full px-4 py-3 pr-11 rounded-xl border bg-white
                              text-[#0F172A] text-sm placeholder-[#94A3B8]
                              transition-all duration-200
                              focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10
                              ${errors.password
                                ? 'border-[#DC2626] focus:border-[#DC2626]'
                                : 'border-[#E8EDF2] focus:border-[#2563EB] hover:border-[#94A3B8]'
                              }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2
                             text-[#94A3B8] hover:text-[#64748B] transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Strength bar */}
              {form.password && (
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className="flex-1 h-1 rounded-full transition-all duration-300"
                        style={{
                          backgroundColor: strength.score >= level
                            ? strength.color
                            : '#E8EDF2',
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: strength.color }}>
                    {strength.label} password
                  </p>
                </div>
              )}
              {errors.password && (
                <p className="text-xs text-[#DC2626]">{errors.password}</p>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#0F172A]">
                Confirm password
              </label>
              <div className="relative">
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat your password"
                  className={`w-full px-4 py-3 pr-10 rounded-xl border bg-white
                              text-[#0F172A] text-sm placeholder-[#94A3B8]
                              transition-all duration-200
                              focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10
                              ${errors.confirmPassword
                                ? 'border-[#DC2626] focus:border-[#DC2626]'
                                : 'border-[#E8EDF2] focus:border-[#2563EB] hover:border-[#94A3B8]'
                              }`}
                />
                {/* Match indicator */}
                {form.confirmPassword && form.password === form.confirmPassword && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    <Check size={15} className="text-[#16A34A]" />
                  </div>
                )}
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-[#DC2626]">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Terms */}
            <div className="space-y-1">
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
                    className={`w-4 h-4 rounded flex items-center justify-center
                                border transition-all duration-200
                                ${form.agreed
                                  ? 'bg-[#2563EB] border-[#2563EB]'
                                  : 'bg-white border-[#E8EDF2] group-hover:border-[#2563EB]'
                                }`}
                  >
                    {form.agreed && <Check size={10} className="text-white" strokeWidth={3} />}
                  </div>
                </div>
                <span className="text-sm text-[#64748B] leading-relaxed">
                  I agree to the{' '}
                  <span className="text-[#2563EB] font-medium cursor-pointer hover:underline">
                    Terms of Service
                  </span>{' '}
                  and{' '}
                  <span className="text-[#2563EB] font-medium cursor-pointer hover:underline">
                    Privacy Policy
                  </span>
                </span>
              </label>
              {errors.agreed && (
                <p className="text-xs text-[#DC2626] pl-7">{errors.agreed}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2
                         px-6 py-3.5 rounded-xl font-semibold text-sm text-white
                         bg-[#2563EB] hover:bg-[#1D4ED8]
                         disabled:opacity-60 disabled:cursor-not-allowed
                         transition-all duration-200
                         focus:outline-none focus:ring-4 focus:ring-[#2563EB]/20
                         shadow-[0_1px_3px_0_rgba(37,99,235,0.3)]
                         hover:shadow-[0_4px_16px_0_rgba(37,99,235,0.35)]
                         active:scale-[0.98]"
            >
              {loading ? (
                <LoadingSpinner />
              ) : (
                <>
                  Create account
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </motion.form>

          {/* Login link */}
          <motion.p variants={itemVariants} className="text-center text-sm text-[#64748B]">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-[#2563EB] font-semibold hover:text-[#1D4ED8] transition-colors"
            >
              Sign in
            </Link>
          </motion.p>
        </div>
      </motion.div>
    </div>
  )
}

/* ── Reusable form field ── */
function FormField({ label, name, type, value, onChange, placeholder, error, inputMode, autoComplete }) {
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
        inputMode={inputMode}
        autoComplete={autoComplete}
        className={`w-full px-4 py-3 rounded-xl border bg-white
                    text-[#0F172A] text-sm placeholder-[#94A3B8]
                    transition-all duration-200
                    focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10
                    ${error
                      ? 'border-[#DC2626] focus:border-[#DC2626]'
                      : 'border-[#E8EDF2] focus:border-[#2563EB] hover:border-[#94A3B8]'
                    }`}
      />
      {error && <p className="text-xs text-[#DC2626]">{error}</p>}
    </div>
  )
}

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
