import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import BrandMark from '../common/BrandMark.jsx'

/**
 * LandingNavbar — transparent overlay nav with pill center menu.
 * Matches reference: top-left brand mark, center pill links, top-right text link.
 * Font: Aether for brand, Helvetica Light (300) for all nav links.
 * Font-synthesis: none is set globally; no bold/semibold classes used here.
 */
export default function LandingNavbar() {
  const [scrolled, setScrolled]         = useState(false)
  const [mobileOpen, setMobileOpen]     = useState(false)
  const navRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!mobileOpen) return

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    const onClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setMobileOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onClickOutside)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onClickOutside)
    }
  }, [mobileOpen])

  const pillLinkClass =
    'transition-opacity duration-200 opacity-75 hover:opacity-100 whitespace-nowrap'

  return (
    <header
      ref={navRef}
      style={{ fontSynthesis: 'none' }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300
        ${scrolled ? 'bg-black/45 backdrop-blur-md py-4' : 'bg-transparent py-7 sm:py-9'}`}
    >
      <div className="max-w-[1380px] mx-auto px-5 sm:px-10 lg:px-14">
        <div className="flex items-center justify-between gap-6">

          {/* ── Brand ── */}
          <Link
            to="/"
            style={{ fontFamily: 'Aether, sans-serif', fontWeight: 400, fontSynthesis: 'none' }}
            className="flex items-center gap-2.5 text-white opacity-90 hover:opacity-100 transition-opacity shrink-0"
          >
            <BrandMark size={14} rounded="rounded-full" />
            <div
              className="flex flex-col leading-[1.15]"
              style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase' }}
            >
              <span>Stroke</span>
              <span>AI</span>
            </div>
          </Link>

          {/* ── Pill Navigation – Desktop ── */}
          <nav
            aria-label="Primary navigation"
            style={{
              fontFamily: 'Helvetica, sans-serif',
              fontWeight: 300,
              fontSize: '12.5px',
              letterSpacing: '0.06em',
              fontSynthesis: 'none',
            }}
            className="hidden md:flex items-center gap-7 text-white
                       bg-white/10 backdrop-blur-md
                       border border-white/15
                       rounded-full px-6 py-2"
          >
            <a href="#services"    className={pillLinkClass}>Features</a>
            <a href="#how-it-works" className={pillLinkClass}>Benefits</a>
            <Link to="/demo"       className={pillLinkClass}>Platform</Link>
            <Link to="/register"   className={pillLinkClass}>Signup Form</Link>
          </nav>

          {/* ── Contacts link – Desktop ── */}
          <Link
            to="/login"
            style={{
              fontFamily: 'Helvetica, sans-serif',
              fontWeight: 300,
              fontSize: '12.5px',
              letterSpacing: '0.06em',
              fontSynthesis: 'none',
            }}
            className="hidden md:block text-white opacity-75 hover:opacity-100
                       transition-opacity duration-200 shrink-0"
          >
            Contacts
          </Link>

          {/* ── Hamburger – Mobile ── */}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="md:hidden p-1.5 text-white/85 hover:text-white
                       hover:bg-white/10 rounded-full transition-colors"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="landing-mobile-menu"
          >
            {mobileOpen
              ? <X     size={19} strokeWidth={1.25} />
              : <Menu  size={19} strokeWidth={1.25} />
            }
          </button>

        </div>
      </div>

      {/* ── Mobile Drawer ── */}
      {mobileOpen && (
        <div
          id="landing-mobile-menu"
          style={{ fontSynthesis: 'none' }}
          className="md:hidden absolute top-full inset-x-0
                     bg-black/90 backdrop-blur-2xl
                     border-b border-white/10 px-6 py-7"
        >
          <nav
            style={{
              fontFamily: 'Helvetica, sans-serif',
              fontWeight: 300,
              fontSize: '13px',
              letterSpacing: '0.08em',
            }}
            className="flex flex-col gap-5 text-white/80"
          >
            <a href="#services"     onClick={() => setMobileOpen(false)} className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" onClick={() => setMobileOpen(false)} className="hover:text-white transition-colors">Benefits</a>
            <Link to="/demo"        onClick={() => setMobileOpen(false)} className="hover:text-white transition-colors">Platform</Link>
            <Link to="/register"    onClick={() => setMobileOpen(false)} className="hover:text-white transition-colors">Signup Form</Link>
            <Link to="/login"       onClick={() => setMobileOpen(false)} className="hover:text-white transition-colors">Contacts</Link>
          </nav>
        </div>
      )}
    </header>
  )
}
