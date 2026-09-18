import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Shield } from 'lucide-react'
import apiClient from '../../lib/apiClient'
import BrandMark from '../common/BrandMark.jsx'
import AuthShell from './AuthShell.jsx'

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: (index) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  }),
}

/* ─── Dot-grid SVG background ─── */
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
    <AuthShell>

      {/* ── Main card ── */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[1000px]
                   bg-surface-1 rounded-xl shadow-2xl border border-surface-1/80
                   overflow-hidden"
        style={{
          boxShadow: '0 8px 40px 0 rgba(99,102,241,0.10), 0 2px 8px 0 rgba(0,0,0,0.06)',
        }}
      >
        {/* Top accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
          style={{ background: 'linear-gradient(90deg, var(--color-primary-600) 0%, var(--color-accent-sky-fg) 50%, var(--color-accent-teal-fg) 100%)' }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px]">
          {/* ── LEFT INFO PANEL ── */}
          <div
            className="relative px-8 py-10 sm:px-12 sm:py-14 lg:px-14 lg:py-16
                        flex flex-col justify-between overflow-hidden"
            style={{ background: 'linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-primary-700) 50%, var(--color-primary-800) 100%)' }}
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
                <span className="text-2xl font-bold tracking-tight text-on-primary">Stroke AI</span>
              </div>

              {/* Content */}
              <div className="space-y-6">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-on-primary leading-tight">
                  Account Recovery
                </h1>
                <p className="text-lg text-on-primary/90 leading-relaxed">
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
                      <div className="w-6 h-6 rounded-full bg-surface-1/20 border border-surface-1/30 flex items-center justify-center flex-shrink-0">
                        <Shield size={13} className="text-on-primary" strokeWidth={2.5} />
                      </div>
                      <p className="text-on-primary/90 text-sm">{item}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative z-10">
              <p className="text-on-primary/75 text-xs">
                Encrypted, private account recovery
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
                      style={{ background: 'linear-gradient(135deg, var(--color-success-bg), var(--color-success-bg))' }}
                    >
                      <CheckCircle size={40} className="text-success-fg" strokeWidth={1.5} />
                    </motion.div>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
                      Check your inbox
                    </h2>
                    <p className="text-sm text-ink-subtle leading-relaxed max-w-xs mx-auto">
                      If <span className="font-medium text-ink-muted">{email}</span> is registered,
                      you'll receive a password reset link shortly.
                    </p>
                  </div>

                  <div
                    className="rounded-xl px-5 py-4 text-sm text-primary-700 border border-primary-200"
                    style={{ background: 'linear-gradient(135deg, var(--color-primary-50), var(--color-primary-100))' }}
                  >
                    <p className="font-medium mb-1">Didn't receive the email?</p>
                    <ul className="text-primary-700 text-xs space-y-1 list-disc list-inside text-left">
                      <li>Check your spam or junk folder</li>
                      <li>Ensure you used the correct email</li>
                      <li>Wait up to 2 minutes for delivery</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => { setSubmitted(false); setEmail(''); setError('') }}
                      className="w-full text-sm font-medium text-primary-700 hover:text-primary-800
                                 transition-colors py-2 rounded-xl border border-primary-200
                                 hover:border-primary-500 hover:bg-primary-50"
                    >
                      Try a different email
                    </button>
                    <Link
                      to="/login"
                      className="flex items-center justify-center gap-2 w-full text-sm
                                 text-ink-subtle hover:text-ink-muted transition-colors"
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
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink leading-tight">
                      Forgot password?
                    </h2>
                    <p className="mt-2 text-sm text-ink-subtle">
                      Enter your email and we'll send you a reset link
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                    {/* Email field */}
                    <motion.div custom={0} variants={fadeIn} initial="initial" animate="animate">
                      <label className="block text-sm font-medium text-ink mb-1.5">
                        Email address
                      </label>
                      <div className="relative group">
                        <Mail
                          size={17}
                          strokeWidth={2}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle
                                     transition-colors group-focus-within:text-primary-600 pointer-events-none"
                        />
                        <input
                          id="forgot-email"
                          type="email"
                          name="email"
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); if (error) setError('') }}
                          autoComplete="email"
                          placeholder="you@example.com"
                          className={`w-full border bg-surface-2 rounded-xl pl-11 pr-4 py-3
                                     text-sm text-ink placeholder:text-ink-subtle
                                     focus:outline-none focus:ring-2 focus:border-transparent
                                     focus:bg-surface-1 transition-all duration-200
                                     ${error
                                       ? 'border-critical-fg/40 focus:ring-critical-fg/40'
                                       : 'border-border-soft focus:ring-primary-600/40'
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
                            className="mt-2 flex items-center gap-1.5 text-xs text-critical-fg"
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
                      className="group relative w-full text-on-primary px-4 py-3.5 text-sm font-semibold rounded-xl
                                 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed
                                 flex items-center justify-center gap-2 shadow-md"
                      style={{
                        background: loading
                          ? 'var(--color-primary-500)'
                          : 'linear-gradient(90deg, var(--color-primary-600) 0%, var(--color-accent-sky-fg) 100%)',
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
                    <div className="flex-1 h-px bg-border-soft" />
                    <span className="text-xs text-ink-subtle font-medium">or</span>
                    <div className="flex-1 h-px bg-border-soft" />
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
                      className="inline-flex items-center gap-2 text-sm font-medium text-ink-subtle
                                 hover:text-primary-700 transition-colors"
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
                    className="mt-6 text-center text-sm text-ink-subtle"
                  >
                    Don&apos;t have an account?{' '}
                    <Link
                      to="/register"
                      className="font-semibold text-primary-700 hover:text-primary-800 transition-colors"
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
    </AuthShell>
  )
}
