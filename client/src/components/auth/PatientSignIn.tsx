import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { useAuth } from '../../app/useAuth'
import * as authService from '../../services/auth.service'
import type { ApiError } from '../../types/api'
import MobileNumberField from './MobileNumberField'
import { isValidMobile, mobileDigits } from './mobileFormat'
import OtpCodeInput from './OtpCodeInput'
import PasswordSignIn from './PasswordSignIn'
import DoorHeading from './DoorHeading'
import { AUDIENCE_COPY } from './audience'
import { useFinishSignIn } from './useFinishSignIn'

/**
 * The Patient sign-in screen (entry page → Patient): sign in with a mobile
 * number (a code by SMS) or with email + password, and the way to create an
 * account.
 *
 * ⚠️ MOVED, NOT REWRITTEN. This is the patient half of the door-based Login
 * screen, with its layout, labels, ids, copy, state machine and server
 * messages unchanged. No emailed sign-in code: withdrawn 25 Sep 2026, and the
 * server refuses it.
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

/** How a patient chooses to sign in. */
type Method = 'Sms' | 'Password'

const METHODS: readonly Method[] = ['Sms', 'Password']

const METHOD_LABEL: Record<Method, string> = {
  Sms: 'Mobile number',
  Password: 'Email & password',
}

/** mm:ss from a server timestamp — presentation only; the server decides. */
function countdown(until: number, now: number): string {
  const secs = Math.max(0, Math.ceil((until - now) / 1000))
  return `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`
}

export default function PatientSignIn() {
  const { loginWithOtp } = useAuth()
  const finish = useFinishSignIn()

  const [method, setMethod] = useState<Method>('Sms')
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
    setPhase('authenticated')
    finish(result)
  }

  const chooseMethod = (m: Method) => {
    setMethod(m)
    setFieldError(undefined)
    setError('')
  }

  // ⚠️ A real radio group: one Tab stop, arrow keys move AND select (the
  // WAI-ARIA radio pattern). Before, each option was its own Tab stop and
  // arrows did nothing.
  const methodRefs = useRef<Partial<Record<Method, HTMLButtonElement | null>>>({})
  const onMethodKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (step === 0) return
    e.preventDefault()
    const next = METHODS[(METHODS.indexOf(method) + step + METHODS.length) % METHODS.length]
    chooseMethod(next)
    methodRefs.current[next]?.focus()
  }

  const busy = phase === 'requesting_otp' || phase === 'verifying_otp'

  // ── Stage 2 · code ───────────────────────────────────────────────────────
  if (otpScreen && challenge !== null) {
    return (
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
    )
  }

  // ── Stage 1 · identify ───────────────────────────────────────────────────
  return (
    <div>
      <DoorHeading
        title={AUDIENCE_COPY.patient.signInHeading}
        description={method === 'Password'
          ? 'Sign in with your email address and password.'
          : 'We’ll send a 6-digit code by SMS to your registered mobile number.'}
      />

      {/*
        ⚠️ A SIGN-IN METHOD, NOT A ROLE PICKER. It asks only how to prove who
        you are; the server resolves what the account is.
      */}
      <div
        role="radiogroup"
        aria-label="How would you like to sign in?"
        onKeyDown={onMethodKeyDown}
        className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-border-soft bg-surface-2 p-1"
      >
        {METHODS.map((m) => (
          <button
            key={m}
            ref={(el) => { methodRefs.current[m] = el }}
            type="button"
            role="radio"
            aria-checked={method === m}
            tabIndex={method === m ? 0 : -1}
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

      {method === 'Password' ? (
        // No autofocus here: arrowing across the method radios must not have
        // focus snatched into the email field on the way past.
        <PasswordSignIn audience="patient" onSignedIn={finish} />
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

      <p className="mt-6 text-sm text-ink-muted">
        New here?{' '}
        <Link to="/register?as=patient" className="focus-ring rounded font-semibold text-primary-700 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  )
}
