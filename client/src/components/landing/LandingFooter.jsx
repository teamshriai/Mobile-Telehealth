import { Link } from 'react-router-dom'
import BrandMark from '../common/BrandMark.jsx'

/* ═══════════════════════════════════════════════════════════════════
   LandingFooter — Stroke AI

   Layout:
     ┌─────────────────────────────────────────────────────────────┐
     │  Start your care journey                                    │
     │  Create your account and get access today   [ Get Started ] │
     ├─────────────────────────────────────────────────────────────┤  ← 1px rule
     │  ✳ Stroke AI      Features  Benefits  Sign in                │
     ├─────────────────────────────────────────────────────────────┤  ← 1px rule
     │                                       © year Stroke AI …     │
     └─────────────────────────────────────────────────────────────┘

   Background: #ddeaf2  (mint — same tone as main page sections)
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
const BG    = '#ddeaf2'   // page-matched mint background
const RULE  = '#b6d2de'   // thin divider lines
const INK   = '#1a2e3b'   // darkest: logo text, icon fill
const BODY  = '#2c4a5a'   // nav links, contact text
const MUTED = '#4a6a7a'   // copyright line
const LINK  = '#1a6fa8'   // focus ring

/* ── Reusable nav / policy link ─────────────────────────────────── */
function FooterLink({ href, to, children, style = {} }) {
  const base = {
    ...HELV,
    fontSize: '12.5px',
    color: BODY,
    textDecoration: 'none',
    letterSpacing: '0.01em',
    whiteSpace: 'nowrap',
    transition: 'color 0.15s ease',
    ...style,
  }
  const hoverIn  = e => { e.currentTarget.style.color = INK }
  const hoverOut = e => { e.currentTarget.style.color = style.color ?? BODY }

  if (to) {
    return (
      <Link to={to} style={base} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
        {children}
      </Link>
    )
  }
  return (
    <a href={href} style={base} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
      {children}
    </a>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════════════ */
export default function LandingFooter() {
  const year = new Date().getFullYear()

  return (
    <>
      {/* ── Scoped responsive CSS ─────────────────────────────────── */}
      <style>{`
        /* ── CTA section ── */
        .nf-hero-wrap {
          max-width: 1320px;
          margin: 0 auto;
          padding: clamp(2.5rem, 6vw, 4.5rem) clamp(1.25rem, 4vw, 3rem) clamp(2.5rem, 5vw, 3.5rem);
        }
        .nf-hero-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: clamp(1.5rem, 4vw, 3rem);
        }
        .nf-cta-btn:focus-visible {
          outline: 2px solid ${LINK};
          outline-offset: 2px;
        }

        /* ── Top nav row ── */
        .nf-top-row {
          max-width: 1320px;
          margin: 0 auto;
          padding: 0 clamp(1.25rem, 4vw, 3rem);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          min-height: 72px;
        }
        .nf-site-nav {
          display: flex;
          align-items: center;
          gap: clamp(1rem, 2.2vw, 2rem);
          flex-wrap: wrap;
        }

        /* ── Bottom row ── */
        .nf-bottom-wrap {
          max-width: 1320px;
          margin: 0 auto;
          padding: clamp(1.5rem, 3vw, 2rem) clamp(1.25rem, 4vw, 3rem);
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }

        /* ── Mobile breakpoint ── */
        @media (max-width: 600px) {
          .nf-hero-row {
            flex-direction: column;
            align-items: flex-start;
          }
          .nf-top-row {
            flex-direction: column;
            align-items: flex-start;
            padding-top: 1.1rem;
            padding-bottom: 1.1rem;
            gap: 0.8rem;
            min-height: unset;
          }
          .nf-site-nav {
            gap: 0.8rem;
          }
          .nf-bottom-wrap {
            justify-content: flex-start;
          }
        }
      `}</style>

      <div style={{ width: '100%', background: BG }}>

        {/* ════ Top accent bar ═══════════════════════════════════════ */}
        <div
          aria-hidden="true"
          style={{
            height: '4px',
            width: '100%',
            background: 'linear-gradient(90deg, #4f7fb8 0%, #e8935a 50%, #7fbf6a 100%)',
          }}
        />

        {/* ════ SECTION — Start your care journey CTA ═══════════════ */}
        <section id="signup" aria-labelledby="nf-signup-heading">
          <div className="nf-hero-wrap">
            <div className="nf-hero-row">
              <div>
                <h2
                  id="nf-signup-heading"
                  style={{
                    ...DISPLAY,
                    fontSize: 'clamp(1.9rem, 4vw, 2.75rem)',
                    letterSpacing: '-0.01em',
                    color: INK,
                    margin: '0 0 10px',
                    lineHeight: 1.1,
                  }}
                >
                  Get Stroke AI ready
                </h2>
                <p style={{ ...HELV, fontSize: '14px', color: BODY, margin: 0, maxWidth: '480px' }}>
                  Create your account to set up fast, connected stroke care — for yourself or someone you love.
                </p>
              </div>

              <Link
                to="/register"
                className="nf-cta-btn"
                style={{
                  ...DISPLAY,
                  fontWeight: 500,
                  fontSize: '13px',
                  color: '#fff',
                  background: INK,
                  border: 'none',
                  borderRadius: '999px',
                  padding: '13px 30px',
                  width: 'fit-content',
                  textDecoration: 'none',
                  flexShrink: 0,
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
              >
                Get Started
              </Link>
            </div>
          </div>
        </section>

        <footer
          role="contentinfo"
          aria-label="Stroke AI site footer"
          style={{ width: '100%' }}
        >

          {/* ════ ROW 1 — Top navigation bar ═════════════════════════ */}
          <div style={{ borderTop: `1px solid ${RULE}`, borderBottom: `1px solid ${RULE}` }}>
            <div className="nf-top-row">

              {/* Brand mark + wordmark */}
              <Link
                to="/"
                aria-label="Stroke AI — return to homepage"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  textDecoration: 'none',
                  userSelect: 'none',
                  flexShrink: 0,
                }}
              >
                <BrandMark size={16} />
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                  <span style={{ ...DISPLAY, fontSize: '13px', letterSpacing: '-0.01em', color: INK }}>
                    Stroke AI
                  </span>
                  <span style={{ ...HELV, fontSize: '11px', letterSpacing: '0.04em', color: INK }}>
                    Emergency Response
                  </span>
                </div>
              </Link>

              {/* Site navigation — anchors match the real section ids on the page */}
              <nav aria-label="Footer site navigation" className="nf-site-nav">
                <FooterLink href="#services">Features</FooterLink>
                <FooterLink href="#benefits">Benefits</FooterLink>
                <FooterLink to="/demo">Platform</FooterLink>
                <FooterLink to="/login">Sign in</FooterLink>
              </nav>

            </div>
          </div>

          {/* ════ ROW 2 — Bottom bar ═══════════════════════════════════ */}
          <div className="nf-bottom-wrap">
            <p style={{ ...HELV, fontSize: '11px', color: MUTED, margin: 0, lineHeight: 1.6 }}>
              © {year} Stroke AI. All rights reserved.
            </p>
          </div>

        </footer>
      </div>
    </>
  )
}
