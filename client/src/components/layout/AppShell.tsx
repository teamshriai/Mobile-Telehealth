import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, LogOut, ChevronDown, Siren } from 'lucide-react'
import BrandMark from '../common/BrandMark'
import ThemeToggle from '../common/ThemeToggle'
import NotificationBell from './NotificationBell'
import ErrorBoundary from '../feedback/ErrorBoundary'
import IdleWarning from '../feedback/IdleWarning'
import { portalForRole, titleForPath, type PortalDescriptor } from '../../app/navigation'
import PatientBanner from '../clinical/PatientBanner'
import BreakGlassBanner from '../clinical/BreakGlassBanner'
import OfflineStrip from './OfflineStrip'
import AiDemoSwitch from '../../ai/components/AiDemoSwitch'
import AssistantBubble from '../../ai/components/AssistantBubble'
import { roleLabel } from '../clinical/clinicalLabels'
import { useAuth } from '../../app/useAuth'
import { useIdleTimeout } from '../../app/useIdleTimeout'
import { useDismissable } from '../../app/useDismissable'

/**
 * The one authenticated shell, for every portal.
 *
 * Replaces PatientLayout (fixed sidebar + topbar) and PortalShell (tab strip)
 * — two shells that navigated differently, carried different features, and
 * had drifted apart: only the patient one had notifications, an account menu
 * or a mobile drawer, and only the staff one worked below its own breakpoint
 * without one. Navigation is now a top navbar everywhere.
 *
 * Which items appear comes entirely from portalForRole(role), so adding a
 * portal is a descriptor change, not a new shell.
 *
 * Landmarks are semantic on purpose (<header>, <nav>, <main>) — Phase 1 found
 * the authenticated app was largely nested <div>s, leaving screen-reader users
 * nothing to navigate by.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function navItemClass(isActive: boolean, tone?: 'emergency'): string {
  const base =
    'focus-ring inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors'
  if (tone === 'emergency') {
    return `${base} ${isActive ? 'bg-critical-bg text-critical-fg' : 'text-critical-fg hover:bg-critical-bg'}`
  }
  return `${base} ${isActive ? 'bg-primary-50 text-primary-700' : 'text-ink-muted hover:bg-surface-2 hover:text-ink'}`
}

interface NavDrawerProps {
  open: boolean
  onClose: () => void
  portal: PortalDescriptor
  role: string | null | undefined
}

/** Slide-over navigation for narrow screens. Conditionally rendered rather
 *  than parked off-canvas, which is why it needs no `inert` juggling — the
 *  closed drawer simply is not in the tree. */
