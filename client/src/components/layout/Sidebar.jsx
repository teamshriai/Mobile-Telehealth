import { useEffect, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  GitBranch,
  FileText,
  FlaskConical,
  Calendar,
  Sparkles,
  User,
  Settings,
  LogOut,
  ChevronRight,
  Activity,
  Video,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import Modal from '../common/Modal.jsx'
import Button from '../common/Button.jsx'
import BrandMark from '../common/BrandMark.jsx'

/* ── Navigation items ── */
const NAV_ITEMS = [
  {
    section: 'Overview',
    items: [
      { label: 'Dashboard',       path: '/dashboard',      icon: LayoutDashboard },
      { label: 'Timeline',        path: '/dashboard/timeline', icon: GitBranch },
    ],
  },
  {
    section: 'Medical',
    items: [
      { label: 'Health Records', path: '/dashboard/medical-records', icon: Activity },
      { label: 'Reports',         path: '/dashboard/reports',         icon: FileText },
      { label: 'Appointments',    path: '/dashboard/appointments',    icon: Calendar },
      { label: 'Online Meetings', path: '/dashboard/meetings',        icon: Video },
    ],
  },
  {
    section: 'Support',
    items: [
      { label: 'Care Guide',      path: '/dashboard/ai',             icon: Sparkles },
    ],
  },
]

const BOTTOM_ITEMS = [
  { label: 'Profile',  path: '/dashboard/profile',  icon: User },
  { label: 'Settings', path: '/dashboard/settings', icon: Settings },
]

/* Smoothly reveals a label as the rail expands, without the mount/unmount
   races that independent AnimatePresence blocks were prone to during the
   hover-expand transition — a single continuous CSS transition instead. */
function RevealLabel({ expanded, children, className = '' }) {
  return (
    <div
      className={`grid overflow-hidden transition-[grid-template-columns] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        expanded ? 'grid-cols-[1fr]' : 'grid-cols-[0fr]'
      }`}
    >
      <div className="min-w-0 overflow-hidden">
        <div
          className={`transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            expanded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

export default function Sidebar({ expanded, onExpandChange, mobileOpen = false, onMobileClose }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { logout } = useAuth()
  const [logoutModalOpen, setLogoutModalOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const handleLogout = async () => {
    setSigningOut(true)
    await logout()
    navigate('/login', { replace: true })
  }

  /* ── Retrieve user from localStorage ── */
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('oncotrace_user')) || {}
    } catch {
      return {}
    }
  })()

  const initials = user.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '—'
  // A touch device has no hover state; the open drawer must always show labels.
  const showExpanded = expanded || mobileOpen

  useEffect(() => {
    onMobileClose?.()
  }, [location.pathname, onMobileClose])

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Width and every label reveal inside this sidebar share the exact same
          CSS transition (duration-300, same cubic-bezier) so they run on one
          browser-compositor timeline instead of two independent animation
          engines — that mismatch was the actual cause of labels/positions
          looking wrong mid-transition, not something a visual patch fixes. */}
      <aside
        onMouseEnter={() => onExpandChange(true)}
        onMouseLeave={() => onExpandChange(false)}
        className={`fixed left-0 top-0 z-40 flex h-screen w-[88vw] max-w-[280px] flex-col overflow-hidden border-r border-white/20 backdrop-blur-2xl transition-[width,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:w-[280px] lg:translate-x-0 ${
          showExpanded ? 'lg:w-[216px]' : 'lg:w-[64px]'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{
          background: 'linear-gradient(165deg, rgba(23,37,84,0.97) 0%, rgba(29,58,138,0.95) 45%, rgba(30,64,175,0.92) 100%)',
          boxShadow: expanded
            ? '4px 0 32px 0 rgba(23,37,84,0.35)'
            : '1px 0 0 0 rgba(23,37,84,0.25)',
        }}
      >

      {/* ── Logo area ── */}
      <div className="flex h-14 flex-shrink-0 items-center border-b border-white/15 px-3">
        <div className="flex items-center gap-3 min-w-0">

          {/* Logo mark */}
          <BrandMark size={16} />

          {/* Brand name — slides in when expanded */}
          <RevealLabel expanded={showExpanded}>
            <p
              className="text-sm font-bold text-white whitespace-nowrap tracking-tight"
              style={{ fontFamily: 'DM Sans, Inter, sans-serif' }}
            >
              Stroke AI
            </p>
            <p className="text-[10px] text-white/70 whitespace-nowrap font-medium">
              Emergency care workspace
            </p>
          </RevealLabel>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3">
        <div className="space-y-5 px-2">
          {NAV_ITEMS.map((group) => (
            <NavGroup
              key={group.section}
              section={group.section}
              items={group.items}
              expanded={showExpanded}
              currentPath={location.pathname}
              onNavigate={onMobileClose}
            />
          ))}
        </div>
      </nav>

      {/* ── Bottom section ── */}
      <div className="flex-shrink-0 border-t border-white/15 px-3 py-3 space-y-1">

        {/* Profile + Settings links */}
        {BOTTOM_ITEMS.map((item) => (
          <SidebarNavItem
            key={item.path}
            item={item}
            expanded={showExpanded}
            isActive={location.pathname === item.path}
            onNavigate={onMobileClose}
          />
        ))}

        {/* Divider */}
        <div className="my-2 h-px bg-white/15" />

        {/* Patient avatar row */}
        <div
          className="flex items-center gap-3 px-2 py-2.5 rounded-xl
                     hover:bg-white/10 transition-colors duration-200 cursor-pointer group"
          onClick={() => navigate('/dashboard/profile')}
        >
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center
                       text-white text-xs font-bold ring-1 ring-white/30"
            style={{
              background: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
            }}
          >
            {initials}
          </div>

          {/* Name + role */}
          <RevealLabel expanded={showExpanded} className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {user.name || 'Patient'}
            </p>
            <p className="text-[10px] text-white/65 truncate">Patient</p>
          </RevealLabel>

          {/* Chevron */}
          {showExpanded && (
            <ChevronRight
              size={14}
              className="text-white/50 group-hover:text-white/80 transition-colors flex-shrink-0"
            />
          )}
        </div>

        {/* Logout button */}
        <button
          onClick={() => setLogoutModalOpen(true)}
          className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl
                     text-white/70 hover:text-white hover:bg-white/10
                     transition-all duration-200 group"
        >
          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
            <LogOut size={16} className="transition-colors duration-200 group-hover:text-red-200" />
          </div>

          <RevealLabel expanded={showExpanded}>
            <span className="text-xs font-medium whitespace-nowrap">Sign out</span>
          </RevealLabel>
        </button>
      </div>
      </aside>

      {/* Sign-out confirmation */}
      <Modal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        title="Sign out?"
        subtitle="You'll need to sign in again to access your account."
        size="sm"
        closeable={!signingOut}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setLogoutModalOpen(false)} disabled={signingOut}>
              No, stay signed in
            </Button>
            <Button variant="primary" size="sm" icon={<LogOut size={13} />} loading={signingOut} onClick={handleLogout}>
              Yes, sign out
            </Button>
          </>
        }
      />
    </>
  )
}

/* ── Nav group with section label ── */
function NavGroup({ section, items, expanded, currentPath, onNavigate }) {
  return (
    <div className="space-y-0.5">
      {/* Section label */}
      <RevealLabel expanded={expanded}>
        <p className={`px-2 text-[10px] font-semibold text-white/55
                       uppercase tracking-widest whitespace-nowrap ${expanded ? 'mb-2' : ''}`}>
          {section}
        </p>
      </RevealLabel>

      {/* Nav items */}
      {items.map((item) => (
        <SidebarNavItem
          key={item.path}
          item={item}
          expanded={expanded}
          isActive={
            item.path === '/dashboard'
              ? currentPath === '/dashboard'
              : currentPath.startsWith(item.path)
          }
          onNavigate={onNavigate}
        />
      ))}
    </div>
  )
}

/* ── Individual nav item ── */
function SidebarNavItem({ item, expanded, isActive, onNavigate }) {
  const { label, path, icon: Icon } = item

  return (
    <NavLink
      to={path}
      end={path === '/dashboard'}
      className="block"
      onClick={() => onNavigate?.()}
    >
      <div
        className={`relative flex items-center gap-3 px-2 py-2.5 rounded-xl
                    transition-all duration-200 group cursor-pointer
                    ${isActive
                      ? 'bg-white/15 text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
      >
        {/* Active indicator bar — local to this item, no cross-item shared
            animation. A shared `layoutId` here previously tried to FLIP-
            animate between two items' bounding boxes while the sidebar's
            own width was also changing, which is what broke its alignment;
            a plain per-item transition can't desync like that. */}
        <span
          aria-hidden="true"
          className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5
                     bg-white rounded-full transition-opacity duration-200
                     ${isActive ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Icon — a plain solid circle behind the active icon, tightly sized
            to the tile itself. The previous `ring-1` here added a second
            box-shadow layer that, under the sidebar's own backdrop-blur-2xl,
            bled outward into an oversized blurred halo — dropping the ring
            (keeping the solid fill) removes that without losing the circle. */}
        <div
          className={`w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-full transition-colors duration-200
                      ${isActive ? 'bg-white/20' : ''}`}
        >
          <Icon
            size={17}
            strokeWidth={1.75}
            className={`transition-colors duration-200
              ${isActive ? 'text-white' : 'text-white/70 group-hover:text-white'}`}
          />
        </div>

        {/* Label */}
        <RevealLabel expanded={expanded}>
          <span className={`text-xs font-medium whitespace-nowrap ${isActive ? 'text-white' : ''}`}>
            {label}
          </span>
        </RevealLabel>
      </div>
    </NavLink>
  )
}
