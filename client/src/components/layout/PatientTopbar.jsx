import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, LogOut, ChevronDown, User as UserIcon, Settings as SettingsIcon } from 'lucide-react'
import { useAuth } from '../../app/AuthContext.jsx'
import NotificationBell from './NotificationBell.jsx'

/**
 * Patient portal top bar: menu toggle (mobile), page title, notifications,
 * account menu.
 *
 * Phase 1 found the bell rendering four hardcoded fake notifications. Phase 2
 * removed it rather than ship an empty or fabricated one. Phase 3 reinstates
 * it now that appointment request/cancel genuinely write Notification rows —
 * see NotificationBell.jsx.
 */
export default function PatientTopbar({ title, sidebarOpen, onOpenSidebar }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const menuRef = useRef(null)
  const triggerRef = useRef(null)

  // Close on Escape and on outside click, and return focus to the trigger —
  // without the focus return, dismissing the menu strands keyboard focus on
  // an element that no longer exists.
  useEffect(() => {
    if (!menuOpen) return undefined

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        triggerRef.current?.focus()
      }
    }
    const onPointerDown = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [menuOpen])

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
    <header className="sticky top-0 z-20 flex h-16 flex-shrink-0 items-center gap-3 border-b border-[#E8EDF2] bg-white/95 px-4 backdrop-blur sm:px-5">
      <button
        type="button"
        onClick={onOpenSidebar}
        aria-label="Open navigation menu"
        aria-controls="patient-sidebar"
        aria-expanded={sidebarOpen}
        className="focus-ring tap-target -ml-1 rounded-lg text-[#475569] hover:bg-[#F1F5F9] lg:hidden"
      >
        <Menu size={21} aria-hidden="true" />
      </button>

      {/* The page's accessible heading lives in the page body; this is a
          secondary visual label, so it is not an <h1>. */}
      <p className="truncate text-[15px] font-semibold text-[#0F172A]">{title}</p>

      <div className="ml-auto flex items-center gap-1.5">
        <NotificationBell />

        <div className="relative">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="focus-ring flex min-h-11 items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#F1F5F9]"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-xs font-bold text-[#1D4ED8]"
            >
              {initials}
            </span>
            <span className="hidden max-w-[160px] truncate text-sm font-medium text-[#0F172A] sm:block">
              {displayName}
            </span>
            <ChevronDown size={15} aria-hidden="true" className="text-[#64748B]" />
          </button>

          {menuOpen && (
            <div
              ref={menuRef}
              role="menu"
              aria-label="Account menu"
              className="absolute right-0 top-[calc(100%+6px)] w-56 overflow-hidden rounded-xl border border-[#E8EDF2] bg-white shadow-[0_4px_16px_0_rgba(15,23,42,0.08)]"
            >
              <div className="border-b border-[#E8EDF2] px-3.5 py-3">
                <p className="truncate text-sm font-semibold text-[#0F172A]">{displayName}</p>
                {user?.email && (
                  <p className="truncate text-xs text-[#64748B]">{user.email}</p>
                )}
              </div>

              <button
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); navigate('/app/profile') }}
                className="focus-ring flex w-full min-h-11 items-center gap-2.5 px-3.5 text-sm text-[#475569] transition-colors hover:bg-[#F1F5F9]"
              >
                <UserIcon size={16} aria-hidden="true" /> Profile
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); navigate('/app/settings') }}
                className="focus-ring flex w-full min-h-11 items-center gap-2.5 px-3.5 text-sm text-[#475569] transition-colors hover:bg-[#F1F5F9]"
              >
                <SettingsIcon size={16} aria-hidden="true" /> Settings
              </button>

              <div className="border-t border-[#E8EDF2]">
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="focus-ring flex w-full min-h-11 items-center gap-2.5 px-3.5 text-sm font-medium text-[#A33A28] transition-colors hover:bg-[#FBEAE7] disabled:opacity-60"
                >
                  <LogOut size={16} aria-hidden="true" />
                  {signingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
