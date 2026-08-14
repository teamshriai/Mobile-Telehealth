import { Link } from 'react-router-dom'

/* ═══════════════════════════════════════════════════════════════════
   LandingFooter — pixel-accurate match to reference image.

   Font contract (identical to LandingHeader):
     Headings / nav labels  →  Plus Jakarta Sans 400  (DISPLAY)
     Body / address / copy  →  Helvetica Light 300    (HELV)

   Layout (reference breakdown):
     ┌────────────────────────────────────────────────────────────┐
     │  [LogoMark  CareFlow / Telehealth]  [Privacy] [Accessibility]  ···  [Features] [Benefits] [Signup Form] [Contacts]  │
     ├────────────────────────────────────────────────────────────┤  ← full-width 1px rule
     │  Tel: ...        Address: ...        ◉ ◉ ◉               │
     │  Email: ...      500 Medical ...     © year CareFlow…     │
     └────────────────────────────────────────────────────────────┘

   Background: #ddeaf2  (same mint as Features section above)
═══════════════════════════════════════════════════════════════════ */

/* ── Font tokens ────────────────────────────────────────────────── */
const DISPLAY = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontWeight: 400,
  fontSynthesis: 'none',
  WebkitFontSmoothing: 'antialiased',
}
const HELV = {
  fontFamily: "'Helvetica', 'Helvetica Neue', Arial, sans-serif",
  fontWeight: 300,
  fontSynthesis: 'none',
  WebkitFontSmoothing: 'antialiased',
}

/* ── Colour tokens ──────────────────────────────────────────────── */
const BG          = '#ddeaf2'
const RULE        = '#b6d2de'
const INK         = '#1a2e3b'
const BODY        = '#2c4a5a'
const MUTED       = '#4a6a7a'
const ACCENT      = '#1a6fa8'

/* ── 2×2 grid logomark (matches reference) ──────────────────────── */
function LogoMark() {
  return (
    <div aria-hidden="true" style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr 1fr',
      gap: '3px',
      width: '28px',
      height: '28px',
      flexShrink: 0,
    }}>
      <div style={{ background: INK, borderRadius: '2px' }} />
      <div style={{ background: INK, borderRadius: '2px' }} />
      <div style={{ background: INK, borderRadius: '2px' }} />
      {/* bottom-right: outline only — reference detail */}
      <div style={{ border: `1.5px solid ${INK}`, borderRadius: '2px', background: 'transparent' }} />
    </div>
  )
}

/* ── Social icon SVGs ────────────────────────────────────────────── */
function IconFacebook() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}
function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" width="12" height="12" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
function IconX() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

