import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Bell,
  ChevronRight,
  X,
  CheckCircle,
  AlertCircle,
  Info,
  Calendar,
} from 'lucide-react'

/* ── Breadcrumb label map ── */
const BREADCRUMB_MAP = {
  '/':               ['Dashboard'],
  '/timeline':       ['Dashboard', 'Timeline'],
  '/medical-records':['Dashboard', 'Health Records'],
  '/reports':        ['Dashboard', 'Reports'],
  '/appointments':   ['Dashboard', 'Appointments'],
  '/ai':             ['Dashboard', 'Care Guide'],
  '/profile':        ['Dashboard', 'Profile'],
  '/settings':       ['Dashboard', 'Settings'],
}

/* ── Mock notifications ── */
const NOTIFICATIONS = [
  {
    id: 1,
    type: 'success',
    title: 'Liquid biopsy result ready',
    desc: 'Your ctDNA analysis from Oct 14 is now available.',
    time: '2 min ago',
    unread: true,
  },
  {
    id: 2,
    type: 'info',
    title: 'Appointment reminder',
    desc: 'Dr. Priya Nair — tomorrow at 10:30 AM.',
    time: '1 hr ago',
    unread: true,
  },
  {
    id: 3,
    type: 'warning',
    title: 'Report review pending',
    desc: 'Your uploaded MRI scan awaits physician review.',
    time: '3 hr ago',
    unread: false,
  },
  {
    id: 4,
    type: 'info',
    title: 'AI insight generated',
    desc: 'New treatment recommendation based on latest genomics.',
    time: 'Yesterday',
    unread: false,
  },
]

const NOTIFICATION_ICONS = {
  success: { icon: CheckCircle, color: '#16A34A', bg: '#DCFCE7' },
  warning: { icon: AlertCircle, color: '#F59E0B', bg: '#FEF3C7' },
  info:    { icon: Info,        color: '#0EA5E9', bg: '#E0F2FE' },
}

