import { Link } from 'react-router-dom'
import BrandMark from '../common/BrandMark.jsx'
import { DISPLAY, BODY, STRONG, CREAM, PAPER, INK, INK_BODY, INK_SUBTLE, RULE, EASE } from './theme.js'

/* ═══════════════════════════════════════════════════════════════════
   LandingFooter — closing call to action, then the site rails.

     ┌─────────────────────────────────────────────────────────────┐
     │  Get Stroke AI ready                        [ Get Started ] │
     ├─────────────────────────────────────────────────────────────┤  ← hairline
     │  ✳ Stroke AI      Our Command Centre · Why It Matters …     │
     ├─────────────────────────────────────────────────────────────┤  ← hairline
     │                       A joint initiative … © year Stroke AI │
     └─────────────────────────────────────────────────────────────┘
═══════════════════════════════════════════════════════════════════ */

/* ── Reusable nav / policy link ─────────────────────────────────── */
function FooterLink({ href, to, children }) {
  const base = {
    ...BODY,
    fontSize: '13px',
    color: INK_BODY,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    transition: `color 0.18s ${EASE}`,
  }
  const hoverIn = e => { e.currentTarget.style.color = INK }
  const hoverOut = e => { e.currentTarget.style.color = INK_BODY }

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

/* ═══════════════════════════════════════════════════════════════════ */
export default function LandingFooter() {
  const year = new Date().getFullYear()

  return (
    <>
      <style>{`
        .nf-hero-wrap {
          max-width: 1320px;
          margin: 0 auto;
          padding: clamp(3rem, 6vw, 5rem) clamp(1.25rem, 3vw, 2.5rem) clamp(2.5rem, 5vw, 3.5rem);
        }
        .nf-hero-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: clamp(1.5rem, 4vw, 3rem);
        }
        .nf-top-row {
          max-width: 1320px;
          margin: 0 auto;
          padding: 0 clamp(1.25rem, 3vw, 2.5rem);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          min-height: 76px;
        }
        .nf-site-nav {
          display: flex;
          align-items: center;
          gap: clamp(1rem, 2.2vw, 2rem);
          flex-wrap: wrap;
        }
        .nf-bottom-wrap {
          max-width: 1320px;
          margin: 0 auto;
          padding: clamp(1.5rem, 3vw, 2rem) clamp(1.25rem, 3vw, 2.5rem);
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 5px;
        }
        .nf-cta-btn:focus-visible {
          outline: 2px solid #5aa9e6;
          outline-offset: 3px;
        }

        @media (max-width: 640px) {
          .nf-hero-row { flex-direction: column; align-items: flex-start; }
          .nf-top-row {
            flex-direction: column;
            align-items: flex-start;
            padding-top: 1.25rem;
            padding-bottom: 1.25rem;
            gap: 1rem;
            min-height: unset;
          }
          .nf-site-nav { gap: 0.9rem; }
          .nf-bottom-wrap { align-items: flex-start; }
        }
      `}</style>

      <div style={{ width: '100%', background: CREAM, borderTop: `1px solid ${RULE}` }}>

        {/* ════ Closing call to action ═══════════════════════════════ */}
        <section id="signup" aria-labelledby="nf-signup-heading">
          <div className="nf-hero-wrap">
            <div className="nf-hero-row">
              <div>
                <h2
                  id="nf-signup-heading"
                  style={{
                    ...DISPLAY,
                    fontSize: 'clamp(2rem, 4.6vw, 3.4rem)',
                    letterSpacing: '-0.012em',
                    lineHeight: 1.06,
                    color: INK,
                    margin: '0 0 14px',
                    maxWidth: '16ch',
                  }}
                >
                  Get Stroke AI ready
                </h2>
                <p style={{ ...BODY, fontSize: 'clamp(13.5px, 1.15vw, 15.5px)', lineHeight: 1.7, color: INK_BODY, margin: 0, maxWidth: '48ch' }}>
                  Create your account to set up fast, connected stroke care — for yourself or someone you love.
                </p>
                <p style={{ ...BODY, fontSize: '13px', lineHeight: 1.7, color: INK_BODY, margin: '16px 0 0', maxWidth: '48ch' }}>
                  Building this with us? Hospitals, ambulance networks, and health-tech partners are
                  welcome to reach our team directly —{' '}
                  <a
                    href="mailto:partner@stroke-ai.org"
                    style={{ ...STRONG, color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}
                  >
                    partner with us →
                  </a>
                </p>
              </div>

              <Link
                to="/register"
                className="nf-cta-btn"
                style={{
                  ...STRONG,
                  fontSize: '13.5px',
                  color: PAPER,
                  background: INK,
                  border: `1px solid ${INK}`,
                  borderRadius: '8px',
                  padding: '14px 30px',
                  width: 'fit-content',
                  textDecoration: 'none',
                  flexShrink: 0,
                  transition: `background 0.2s ${EASE}, color 0.2s ${EASE}`,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = INK }}
                onMouseLeave={e => { e.currentTarget.style.background = INK; e.currentTarget.style.color = PAPER }}
              >
                Get Started
              </Link>
            </div>
          </div>
        </section>

        <footer role="contentinfo" aria-label="Stroke AI site footer" style={{ width: '100%' }}>

          {/* ════ Site rail ══════════════════════════════════════════ */}
          <div style={{ borderTop: `1px solid ${RULE}`, borderBottom: `1px solid ${RULE}` }}>
            <div className="nf-top-row">

              <Link
                to="/"
                aria-label="Stroke AI — return to homepage"
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  textDecoration: 'none', userSelect: 'none', flexShrink: 0,
                }}
              >
                <BrandMark size={16} />
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                  <span style={{ ...STRONG, fontSize: '13px', color: INK }}>Stroke AI</span>
                  <span style={{ ...BODY, fontSize: '11.5px', letterSpacing: '0.04em', color: INK_BODY }}>
                    Emergency Response
                  </span>
                </div>
              </Link>

              <nav aria-label="Footer site navigation" className="nf-site-nav">
                <FooterLink href="#services">Our Command Centre</FooterLink>
                <FooterLink href="#how-it-works">Why It Matters</FooterLink>
                <FooterLink href="#team">Our Team</FooterLink>
                <FooterLink to="/login">Sign in</FooterLink>
              </nav>

            </div>
          </div>

          {/* ════ Fine print ═══════════════════════════════════════════ */}
          <div className="nf-bottom-wrap">
            <p style={{ ...BODY, fontSize: '11.5px', color: INK_BODY, margin: 0, lineHeight: 1.6 }}>
              A joint initiative of SHRI-AI and IndoStates Health Hospital
            </p>
            <p style={{ ...BODY, fontSize: '11.5px', color: INK_SUBTLE, margin: 0, lineHeight: 1.6 }}>
              © {year} Stroke AI. All rights reserved.
            </p>
          </div>

        </footer>
      </div>
    </>
  )
}
