import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, AlertTriangle, Eye, EyeOff, Lock } from 'lucide-react'
import { useAuth } from '../../app/useAuth'
import EmailField from './EmailField'
import { isValidEmail, normalizeEmail } from './emailFormat'
import type { AuthResult } from '../../app/authContextObject'
import type { Audience } from './audience'

/**
 * Email + password sign-in.
 *
 * ⚠️ A thin form over the EXISTING `AuthContext.login` → `POST /auth/login`,
 * which ends in the same `establishSession` as OTP. Nothing about the session,
 * lockout (5 failures → 30 minutes) or error wording is decided here; the
 * server's message is shown as given, and it deliberately does not say whether
 * the email or the password was wrong.
 */
interface PasswordSignInProps {
  audience: Audience
  onSignedIn: (result: AuthResult) => void
}

export default function PasswordSignIn({ audience, onSignedIn }: PasswordSignInProps) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [emailError, setEmailError] = useState<string | undefined>(undefined)
  const [error, setError] = useState('')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!isValidEmail(email)) {
      setEmailError('Enter a valid email address.')
      return
    }
    if (password === '') {
      setError('Enter your password.')
      return
    }
    setError('')
    setBusy(true)
    const result = await login({ email: normalizeEmail(email), password })
    setBusy(false)
    if (!result.success) {
      // `login` put the server's message on context; the returned result does
      // not carry it, so fall back to a neutral line rather than guess.
      setError(result.message ?? 'Email or password is incorrect.')
      setPassword('')
      return
    }
    onSignedIn(result)
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <EmailField
        id="login-password-email"
        value={email}
        onChange={(v) => { setEmail(v); setEmailError(undefined); setError('') }}
        error={emailError}
        hint={audience === 'patient' ? 'The email address you registered with' : 'Your work email address'}
        autoFocus
        disabled={busy}
      />

      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <label htmlFor="login-password" className="block text-sm font-medium text-ink-muted">
            Password
          </label>
          <Link
            to={`/forgot-password?as=${audience}`}
            className="focus-ring rounded text-xs font-semibold text-primary-700 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <div className="group relative">
          <Lock
            size={16}
            strokeWidth={2}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-ink-subtle transition-colors group-focus-within:text-primary-700 sm:left-3.5"
          />
          <input
            id="login-password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            disabled={busy}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError('') }}
            aria-invalid={error !== '' ? 'true' : undefined}
            className="w-full rounded-lg border border-border-soft bg-surface-1 py-2.5 pl-10 pr-12 text-base text-ink transition-all duration-200 placeholder:text-ink-subtle hover:border-border focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-700/35 disabled:opacity-60 sm:pl-11"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
            aria-pressed={show}
            className="focus-ring absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-ink-subtle hover:text-ink"
          >
            {show ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {error !== '' && (
        <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm text-critical-fg">
          <AlertTriangle size={15} aria-hidden="true" className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="focus-ring mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-700 disabled:opacity-60"
      >
        {busy ? 'Signing in…' : 'Sign in'}
        {!busy && <ArrowRight size={16} aria-hidden="true" />}
      </button>
    </form>
  )
}