/* ── Hover-aware link helper ─────────────────────────────────────── */
function FooterLink({ href, children, style = {} }) {
  return (
    <a
      href={href}
      style={{
        ...HELV,
        fontSize: '12.5px',
        color: BODY,
        textDecoration: 'none',
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
        transition: 'color 0.15s ease',
        ...style,
      }}
      onMouseEnter={e => (e.currentTarget.style.color = INK)}
      onMouseLeave={e => (e.currentTarget.style.color = BODY)}
    >
      {children}
    </a>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function LandingFooter() {
  const year = new Date().getFullYear()

  return (
    <>
      {/* ── Scoped responsive styles ──────────────────────────────── */}
      <style>{`
        /* Default: 3-column bottom grid */
        .lf-bottom-grid {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: start;
          gap: clamp(1.5rem, 4vw, 3rem);
        }

        /* ≤ 900px: 2-col (contact | address+socials stacked) */
        @media (max-width: 900px) {
          .lf-bottom-grid {
            grid-template-columns: 1fr 1fr;
          }
          .lf-right-col {
            grid-column: 1 / -1;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between;
          }
          .lf-copy {
            text-align: left !important;
            white-space: normal !important;
          }
        }

        /* ≤ 600px: single column, everything stacked */
        @media (max-width: 600px) {
          .lf-top-row {
            flex-direction: column !important;
            align-items: flex-start !important;
            padding-top: 1.1rem !important;
            padding-bottom: 1.1rem !important;
            gap: 0.75rem !important;
          }
          .lf-left-cluster {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 0.6rem !important;
          }
          .lf-bottom-grid {
            grid-template-columns: 1fr !important;
          }
          .lf-right-col {
            grid-column: auto !important;
            flex-direction: column !important;
            align-items: flex-start !important;
          }
          .lf-copy {
            white-space: normal !important;
          }
        }
      `}</style>

      <footer
        role="contentinfo"
        aria-label="Site footer"
        style={{ width: '100%', background: BG }}
      >

        {/* ══ ROW 1 — top nav bar ══════════════════════════════════ */}
        <div style={{ borderTop: `1px solid ${RULE}`, borderBottom: `1px solid ${RULE}` }}>
          <div
            className="lf-top-row"
            style={{
              maxWidth: '1320px',
              margin: '0 auto',
              padding: '0 clamp(1.25rem, 4vw, 3rem)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              minHeight: '72px',
            }}
          >
            {/* Left: logo + policy links */}
            <div
              className="lf-left-cluster"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'clamp(1.5rem, 3vw, 2.8rem)',
                flexWrap: 'wrap',
              }}
            >
              {/* Brand */}
              <Link
                to="/"
                aria-label="CareFlow Telehealth — go to homepage"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  textDecoration: 'none',
                  userSelect: 'none',
                  flexShrink: 0,
                }}
              >
                <LogoMark />
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.22 }}>
                  <span style={{ ...DISPLAY, fontSize: '13px', letterSpacing: '-0.01em', color: INK }}>
                    CareFlow
                  </span>
                  <span style={{ ...HELV, fontSize: '11px', letterSpacing: '0.02em', color: INK }}>
                    Telehealth
                  </span>
                </div>
              </Link>

              {/* Policy links */}
              <nav aria-label="Legal links" style={{ display: 'flex', alignItems: 'center', gap: 'clamp(1rem, 2vw, 1.8rem)', flexWrap: 'wrap' }}>
                <FooterLink href="#privacy">Privacy Policy</FooterLink>
                <FooterLink href="#accessibility">Accessibility Statement</FooterLink>
              </nav>
            </div>

            {/* Right: site nav */}
            <nav aria-label="Footer site navigation" style={{ display: 'flex', alignItems: 'center', gap: 'clamp(1rem, 2vw, 1.8rem)', flexWrap: 'wrap' }}>
              <FooterLink href="#services">Features</FooterLink>
              <FooterLink href="#how-it-works">Benefits</FooterLink>
              <FooterLink href="#signup">Signup Form</FooterLink>
              <FooterLink href="#contact">Contacts</FooterLink>
            </nav>
          </div>
        </div>

        {/* ══ ROW 2 — bottom info bar ══════════════════════════════ */}
        <div style={{ maxWidth: '1320px', margin: '0 auto', padding: 'clamp(2rem, 4.5vw, 3.2rem) clamp(1.25rem, 4vw, 3rem)' }}>
          <div className="lf-bottom-grid">

            {/* Col 1: Tel + Email */}
            <address style={{ fontStyle: 'normal' }}>
              <p style={{ ...HELV, fontSize: '12px', color: BODY, lineHeight: 2, margin: 0 }}>
                <span style={{ fontWeight: 400 }}>Tel:</span>{' '}
                <a
                  href="tel:+18005550000"
                  style={{ color: BODY, textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = INK)}
                  onMouseLeave={e => (e.currentTarget.style.color = BODY)}
                >
                  +1 (800) 555-CARE
                </a>
              </p>
              <p style={{ ...HELV, fontSize: '12px', color: BODY, lineHeight: 2, margin: 0 }}>
                <span style={{ fontWeight: 400 }}>Email:</span>{' '}
                <a
                  href="mailto:support@careflow.health"
                  style={{ color: BODY, textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = INK)}
                  onMouseLeave={e => (e.currentTarget.style.color = BODY)}
                >
                  support@careflow.health
                </a>
              </p>
            </address>

            {/* Col 2: Address */}
            <address style={{ fontStyle: 'normal' }}>
              <p style={{ ...HELV, fontSize: '12px', color: BODY, lineHeight: 2, margin: 0 }}>
                <span style={{ fontWeight: 400 }}>Address:</span>
              </p>
              <p style={{ ...HELV, fontSize: '12px', color: BODY, lineHeight: 2, margin: 0 }}>
                500 Medical Center Blvd
              </p>
              <p style={{ ...HELV, fontSize: '12px', color: BODY, lineHeight: 2, margin: 0 }}>
                San Francisco, CA 94158
              </p>
            </address>

            {/* Col 3: Social icons + Copyright */}
            <div
              className="lf-right-col"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '10px',
              }}
            >
              {/* Social circles */}
              <div role="list" aria-label="Social media links" style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                {[
                  { href: 'https://facebook.com',  label: 'Facebook',  Icon: IconFacebook },
                  { href: 'https://instagram.com', label: 'Instagram', Icon: IconInstagram },
                  { href: 'https://twitter.com',   label: 'X',         Icon: IconX },
                ].map(({ href, label, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    role="listitem"
                    aria-label={`Follow us on ${label}`}
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      background: INK,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none',
                      flexShrink: 0,
                      transition: 'background 0.15s ease, transform 0.15s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = BODY
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = INK
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                    onFocus={e => { e.currentTarget.style.outline = `2px solid ${ACCENT}`; e.currentTarget.style.outlineOffset = '2px' }}
                    onBlur={e => { e.currentTarget.style.outline = 'none' }}
                  >
                    <Icon />
                  </a>
                ))}
              </div>

              {/* Copyright */}
              <p
                className="lf-copy"
                style={{
                  ...HELV,
                  fontSize: '11px',
                  color: MUTED,
                  margin: 0,
                  textAlign: 'right',
                  lineHeight: 1.6,
                  whiteSpace: 'nowrap',
                }}
              >
                © {year} by CareFlow Telehealth. Powered and secured by{' '}
                <a
                  href="#security"
                  style={{ color: ACCENT, textDecoration: 'underline', transition: 'opacity 0.15s ease' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  CareFlow
                </a>
              </p>
            </div>

          </div>
        </div>
      </footer>
    </>
  )
}