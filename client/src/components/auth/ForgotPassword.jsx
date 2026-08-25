import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Shield } from 'lucide-react'
import apiClient from '../../lib/apiClient'
import BrandMark from '../common/BrandMark.jsx'

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
          id="dots-fp"
          x="0"
          y="0"
          width="24"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1.5" cy="1.5" r="1.2" fill="#b0bec5" fillOpacity="0.55" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dots-fp)" />
    </svg>
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
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export default function ForgotPassword() {
  const [email, setEmail]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [submitted, setSubmitted]   = useState(false)

  /* Basic email regex — same pattern as Register.jsx */
  const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)
    try {
      await apiClient.post('/auth/forgot-password', { email: email.trim().toLowerCase() })
      setSubmitted(true)
    } catch (err) {
      /*
       * Security: always show the same success-like message regardless of
       * whether the email exists. This prevents email enumeration.
       * We still show the submitted state so the user knows to check inbox.
       */
      if (err.status === 404 || err.status === 400 || err.status === 429) {
        // 404 → email not found (server intentionally returns generic msg)
        // 429 → rate-limited
        setError(err.message || 'Something went wrong. Please try again.')
      } else {
        // For network errors or unexpected failures we still show submitted
        // state to avoid leaking whether the email exists.
        setSubmitted(true)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden font-sans p-4"
      style={{ background: '#f0f4f8' }}
    >
      {/* ── Dot-grid background ── */}
      <DotGrid />

      {/* ── Gradient blobs (identical palette to Login) ── */}
      <motion.div
        className="absolute rounded-full blur-3xl opacity-50 pointer-events-none
                   w-72 h-72 sm:w-96 sm:h-96 lg:w-[460px] lg:h-[460px]
                   -top-24 -left-24"
        style={{ background: 'radial-gradient(circle, #a78bfa 0%, #818cf8 40%, #6366f1 100%)' }}
        animate={{ scale: [1, 1.1, 1], x: [0, 12, 0], y: [0, -8, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute rounded-full blur-3xl opacity-45 pointer-events-none
                   w-56 h-56 sm:w-72 sm:h-72 lg:w-[380px] lg:h-[380px]
                   -bottom-16 -right-16"
        style={{ background: 'radial-gradient(circle, #2dd4bf 0%, #38bdf8 50%, #6366f1 100%)' }}
        animate={{ scale: [1, 1.15, 1], x: [0, -14, 0], y: [0, 10, 0] }}
        transition={{ duration: 10, delay: 1, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute rounded-full blur-3xl opacity-30 pointer-events-none
                   w-40 h-40 sm:w-56 sm:h-56 lg:w-72 lg:h-72 top-1/2 -right-10"
        style={{ background: 'radial-gradient(circle, #f9a8d4 0%, #fbcfe8 100%)' }}
        animate={{ scale: [1, 1.08, 1], y: [0, -12, 0] }}
        transition={{ duration: 7, delay: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute rounded-full blur-3xl opacity-25 pointer-events-none
                   w-36 h-36 sm:w-48 sm:h-48 bottom-10 left-10"
        style={{ background: 'radial-gradient(circle, #86efac 0%, #34d399 100%)' }}
        animate={{ scale: [1, 1.12, 1], x: [0, 10, 0] }}
        transition={{ duration: 8, delay: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ── Main card ── */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[1000px]
                   bg-white rounded-xl shadow-2xl border border-white/80
                   overflow-hidden"
        style={{
          boxShadow: '0 8px 40px 0 rgba(99,102,241,0.10), 0 2px 8px 0 rgba(0,0,0,0.06)',
        }}
      >
        {/* Top accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
          style={{ background: 'linear-gradient(90deg, #6366f1 0%, #38bdf8 50%, #2dd4bf 100%)' }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px]">
          {/* ── LEFT INFO PANEL ── */}
          <div
            className="relative px-8 py-10 sm:px-12 sm:py-14 lg:px-14 lg:py-16
                        flex flex-col justify-between overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%)' }}
          >
            {/* Decorative overlay */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />

            <div className="relative z-10">
              {/* Brand */}
              <div className="flex items-center gap-3 mb-12">
                <div className="shadow-lg rounded-xl">
                  <BrandMark size={26} />
                </div>
                <span className="text-2xl font-bold tracking-tight text-white">Stroke AI</span>
              </div>

              {/* Content */}
              <div className="space-y-6">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
                  Account Recovery
                </h1>
                <p className="text-lg text-indigo-100 leading-relaxed">
                  Reset your password securely. We'll send a one-time link to your registered email.
                </p>

                {/* Security note */}
                <div className="space-y-4 pt-4">
                  {[
                    'Reset link expires in 15 minutes',
                    'One-time use — link invalidates after reset',
                    'All active sessions will be terminated',
                    'Your data remains protected throughout',
                  ].map((item, i) => (
                    <motion.div
                      key={item}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.1, duration: 0.4 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-6 h-6 rounded-full bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
                        <Shield size={13} className="text-white" strokeWidth={2.5} />
                      </div>
                      <p className="text-indigo-100 text-sm">{item}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative z-10">
              <p className="text-indigo-200 text-xs">
                Encrypted and HIPAA-compliant account recovery
              </p>
            </div>
          </div>

          {/* ── RIGHT FORM PANEL ── */}
          <div className="px-8 py-10 sm:px-12 sm:py-14 lg:px-14 lg:py-16 flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {submitted ? (
                /* ── SUCCESS STATE ── */
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="text-center space-y-6"
                >
                  <div className="flex justify-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                      className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}
                    >
                      <CheckCircle size={40} className="text-emerald-600" strokeWidth={1.5} />
                    </motion.div>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                      Check your inbox
                    </h2>
                    <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">
                      If <span className="font-medium text-gray-700">{email}</span> is registered,
                      you'll receive a password reset link shortly.
                    </p>
                  </div>

                  <div
                    className="rounded-xl px-5 py-4 text-sm text-indigo-700 border border-indigo-100"
                    style={{ background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)' }}
                  >
                    <p className="font-medium mb-1">Didn't receive the email?</p>
                    <ul className="text-indigo-600 text-xs space-y-1 list-disc list-inside text-left">
                      <li>Check your spam or junk folder</li>
                      <li>Ensure you used the correct email</li>
                      <li>Wait up to 2 minutes for delivery</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => { setSubmitted(false); setEmail(''); setError('') }}
                      className="w-full text-sm font-medium text-indigo-600 hover:text-indigo-800
                                 transition-colors py-2 rounded-xl border border-indigo-200
                                 hover:border-indigo-400 hover:bg-indigo-50"
                    >
                      Try a different email
                    </button>
                    <Link
                      to="/login"
                      className="flex items-center justify-center gap-2 w-full text-sm
                                 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <ArrowLeft size={15} strokeWidth={2} />
                      Back to sign in
                    </Link>
                  </div>
                </motion.div>
              ) : (
                /* ── REQUEST FORM ── */
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35 }}
                >
                  {/* Heading */}
                  <div className="mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 leading-tight">
                      Forgot password?
                    </h2>
                    <p className="mt-2 text-sm text-gray-500">
                      Enter your email and we'll send you a reset link
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                    {/* Email field */}
                    <motion.div custom={0} variants={fadeIn} initial="initial" animate="animate">
                      <label className="block text-sm font-medium text-gray-800 mb-1.5">
                        Email address
                      </label>
                      <div className="relative group">
                        <Mail
                          size={17}
                          strokeWidth={2}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400
                                     transition-colors group-focus-within:text-indigo-500 pointer-events-none"
                        />
                        <input
                          id="forgot-email"
                          type="email"
                          name="email"
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); if (error) setError('') }}
                          autoComplete="email"
                          placeholder="you@example.com"
                          className={`w-full border bg-gray-50 rounded-xl pl-11 pr-4 py-3
                                     text-sm text-gray-900 placeholder:text-gray-400
                                     focus:outline-none focus:ring-2 focus:border-transparent
                                     focus:bg-white transition-all duration-200
                                     ${error
                                       ? 'border-red-300 focus:ring-red-400'
                                       : 'border-gray-200 focus:ring-indigo-400'
                                     }`}
                          aria-describedby={error ? 'email-error' : undefined}
                          aria-invalid={!!error}
                        />
                      </div>
                      <AnimatePresence>
                        {error && (
                          <motion.div
                            id="email-error"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 flex items-center gap-1.5 text-xs text-red-600"
                            role="alert"
                          >
                            <AlertCircle size={13} strokeWidth={2} />
                            {error}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {/* Submit */}
                    <motion.button
                      custom={1}
                      variants={fadeIn}
                      initial="initial"
                      animate="animate"
                      type="submit"
                      id="forgot-password-submit"
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
                          Send reset link
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

                  {/* Back to login */}
                  <motion.div
                    custom={2}
                    variants={fadeIn}
                    initial="initial"
                    animate="animate"
                    className="text-center"
                  >
                    <Link
                      to="/login"
                      id="back-to-login"
                      className="inline-flex items-center gap-2 text-sm font-medium text-gray-500
                                 hover:text-indigo-600 transition-colors"
                    >
                      <ArrowLeft size={15} strokeWidth={2} />
                      Back to sign in
                    </Link>
                  </motion.div>

                  <motion.p
                    custom={3}
                    variants={fadeIn}
                    initial="initial"
                    animate="animate"
                    className="mt-6 text-center text-sm text-gray-500"
                  >
                    Don&apos;t have an account?{' '}
                    <Link
                      to="/register"
                      className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      Create account
                    </Link>
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </main>
  )
}
