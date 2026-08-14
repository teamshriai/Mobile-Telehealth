import { useState } from 'react'
import { Link } from 'react-router-dom'

/* ═══════════════════════════════════════════════════════════════════
   LandingFooter — pixel-accurate to Nimbus Commute reference design.

   Font contract:
     Headings / nav labels  →  Plus Jakarta Sans 400  (DISPLAY)
     Body / address / copy  →  Helvetica Light 300    (HELV)

   Layout:
     ┌─────────────────────────────────────────────────────────────┐
     │  Start Your Journey            ⌢⌢⌢  map + route lines      │
     │  Create your account…          [🚲][🚶][🚌]                 │
     │  [ First name  ]                          ┌──────────┐      │
     │  [ Last name   ]                          │  photo   │      │
     │  [ Email       ]                          └──────────┘      │
     │  ( Claim My Spot )                                          │
     ├─────────────────────────────────────────────────────────────┤  ← 1px rule
     │  ✳ Nimbus  Privacy Policy  Accessibility ··· Features  Benefits  Signup Form  Contacts  │
     │    Commute                                                  │
     ├─────────────────────────────────────────────────────────────┤  ← 1px rule
     │  Tel: 123-456-7890    Address:                  ◉ ◉ ◉      │
     │  Email: info@mysite   500 Terry Francine St     © year …   │
     │                       San Francisco, CA 94158               │
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
const BG      = '#ddeaf2'   // page-matched mint background
const RULE    = '#b6d2de'   // thin divider lines
const INK     = '#1a2e3b'   // darkest: logo text, icon fill
const BODY    = '#2c4a5a'   // nav links, contact text
const MUTED   = '#4a6a7a'   // copyright line
const LINK    = '#1a6fa8'   // Wix anchor + focus ring
const ERROR   = '#c23b3b'   // required-field asterisk + validation text
const SUCCESS = '#2f7a4f'   // submit success message

/* ── Starburst logomark (8-arm asterisk with endpoint dots) ─────── */
function LogoMark() {
  const cx = 19
  const cy = 19
  const R  = 14.5

  // 8 arms at 45° increments, pointing up at i=0
  const arms = Array.from({ length: 8 }, (_, i) => {
    const rad = ((i * 45) - 90) * (Math.PI / 180)
    return {
      x: cx + Math.cos(rad) * R,
      y: cy + Math.sin(rad) * R,
    }
  })

  return (
    <svg
      viewBox="0 0 38 38"
      width="34"
      height="34"
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0, display: 'block' }}
    >
      {/* Radiating arms */}
      {arms.map((a, i) => (
        <line
          key={`arm-${i}`}
          x1={cx} y1={cy}
          x2={a.x} y2={a.y}
          stroke={INK}
          strokeWidth="1.35"
          strokeLinecap="round"
        />
      ))}
      {/* Endpoint dots */}
      {arms.map((a, i) => (
        <circle key={`dot-${i}`} cx={a.x} cy={a.y} r="1.9" fill={INK} />
      ))}
      {/* Centre hub */}
      <circle cx={cx} cy={cy} r="2.4" fill={INK} />
    </svg>
  )
}

/* ── Social icon SVGs ────────────────────────────────────────────── */
function IconFacebook() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width="12"
      height="12"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

function IconInstagram() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="12"
      height="12"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconX() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width="11"
      height="11"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

/* ── Commute-mode badge icons (bike / walk / bus) ────────────────── */
function IconBike() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true" focusable="false">
      <circle cx="5.5" cy="17.5" r="3.2" />
      <circle cx="18.5" cy="17.5" r="3.2" />
      <path d="M5.5 17.5 10 8h4l3 5.5M10 8 8.5 5H6" />
      <path d="M10 8h5l3.5 9.5" />
    </svg>
  )
}

function IconWalk() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true" focusable="false">
      <circle cx="13.5" cy="4" r="1.6" fill="currentColor" stroke="none" />
      <path d="M12 7.5 8.5 9l1 4-3 2.5M13 7.5l3 1.5-.5 4 2.5 4M9.5 13l3.5-.5 2 1.5" />
    </svg>
  )
}

