import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import BrandMark from '../common/BrandMark.jsx'
import { BODY, STRONG, INK, INK_BODY, PAPER, RULE, EASE } from './theme.js'
import { INK as HERO_INK, HAIRLINE as HERO_HAIRLINE } from './hero/heroTheme.js'

/**
 * LandingNavbar — overlay navigation whose items are separate containers rather
 * than one grouped pill.
 *
 * Two palettes: light-on-photograph while the hero fills the screen, ink-on-cream
 * once it has shrunk away. The switch is driven by a sentinel the hero renders
 * (`[data-nav-sentinel]`) instead of a scroll offset, because the pinned hero
 * makes any fixed pixel threshold meaningless.
 */

const NAV_LINKS = [
  { label: 'Our Command Centre', href: '#services' },
  { label: 'Why It Matters', href: '#how-it-works' },
  { label: 'Our Team', href: '#team' },
  { label: 'Platform', to: '/demo' },
  { label: 'Signup Form', to: '/register' },
]

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navRef = useRef(null)

  /* The hero is a normal (non-pinned) block now, so a plain scroll offset —
     the spec's own "past 24px scroll" — is enough; an intersection-based
     sentinel is what the old pinned hero needed, and on a tall mobile hero
     (copy stacked above a full-width media panel) it reads the page as
     "scrolled" before the user has scrolled at all, since its sentinel would
     start off screen below the fold. */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!mobileOpen) return

    const onKeyDown = (e) => { if (e.key === 'Escape') setMobileOpen(false) }
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

  const ink = scrolled ? INK_BODY : 'rgba(255,255,255,0.88)'
  const inkStrong = scrolled ? INK : '#ffffff'
  const chipBorder = scrolled ? RULE : 'rgba(255,255,255,0.30)'
  const chipBg = scrolled ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.08)'

  /* Each item is its own container: same hairline box, own padding, own hover. */
  const chip = {
    ...BODY,
    fontSize: '12.5px',
    letterSpacing: '0.01em',
    lineHeight: 1,
    color: ink,
    background: chipBg,
    border: `1px solid ${chipBorder}`,
    borderRadius: '8px',
    padding: '9px 14px',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    WebkitBackdropFilter: 'blur(10px)',
    backdropFilter: 'blur(10px)',
    transition: `color .25s ${EASE}, background .25s ${EASE}, border-color .25s ${EASE}`,
  }

  const hoverIn = (e) => {
    e.currentTarget.style.color = inkStrong
    e.currentTarget.style.background = scrolled ? '#ffffff' : 'rgba(255,255,255,0.18)'
  }
  const hoverOut = (e) => {
    e.currentTarget.style.color = ink
    e.currentTarget.style.background = chipBg
  }

  return (
    <header
      ref={navRef}
      className="sticky top-0 z-50"
      style={{
        fontSynthesis: 'none',
        padding: scrolled ? '12px 0' : '20px 0',
        /* Sits directly above the dark hero in normal flow (no overlay trick
           any more), so the "unscrolled" state matches the hero's own ink
           tone rather than a true transparency that would otherwise show
           the page's light base background through it. */
        background: scrolled ? 'rgba(247,245,239,0.88)' : HERO_INK,
        borderBottom: `1px solid ${scrolled ? RULE : HERO_HAIRLINE}`,
        WebkitBackdropFilter: scrolled ? 'blur(14px)' : 'none',
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        transition: `padding .35s ${EASE}, background .35s ${EASE}, border-color .35s ${EASE}`,
      }}
    >
      <div className="max-w-[1380px] mx-auto px-5 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between gap-4 xl:gap-6">

          {/* ── Brand + partner marks, one group so they stay together ── */}
          <div className="flex items-center gap-3 xl:gap-4 shrink-0">
          <Link
            to="/"
            className="flex items-center gap-2.5 shrink-0"
            style={{ textDecoration: 'none' }}
          >
            <BrandMark size={14} rounded="rounded-full" />
            <div
              className="flex flex-col leading-[1.15]"
              style={{
                ...STRONG,
                fontSize: '11px',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: inkStrong,
                transition: `color .35s ${EASE}`,
              }}
            >
              <span>Stroke</span>
              <span>AI</span>
            </div>
          </Link>

          {/* ── Partner marks — a single quiet chip so both read on the
                photograph and on cream without restyling per state. Hidden
                below xl, where the nav needs the room more than the branding. */}
          <span className="hidden xl:flex items-center shrink-0" style={{
            gap: '9px',
            background: '#FFFFFF',
            border: `1px solid ${scrolled ? RULE : 'rgba(255,255,255,0.42)'}`,
            borderRadius: '8px',
            padding: '6px 12px',
            transition: `border-color .35s ${EASE}`,
          }}>
            {/* Same pair as the partner band below the hero, so the branding
                doesn't change identity between the bar and the page. */}
            <picture>
              <source srcSet="/shri-ai-logo-trans.webp" type="image/webp" />
              <img
                src="/shri-ai-logo.png" alt="SHRI-AI"
                width="640" height="640" decoding="async"
                style={{ height: '30px', width: 'auto', objectFit: 'contain', display: 'block' }}
              />
            </picture>
            <span aria-hidden="true" style={{ width: '1px', height: '22px', background: RULE }} />
            <picture>
              <source srcSet="/logo-indostates-trans.webp" type="image/webp" />
              <img
                src="/logo-indostates.png" alt="IndoStates Health Hospital"
                width="640" height="156" decoding="async"
                style={{ height: '19px', width: 'auto', objectFit: 'contain', display: 'block' }}
              />
            </picture>
          </span>
          </div>

          {/* ── Individual nav containers — desktop ── */}
          <nav aria-label="Primary navigation" className="hidden lg:flex items-center gap-3 xl:gap-3.5">
            {NAV_LINKS.map(({ label, href, to }) => (
              to ? (
                <Link key={label} to={to} style={chip} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
                  {label}
                </Link>
              ) : (
                <a key={label} href={href} style={chip} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
                  {label}
                </a>
              )
            ))}
          </nav>

          {/* ── Contact — desktop ── */}
          <Link
            to="/login"
            className="hidden lg:block shrink-0"
            style={{
              ...STRONG,
              fontSize: '12.5px',
              letterSpacing: '0.01em',
              lineHeight: 1,
              color: scrolled ? PAPER : INK,
              background: scrolled ? INK : 'rgba(255,255,255,0.92)',
              border: `1px solid ${scrolled ? INK : 'rgba(255,255,255,0.92)'}`,
              borderRadius: '8px',
              padding: '10px 18px',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              transition: `color .25s ${EASE}, background .25s ${EASE}, border-color .25s ${EASE}`,
            }}
          >
            Contacts
          </Link>

          {/* ── Hamburger — mobile / tablet ── */}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="lg:hidden rounded-lg p-2 transition-colors"
            style={{
              color: inkStrong,
              background: chipBg,
              border: `1px solid ${chipBorder}`,
            }}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="landing-mobile-menu"
          >
            {mobileOpen
              ? <X size={18} strokeWidth={1.4} />
              : <Menu size={18} strokeWidth={1.4} />
            }
          </button>

        </div>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div
          id="landing-mobile-menu"
          className="lg:hidden absolute top-full inset-x-0 px-5 py-5"
          style={{
            background: 'rgba(247,245,239,0.97)',
            borderBottom: `1px solid ${RULE}`,
            WebkitBackdropFilter: 'blur(18px)',
            backdropFilter: 'blur(18px)',
          }}
        >
          <nav className="flex flex-col gap-2">
            {[...NAV_LINKS, { label: 'Contacts', to: '/login' }].map(({ label, href, to }) => {
              const item = {
                ...BODY,
                fontSize: '13.5px',
                color: INK_BODY,
                background: '#FFFDF8',
                border: `1px solid ${RULE}`,
                borderRadius: '8px',
                padding: '13px 16px',
                textDecoration: 'none',
                display: 'block',
              }
              return to ? (
                <Link key={label} to={to} onClick={() => setMobileOpen(false)} style={item}>{label}</Link>
              ) : (
                <a key={label} href={href} onClick={() => setMobileOpen(false)} style={item}>{label}</a>
              )
            })}
          </nav>
        </div>
      )}
    </header>
  )
}
