import { useState, type ChangeEvent, type ComponentType, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Eye, EyeOff, Mail, Lock, Shield, CheckCircle } from 'lucide-react'
import { useAuth } from '../../app/useAuth'
import { homeForRole } from '../../app/roleHome'
import BrandMark from '../common/BrandMark'
import AuthShell from './AuthShell'

interface LoginLocationState {
  message?: string
  expired?: boolean
  from?: string
}

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  }),
}


/* ─── Dot-grid SVG background ─── */
export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state ?? null) as LoginLocationState | null
  const successMessage = state?.message || ''
  // Set by the idle timeout and by apiClient when a session ends
  // irrecoverably. Without this the user is simply dumped on the login page
  // with no explanation of why they are no longer signed in.
  const sessionExpired = state?.expired === true
  const { login, loading, error: authError } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [inlineError, setInlineError] = useState('')

  const error = authError?.message || inlineError

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
    if (inlineError) setInlineError('')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.email || !form.password) {
      setInlineError('Enter your email and password to continue.')
      return
    }
    const result = await login({ email: form.email, password: form.password })
    if (result.success) {
      // Route by role rather than to a fixed path: a Doctor or Admin signing in
      // must land in their own portal, not the patient one. An account that
      // has not finished onboarding goes there first regardless of `from` —
      // RequireAuth would redirect it there anyway (see guards.tsx), so this
      // just skips the extra hop.
      const from = state?.from
      navigate(result.needsOnboarding ? '/onboarding' : (from ?? homeForRole(result.role)), {
        replace: true,
      })
    }
  }

  return (
    <AuthShell>

      {/* ── Main login card — horizontal rectangle: identity left, form right ── */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[860px]
                   bg-surface-1 rounded-lg shadow-2xl border border-surface-1/80
                   overflow-hidden"
        style={{
          boxShadow:
            '0 6px 32px 0 rgba(26,46,59,0.08), 0 2px 6px 0 rgba(0,0,0,0.04)',
        }}
      >
        {/* Card top accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-0.5 rounded-t-lg bg-gradient-to-r from-primary-600 via-accent-clay-fg to-accent-sage-fg"
        />

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr]">
          {/* ── LEFT: identity / heading ── */}
          <div className="px-6 py-8 sm:px-10 sm:py-10 md:py-12 md:border-r md:border-border-soft flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-8">
                <BrandMark size={18} />
                <span className="text-lg font-bold tracking-tight text-ink">
                  Stroke AI
                </span>
              </div>

              <h2 className="text-2xl md:text-[28px] font-bold tracking-tight text-ink">
                Welcome back
              </h2>
              <p className="mt-1.5 text-sm text-ink-muted">
                Sign in to access your healthcare portal
              </p>
            </div>

            <div className="hidden md:flex items-center gap-2 text-xs text-ink-subtle mt-10">
              <Shield size={13} strokeWidth={2} />
              <span>Your data is encrypted and private</span>
            </div>
          </div>

          {/* ── RIGHT: form ── */}
          <div className="px-6 py-8 sm:px-10 sm:py-10 md:py-12 flex flex-col justify-center">
            {/* Explains an involuntary sign-out — idle timeout, or a refresh
                token that could not be renewed. */}
            {sessionExpired && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-warning-bg border border-warning-fg/40 rounded-md px-3.5 py-2.5 text-xs sm:text-sm text-warning-fg flex items-center gap-2 mb-5 shadow-sm font-medium"
                role="status"
              >
                <Shield size={16} className="text-warning-fg flex-shrink-0" strokeWidth={2} />
                <span>
                  You were signed out to protect your information. Please sign in again.
                </span>
              </motion.div>
            )}

            {/* Success notification banner from registration */}
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-success-bg border border-success-fg/25 rounded-md px-3.5 py-2.5 text-xs sm:text-sm text-success-fg flex items-center gap-2 mb-5 shadow-sm font-medium"
                role="status"
              >
                <CheckCircle size={16} className="text-success-fg flex-shrink-0" strokeWidth={2} />
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
                    className="text-xs font-medium hover:opacity-80 transition-opacity text-primary-700"
                  >
                    Forgot?
                  </Link>
                }
                rightElement={
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
                }
              />

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-critical-bg border border-critical-fg/25 rounded-md px-3 py-2 text-xs sm:text-sm text-critical-fg"
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
                className="group relative w-full text-on-primary px-4 py-2.5 sm:py-2.5 lg:py-3 text-sm font-semibold rounded-full
                           transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed
                           flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:opacity-90
                           mt-2"
                style={{ background: loading ? 'var(--color-ink-subtle)' : 'var(--color-primary-600)' }}
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
              <div className="flex-1 h-px bg-border-soft" />
              <span className="text-xs text-ink-subtle font-medium">or</span>
              <div className="flex-1 h-px bg-border-soft" />
            </div>

            {/* Register link */}
            <motion.p
              custom={4}
              variants={fadeIn}
              initial="initial"
              animate="animate"
              className="text-center text-xs sm:text-sm text-ink-muted"
            >
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-semibold hover:opacity-80 transition-opacity text-primary-700"
              >
                Create account
              </Link>
            </motion.p>

            {/* Footer info — mobile only; desktop shows it in the left column */}
            <div className="md:hidden mt-5 pt-5 border-t border-border-soft">
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

/* ─── InputField ───
 * Bug fix: the <label> here had no `htmlFor` and the <input> no `id` — the
 * visible label text was never exposed to the accessibility tree as the
 * input's accessible name, only tied to it by CSS proximity. A screen
 * reader announced just "edit text" rather than "Email address, edit
 * text". `id` is derived from `name`, which every caller already passes. */
interface InputFieldProps {
  index: number
  label: string
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  action?: ReactNode
  rightElement?: ReactNode
  name: string
  type: string
  value: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  autoComplete?: string
  placeholder?: string
}

function InputField({ index, label, icon: Icon, action, rightElement, ...inputProps }: InputFieldProps) {
  const inputId = `login-${inputProps.name}`
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
          {...inputProps}
          className="w-full border border-border-soft bg-surface-1 rounded-lg pl-9 sm:pl-10 pr-10 py-2 sm:py-2.5
                     text-sm text-ink placeholder:text-ink-subtle
                     focus:outline-none focus:ring-2 focus:ring-primary-700/35 focus:border-transparent
                     focus:bg-surface-1 transition-all duration-200 hover:border-border"
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
