import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Eye, EyeOff, Mail, Lock, Shield } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

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
          <circle cx="1.5" cy="1.5" r="1.2" fill="#b0bec5" fillOpacity="0.55" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dots)" />
    </svg>
  )
}

export default function Login() {
  const navigate = useNavigate()
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

      {/* ── Main login card (two-column layout) ── */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[1000px]
                   bg-white rounded-2xl shadow-2xl border border-white/80
                   overflow-hidden"
        style={{
          boxShadow:
            '0 8px 40px 0 rgba(99,102,241,0.10), 0 2px 8px 0 rgba(0,0,0,0.06)',
        }}
      >
        {/* Card top accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
          style={{
            background: 'linear-gradient(90deg, #6366f1 0%, #38bdf8 50%, #2dd4bf 100%)',
          }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px]">
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
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 bg-white"
                >
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
                  Healthcare Management Platform
                </h1>
                <p className="text-lg text-indigo-100 leading-relaxed">
                  Secure access to patient records, analytics, and care coordination tools.
                </p>                
              </div>
            </div>
          </div>

          {/* ── RIGHT SECTION (Login Form) ── */}
          <div className="px-8 py-10 sm:px-12 sm:py-14 lg:px-14 lg:py-16 flex flex-col justify-center">
            {/* Heading */}
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 leading-tight">
                Welcome back
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Sign in to access your healthcare portal
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
                    Forgot password?
                  </Link>
                }
                rightElement={
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
                }
              />

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700"
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
                    Sign in
                    <ArrowRight
                      size={16}
                      strokeWidth={2.5}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </>
                )}
              </motion.button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Demo credentials */}
            <motion.div custom={3} variants={fadeIn} initial="initial" animate="animate">
              <button
                type="button"
                onClick={() =>
                  setForm({ email: 'anand@careflow.health', password: 'demo1234' })
                }
                className="w-full border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium
                           text-gray-600 rounded-xl hover:border-indigo-300 hover:bg-indigo-50
                           hover:text-indigo-700 transition-all duration-200"
              >
                Use demo credentials
              </button>
            </motion.div>

            {/* Register link */}
            <motion.p
              custom={4}
              variants={fadeIn}
              initial="initial"
              animate="animate"
              className="mt-6 text-center text-sm text-gray-500"
            >
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Create account
              </Link>
            </motion.p>
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
          className="w-full border border-gray-200 bg-gray-50 rounded-xl pl-11 pr-11 py-3
                     text-sm text-gray-900 placeholder:text-gray-400
                     focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent
                     focus:bg-white transition-all duration-200"
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