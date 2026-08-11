import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Eye, EyeOff, Mail, Lock, Shield, CheckCircle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: (index) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
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

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const successMessage = location.state?.message || ''
  const { login, loading, error: authError } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [inlineError, setInlineError] = useState('')

  const error = authError?.message || inlineError

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
    if (inlineError) setInlineError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.email || !form.password) {
      setInlineError('Enter your email and password to continue.')
      return
    }
    const result = await login({ email: form.email, password: form.password })
    if (result.success) {
      navigate('/', { replace: true })
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

      {/* ── Main login card (two-column layout) ── */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[950px]
                   bg-white rounded-lg shadow-2xl border border-white/80
                   overflow-hidden"
        style={{
          boxShadow:
            '0 6px 32px 0 rgba(99,102,241,0.08), 0 2px 6px 0 rgba(0,0,0,0.04)',
        }}
      >
        {/* Card top accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-0.5 rounded-t-lg"
          style={{
            background: 'linear-gradient(90deg, #6366f1 0%, #38bdf8 50%, #2dd4bf 100%)',
          }}
        />

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
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0 bg-white"
                >
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
                  Healthcare Management Platform
                </h1>
                <p className="text-base text-indigo-100 leading-relaxed max-w-md">
                  Secure access to patient records, analytics, and care coordination tools.
                </p>
                
                {/* Feature list */}
                <div className="pt-6 space-y-3">
                  {[
                    'Advanced patient data analytics',
                    'Real-time care coordination',
                    'HIPAA-compliant security',
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-indigo-50">
                      <Shield size={16} strokeWidth={2} className="flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT SECTION (Login Form) ── */}
          <div className="px-6 py-8 sm:px-10 sm:py-10 lg:px-10 lg:py-12 xl:px-12 xl:py-14 flex flex-col justify-center">
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
            <div className="mb-6 lg:mb-7">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-gray-900">
                Welcome back
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-gray-600">
                Sign in to access your healthcare portal
              </p>
            </div>

            {/* Success notification banner from registration */}
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50 border border-emerald-200 rounded-md px-3.5 py-2.5 text-xs sm:text-sm text-emerald-800 flex items-center gap-2 mb-5 shadow-sm font-medium"
                role="status"
              >
                <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" strokeWidth={2} />
                <span>{successMessage}</span>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 lg:space-y-4" noValidate>
              <InputField
                index={0}
                label="Email address"
                icon={Mail}
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                placeholder="you@example.com"
              />

              <InputField
                index={1}
                label="Password"
                icon={Lock}
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                placeholder="Enter your password"
                action={
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    Forgot?
                  </Link>
                }
                rightElement={
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
                }
              />

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-xs sm:text-sm text-red-700"
                  role="alert"
                >
                  {error}
                </motion.div>
              )}

              {/* Submit */}
              <motion.button
                custom={2}
                variants={fadeIn}
                initial="initial"
                animate="animate"
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.01 }}
                whileTap={{ scale: loading ? 1 : 0.99 }}
                className="group relative w-full text-white px-4 py-2.5 sm:py-2.5 lg:py-3 text-sm font-semibold rounded-lg
                           transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed
                           flex items-center justify-center gap-2 shadow-md hover:shadow-lg
                           mt-2"
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
                    Sign in
                    <ArrowRight
                      size={16}
                      strokeWidth={2.5}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </>
                )}
              </motion.button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5 lg:my-6">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Register link */}
            <motion.p
              custom={4}
              variants={fadeIn}
              initial="initial"
              animate="animate"
              className="text-center text-xs sm:text-sm text-gray-600"
            >
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                Create account
              </Link>
            </motion.p>

            {/* Mobile footer info */}
            <div className="lg:hidden mt-5 pt-5 border-t border-gray-100">
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

/* ─── InputField ─── */
function InputField({ index, label, icon: Icon, action, rightElement, ...inputProps }) {
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
          className="w-full border border-gray-200 bg-white rounded-lg pl-9 sm:pl-10 pr-10 py-2 sm:py-2.5
                     text-sm text-gray-900 placeholder:text-gray-400
                     focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent
                     focus:bg-white transition-all duration-200 hover:border-gray-300"
        />
        {rightElement}
      </div>
    </motion.div>
  )
}

/* ─── Spinner ─── */
function Spinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Loading"
    >
      <circle
        cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="3"
        className="opacity-25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor" strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}