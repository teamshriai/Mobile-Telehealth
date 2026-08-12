import LandingNavbar from './LandingNavbar.jsx'
import LandingHeader from './LandingHeader.jsx'
import LandingFooter from './LandingFooter.jsx'

export default function LandingPage() {
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
