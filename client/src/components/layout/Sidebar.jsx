import { useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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

/* ── Sidebar widths ── */
const COLLAPSED_W = 64
const EXPANDED_W  = 216

export default function Sidebar({ expanded, onExpandChange, mobileOpen = false, onMobileClose }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { logout } = useAuth()

  const handleLogout = async () => {
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
    : 'AK'
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

      <motion.aside
        initial={false}
        animate={{ width: showExpanded ? EXPANDED_W : COLLAPSED_W }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onMouseEnter={() => onExpandChange(true)}
        onMouseLeave={() => onExpandChange(false)}
        className={`fixed left-0 top-0 z-40 flex h-screen w-[88vw] max-w-[280px] flex-col overflow-hidden border-r border-[#E8EDF2] bg-white/95 transition-transform duration-300 sm:w-[280px] lg:w-auto lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{
          boxShadow: expanded
            ? '4px 0 24px 0 rgba(15,23,42,0.06)'
            : '1px 0 0 0 rgba(15,23,42,0.06)',
        }}
      >

      {/* ── Logo area ── */}
      <div className="flex h-14 flex-shrink-0 items-center border-b border-slate-200 px-3">
        <div className="flex items-center gap-3 min-w-0">

          {/* Logo mark */}
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
            style={{
              background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
            }}
          >
            <OncotraceMark />
          </div>

          {/* Brand name — slides in when expanded */}
          <AnimatePresence>
            {showExpanded && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <p
                  className="text-sm font-bold text-[#0F172A] whitespace-nowrap tracking-tight"
                  style={{ fontFamily: 'DM Sans, Inter, sans-serif' }}
                >
                  CareFlow
                </p>
                <p className="text-[10px] text-[#94A3B8] whitespace-nowrap font-medium">
                  Health workspace
                </p>
              </motion.div>
            )}
          </AnimatePresence>
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
      <div className="flex-shrink-0 border-t border-[#E8EDF2] px-3 py-3 space-y-1">

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
        <div className="my-2 h-px bg-[#E8EDF2]" />

        {/* Patient avatar row */}
        <div
          className="flex items-center gap-3 px-2 py-2.5 rounded-xl
                     hover:bg-[#F1F5F9] transition-colors duration-200 cursor-pointer group"
          onClick={() => navigate('/profile')}
        >
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center
                       text-white text-xs font-bold"
            style={{
              background: 'linear-gradient(135deg, #2563EB, #3B82F6)',
            }}
          >
            {initials}
          </div>

          {/* Name + role */}
          <AnimatePresence>
            {showExpanded && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="flex-1 min-w-0 overflow-hidden"
              >
                <p className="text-xs font-semibold text-[#0F172A] truncate">
                  {user.name || 'Anand Krishnamurthy'}
                </p>
                <p className="text-[10px] text-[#94A3B8] truncate">Patient</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chevron */}
          <AnimatePresence>
            {showExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <ChevronRight
                  size={14}
                  className="text-[#94A3B8] group-hover:text-[#64748B] transition-colors"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl
                     text-[#64748B] hover:text-[#DC2626] hover:bg-[#FEE2E2]
                     transition-all duration-200 group"
        >
          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
            <LogOut size={16} className="transition-colors duration-200" />
          </div>

          <AnimatePresence>
            {showExpanded && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="text-xs font-medium whitespace-nowrap"
              >
                Sign out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
      </motion.aside>
    </>
  )
}

/* ── Nav group with section label ── */
function NavGroup({ section, items, expanded, currentPath, onNavigate }) {
  return (
    <div className="space-y-0.5">
      {/* Section label */}
      <AnimatePresence>
        {expanded && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="px-2 mb-2 text-[10px] font-semibold text-[#94A3B8]
                       uppercase tracking-widest whitespace-nowrap"
          >
            {section}
          </motion.p>
        )}
      </AnimatePresence>

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
                      ? 'bg-[#EFF6FF] text-[#2563EB]'
                      : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                    }`}
      >
        {/* Active indicator bar */}
        {isActive && (
          <motion.div
            layoutId="activeIndicator"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5
                       bg-[#2563EB] rounded-full"
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          />
        )}

        {/* Icon */}
        <div
          className={`w-8 h-8 flex items-center justify-center flex-shrink-0
                      rounded-lg transition-all duration-200
                      ${isActive
                        ? 'bg-[#2563EB]/10'
                        : 'group-hover:bg-[#F1F5F9]'
                      }`}
        >
          <Icon
            size={16}
            className={`transition-colors duration-200
              ${isActive ? 'text-[#2563EB]' : 'text-[#64748B] group-hover:text-[#0F172A]'}`}
          />
        </div>

        {/* Label */}
        <AnimatePresence>
          {expanded && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={`text-xs font-medium whitespace-nowrap
                ${isActive ? 'text-[#2563EB]' : ''}`}
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </NavLink>
  )
}

/* ── SVG logo mark ── */
function OncotraceMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M4 9C4 6.239 6.239 4 9 4C11.761 4 14 6.239 14 9"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="9" cy="9" r="2" fill="white" />
      <path
        d="M9 11L9 14"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M6.5 12.5L11.5 12.5"
        stroke="white"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  )
}
