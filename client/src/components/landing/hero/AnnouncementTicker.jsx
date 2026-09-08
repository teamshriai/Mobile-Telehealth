import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BODY, STRONG, SLATE, HAIRLINE, BONE, BONE_DIM, PENUMBRA, EASE, reducedMotion } from './heroTheme.js'
import { TICKER_ITEMS } from './heroContent.js'

const COOKIE_NAME = 'sa_ticker_dismissed'
const ROTATE_MS = 6000

function readCookie(name) {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

function writeCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

/* ═══════════════════════════════════════════════════════════════════
   AnnouncementTicker — 40px full-bleed strip above the header.

   Cross-fades between items on a 6s interval, pauses on hover/focus, and
   collapses to a single static item under 640px. Dismissal persists in a
   cookie (not localStorage, so a future SSR render never flashes it back
   in) for 7 days.
═══════════════════════════════════════════════════════════════════ */
export default function AnnouncementTicker() {
  const [dismissed, setDismissed] = useState(() => readCookie(COOKIE_NAME) === '1')
  const [index, setIndex] = useState(0)
  const [fading, setFading] = useState(false)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (dismissed || paused || reducedMotion() || TICKER_ITEMS.length < 2) return
    timerRef.current = window.setInterval(() => {
      setFading(true)
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % TICKER_ITEMS.length)
        setFading(false)
      }, 240)
    }, ROTATE_MS)
    return () => window.clearInterval(timerRef.current)
  }, [dismissed, paused])

  /* The 40px slot is reserved whether or not the ticker is dismissed, so
     dismissing it never shifts the header (and the layout) up — see
     stroke-ai-hero-spec.md Part 7's CLS budget. */
  if (dismissed) {
    return <div aria-hidden="true" style={{ height: '40px', flexShrink: 0, background: SLATE, borderBottom: `1px solid ${HAIRLINE}` }} />
  }

  const item = TICKER_ITEMS[index]
  const isExternalRoute = item.href.startsWith('/')

  const dismiss = () => {
    writeCookie(COOKIE_NAME, '1', 7)
    setDismissed(true)
  }

  const Row = isExternalRoute ? Link : 'a'
  const rowProps = isExternalRoute ? { to: item.href } : { href: item.href }

  return (
    <div
      style={{
        height: '40px',
        flexShrink: 0,
        background: SLATE,
        borderBottom: `1px solid ${HAIRLINE}`,
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <style>{`
        @keyframes sa-ticker-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        .sa-ticker-dot { animation: sa-ticker-pulse 2s ease-in-out infinite; }
        .sa-ticker-row { transition: opacity 240ms ${EASE}, transform 320ms ${EASE}; }
        .sa-ticker-text { display: none; }
        @media (min-width: 641px) { .sa-ticker-text { display: inline; } }
        .sa-ticker-text-mobile { display: inline; }
        @media (min-width: 641px) { .sa-ticker-text-mobile { display: none; } }
        .sa-ticker-x:focus-visible, .sa-ticker-link:focus-visible {
          outline: 2px solid ${BONE};
          outline-offset: 2px;
        }
      `}</style>
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          height: '100%',
          padding: '0 clamp(20px, 5vw, 80px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <Row
          {...rowProps}
          className="sa-ticker-link sa-ticker-row"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            minWidth: 0,
            flex: 1,
            textDecoration: 'none',
            opacity: fading ? 0 : 1,
            transform: fading ? 'translateY(-4px)' : 'translateY(0)',
          }}
        >
          <span
            aria-hidden="true"
            className="sa-ticker-dot"
            style={{
              width: '6px', height: '6px', borderRadius: '999px',
              background: PENUMBRA, flexShrink: 0,
            }}
          />
          <span style={{ ...STRONG, fontSize: '13px', color: BONE, flexShrink: 0 }}>New</span>
          <span
            style={{
              ...BODY,
              fontSize: '13px',
              color: BONE_DIM,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              minWidth: 0,
            }}
          >
            <span className="sa-ticker-text-mobile">{TICKER_ITEMS[0].text}</span>
            <span className="sa-ticker-text">{item.text}</span>
          </span>
        </Row>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="sa-ticker-x"
          style={{
            flexShrink: 0,
            width: '22px', height: '22px',
            display: 'grid', placeItems: 'center',
            background: 'transparent',
            border: 'none',
            borderRadius: '4px',
            color: BONE_DIM,
            cursor: 'pointer',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