function IconBus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true" focusable="false">
      <rect x="4" y="4.5" width="16" height="12" rx="2.2" />
      <path d="M4 10.5h16" />
      <path d="M8 16.5v2M16 16.5v2" />
      <circle cx="8" cy="13.3" r="0.6" fill="currentColor" />
      <circle cx="16" cy="13.3" r="0.6" fill="currentColor" />
    </svg>
  )
}

/* ── Decorative commute-map illustration ─────────────────────────── */
function MapIllustration() {
  return (
    <svg
      viewBox="0 0 640 500"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      {/* Street network */}
      <g fill="none" stroke="#aec4cf" strokeWidth="1.1" strokeLinecap="round">
        <path d="M30 70 L190 45 L360 95 L440 65 L600 115" />
        <path d="M30 70 L55 190 L20 330 L75 430" />
        <path d="M190 45 L205 165 L360 95" />
        <path d="M360 95 L375 220 L305 345 L350 460" />
        <path d="M440 65 L470 205 L600 115" />
        <path d="M600 115 L585 270 L525 385 L350 460" />
        <path d="M55 190 L205 165 L375 220" />
        <path d="M20 330 L305 345" />
        <path d="M75 430 L350 460 L525 385" />
      </g>

      {/* Route — bike/walk (green, dotted) */}
      <path
        d="M110 300 C150 260 205 335 250 270 C290 215 340 230 365 190"
        fill="none" stroke="#8fbf6a" strokeWidth="2" strokeDasharray="1 8" strokeLinecap="round"
      />
      {/* Route — transit (blue, dotted) */}
      <path
        d="M250 270 C285 320 250 375 305 395 C365 415 400 350 445 380"
        fill="none" stroke="#6fa8d8" strokeWidth="2" strokeDasharray="1 8" strokeLinecap="round"
      />

      {/* Waypoint markers */}
      <circle cx="110" cy="300" r="5.5" fill="#8a9aa3" />
      <circle cx="205" cy="165" r="5.5" fill="#8a9aa3" />
      <circle cx="250" cy="270" r="6" fill="#6fa8d8" />
      <circle cx="365" cy="190" r="6" fill="#8fbf6a" />
      <circle cx="445" cy="380" r="6" fill="#8fbf6a" />
      <circle cx="305" cy="395" r="5" fill="#8a9aa3" />
    </svg>
  )
}

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

