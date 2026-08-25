import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'

/* ── Page transition variants ── */
const pageVariants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1],
    },
  },
}

export default function AppLayout() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  )
  const location = useLocation()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const handleResize = () => setIsDesktop(mediaQuery.matches)

    handleResize()
    mediaQuery.addEventListener?.('change', handleResize)

    return () => mediaQuery.removeEventListener?.('change', handleResize)
  }, [])

  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), [])
  const openMobileSidebar = useCallback(() => setMobileSidebarOpen(true), [])

  useEffect(() => {
    if (isDesktop) setMobileSidebarOpen(false)
  }, [isDesktop])

  useEffect(() => {
    if (!mobileSidebarOpen) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeMobileSidebar()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [mobileSidebarOpen, closeMobileSidebar])

  const contentOffset = isDesktop ? (sidebarExpanded ? 216 : 64) : 0

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.06),_transparent_38%),#f8fafc] text-slate-900">
      <Sidebar
        expanded={sidebarExpanded}
        onExpandChange={setSidebarExpanded}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={closeMobileSidebar}
      />

      <div
        className="flex min-h-screen flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ paddingLeft: `${contentOffset}px` }}
      >
        <Topbar onOpenSidebar={openMobileSidebar} />

        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="mx-auto min-h-full w-full max-w-[1440px] px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6 2xl:max-w-[1680px]"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