function NavDrawer({ open, onClose, portal, role }: NavDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return undefined

    previouslyFocused.current = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const panel = panelRef.current
    const focusables = panel ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)) : []
    ;(focusables[0] ?? panel)?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      // Always restore focus — dismissing a drawer must not strand focus on
      // an element that no longer exists.
      previouslyFocused.current?.focus?.()
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.button
            type="button"
            aria-label="Close navigation menu"
            onClick={onClose}
            className="absolute inset-0 bg-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            tabIndex={-1}
            className="absolute left-0 top-0 flex h-full w-[86vw] max-w-[300px] flex-col border-r border-border-soft bg-surface-1"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex h-16 flex-shrink-0 items-center gap-2.5 border-b border-border-soft px-4">
              <BrandMark size={16} />
              <span className="text-[15px] font-bold tracking-tight text-ink">Stroke AI</span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close navigation menu"
                className="focus-ring tap-target ml-auto rounded-lg text-ink-muted hover:bg-surface-2"
              >
                <X size={19} aria-hidden="true" />
              </button>
            </div>

            <nav aria-label="Main navigation" className="flex-1 overflow-y-auto p-3">
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                {portal.label}
              </p>
              <ul className="space-y-1">
                {portal.items.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      end={item.end}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `${navItemClass(isActive, item.tone)} w-full !items-start px-3 py-2.5`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon
                            size={19}
                            aria-hidden="true"
                            className="mt-0.5 flex-shrink-0"
                            strokeWidth={isActive ? 2.2 : 1.8}
                          />
                          <span className="min-w-0">
                            <span className="block truncate">{item.label}</span>
                            {item.description && (
                              <span className="block truncate text-xs font-normal text-ink-subtle">
                                {item.description}
                              </span>
                            )}
                          </span>
                          {isActive && <span className="sr-only">(current page)</span>}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>

              {portal.account.length > 0 && (
                <div className="mt-5 border-t border-border-soft pt-4">
                  <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                    Account
                  </p>
                  <ul className="space-y-1">
                    {portal.account.map((item) => (
                      <li key={item.path}>
                        <NavLink
                          to={item.path}
                          onClick={onClose}
                          className={({ isActive }) => `${navItemClass(isActive)} w-full py-2.5`}
                        >
                          <item.icon size={19} aria-hidden="true" className="flex-shrink-0" />
                          {item.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </nav>

            <p className="border-t border-border-soft px-4 py-3 text-xs text-ink-subtle">
              Signed in as {roleLabel(role)}
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function AccountMenu({ portal }: { portal: PortalDescriptor }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const close = useCallback(() => setOpen(false), [])
  useDismissable({ open, onClose: close, triggerRef, panelRef })

  const displayName = user?.name ?? user?.email ?? 'Your account'
  const initials = (user?.name ?? user?.email ?? '?')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  const handleSignOut = async () => {
    setSigningOut(true)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="focus-ring flex min-h-11 items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-2"
      >
        <span
          aria-hidden="true"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-700"
        >
          {initials}
        </span>
        <span className="hidden max-w-[160px] truncate text-sm font-medium text-ink sm:block">
          {displayName}
        </span>
        <ChevronDown size={15} aria-hidden="true" className="hidden text-ink-subtle sm:block" />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-label="Account menu"
          className="absolute right-0 top-[calc(100%+6px)] z-40 w-56 overflow-hidden rounded-xl border border-border-soft bg-surface-1 shadow-card-lg"
        >
          <div className="border-b border-border-soft px-3.5 py-3">
            <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
            {user?.email && <p className="truncate text-xs text-ink-subtle">{user.email}</p>}
          </div>

          {portal.account.map((item) => (
            <button
              key={item.path}
              type="button"
              role="menuitem"
              onClick={() => { close(); navigate(item.path) }}
              className="focus-ring flex min-h-11 w-full items-center gap-2.5 px-3.5 text-sm text-ink-muted transition-colors hover:bg-surface-2"
            >
              <item.icon size={16} aria-hidden="true" /> {item.label}
            </button>
          ))}

          <AiDemoSwitch />

          <div className="border-t border-border-soft">
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              disabled={signingOut}
              className="focus-ring flex min-h-11 w-full items-center gap-2.5 px-3.5 text-sm font-medium text-critical-fg transition-colors hover:bg-critical-bg disabled:opacity-60"
            >
              <LogOut size={16} aria-hidden="true" />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AppShell(): ReactNode {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, role, logout } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const portal = portalForRole(role)
  const title = titleForPath(location.pathname)

  const handleIdle = useCallback(async () => {
    await logout()
    navigate('/login', { replace: true, state: { expired: true } })
  }, [logout, navigate])

  const { warning, secondsLeft, stayActive } = useIdleTimeout({
    enabled: isAuthenticated,
    role,
    onIdle: handleIdle,
  })

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])
  useEffect(() => { closeDrawer() }, [location.pathname, closeDrawer])

  useEffect(() => { document.title = `${title} · Stroke AI` }, [title])

  // The emergency destination stays reachable in one tap at every width. On a
  // stroke product it must not be the item that scrolled off the end of the
  // strip or sits behind a hamburger.
  const emergencyItem = portal.items.find((i) => i.tone === 'emergency') ?? null

  // ⚠️ Compact density is scoped to the CLINICIAN shell only (UI_ATLAS §3.3).
  // The patient portal keeps comfortable density and its 14px type floor,
  // which exist because its users include people with post-stroke visual
  // field loss. Applying compact globally would trade a real accessibility
  // decision for a clinical one that does not apply to them.
  const isClinician =
    role === 'Doctor' || role === 'Resident' || role === 'HealthcareWorker' || role === 'LabTechnician'

  return (
    <div
      className="min-h-screen bg-bg text-ink"
      data-density={isClinician ? 'compact' : 'comfortable'}
    >
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <header className="sticky top-0 z-30 border-b border-border-soft bg-surface-1/95 backdrop-blur">
        <div className="flex h-16 items-center gap-2.5 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={drawerOpen}
            className="focus-ring tap-target -ml-1 rounded-lg text-ink-muted hover:bg-surface-2 lg:hidden"
          >
            <Menu size={21} aria-hidden="true" />
          </button>

          {/* Below sm the wordmark is dropped and the mark alone carries the
              brand. With the hamburger, emergency, theme, bell and account
              controls all present, keeping it pushed the row to 420px on a
              375px screen — the header, not the page, was the overflow. */}
          <BrandMark size={16} />
          <span className="hidden whitespace-nowrap text-[15px] font-bold tracking-tight text-ink sm:inline">
            Stroke AI
          </span>
          <span aria-hidden="true" className="hidden text-ink-subtle sm:inline">/</span>
          <span className="hidden whitespace-nowrap text-sm font-medium text-ink-subtle sm:inline">
            {portal.label}
          </span>
          <span className="sr-only">Stroke AI — {portal.label}</span>

          <div className="ml-auto flex items-center gap-1.5">
            {emergencyItem && (
              <NavLink
                to={emergencyItem.path}
                aria-label={emergencyItem.label}
                className="focus-ring tap-target rounded-lg text-critical-fg transition-colors hover:bg-critical-bg lg:hidden"
              >
                <Siren size={20} aria-hidden="true" />
              </NavLink>
            )}
            <ThemeToggle />
            <NotificationBell />
            <AccountMenu portal={portal} />
          </div>
        </div>

        {portal.items.length > 0 && (
          <nav
            aria-label="Main navigation"
            className="scrollbar-hide hidden overflow-x-auto px-4 pb-2 sm:px-6 lg:block"
          >
            <ul className="flex gap-1">
              {portal.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) => navItemClass(isActive, item.tone)}
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          size={17}
                          aria-hidden="true"
                          strokeWidth={isActive ? 2.2 : 1.8}
                        />
                        {item.label}
                        {isActive && <span className="sr-only">(current page)</span>}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* ── Z3 and GP-10 ──────────────────────────────────────────────────
            Inside <header> so both stay STICKY with the nav. A patient
            banner that scrolls away is a wrong-patient error waiting to
            happen — its whole purpose is to be visible at the moment of a
            clinical action, not at the moment the page loaded. Both render
            null when they have nothing to say. */}
        {/* GP-12 / C-37. Above the patient banner because losing the network
            changes what every action on the page will do, whoever the patient
            is. Renders null when online. */}
        <OfflineStrip />
        <BreakGlassBanner />
        <PatientBanner />
      </header>

      <NavDrawer open={drawerOpen} onClose={closeDrawer} portal={portal} role={role} />

      <main id="main-content" tabIndex={-1} className="overflow-x-hidden">
        <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
          {/* Keyed to the path so a thrown error on one page does not leave the
              boundary latched when the user navigates away. */}
          <ErrorBoundary key={location.pathname} label={`${role}:${location.pathname}`}>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>

      {/* ── Z7b · GP-17 ───────────────────────────────────────────────────
          Mounted by the shell, not by a screen: §6.1 makes it "the only
          element that appears on every screen in the product", and it floats
          rather than occupying layout width, so no screen has to make room
          for it. It hides itself entirely when assistance is off. */}
      <AssistantBubble />

      {warning && <IdleWarning secondsLeft={secondsLeft} onStayActive={stayActive} />}
    </div>
  )
}