export default function Topbar({ onOpenSidebar }) {
  const location = useLocation()
  const navigate = useNavigate()

  const [searchOpen,  setSearchOpen]  = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [notifOpen,   setNotifOpen]   = useState(false)

  const breadcrumbs = BREADCRUMB_MAP[location.pathname] || ['Dashboard']
  const unreadCount = NOTIFICATIONS.filter((n) => n.unread).length

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSearchOpen(false)
        setNotifOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  /* ── Current date ── */
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month:   'short',
    day:     'numeric',
    year:    'numeric',
  })

  /* ── User from localStorage ── */
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

  return (
    <header
      className="sticky top-0 z-30 flex h-14 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white/85 px-4 sm:px-5"
      style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
    >

      {/* ── Left: Breadcrumb ── */}
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E8EDF2] bg-[#F8FAFC] text-[#0F172A] shadow-sm transition-colors hover:bg-[#EFF6FF] lg:hidden"
          aria-label="Open navigation"
        >
          <span className="flex flex-col gap-1">
            <span className="h-0.5 w-4 rounded-full bg-current" />
            <span className="h-0.5 w-4 rounded-full bg-current" />
            <span className="h-0.5 w-4 rounded-full bg-current" />
          </span>
        </button>

        <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
        {breadcrumbs.map((crumb, i) => (
          <div key={crumb} className="flex items-center gap-1.5">
            {i > 0 && (
              <ChevronRight size={13} className="text-[#CBD5E1]" />
            )}
            <span
              className={`text-sm font-medium transition-colors
                ${i === breadcrumbs.length - 1
                  ? 'text-[#0F172A]'
                  : 'text-[#94A3B8] hover:text-[#64748B] cursor-pointer'
                }`}
              onClick={() => i === 0 && navigate('/')}
            >
              {crumb}
            </span>
          </div>
        ))}
        </div>
      </div>

      {/* ── Right: Actions ── */}
      <div className="flex items-center gap-2 sm:gap-3">

        {/* Date pill */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5
                        rounded-full bg-[#F1F5F9] border border-[#E8EDF2]">
          <Calendar size={12} className="text-[#94A3B8]" />
          <span className="text-xs text-[#64748B] font-medium whitespace-nowrap">
            {today}
          </span>
        </div>

        {/* Search button */}
        <button
          onClick={() => setSearchOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl
                     text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]
                     transition-all duration-200"
        >
          <Search size={16} />
        </button>

        {/* Notification button */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="w-9 h-9 flex items-center justify-center rounded-xl
                       text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]
                       transition-all duration-200 relative"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#2563EB]
                           ring-2 ring-white"
              />
            )}
          </button>

          {/* Notification dropdown */}
          <AnimatePresence>
            {notifOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setNotifOpen(false)}
                />

                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 top-12 w-[min(340px,calc(100vw-2rem))] bg-white
                             rounded-2xl border border-[#E8EDF2] z-50 overflow-hidden"
                  style={{
                    boxShadow: '0 8px 40px 0 rgba(15,23,42,0.12)',
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3.5
                                  border-b border-[#E8EDF2]">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-[#0F172A]">
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold
                                         rounded-full bg-[#2563EB] text-white">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setNotifOpen(false)}
                      className="w-6 h-6 flex items-center justify-center rounded-lg
                                 text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F1F5F9]
                                 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>

                  {/* List */}
                  <div className="divide-y divide-[#F1F5F9] max-h-[360px] overflow-y-auto">
                    {NOTIFICATIONS.map((notif) => (
                      <NotificationItem key={notif.id} notif={notif} />
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-3 border-t border-[#E8EDF2] bg-[#FAFBFC]">
                    <button
                      className="text-xs text-[#2563EB] font-medium
                                 hover:text-[#1D4ED8] transition-colors"
                    >
                      Mark all as read
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-[#E8EDF2] mx-1" />

        {/* Patient avatar */}
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2.5 pl-1 pr-3 py-1.5 rounded-full
                     hover:bg-[#F1F5F9] transition-all duration-200 group"
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center
                       text-white text-xs font-bold flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #2563EB, #3B82F6)',
            }}
          >
            {initials}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-[#0F172A] leading-none">
              {user.name?.split(' ')[0] || 'Anand'}
            </p>
            <p className="text-[10px] text-[#94A3B8] leading-none mt-0.5">Patient</p>
          </div>
        </button>
      </div>

      {/* ── Search overlay ── */}
      <AnimatePresence>
        {searchOpen && (
          <SearchOverlay
            query={searchQuery}
            onQueryChange={setSearchQuery}
            onClose={() => {
              setSearchOpen(false)
              setSearchQuery('')
            }}
          />
        )}
      </AnimatePresence>
    </header>
  )
}

/* ── Notification item ── */
function NotificationItem({ notif }) {
  const { icon: Icon, color, bg } = NOTIFICATION_ICONS[notif.type]

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer
                  hover:bg-[#FAFBFC] transition-colors duration-150
                  ${notif.unread ? 'bg-[#EFF6FF]/40' : 'bg-white'}`}
    >
      {/* Icon */}
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ backgroundColor: bg }}
      >
        <Icon size={14} style={{ color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[#0F172A] leading-snug">
          {notif.title}
        </p>
        <p className="text-xs text-[#64748B] leading-snug mt-0.5 line-clamp-2">
          {notif.desc}
        </p>
        <p className="text-[10px] text-[#94A3B8] mt-1 font-medium">
          {notif.time}
        </p>
      </div>

      {/* Unread dot */}
      {notif.unread && (
        <div className="w-1.5 h-1.5 rounded-full bg-[#2563EB] flex-shrink-0 mt-1.5" />
      )}
    </div>
  )
}

/* ── Search overlay ── */
function SearchOverlay({ query, onQueryChange, onClose }) {
  const navigate = useNavigate()

  const QUICK_LINKS = [
    { label: 'Dashboard',       path: '/' },
    { label: 'Timeline',        path: '/timeline' },
    { label: 'Medical Records', path: '/medical-records' },
    { label: 'Reports',         path: '/reports' },
    { label: 'Appointments',    path: '/appointments' },
    { label: 'AI Assistant',    path: '/ai' },
    { label: 'Profile',         path: '/profile' },
    { label: 'Settings',        path: '/settings' },
  ]

  const filtered = query.length > 0
    ? QUICK_LINKS.filter((l) =>
        l.label.toLowerCase().includes(query.toLowerCase())
      )
    : QUICK_LINKS

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-[#0F172A]/30 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Search modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -16 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="fixed left-1/2 top-[12vh] max-h-[80vh] -translate-x-1/2 w-[calc(100%-2rem)] max-w-[520px]
                   bg-white rounded-2xl border border-[#E8EDF2] z-50 overflow-hidden"
        style={{ boxShadow: '0 20px 60px 0 rgba(15,23,42,0.16)' }}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-[#E8EDF2]">
          <Search size={16} className="text-[#94A3B8] flex-shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search pages, reports, appointments..."
            className="flex-1 text-sm text-[#0F172A] placeholder-[#94A3B8]
                       bg-transparent focus:outline-none"
          />
          <button
            onClick={onClose}
            className="text-xs text-[#94A3B8] bg-[#F1F5F9] px-2 py-1
                       rounded-lg hover:bg-[#E8EDF2] transition-colors font-medium"
          >
            Esc
          </button>
        </div>

        {/* Results */}
        <div className="py-2 max-h-[320px] overflow-y-auto">
          {filtered.length > 0 ? (
            <>
              <p className="px-4 py-1.5 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-widest">
                {query ? 'Results' : 'Quick Navigation'}
              </p>
              {filtered.map((link) => (
                <button
                  key={link.path}
                  onClick={() => {
                    navigate(link.path)
                    onClose()
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5
                             hover:bg-[#F8FAFC] transition-colors text-left group"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#F1F5F9] flex items-center
                                  justify-center group-hover:bg-[#EFF6FF] transition-colors">
                    <ChevronRight size={13} className="text-[#94A3B8] group-hover:text-[#2563EB]" />
                  </div>
                  <span className="text-sm text-[#0F172A] font-medium">{link.label}</span>
                </button>
              ))}
            </>
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-[#94A3B8]">No results for "{query}"</p>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2.5 border-t border-[#E8EDF2] bg-[#FAFBFC]
                        flex items-center gap-4">
          <span className="text-[10px] text-[#94A3B8]">
            Press <kbd className="px-1 py-0.5 bg-[#E8EDF2] rounded text-[10px] font-mono">Enter</kbd> to navigate
          </span>
          <span className="text-[10px] text-[#94A3B8]">
            Press <kbd className="px-1 py-0.5 bg-[#E8EDF2] rounded text-[10px] font-mono">Esc</kbd> to close
          </span>
        </div>
      </motion.div>
    </>
  )
}
