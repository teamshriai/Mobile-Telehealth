import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Video, Menu, X, Shield, ArrowRight } from 'lucide-react'

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 font-sans ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-gray-200 py-3 shadow-xs'
          : 'bg-white border-b border-gray-100 py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-700 to-indigo-800 flex items-center justify-center text-white shadow-xs group-hover:bg-blue-800 transition-colors">
              <Video size={18} strokeWidth={2.2} />
            </div>
            <div>
              <span className="text-base font-bold text-gray-900 tracking-tight block leading-none">
                CareFlow
              </span>
              <span className="text-[10px] font-semibold text-blue-700 tracking-wider uppercase block mt-0.5">
                Telehealth Portal
              </span>
            </div>
          </Link>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-gray-600">
            <a href="#services" className="hover:text-blue-700 transition-colors">
              Services
            </a>
            <a href="#how-it-works" className="hover:text-blue-700 transition-colors">
              How It Works
            </a>
            <a href="#doctors" className="hover:text-blue-700 transition-colors">
              Our Specialists
            </a>
            <a href="#faq" className="hover:text-blue-700 transition-colors">
              Patient FAQ
            </a>
          </nav>

          {/* Action Buttons (Sign In / Sign Up) */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:text-blue-700 hover:bg-gray-50 transition-all border border-gray-200"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-xs flex items-center gap-1.5"
            >
              <span>Patient Portal Registration</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-gray-200 bg-white px-4 pt-3 pb-6 space-y-4 shadow-lg">
          <nav className="flex flex-col space-y-3 text-sm font-medium text-gray-700">
            <a
              href="#services"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-blue-700"
            >
              Services
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-blue-700"
            >
              How It Works
            </a>
            <a
              href="#doctors"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-blue-700"
            >
              Our Specialists
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-blue-700"
            >
              Patient FAQ
            </a>
          </nav>
          <div className="pt-3 border-t border-gray-100 flex flex-col gap-2.5">
            <Link
              to="/login"
              className="w-full text-center py-2.5 rounded-lg text-xs font-semibold text-gray-800 border border-gray-300 hover:bg-gray-50"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="w-full text-center py-2.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700"
            >
              Patient Portal Registration
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
