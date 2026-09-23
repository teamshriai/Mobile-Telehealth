import { useEffect, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import * as breakGlassService from '../../services/breakGlass.service'
import { useAuth } from '../../app/useAuth'
import type { BreakGlassGrantView } from '../../types/domain'

/**
 * `GP-10` — the break-glass banner.
 *
 * ⚠️ UI_ATLAS: *"Amber, full width, reason-before-render; 'This access is
 * logged and reviewed'."* It persists for the LIFE OF THE GRANT, on every
 * screen — not just the one where glass was broken. A clinician must never
 * be able to forget they are inside an emergency-access session, because
 * forgetting is how a twelve-hour grant becomes a habit.
 *
 * Deliberately not dismissible. A banner you can close is a banner that is
 * closed.
 */
export default function BreakGlassBanner() {
  const { isAuthenticated, can } = useAuth()
  const [grants, setGrants] = useState<BreakGlassGrantView[]>([])

  useEffect(() => {
    // Only clinicians who can break glass can hold a grant — asking for
    // anyone else is a guaranteed 403 on every page load.
    if (!isAuthenticated || !can('breakglass:request:any')) {
      setGrants([])
      return undefined
    }

    let cancelled = false
    const load = (): void => {
      breakGlassService
        .listActiveGrants()
        .then((g) => { if (!cancelled) setGrants(g) })
        .catch(() => { if (!cancelled) setGrants([]) })
    }
    load()

    // Re-checked periodically so the banner disappears when the grant
    // expires, without needing a reload. Expiry is the safety property;
    // a banner that outlives it would be lying in the other direction.
    const timer = window.setInterval(load, 60_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [isAuthenticated, can])

  if (grants.length === 0) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-warning-fg/40 bg-warning-bg px-4 py-2 sm:px-6"
      // The browser suite asserts this banner appears after a grant, survives
      // navigation, and contains NO dismiss control. GP-10 is not dismissible.
      data-testid="break-glass-banner"
    >
      <div className="mx-auto flex w-full max-w-7xl items-start gap-2.5">
        <ShieldAlert size={16} aria-hidden="true" className="mt-0.5 flex-shrink-0 text-warning-fg" />
        <p className="min-w-0 text-xs leading-relaxed text-warning-fg">
          <strong className="font-semibold">Emergency access in effect</strong> —{' '}
          {grants.length === 1
            ? `you are accessing ${grants[0].patientName} (${grants[0].shriPatientId}) without a care relationship.`
            : `you hold emergency access to ${grants.length} patient records without a care relationship.`}{' '}
          This access is logged and reviewed.
          {grants.length === 1 && (
            <>
              {' '}Expires {new Date(grants[0].expiresAt).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })}.
            </>
          )}
        </p>
      </div>
    </div>
  )
}
