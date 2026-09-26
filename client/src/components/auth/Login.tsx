import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Shield, CheckCircle, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../app/useAuth'
import { homeForRole } from '../../app/roleHome'
import * as authService from '../../services/auth.service'
import BrandMark from '../common/BrandMark'
import AuthShell from './AuthShell'
import MobileNumberField from './MobileNumberField'
import { isValidMobile, mobileDigits } from './mobileFormat'
import OtpCodeInput from './OtpCodeInput'
import type { ApiError } from '../../types/api'
import type { AuthResult } from '../../app/authContextObject'
import EntryPage from './EntryPage'
import PasswordSignIn from './PasswordSignIn'
import { AUDIENCE_COPY, audienceUsesOtp, parseAudience, type Audience } from './audience'

/**
 * Sign in, addressed to whoever chose the door on the entry page.
 *
 *  - `?as=patient`   — mobile number (a code by SMS) or email + password;
 *                      plus "Create account". No emailed sign-in code:
 *                      withdrawn 25 Sep 2026, and the server refuses it.
 *  - `?as=clinician` — email + password only.
 *  - `?as=hospital`  — email + password only.
 *  - no `?as`        — the entry page itself ("Who are you?").
 *
 * Staff accounts are either self-created at /register (Doctor or Hospital
 * Administrator — restored 25 Sep 2026) or provisioned by a hospital admin,
 * in which case the new staff member sets a password from an emailed link.
 * Staff cannot use OTP — the server never issues them a code — so the staff
 * doors do not offer it.
 *
 * ⚠️ THE AUDIENCE IS NOT A ROLE CLAIM. It is never sent to the server; the
 * account's role decides the portal after sign-in.
 *
 * ⚠️ THE SERVER IS AUTHORITATIVE ABOUT EVERYTHING THAT MATTERS: whether the
 * number is registered (it never says), when the code expires, how many
 * attempts remain, and which role the account holds. This screen renders that;
 * it decides none of it.
 */

/**
 * The explicit state machine. `loading` booleans are what produce a screen
 * that sits on "Loading…" forever when a branch is missed; a union cannot.
 */
type Phase =
  | 'entering_identifier'
  | 'requesting_otp'
  | 'otp_sent'
  | 'verifying_otp'
  | 'authenticated'

interface LoginLocationState {
  message?: string
  expired?: boolean
  from?: string
}

/** mm:ss from a server timestamp — presentation only; the server decides. */
function countdown(until: number, now: number): string {
  const secs = Math.max(0, Math.ceil((until - now) / 1000))
  return `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`
}

export default function Login() {
  const [params] = useSearchParams()
  const audience = parseAudience(params.get('as'))
  if (audience === null) return <EntryPage />
  // Keyed so switching doors starts a clean state machine.
  return <AudienceLogin key={audience} audience={audience} />
}

/** How a patient chooses to sign in. Staff are always `Password`. */
type Method = 'Sms' | 'Password'

const METHOD_LABEL: Record<Method, string> = {
  Sms: 'Mobile number',
  Password: 'Email & password',
}

