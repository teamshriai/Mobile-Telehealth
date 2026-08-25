import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, ArrowRight, ArrowLeft, Eye, EyeOff, CheckCircle, AlertCircle, Shield } from 'lucide-react'
import apiClient from '../../lib/apiClient'
import * as authService from '../../services/auth.service'
import BrandMark from '../common/BrandMark.jsx'

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: (index) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  }),
}

/* Same strength heuristic as Register.jsx, kept in sync intentionally */
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

function DotGrid() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="dots-rp" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.2" fill="#b0bec5" fillOpacity="0.55" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dots-rp)" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-label="Loading">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/* Reset token format is a 64-char hex string (see server/src/auth/auth.validator.ts) */
const isValidTokenFormat = (token) => /^[a-f0-9]{64}$/i.test(token ?? '')

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  // 'checking' | 'valid' | 'invalid'
  const [tokenStatus, setTokenStatus] = useState('checking')
  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const strength = getPasswordStrength(form.password)

  useEffect(() => {
    let cancelled = false

    if (!isValidTokenFormat(token)) {
      setTokenStatus('invalid')
      return
    }

    apiClient
      .post('/auth/verify-reset-token', { token })
      .then(() => {
        if (!cancelled) setTokenStatus('valid')
      })
      .catch(() => {
        if (!cancelled) setTokenStatus('invalid')
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const next = {}
    if (!form.password) next.password = 'Password is required'
    else if (form.password.length < 8) {
      next.password = 'Password must be at least 8 characters'
    } else if (
      !/[A-Z]/.test(form.password) ||
      !/[a-z]/.test(form.password) ||
      !/\d/.test(form.password) ||
      !/[^A-Za-z0-9]/.test(form.password)
    ) {
      next.password = 'Password must include uppercase, lowercase, number & special char'
    }
    if (form.password !== form.confirmPassword) {
      next.confirmPassword = 'Passwords do not match'
    }
    return next
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    const nextErrors = validate()
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setLoading(true)
    try {
      await authService.resetPassword({ token, password: form.password })
      setDone(true)
      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { message: 'Password reset successfully. Please sign in with your new password.' },
        })
      }, 2000)
    } catch (err) {
      if (err.status === 400) {
        // Token was valid at page load but has since been used/expired elsewhere.
        setTokenStatus('invalid')
      } else {
        setErrors({ global: err.message || 'Something went wrong. Please try again.' })
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
      <DotGrid />

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
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[520px] bg-white rounded-xl shadow-2xl border border-white/80 overflow-hidden"
        style={{ boxShadow: '0 8px 40px 0 rgba(99,102,241,0.10), 0 2px 8px 0 rgba(0,0,0,0.06)' }}
      >
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #6366f1 0%, #38bdf8 50%, #2dd4bf 100%)' }} />

        <div className="px-6 py-10 sm:px-10 sm:py-12">
          <div className="flex items-center justify-center gap-2.5 mb-8">
            <BrandMark size={18} />
            <span className="text-lg font-bold tracking-tight text-gray-900">Stroke AI</span>
          </div>

          <AnimatePresence mode="wait">
            {tokenStatus === 'checking' && (
              <motion.div
                key="checking"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-8"
                role="status"
              >
                <div className="flex justify-center mb-3 text-indigo-500">
                  <Spinner />
                </div>
                <p className="text-sm text-gray-500">Verifying your reset link…</p>
              </motion.div>
            )}

            {tokenStatus === 'invalid' && (
              <motion.div
                key="invalid"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center space-y-5"
              >
                <div className="flex justify-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #fee2e2, #fecaca)' }}
                  >
                    <AlertCircle size={32} className="text-red-600" strokeWidth={1.5} />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
                    Link expired or invalid
                  </h2>
                  <p className="text-sm text-gray-500 leading-relaxed max-w-sm mx-auto">
                    This password reset link is no longer valid. Reset links expire after 15 minutes
                    and can only be used once. Please request a new one.
                  </p>
                </div>
                <Link
                  to="/forgot-password"
                  className="inline-flex items-center justify-center gap-2 w-full text-white px-4 py-3 text-sm font-semibold rounded-xl shadow-md transition-all"
                  style={{ background: 'linear-gradient(90deg, #6366f1 0%, #38bdf8 100%)' }}
                >
                  Request a new link
                  <ArrowRight size={16} strokeWidth={2.5} />
                </Link>
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-2 w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ArrowLeft size={15} strokeWidth={2} />
                  Back to sign in
                </Link>
              </motion.div>
            )}

            {tokenStatus === 'valid' && done && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-5"
              >
                <div className="flex justify-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}
                  >
                    <CheckCircle size={32} className="text-emerald-600" strokeWidth={1.5} />
                  </motion.div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
                    Password reset
                  </h2>
                  <p className="text-sm text-gray-500">
                    Redirecting you to sign in…
                  </p>
                </div>
              </motion.div>
            )}

            {tokenStatus === 'valid' && !done && (
              <motion.div key="form" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
                    Set a new password
                  </h2>
                  <p className="mt-1.5 text-sm text-gray-500">
                    Choose a strong password you haven't used before.
                  </p>
                </div>

                {errors.global && (
                  <div
                    className="bg-red-50 border border-red-200 rounded-md px-3.5 py-2.5 text-sm text-red-700 mb-5"
                    role="alert"
                  >
                    {errors.global}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  <motion.div custom={0} variants={fadeIn} initial="initial" animate="animate">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
                    <div className="relative group">
                      <Lock
                        size={16}
                        strokeWidth={2}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-indigo-500 pointer-events-none"
                      />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Min. 8 characters"
                        autoComplete="new-password"
                        className={`w-full border bg-white rounded-lg pl-10 pr-10 py-2.5 text-sm text-gray-900 placeholder:text-gray-400
                                   focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 hover:border-gray-300
                                   ${errors.password ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-indigo-400'}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
                      </button>
                    </div>
                    {form.password && (
                      <div className="mt-1.5 space-y-1">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className="flex-1 h-1 rounded-full transition-all duration-300"
                              style={{ backgroundColor: strength.score >= level ? strength.color : '#E5E7EB' }}
                            />
                          ))}
                        </div>
                        <p className="text-xs font-medium" style={{ color: strength.color }}>
                          {strength.label} password
                        </p>
                      </div>
                    )}
                    {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
                  </motion.div>

                  <motion.div custom={1} variants={fadeIn} initial="initial" animate="animate">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm new password</label>
                    <div className="relative group">
                      <Lock
                        size={16}
                        strokeWidth={2}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-indigo-500 pointer-events-none"
                      />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        placeholder="Repeat your password"
                        autoComplete="new-password"
                        className={`w-full border bg-white rounded-lg pl-10 pr-10 py-2.5 text-sm text-gray-900 placeholder:text-gray-400
                                   focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 hover:border-gray-300
                                   ${errors.confirmPassword ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-indigo-400'}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((p) => !p)}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>}
                  </motion.div>

                  <motion.button
                    custom={2}
                    variants={fadeIn}
                    initial="initial"
                    animate="animate"
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.01 }}
                    whileTap={{ scale: loading ? 1 : 0.99 }}
                    className="group relative w-full text-white px-4 py-3 text-sm font-semibold rounded-xl
                               transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed
                               flex items-center justify-center gap-2 shadow-md mt-2"
                    style={{ background: loading ? '#818cf8' : 'linear-gradient(90deg, #6366f1 0%, #38bdf8 100%)' }}
                  >
                    {loading ? (
                      <Spinner />
                    ) : (
                      <>
                        Reset password
                        <ArrowRight size={16} strokeWidth={2.5} className="transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </motion.button>
                </form>

                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
                  <Shield size={13} strokeWidth={2} />
                  <span>HIPAA-compliant and secure</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </main>
  )
}
