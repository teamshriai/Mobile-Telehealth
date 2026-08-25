import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import LandingNavbar from './LandingNavbar.jsx'
import LandingHeader from './LandingHeader.jsx'
import LandingFooter from './LandingFooter.jsx'

export default function LandingPage() {
  const { hash } = useLocation()

  // The browser tries to scroll to the URL fragment before this route's lazy
  // chunk has rendered the target section, so a direct/refreshed load of
  // e.g. /#services silently lands at the top instead. Retry once mounted.
  useEffect(() => {
    if (!hash) return
    const id = hash.slice(1)

    const scrollToTarget = () => {
      const el = document.getElementById(id)
      if (!el) return
      const top = el.getBoundingClientRect().top + window.scrollY
      // Explicit 'instant' bypasses the root's `scroll-behavior: smooth`
      // (index.css), which would otherwise animate and may not finish
      // before the browser considers the page "loaded".
      window.scrollTo({ top, behavior: 'instant' })
    }

    // Images below the fold (feature/benefit photos) can still be decoding
    // when this effect first runs, which shifts section offsets below and
    // makes an early measurement land short. Re-measure a few times as
    // layout settles rather than guessing a single "safe" delay.
    scrollToTarget()
    const timeouts = [100, 400, 1200].map((ms) => window.setTimeout(scrollToTarget, ms))

    return () => timeouts.forEach(window.clearTimeout)
  }, [hash])

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Fixed navigation bar */}
      <LandingNavbar />

      {/* Hero + scroll-reveal content sections (all in one component) */}
      <LandingHeader />

      {/* Footer */}
      <LandingFooter />
    </div>
  )
}
