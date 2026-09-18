import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { X } from 'lucide-react'
import BrandMark from '../common/BrandMark.jsx'
import { PATIENT_NAV, PATIENT_ACCOUNT_NAV } from '../../app/navigation.js'

/**
 * Patient portal sidebar.
 *
 * Desktop: a persistent, always-labelled rail. The previous sidebar collapsed
 * to 64px icons and expanded on HOVER, which meant keyboard users tabbed
 * through unlabelled icons — the labels were revealed only by a pointer. Labels
 * are now always visible; the space cost is worth it on a portal whose users
 * include people with post-stroke visual and cognitive impairment.
 *
 * Mobile: an off-canvas drawer over a backdrop.
 */

function NavItem({ item, onNavigate }) {
  const Icon = item.icon
  const isEmergency = item.tone === 'emergency'

  return (
    <NavLink
      to={item.path}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          'focus-ring group flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isEmergency
            ? isActive
              ? 'bg-critical-bg text-critical-fg'
              : 'text-critical-fg hover:bg-critical-bg'
            : isActive
              ? 'bg-primary-50 text-primary-700'
              : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={19} aria-hidden="true" className="flex-shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
          <span className="truncate">{item.label}</span>
          {/* Marks the active item for screen readers; NavLink's styling alone
              conveys it visually only. */}
          {isActive && <span className="sr-only">(current page)</span>}
        </>
      )}
    </NavLink>
  )
}

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function PatientSidebar({ mobileOpen, onMobileClose }) {
  const asideRef = useRef(null)

  /*
   * Two problems fixed here, both mobile-only (the <aside> is always visible
   * on lg: and neither applies there):
   *
   * 1. When the drawer is CLOSED it still sits in the DOM, just translated
   *    off-screen — so without this, its nav links stayed in the Tab order
   *    while invisible. `inert` (not aria-hidden alone) removes them from
   *    both the accessibility tree and keyboard focus.
   * 2. When the drawer is OPEN, Tab must not escape into the page behind the
   *    backdrop — the same focus-trap pattern already used in Modal.jsx.
   */
  useEffect(() => {
    const aside = asideRef.current
    if (!aside) return undefined

    const isMobileViewport = () => window.matchMedia('(max-width: 1023px)').matches

    const applyInert = () => {
      if (isMobileViewport() && !mobileOpen) {
        aside.setAttribute('inert', '')
      } else {
        aside.removeAttribute('inert')
      }
    }
    applyInert()

    const mq = window.matchMedia('(max-width: 1023px)')
    mq.addEventListener?.('change', applyInert)

    if (!mobileOpen || !isMobileViewport()) {
      return () => mq.removeEventListener?.('change', applyInert)
    }

    // Move focus into the open drawer, then trap Tab inside it.
    const focusables = Array.from(aside.querySelectorAll(FOCUSABLE))
    focusables[0]?.focus()

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onMobileClose?.()
        return
      }
      if (e.key !== 'Tab' || focusables.length === 0) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      mq.removeEventListener?.('change', applyInert)
    }
  }, [mobileOpen, onMobileClose])

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={onMobileClose}
          className="fixed inset-0 z-30 bg-scrim lg:hidden"
        />
      )}

      <aside
        id="patient-sidebar"
        ref={asideRef}
        className={[
          'fixed left-0 top-0 z-40 flex h-screen w-[86vw] max-w-[272px] flex-col border-r border-border-soft bg-surface-1',
          'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          'lg:w-[248px] lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* ── Brand ── */}
        <div className="flex h-16 flex-shrink-0 items-center gap-2.5 border-b border-border-soft px-4">
          <BrandMark size={16} />
          <span className="text-[15px] font-bold tracking-tight text-ink">Stroke AI</span>

          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Close navigation menu"
            className="focus-ring tap-target ml-auto rounded-lg text-ink-muted hover:bg-surface-2 lg:hidden"
          >
            <X size={19} aria-hidden="true" />
          </button>
        </div>

        {/* ── Primary navigation ── */}
        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {PATIENT_NAV.map((item) => (
              <li key={item.path}>
                <NavItem item={item} onNavigate={onMobileClose} />
              </li>
            ))}
          </ul>

          {/* ── Account ── */}
          <div className="mt-6 border-t border-border-soft pt-4">
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
              Account
            </p>
            <ul className="space-y-1">
              {PATIENT_ACCOUNT_NAV.map((item) => (
                <li key={item.path}>
                  <NavItem item={item} onNavigate={onMobileClose} />
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </aside>
    </>
  )
}
