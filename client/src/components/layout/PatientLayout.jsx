import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import PatientSidebar from './PatientSidebar.jsx'
import PatientTopbar from './PatientTopbar.jsx'
import ErrorBoundary from '../feedback/ErrorBoundary.jsx'
import IdleWarning from '../feedback/IdleWarning.jsx'
import { titleForPath } from '../../app/navigation.js'
import { useAuth } from '../../app/AuthContext.jsx'
import { useIdleTimeout } from '../../app/useIdleTimeout.js'

/**
 * The single patient portal shell. Every patient route renders inside it —
 * no page defines its own chrome.
 *
 * Structure is semantic on purpose: <aside> nav, <header>, <main>. Phase 1
 * found the authenticated app was largely nested <div>s, so a screen-reader
 * user had no landmarks to navigate by.
 */
export default function PatientLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, role, logout } = useAuth()

  // Mounted here rather than in App so it can only ever run inside the
  // authenticated shell — an anonymous visitor reading the login page must
  // not be "signed out" of a session they do not have.
  const handleIdle = useCallback(async () => {
    await logout()
    navigate('/login', { replace: true, state: { expired: true } })
  }, [logout, navigate])

  const { warning, secondsLeft, stayActive } = useIdleTimeout({
    enabled: isAuthenticated,
    role,
    onIdle: handleIdle,
  })

  const closeMobile = useCallback(() => setMobileOpen(false), [])
  const openMobile = useCallback(() => setMobileOpen(true), [])

  // Close the drawer on navigation — otherwise it stays open over the page
  // the user just chose.
  useEffect(() => { closeMobile() }, [location.pathname, closeMobile])

  // Lock body scroll while the drawer is open, so the page behind does not
  // scroll under the user's finger.
  useEffect(() => {
    if (!mobileOpen) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [mobileOpen])

  // Keep the document title in step with the route — it is how a browser tab,
  // a bookmark, and a screen reader's page announcement all identify the page.
  const title = titleForPath(location.pathname)
  useEffect(() => { document.title = `${title} · Stroke AI` }, [title])

  return (
    <div className="min-h-screen bg-[#FAFBFC] text-[#0F172A]">
      {/* First tab stop on every page: jump past the nav straight to content. */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <PatientSidebar mobileOpen={mobileOpen} onMobileClose={closeMobile} />

      {/* Left padding clears the fixed sidebar on desktop only. */}
      <div className="flex min-h-screen flex-col lg:pl-[248px]">
        <PatientTopbar title={title} sidebarOpen={mobileOpen} onOpenSidebar={openMobile} />

        <main id="main-content" tabIndex={-1} className="flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1280px] px-4 py-5 sm:px-6 sm:py-6">
            {/* Keyed to the path so a thrown error on one page does not leave
                the boundary latched when the user navigates away. */}
            <ErrorBoundary key={location.pathname} label={`patient:${location.pathname}`}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {warning && <IdleWarning secondsLeft={secondsLeft} onStayActive={stayActive} />}
    </div>
  )
}
