import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DISPLAY, BODY, STRONG, TABULAR,
  INK, HAIRLINE, BONE, BONE_DIM, CORE,
  EASE, reducedMotion,
} from './heroTheme.js'
import { HEADLINE_LINES, SUBHEAD, CTA, STATS } from './heroContent.js'
import HeroMedia from './HeroMedia.jsx'

/* Part 4 load sequence — one orchestrated pass, ms offsets from mount. */
const T = { media: 0, line1: 120, line2: 200, line3: 280, subhead: 460, cta: 560, rules: 640, statContent: 680 }

function StatTrio() {
  return (
    <div className="sh-stats">
      {STATS.map((s, i) => (
        <div className="sh-stat" key={s.label}>
          {i > 0 && <span aria-hidden="true" className="sh-stat-rule" style={{ transitionDelay: `${T.rules}ms` }} />}
          <div className="sh-stat-inner" style={{ transitionDelay: `${T.statContent}ms` }}>
            <div style={{ ...DISPLAY, ...TABULAR, fontSize: 'clamp(1.5rem, 19cqw, 3.25rem)', lineHeight: 1, letterSpacing: '-0.02em', color: BONE, whiteSpace: 'nowrap' }}>
              {s.value}
            </div>
            <div style={{ ...BODY, fontSize: '13px', lineHeight: 1.35, color: BONE_DIM, marginTop: '8px', maxWidth: '18ch' }}>
              {s.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Hero — headline, subhead, CTA and the stat trio, static (no scroll pin),
   left-aligned, in a 55/45 split against HeroMedia.

   Motion is a single `in` flag driving every element's transition-delay per
   the Part 4 timing table — the same pattern LandingHeader used for its
   previous hero, just with per-line/per-stat delays instead of one set.
═══════════════════════════════════════════════════════════════════ */
export default function Hero() {
  const [inView, setInView] = useState(reducedMotion)

  useEffect(() => {
    if (reducedMotion()) { setInView(true); return }
    const id = requestAnimationFrame(() => setInView(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <section
      aria-label="Stroke AI"
      style={{
        background: INK,
        position: 'relative',
        zIndex: 20,
        minHeight: 'calc(100svh - 112px)',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <style>{`
        .sh-focus:focus-visible {
          outline: 2px solid ${BONE};
          outline-offset: 3px;
        }
        .sh-grid {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 24px;
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          padding: 96px clamp(20px, 5vw, 80px) 64px;
          box-sizing: border-box;
        }
        /* container-type so the H1 can size itself off its own column width
           (cqw) rather than the viewport (vw) — the copy column is ~58% of
           the viewport in the two-column layout, and a vw-based clamp sized
           "costs 1.9 million" to overflow the narrower real column. */
        .sh-copy { grid-column: 1 / span 12; order: 1; container-type: inline-size; }
        .sh-media { grid-column: 1 / span 12; order: 0; }
        @media (min-width: 768px) {
          .sh-copy  { grid-column: 1 / span 7; order: 0; }
          .sh-media { grid-column: 8 / span 5; order: 1; }
        }
        @media (max-width: 767px) {
          .sh-grid { padding-left: 20px; padding-right: 20px; }
        }

        .sh-line-clip { overflow: hidden; display: block; }
        .sh-line {
          display: block;
          white-space: nowrap;
          transform: translateY(100%);
          transition: transform 700ms ${EASE};
        }
        .sh-in .sh-line { transform: translateY(0); }
        /* The middle line is the long one ("costs 1.9 million") — it sets the
           floor the fluid H1 size has to clear a viewport-width test against,
           or it wraps inside its own clipped line and breaks the 3-line
           reveal. Below 640px the spec explicitly allows it to wrap instead. */
        @media (max-width: 639px) {
          .sh-line--wrap { white-space: normal; }
        }

        .sh-fade { opacity: 0; transition: opacity 500ms ease-out; }
        .sh-in .sh-fade { opacity: 1; }
        .sh-rise { opacity: 0; transform: translateY(8px); transition: opacity 400ms ease-out, transform 400ms ease-out; }
        .sh-in .sh-rise { opacity: 1; transform: translateY(0); }

        .sh-media-in { opacity: 0; transform: scale(1.04); transition: opacity 900ms ${EASE}, transform 900ms ${EASE}; }
        .sh-in .sh-media-in { opacity: 1; transform: scale(1); }

        .sh-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          margin-top: 48px;
        }
        /* Its own container, not just the copy column's: sized off each cell's
           actual pixel width so "≤110 km" (the longest value) never overflows
           its column while "23" and "6" stay visually matched to it. */
        .sh-stat { position: relative; display: flex; align-items: center; container-type: inline-size; }
        .sh-stat-rule {
          width: 1px; height: 48px;
          background: ${HAIRLINE};
          margin-right: clamp(16px, 2vw, 28px);
          flex-shrink: 0;
          transform: scaleY(0);
          transform-origin: center;
          transition: transform 500ms ease-out;
        }
        .sh-in .sh-stat-rule { transform: scaleY(1); }
        .sh-stat-inner { opacity: 0; transition: opacity 400ms ease-out; }
        .sh-in .sh-stat-inner { opacity: 1; }
        @media (max-width: 767px) {
          .sh-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: 20px; }
          .sh-stat-rule { display: none; }
          .sh-stats { border-top: 1px solid ${HAIRLINE}; padding-top: 20px; }
        }

        .sh-cta {
          height: 52px;
          padding: 0 28px;
          border-radius: 999px;
          background: ${CORE};
          color: ${INK};
          border: none;
          display: inline-flex;
          align-items: center;
          text-decoration: none;
          transition: filter 160ms ease-out, transform 160ms ease-out;
        }
        .sh-cta:hover { filter: brightness(1.08); transform: translateY(-1px); }
        .sh-cta:active { filter: brightness(0.96); transform: translateY(0); }
      `}</style>

      <div className={`sh-grid ${inView ? 'sh-in' : ''}`}>
        <div className="sh-copy">
          <h1 style={{
            ...DISPLAY,
            /* Sized off the copy column (cqw), not the viewport — see the
               .sh-copy container-type comment above. */
            fontSize: 'clamp(2.25rem, 9.6cqw, 5.5rem)',
            lineHeight: 0.94,
            letterSpacing: '-0.03em',
            color: BONE,
            margin: '0 0 24px',
          }}>
            {HEADLINE_LINES.map((line, i) => (
              <span className="sh-line-clip" key={line}>
                <span
                  className={`sh-line${i === 1 ? ' sh-line--wrap' : ''}`}
                  style={{ transitionDelay: `${[T.line1, T.line2, T.line3][i]}ms` }}
                >
                  {line}
                </span>
              </span>
            ))}
          </h1>

          <p
            className="sh-fade"
            style={{
              ...BODY,
              fontSize: '18px',
              lineHeight: 1.55,
              letterSpacing: '-0.005em',
              color: BONE_DIM,
              maxWidth: '58ch',
              margin: 0,
              transitionDelay: `${T.subhead}ms`,
            }}
          >
            {SUBHEAD}
          </p>

          <div className="sh-rise" style={{ marginTop: '32px', transitionDelay: `${T.cta}ms` }}>
            <Link to={CTA.href} className="sh-cta sh-focus" style={{ ...STRONG, fontSize: '15px', letterSpacing: '-0.005em' }}>
              {CTA.label}
            </Link>
          </div>

          <StatTrio />
        </div>

        <div className="sh-media">
          <div className="sh-media-in" style={{ transitionDelay: `${T.media}ms` }}>
            <HeroMedia />
          </div>
        </div>
      </div>
    </section>
  )
}
