/**
 * useIdleTimeout.ts
 *
 * Signs a user out after a period of no interaction.
 *
 * Why this exists: a Stroke AI session shows health information, and the
 * devices it is opened on are frequently shared — a family tablet, a ward
 * terminal, a phone handed to a relative. An access token that stays live in
 * an abandoned tab is the realistic exposure here, not a stolen one.
 *
 * Two deliberate choices:
 *
 *  1. **There is a warning.** The population this product serves includes
 *     people recovering from stroke, who read slowly and may sit with a page
 *     for several minutes without touching anything. Signing them out mid-page
 *     with no notice would be a usability failure dressed as a security
 *     feature. One interaction during the warning keeps the session.
 *
 *  2. **It does not extend the session.** The timer governs this tab only. It
 *     cannot lengthen the refresh token's life, and the server remains the
 *     authority on when a session is genuinely over. This is a local guard,
 *     not an authentication mechanism.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RoleName } from '../types/domain'

/**
 * Minutes of inactivity before sign-out, by role.
 *
 * Staff get less: a clinician's screen shows many patients' data, not just
 * their own, so an unattended staff terminal exposes more. Mounted by the one
 * shared `AppShell` for every authenticated portal, so this actually runs for
 * every role now — it previously ran only under the patient-only layout.
 */
const IDLE_MINUTES_BY_ROLE: Partial<Record<RoleName, number>> = {
  Patient: 20,
  Doctor: 15,
  Resident: 15,
  HealthcareWorker: 15,
  LabTechnician: 15,
  Admin: 15,
  HospitalAdmin: 15,
}

/** Fallback for any role not listed — the stricter of the two. */
const DEFAULT_IDLE_MINUTES = 15

/** How long the "you're about to be signed out" warning is visible. */
const WARNING_SECONDS = 60

/**
 * Interactions that count as "still here". `scroll` and `mousemove` are
 * included because reading is activity; a page read without a click is the
 * common case, not an edge case.
 */
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'] as const

/**
 * Minimum gap between two activity resets. `mousemove` fires at a very high
 * rate; without this the hook would reset its timers hundreds of times a
 * second for no benefit.
 */
const THROTTLE_MS = 1000

export function idleMinutesForRole(role: string | null | undefined): number {
  if (!role) return DEFAULT_IDLE_MINUTES
  return IDLE_MINUTES_BY_ROLE[role as RoleName] ?? DEFAULT_IDLE_MINUTES
}

export interface UseIdleTimeoutOptions {
  /** Only run for an authenticated user. */
  enabled: boolean
  /** Drives the timeout length. */
  role: string | null | undefined
  /** Called once when the session times out. */
  onIdle: () => void
}

export interface UseIdleTimeoutResult {
  warning: boolean
  secondsLeft: number
  stayActive: () => void
}

export function useIdleTimeout({ enabled, role, onIdle }: UseIdleTimeoutOptions): UseIdleTimeoutResult {
  const [warning, setWarning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(WARNING_SECONDS)

  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const warnTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const countdown = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const lastActivity = useRef(0)
  // Guards against onIdle firing twice if a timer and an event race.
  const firedRef = useRef(false)

  // Held in a ref so changing the callback identity does not tear down and
  // rebuild every listener on each render.
  const onIdleRef = useRef(onIdle)
  useEffect(() => { onIdleRef.current = onIdle }, [onIdle])

  const clearAll = useCallback(() => {
    clearTimeout(idleTimer.current)
    clearTimeout(warnTimer.current)
    clearInterval(countdown.current)
  }, [])

  const reset = useCallback(() => {
    if (firedRef.current) return

    clearAll()
    setWarning(false)
    setSecondsLeft(WARNING_SECONDS)

    const totalMs = idleMinutesForRole(role) * 60_000
    const warnMs = WARNING_SECONDS * 1000

    // Show the warning WARNING_SECONDS before the deadline, then count down.
    warnTimer.current = setTimeout(() => {
      setWarning(true)
      setSecondsLeft(WARNING_SECONDS)
      countdown.current = setInterval(() => {
        setSecondsLeft((s) => (s > 0 ? s - 1 : 0))
      }, 1000)
    }, Math.max(totalMs - warnMs, 0))

    idleTimer.current = setTimeout(() => {
      firedRef.current = true
      clearAll()
      onIdleRef.current?.()
    }, totalMs)
  }, [role, clearAll])

  /** Dismisses the warning and restarts the clock. Bound to the modal button. */
  const stayActive = useCallback(() => {
    lastActivity.current = Date.now()
    reset()
  }, [reset])

  useEffect(() => {
    if (!enabled) {
      clearAll()
      setWarning(false)
      firedRef.current = false
      return undefined
    }

    firedRef.current = false
    lastActivity.current = Date.now()
    reset()

    const onActivity = () => {
      const now = Date.now()
      if (now - lastActivity.current < THROTTLE_MS) return
      lastActivity.current = now
      reset()
    }

    ACTIVITY_EVENTS.forEach((evt) => {
      window.addEventListener(evt, onActivity, { passive: true })
    })

    // A laptop lid closed for an hour does not fire timers reliably — some
    // browsers throttle or defer them while the tab is hidden. Re-checking the
    // wall clock on return catches the case a setTimeout alone would miss.
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || firedRef.current) return
      const idleMs = Date.now() - lastActivity.current
      if (idleMs >= idleMinutesForRole(role) * 60_000) {
        firedRef.current = true
        clearAll()
        onIdleRef.current?.()
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, onActivity))
      document.removeEventListener('visibilitychange', onVisible)
      clearAll()
    }
  }, [enabled, role, reset, clearAll])

  return { warning, secondsLeft, stayActive }
}

export { WARNING_SECONDS }