function AudienceLogin({ audience }: { audience: Audience }) {
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state ?? null) as LoginLocationState | null
  const successMessage = state?.message ?? ''
  const sessionExpired = state?.expired === true

  const { loginWithOtp } = useAuth()

  const usesOtp = audienceUsesOtp(audience)
  const copy = AUDIENCE_COPY[audience]
  const [method, setMethod] = useState<Method>(usesOtp ? 'Sms' : 'Password')

  const [phase, setPhase] = useState<Phase>('entering_identifier')
  const [mobile, setMobile] = useState('')
  const [code, setCode] = useState('')
  const [challenge, setChallenge] = useState<authService.OtpChallenge | null>(null)
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState<string | undefined>(undefined)
  const [now, setNow] = useState(() => Date.now())

  // One ticker for both countdowns. Presentation only — every decision is
  // re-checked by the server, so a paused tab cannot grant extra time.
  const otpScreen = phase === 'otp_sent' || phase === 'verifying_otp'
  useEffect(() => {
    if (!otpScreen) return undefined
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [otpScreen])

  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    // Move focus on the stage change so a screen-reader user is told the
    // screen changed rather than being left on a button that vanished.
    if (phase === 'otp_sent') headingRef.current?.focus()
  }, [phase])

  const expiresAt = challenge === null ? 0 : Date.parse(challenge.expiresAt)
  const resendAt = challenge === null ? 0 : Date.parse(challenge.resendAvailableAt)
  const expired = challenge !== null && now >= expiresAt
  const canResend = challenge !== null && now >= resendAt

  const sendCode = useCallback(
    async (target: string) => {
      setError('')
      setFieldError(undefined)
      setPhase('requesting_otp')
      try {
        const next = await authService.requestOtp({ channel: 'Sms', identifier: target })
        setChallenge(next)
        setCode('')
        setNow(Date.now())
        setPhase('otp_sent')
      } catch (err) {
        const apiErr = err as ApiError
        // ⚠️ 429 is the one branch the server distinguishes, because it is
        // about the requester's own behaviour and leaks nothing about whose
        // number it is.
        setError(
          apiErr.status === 429
            ? 'A code was just sent. Wait a moment before asking for another.'
            : apiErr.message || 'Could not send a code right now. Check your connection.',
        )
        setPhase('entering_identifier')
      }
    },
    [],
  )

  const onSubmitIdentifier = (e: FormEvent) => {
    e.preventDefault()
    if (!isValidMobile(mobile)) {
      setFieldError('Enter a 10-digit mobile number starting 6, 7, 8 or 9.')
      return
    }
    void sendCode(mobileDigits(mobile))
  }

  const onSubmitCode = async (e: FormEvent) => {
    e.preventDefault()
    if (challenge === null) return
    if (code.length !== 6) {
      setError('Enter all six digits.')
      return
    }
    setError('')
    setPhase('verifying_otp')
    const result = await loginWithOtp({ challengeId: challenge.challengeId, code })
    if (!result.success) {
      // ⚠️ SHOW THE SERVER'S OWN MESSAGE. It already distinguishes the four
      // cases that matter — wrong, expired, already used, too many attempts —
      // and three of those mean "request a new code" rather than "look again".
      // Replacing it with one generic line sent a user back to re-read a code
      // that could never work, which is the specific frustration this screen
      // exists to avoid.
      setError(result.message ?? 'Could not sign you in with that code.')
      setCode('')
      setPhase('otp_sent')
      return
    }
    goHome(result)
  }

  /** Where the ACCOUNT belongs — never where the chosen door pointed. */
  const goHome = (result: AuthResult) => {
    if (!result.success) return
    setPhase('authenticated')
    navigate(
      result.needsOnboarding
        ? '/onboarding'
        : (state?.from ?? homeForRole(result.role ?? null)),
      { replace: true },
    )
  }

  const chooseMethod = (m: Method) => {
    setMethod(m)
    setFieldError(undefined)
    setError('')
  }

  const busy = phase === 'requesting_otp' || phase === 'verifying_otp'

  return (
    <AuthShell>
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10 sm:px-6">
        <div className="mb-8 flex items-center gap-2.5">
          <BrandMark size={18} />
          <span className="text-sm font-semibold tracking-[0.06em] text-ink">SHRI HEALTH</span>
        </div>

        {sessionExpired && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            role="status"
            className="mb-5 flex items-center gap-2 rounded-md border border-warning-fg/40 bg-warning-bg px-3.5 py-2.5 text-sm font-medium text-warning-fg"
          >
            <Shield size={16} strokeWidth={2} className="flex-shrink-0" />
            <span>You were signed out to protect your information. Please sign in again.</span>
          </motion.div>
        )}

        {successMessage !== '' && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            role="status"
            className="mb-5 flex items-center gap-2 rounded-md border border-success-fg/25 bg-success-bg px-3.5 py-2.5 text-sm font-medium text-success-fg"
          >
            <CheckCircle size={16} strokeWidth={2} className="flex-shrink-0" />
            <span>{successMessage}</span>
          </motion.div>
        )}

        {/* ── Stage 1 · identify ─────────────────────────────────────────── */}
        {(phase === 'entering_identifier' || phase === 'requesting_otp') && (
          <div>
            <Link
              to="/login"
              state={location.state ?? undefined}
              className="focus-ring mb-5 inline-flex items-center gap-1.5 rounded text-sm text-ink-muted hover:text-ink"
            >
              <ArrowLeft size={15} aria-hidden="true" />
              Choose a different account type
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{copy.signInHeading}</h1>
            <p className="mb-6 mt-1 text-sm text-ink-muted">
              {method === 'Password'
                ? 'Sign in with your email address and password.'
                : 'We\u2019ll send a 6-digit code by SMS to your registered mobile number.'}
            </p>

            {/*
              ⚠️ A SIGN-IN METHOD, NOT A ROLE PICKER. It asks only how to
              prove who you are; the server resolves what the account is.
              Patients only — staff sign in by password.
            */}
            {usesOtp && (
              <div
                role="radiogroup"
                aria-label="How would you like to sign in?"
                className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-border-soft bg-surface-2 p-1"
              >
                {(['Sms', 'Password'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={method === m}
                    disabled={busy}
                    onClick={() => chooseMethod(m)}
                    className={`focus-ring min-h-11 rounded-lg px-2 text-sm font-medium transition-colors ${
                      method === m
                        ? 'bg-surface-1 text-ink shadow-card-sm'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {METHOD_LABEL[m]}
                  </button>
                ))}
              </div>
            )}

            {method === 'Password' ? (
              <PasswordSignIn audience={audience} onSignedIn={goHome} />
            ) : (
              <form onSubmit={onSubmitIdentifier} noValidate>
                <MobileNumberField
                  id="login-mobile"
                  value={mobile}
                  onChange={(v) => { setMobile(v); setFieldError(undefined); setError('') }}
                  error={fieldError}
                  autoFocus
                  disabled={busy}
                />

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
                  {phase === 'requesting_otp' ? 'Sending code…' : 'Continue'}
                  {phase !== 'requesting_otp' && <ArrowRight size={16} aria-hidden="true" />}
                </button>
              </form>
            )}

            {audience === 'patient' ? (
              <p className="mt-6 text-sm text-ink-muted">
                New here?{' '}
                <Link to="/register" className="focus-ring rounded font-semibold text-primary-700 hover:underline">
                  Create an account
                </Link>
              </p>
            ) : (
              <p className="mt-6 text-xs leading-relaxed text-ink-subtle">
                {audience === 'clinician'
                  ? 'New here? Create an account from the welcome page, or use the link your hospital '
                    + 'administrator emailed you to set your password. If a link has expired, use “Forgot password?”.'
                  : 'New here? Create an account from the welcome page. To onboard a new hospital, '
                    + 'you can also contact your SHRI HEALTH representative.'}
              </p>
            )}
          </div>
        )}

        {/* ── Stage 2 · code ─────────────────────────────────────────────── */}
        {otpScreen && challenge !== null && (
          <form onSubmit={onSubmitCode} noValidate>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl font-semibold tracking-tight text-ink outline-none"
            >
              Verify your mobile number
            </h1>
            <p className="mb-6 mt-1 text-sm text-ink-muted">
              We&rsquo;ve sent a 6-digit code to{' '}
              <span className="font-semibold tabular-nums text-ink">+91 {challenge.maskedIdentifier}</span>
            </p>

            <OtpCodeInput
              value={code}
              onChange={(v) => { setCode(v); setError('') }}
              disabled={busy || expired}
              invalid={error !== ''}
            />

            {error !== '' && (
              <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm text-critical-fg">
                <AlertTriangle size={15} aria-hidden="true" className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </p>
            )}

            {expired && error === '' && (
              <p role="status" className="mt-3 text-sm text-warning-fg">
                That code has expired. Request a new one.
              </p>
            )}

            <button
              type="submit"
              disabled={busy || expired || code.length !== 6}
              className="focus-ring mt-6 flex min-h-12 w-full items-center justify-center rounded-xl bg-primary-600 px-5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-700 disabled:opacity-60"
            >
              {phase === 'verifying_otp' ? 'Verifying…' : 'Verify'}
            </button>

            <div className="mt-5 flex flex-col items-start gap-3 text-sm">
              <div>
                <span className="text-ink-subtle">Didn&rsquo;t receive it? </span>
                {canResend ? (
                  <button
                    type="button"
                    onClick={() => void sendCode(mobileDigits(mobile))}
                    disabled={busy}
                    className="focus-ring rounded font-semibold text-primary-700 underline underline-offset-2 disabled:opacity-60"
                  >
                    Resend code
                  </button>
                ) : (
                  // ⚠️ Driven by the SERVER's resendAvailableAt, so the button
                  // cannot unlock before the server will honour it.
                  <span aria-live="polite" className="tabular-nums text-ink-muted">
                    Resend in {countdown(resendAt, now)}
                  </span>
                )}
              </div>

              {!expired && (
                <p aria-live="polite" className="tabular-nums text-xs text-ink-subtle">
                  Code expires in {countdown(expiresAt, now)}
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  setPhase('entering_identifier')
                  setChallenge(null)
                  setCode('')
                  setError('')
                }}
                className="focus-ring rounded text-ink-muted underline underline-offset-2"
              >
                Change mobile number
              </button>
            </div>
          </form>
        )}
      </div>
    </AuthShell>
  )
}