/* ── Inline contact anchor ──────────────────────────────────────── */
function ContactLink({ href, children }) {
  return (
    <a
      href={href}
      style={{ color: BODY, textDecoration: 'none', transition: 'color 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.color = INK)}
      onMouseLeave={e => (e.currentTarget.style.color = BODY)}
    >
      {children}
    </a>
  )
}

/* ── Signup form field ───────────────────────────────────────────── */
function FormField({ id, name, label, type = 'text', value, onChange, error, autoComplete, disabled }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label htmlFor={id} style={{ ...HELV, fontSize: '12.5px', color: BODY }}>
        {label} <span aria-hidden="true" style={{ color: ERROR }}>*</span>
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        disabled={disabled}
        required
        aria-required="true"
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : undefined}
        className="nf-input"
        style={{
          ...HELV,
          fontSize: '14px',
          color: INK,
          background: '#fff',
          border: `1px solid ${error ? ERROR : RULE}`,
          borderRadius: '999px',
          padding: '12px 20px',
          width: '100%',
          outline: 'none',
        }}
      />
      {error && (
        <span id={`${id}-error`} role="alert" style={{ ...HELV, fontSize: '11.5px', color: ERROR }}>
          {error}
        </span>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════════════ */
export default function LandingFooter() {
  const year = new Date().getFullYear()

  const SOCIAL = [
    { href: 'https://facebook.com',  label: 'Facebook',  Icon: IconFacebook },
    { href: 'https://instagram.com', label: 'Instagram', Icon: IconInstagram },
    { href: 'https://twitter.com',   label: 'X',         Icon: IconX },
  ]

  /* ── Signup form state ── */
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  function validate(values) {
    const next = {}
    if (!values.firstName.trim()) next.firstName = 'First name is required'
    if (!values.lastName.trim()) next.lastName = 'Last name is required'
    if (!values.email.trim()) next.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) next.email = 'Enter a valid email address'
    return next
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    setErrors(er => (er[name] ? { ...er, [name]: undefined } : er))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const validation = validate(form)
    setErrors(validation)
    if (Object.keys(validation).length > 0) return

    setSubmitting(true)
    // No lead-capture endpoint is wired up yet — surface local confirmation only.
    window.setTimeout(() => {
      setSubmitting(false)
      setSubmitted(true)
      setForm({ firstName: '', lastName: '', email: '' })
    }, 500)
  }

  return (
    <>
      {/* ── Scoped responsive CSS ─────────────────────────────────── */}
      <style>{`
        /* ── Hero / signup section ── */
        .nf-hero-wrap {
          max-width: 1320px;
          margin: 0 auto;
          padding: clamp(2.5rem, 6vw, 4.5rem) clamp(1.25rem, 4vw, 3rem) clamp(2.5rem, 5vw, 3.5rem);
        }
        .nf-hero-grid {
          display: grid;
          grid-template-columns: minmax(260px, 460px) 1fr;
          align-items: center;
          gap: clamp(2rem, 5vw, 4rem);
        }
        .nf-hero-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-width: 420px;
        }
        .nf-hero-illustration {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 3;
          min-height: 280px;
        }
        .nf-hero-badges {
          position: absolute;
          top: 4%;
          right: 4%;
          display: flex;
          gap: 8px;
          z-index: 2;
        }
        .nf-hero-badge {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(26, 46, 59, 0.12);
        }
        .nf-hero-photo-wrap {
          position: absolute;
          right: 2%;
          bottom: -8%;
          width: clamp(140px, 24%, 220px);
          aspect-ratio: 3 / 3.4;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 14px 30px rgba(26, 46, 59, 0.25);
          z-index: 3;
        }
        .nf-hero-photo-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .nf-input:focus {
          border-color: ${LINK} !important;
          box-shadow: 0 0 0 3px rgba(26, 111, 168, 0.15);
        }
        .nf-submit-btn:focus-visible {
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
        .nf-left-cluster {
          display: flex;
          align-items: center;
          gap: clamp(1.5rem, 3vw, 2.8rem);
          flex-wrap: wrap;
        }
        .nf-legal-links {
          display: flex;
          align-items: center;
          gap: clamp(1rem, 2vw, 1.8rem);
          flex-wrap: wrap;
        }
        .nf-site-nav {
          display: flex;
          align-items: center;
          gap: clamp(1rem, 2.2vw, 2rem);
          flex-wrap: wrap;
        }

        /* ── Bottom grid ── */
        .nf-bottom-wrap {
          max-width: 1320px;
          margin: 0 auto;
          padding: clamp(2rem, 4.5vw, 3.2rem) clamp(1.25rem, 4vw, 3rem);
        }
        .nf-bottom-grid {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: start;
          gap: clamp(1.5rem, 4vw, 3rem);
        }

        /* Right column: social icons + copyright */
        .nf-right-col {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
        }
        .nf-copy {
          text-align: right;
          white-space: nowrap;
        }

        /* ── Large-tablet breakpoint: stack hero illustration below form ── */
        @media (max-width: 1000px) {
          .nf-hero-grid {
            grid-template-columns: 1fr;
          }
          .nf-hero-form {
            max-width: 480px;
          }
          .nf-hero-illustration {
            max-width: 480px;
            aspect-ratio: 5 / 4;
          }
        }

        /* ── Tablet breakpoint ── */
        @media (max-width: 900px) {
          .nf-bottom-grid {
            grid-template-columns: 1fr 1fr;
          }
          .nf-right-col {
            grid-column: 1 / -1;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
          .nf-copy {
            text-align: left;
            white-space: normal;
          }
        }

        /* ── Mobile breakpoint ── */
        @media (max-width: 600px) {
          .nf-hero-form {
            max-width: 100%;
          }
          .nf-hero-illustration {
            max-width: 100%;
            aspect-ratio: 1 / 1;
            min-height: 240px;
          }
          .nf-hero-photo-wrap {
            width: clamp(120px, 34%, 170px);
          }
          .nf-top-row {
            flex-direction: column;
            align-items: flex-start;
            padding-top: 1.1rem;
            padding-bottom: 1.1rem;
            gap: 0.8rem;
            min-height: unset;
          }
          .nf-left-cluster {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.6rem;
          }
          .nf-site-nav {
            gap: 0.8rem;
          }
          .nf-bottom-grid {
            grid-template-columns: 1fr;
          }
          .nf-right-col {
            grid-column: auto;
            flex-direction: column;
            align-items: flex-start;
          }
          .nf-copy {
            white-space: normal;
            text-align: left;
          }
        }

        /* ── Reduced-motion respect ── */
        @media (prefers-reduced-motion: reduce) {
          .nf-social-icon {
            transition: none !important;
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

        {/* ════ SECTION — Start Your Journey signup ═══════════════════ */}
        <section id="signup" aria-labelledby="nf-signup-heading">
          <div className="nf-hero-wrap">
            <div className="nf-hero-grid">

              {/* ── Left: heading + form ── */}
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
                  Start Your Journey
                </h2>
                <p style={{ ...HELV, fontSize: '14px', color: BODY, margin: '0 0 28px' }}>
                  Create your account and begin earning today
                </p>

                {submitted ? (
                  <p
                    role="status"
                    style={{ ...HELV, fontSize: '14px', color: SUCCESS, maxWidth: '420px' }}
                  >
                    Thanks for signing up — check your inbox for next steps.
                  </p>
                ) : (
                  <form className="nf-hero-form" onSubmit={handleSubmit} noValidate>
                    <FormField
                      id="nf-first-name"
                      name="firstName"
                      label="First name"
                      value={form.firstName}
                      onChange={handleChange}
                      error={errors.firstName}
                      autoComplete="given-name"
                      disabled={submitting}
                    />
                    <FormField
                      id="nf-last-name"
                      name="lastName"
                      label="Last name"
                      value={form.lastName}
                      onChange={handleChange}
                      error={errors.lastName}
                      autoComplete="family-name"
                      disabled={submitting}
                    />
                    <FormField
                      id="nf-email"
                      name="email"
                      label="Email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      error={errors.email}
                      autoComplete="email"
                      disabled={submitting}
                    />

                    <button
                      type="submit"
                      disabled={submitting}
                      className="nf-submit-btn"
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
                        cursor: submitting ? 'default' : 'pointer',
                        opacity: submitting ? 0.7 : 1,
                        transition: 'opacity 0.15s ease, transform 0.15s ease',
                        marginTop: '6px',
                      }}
                      onMouseEnter={e => { if (!submitting) e.currentTarget.style.opacity = '0.85' }}
                      onMouseLeave={e => { if (!submitting) e.currentTarget.style.opacity = '1' }}
                    >
                      {submitting ? 'Submitting…' : 'Claim My Spot'}
                    </button>
                  </form>
                )}
              </div>

              {/* ── Right: map illustration + badges + photo ── */}
              <div className="nf-hero-illustration">
                <MapIllustration />

                <div className="nf-hero-badges" role="list" aria-label="Supported commute modes">
                  <div
                    role="listitem"
                    aria-label="Bike"
                    className="nf-hero-badge"
                    style={{ background: '#b7dd8a', color: INK }}
                  >
                    <IconBike />
                  </div>
                  <div
                    role="listitem"
                    aria-label="Walk"
                    className="nf-hero-badge"
                    style={{ background: '#f3f6f4', color: BODY }}
                  >
                    <IconWalk />
                  </div>
                  <div
                    role="listitem"
                    aria-label="Bus"
                    className="nf-hero-badge"
                    style={{ background: '#9cccec', color: INK, boxShadow: `0 0 0 2px #fff, 0 0 0 3.5px #4f8fc7` }}
                  >
                    <IconBus />
                  </div>
                </div>

                <div className="nf-hero-photo-wrap">
                  <img
                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&h=680&q=75"
                    alt="Commuter walking through the city while tracking their trip"
                    loading="lazy"
                  />
                </div>
              </div>

            </div>
          </div>
        </section>

        <footer
          role="contentinfo"
          aria-label="Nimbus Commute site footer"
          style={{ width: '100%' }}
        >

          {/* ════ ROW 1 — Top navigation bar ═════════════════════════ */}
          <div style={{ borderTop: `1px solid ${RULE}`, borderBottom: `1px solid ${RULE}` }}>
            <div className="nf-top-row">

              {/* ── Left: logo + legal policy links ── */}
              <div className="nf-left-cluster">

                {/* Brand mark + wordmark */}
                <Link
                  to="/"
                  aria-label="Nimbus Commute — return to homepage"
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
                  <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                    <span style={{
                      ...DISPLAY,
                      fontSize: '13px',
                      letterSpacing: '-0.01em',
                      color: INK,
                    }}>
                      Nimbus
                    </span>
                    <span style={{
                      ...HELV,
                      fontSize: '11px',
                      letterSpacing: '0.04em',
                      color: INK,
                    }}>
                      Commute
                    </span>
                  </div>
                </Link>

                {/* Legal / policy links */}
                <nav aria-label="Legal and policy links" className="nf-legal-links">
                  <FooterLink href="#privacy">Privacy Policy</FooterLink>
                  <FooterLink href="#accessibility">Accessibility Statement</FooterLink>
                </nav>

              </div>

              {/* ── Right: site navigation ── */}
              <nav aria-label="Footer site navigation" className="nf-site-nav">
                <FooterLink href="#features">Features</FooterLink>
                <FooterLink href="#benefits">Benefits</FooterLink>
                <FooterLink href="#signup">Signup Form</FooterLink>
                <FooterLink href="#contact">Contacts</FooterLink>
              </nav>

            </div>
          </div>

          {/* ════ ROW 2 — Bottom info bar ════════════════════════════ */}
          <div className="nf-bottom-wrap">
            <div className="nf-bottom-grid">

              {/* ── Column 1: Tel + Email ── */}
              <address style={{ fontStyle: 'normal' }}>
                <p style={{ ...HELV, fontSize: '12px', color: BODY, lineHeight: 2, margin: 0 }}>
                  <span style={{ fontWeight: 400 }}>Tel:</span>{' '}
                  <ContactLink href="tel:+11234567890">
                    123-456-7890
                  </ContactLink>
                </p>
                <p style={{ ...HELV, fontSize: '12px', color: BODY, lineHeight: 2, margin: 0 }}>
                  <span style={{ fontWeight: 400 }}>Email:</span>{' '}
                  <ContactLink href="mailto:info@mysite.com">
                    info@mysite.com
                  </ContactLink>
                </p>
              </address>

              {/* ── Column 2: Address ── */}
              <address style={{ fontStyle: 'normal' }}>
                <p style={{ ...HELV, fontSize: '12px', color: BODY, lineHeight: 2, margin: 0 }}>
                  <span style={{ fontWeight: 400 }}>Address:</span>
                </p>
                <p style={{ ...HELV, fontSize: '12px', color: BODY, lineHeight: 2, margin: 0 }}>
                  500 Terry Francine St
                </p>
                <p style={{ ...HELV, fontSize: '12px', color: BODY, lineHeight: 2, margin: 0 }}>
                  San Francisco, CA 94158
                </p>
              </address>

              {/* ── Column 3: Social icons + Copyright ── */}
              <div className="nf-right-col">

                {/* Social icon circles */}
                <div
                  role="list"
                  aria-label="Social media links"
                  style={{ display: 'flex', alignItems: 'center', gap: '7px' }}
                >
                  {SOCIAL.map(({ href, label, Icon }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      role="listitem"
                      aria-label={`Follow Nimbus Commute on ${label}`}
                      className="nf-social-icon"
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
                      onFocus={e => {
                        e.currentTarget.style.outline = `2px solid ${LINK}`
                        e.currentTarget.style.outlineOffset = '2px'
                      }}
                      onBlur={e => {
                        e.currentTarget.style.outline = 'none'
                      }}
                    >
                      <Icon />
                    </a>
                  ))}
                </div>

                {/* Copyright */}
                <p
                  className="nf-copy"
                  style={{
                    ...HELV,
                    fontSize: '11px',
                    color: MUTED,
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  © {year} by Nimbus Commute. Powered and secured by{' '}
                  <a
                    href="https://www.wix.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: LINK,
                      textDecoration: 'underline',
                      transition: 'opacity 0.15s ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    Wix
                  </a>
                </p>

              </div>

            </div>
          </div>

        </footer>
      </div>
    </>
  )
}
