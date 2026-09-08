import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DISPLAY, BODY, STRONG,
  CREAM, PAPER, INK, INK_BODY, INK_SUBTLE, RULE, TINT,
  reducedMotion,
} from './theme.js'
import Hero from './hero/Hero.jsx'
import ArchitectureFlow from './ArchitectureFlow.jsx'
import PartnerMap from './PartnerMap.jsx'
import { Reveal, SectionHead } from './primitives.jsx'

/* ═══════════════════════════════════════════════════════════════════
   LandingHeader — hero, partner band, and every content section below it.

   Type contract (see theme.js):
     h1 / h2  → Playfair Display 400
     h3 and below, all body copy → Lato 400 / 700
   (The hero itself is the one exception — see hero/heroTheme.js.)
═══════════════════════════════════════════════════════════════════ */

/* ── "Why It Matters" — two figures and the context behind them ── */
const MATTERS_CARDS = [
  { type: 'stat', tint: TINT.clay, to: 1.9, decimals: 1, suffix: 'M', label: 'Neurons lost, on average, for every minute a stroke goes untreated.' },
  { type: 'stat', tint: TINT.sand, to: 60, decimals: 0, suffix: ' min', label: 'The golden hour clinicians race against, from first symptom to first treatment.' },
  {
    type: 'note',
    tint: TINT.teal,
    text: 'Every layer of delay — recognising symptoms, reaching a hospital, reading a scan — compounds against the clock. Stroke AI is built to collapse that delay into a single, coordinated response.',
    cite: 'Source: Saver, J.L., "Time Is Brain — Quantified," Stroke, 2006.',
  },
]

const TEAM = [
  {
    tint: TINT.clay,
    name: 'SHRI-AI',
    desc: 'Brings the AI and telehealth technology behind "AI for Health, Care for All" — imaging models, real-time coordination software, and the mobile platform patients and bystanders will actually use.',
  },
  {
    tint: TINT.sky,
    name: 'IndoStates Health Hospital',
    desc: 'Brings the clinical and hospital network behind "Prevent, Screen, Treat" — decades of frontline emergency and neurology care, and the ambulance and scan-lab partnerships a stroke response depends on.',
  },
]

/* ── Count-up: figures animate from zero once scrolled into view ── */
function CountUp({ to, decimals = 0, suffix = '' }) {
  const ref = useRef(null)
  const [val, setVal] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reducedMotion()) { setVal(to); return }
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      const duration = 1500
      const start = performance.now()
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration)
        setVal(to * (1 - Math.pow(1 - t, 3)))
        if (t < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
      obs.disconnect()
    }, { threshold: 0.5 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [to])
  return <span ref={ref}>{val.toFixed(decimals)}{suffix}</span>
}

/* ── Bento line chart ── */
function BentoLineChart() {
  const points = [[32, 148], [168, 72], [304, 158], [440, 88], [520, 60]]
  return (
    <svg viewBox="0 0 552 220" preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden="true">
      <polyline
        points={points.map(([x, y]) => `${x},${y}`).join(' ')}
        fill="none" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round"
      />
      {points.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="6" fill={INK} />
      ))}
    </svg>
  )
}

/* ── Partner band — full-bleed, the two organisations behind the programme ── */
function PartnerBand({ offset }) {
  return (
    <section
      aria-label="Programme partners"
      style={{
        position: 'relative', zIndex: 10,
        width: '100%',
        background: PAPER,
        borderTop: `1px solid ${RULE}`,
        borderBottom: `1px solid ${RULE}`,
        marginTop: offset,
      }}
    >
      <div style={{
        padding: 'clamp(22px, 3vw, 40px) clamp(1rem, 3vw, 2.5rem)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 'clamp(10px, 1.4vw, 14px)',
      }}>
        <div className="sa-band-row">
          <picture className="sa-band-logo">
            <source srcSet="/shri-ai-logo-trans.webp" type="image/webp" />
            <img
              src="/shri-ai-logo.png"
              alt="SHRI-AI — AI for Health, Care for All"
              width="640" height="640"
              loading="lazy" decoding="async"
              style={{ height: 'clamp(118px, 15vw, 224px)', width: 'auto', display: 'block' }}
            />
          </picture>
          <span aria-hidden="true" className="sa-band-div" style={{
            width: '1px', height: 'clamp(92px, 11vw, 148px)', background: RULE, flexShrink: 0,
          }} />
          {/* The source PNG is artwork on an opaque white ground, which showed as
              a visible box once the mark doubled in size. The WebP is the same
              artwork with the white keyed out. */}
          <picture className="sa-band-logo">
            <source srcSet="/logo-indostates-trans.webp" type="image/webp" />
            <img
              src="/logo-indostates.png"
              alt="IndoStates Health Hospital — Prevent, Screen, Treat"
              width="640" height="156"
              loading="lazy" decoding="async"
              style={{ height: 'clamp(52px, 7.6vw, 104px)', width: 'auto', display: 'block' }}
            />
          </picture>
        </div>
        <p style={{
          ...BODY,
          fontSize: 'clamp(12px, 1vw, 13.5px)',
          lineHeight: 1.7,
          color: INK_BODY,
          textAlign: 'center',
          maxWidth: '70ch',
          margin: 0,
        }}>
          A joint initiative of <span style={{ ...STRONG, color: INK }}>SHRI-AI</span> and{' '}
          <span style={{ ...STRONG, color: INK }}>IndoStates Health Hospital</span> — pairing applied
          medical AI with frontline hospital, ambulance, and imaging capability.
        </p>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function LandingHeader() {
  return (
    <>
      <style>{`
        .sa-focus:focus-visible {
          outline: 2px solid #5aa9e6;
          outline-offset: 2px;
        }

        /* Partner band. These marks are sized by height with an auto width, so
           as ordinary flex items they were being shrunk horizontally on narrow
           screens — the fixed height stayed, the width gave way, and both logos
           came out squashed. flex-shrink:0 stops the squeeze, wrap gives them
           somewhere to go instead, and object-fit:contain means even a future
           squeeze would letterbox rather than distort. */
        .sa-band-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: clamp(18px, 4vw, 44px);
        }
        .sa-band-logo {
          flex: 0 0 auto;
          max-width: 100%;
          display: block;
        }
        .sa-band-logo img {
          max-width: 100%;
          object-fit: contain;
        }
        /* Stranded between two stacked logos, the divider reads as an error. */
        @media (max-width: 639px) {
          .sa-band-div { display: none; }
        }

        .sa-grid-3 {
          display: grid;
          gap: clamp(14px, 2vw, 24px);
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
        }
        .sa-grid-2 {
          display: grid;
          gap: clamp(14px, 2vw, 24px);
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
        }

        /* Benefits bento: stacked on phones, two columns with a full-height
           third panel from 640px up. */
        .sa-bento { display: grid; gap: clamp(8px, 1.2vw, 14px); }
        @media (min-width: 640px) {
          .sa-bento {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr 1fr;
          }
          .sa-bento > :nth-child(3) { grid-column: 2; grid-row: 1 / span 2; }
        }
      `}</style>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━ HERO ━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Hero />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━ PARTNER BAND ━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <PartnerBand offset={0} />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━ WHAT WE'RE BUILDING ━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="services" style={{ background: CREAM, position: 'relative', zIndex: 10, scrollMarginTop: '124px' }}>
        {/* The heading keeps the page's 1320px measure; the diagram breaks out of
            it and runs the full width of the section. No 100vw trick — the
            section is already viewport-wide, so simply not being inside the
            container is the whole job (and 100vw would overshoot by the
            scrollbar gutter). */}
        <div style={{
          maxWidth: '1320px', margin: '0 auto',
          padding: 'clamp(3rem, 6vw, 5rem) clamp(1.25rem, 3vw, 2.5rem) 0',
        }}>
          <Reveal>
            <SectionHead label="Our Command Centre" title="Anywhere, anytime." />
          </Reveal>
        </div>

        <Reveal
          delay={80}
          style={{
            maxWidth: '1800px',
            margin: '0 auto',
            padding: 'clamp(1.75rem, 3.5vw, 2.75rem) clamp(1rem, 3vw, 2.5rem) clamp(3rem, 6vw, 5rem)',
          }}
        >
          <ArchitectureFlow />
        </Reveal>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━ THE PARTNER NETWORK ━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <PartnerMap />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━ WHY IT MATTERS ━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        id="how-it-works"
        style={{
          background: PAPER,
          borderTop: `1px solid ${RULE}`,
          position: 'relative', zIndex: 10,
          scrollMarginTop: '124px',
        }}
      >
        <div style={{
          maxWidth: '1320px', margin: '0 auto',
          padding: 'clamp(3rem, 6vw, 5rem) clamp(1.25rem, 3vw, 2.5rem)',
        }}>
          <Reveal>
            <SectionHead
              label="Why It Matters"
              title="Act in Time, Save the Brain"
              lede="Stroke damage is measured in minutes, not hours. Every delay between the first symptom and the first treatment costs tissue that does not come back."
            />
          </Reveal>

          <div className="sa-grid-3" style={{ marginTop: 'clamp(1.75rem, 3.5vw, 2.75rem)' }}>
            {MATTERS_CARDS.map((c, i) => (
              <Reveal key={i} delay={i * 90}>
                <div style={{
                  background: c.tint.bg,
                  border: `1px solid ${RULE}`,
                  borderRadius: '10px',
                  padding: 'clamp(20px, 2.4vw, 30px)',
                  height: '100%',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: c.type === 'stat' ? 'flex-start' : 'center',
                }}>
                  {c.type === 'stat' ? (
                    <>
                      <div style={{
                        ...DISPLAY, fontSize: 'clamp(2.4rem, 4.4vw, 3.4rem)',
                        lineHeight: 1, letterSpacing: '-0.02em', color: c.tint.ink, marginBottom: '14px',
                      }}>
                        <CountUp to={c.to} decimals={c.decimals} suffix={c.suffix} />
                      </div>
                      <p style={{ ...BODY, fontSize: 'clamp(13px, 1.05vw, 14.5px)', lineHeight: 1.65, color: INK_BODY, margin: 0 }}>
                        {c.label}
                      </p>
                    </>
                  ) : (
                    <>
                      <p style={{ ...BODY, fontSize: 'clamp(13px, 1.05vw, 14.5px)', lineHeight: 1.7, color: INK_BODY, margin: '0 0 12px' }}>
                        {c.text}
                      </p>
                      <p style={{ ...BODY, fontSize: '11.5px', lineHeight: 1.6, color: INK_BODY, margin: 0 }}>
                        {c.cite}
                      </p>
                    </>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━ THE PLATFORM ━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="platform" style={{ background: CREAM, borderTop: `1px solid ${RULE}`, position: 'relative', zIndex: 10, scrollMarginTop: '124px' }}>
        <div style={{
          maxWidth: '1320px', margin: '0 auto',
          padding: 'clamp(3rem, 6vw, 5rem) clamp(1.25rem, 3vw, 2.5rem)',
        }}>
          <Reveal>
            <SectionHead
              label="The Platform"
              title="One platform. One golden hour."
              lede="From the first alert to treatment, every step is built to run in parallel rather than in sequence."
            />
          </Reveal>

          <Reveal delay={120}>
            <div style={{
              textAlign: 'center',
              marginTop: 'clamp(2rem, 4.5vw, 3rem)',
              background: TINT.sky.bg,
              border: `1px solid ${RULE}`,
              borderRadius: '10px',
              padding: 'clamp(26px, 4vw, 44px) clamp(20px, 3vw, 32px)',
            }}>
              <Link
                to="/demo"
                className="sa-focus"
                style={{
                  ...STRONG,
                  fontSize: 'clamp(12.5px, 1vw, 13.5px)',
                  color: PAPER, background: INK,
                  border: `1px solid ${INK}`,
                  padding: '13px 28px', borderRadius: '8px',
                  display: 'inline-flex', alignItems: 'center', gap: '9px',
                  textDecoration: 'none',
                  transition: 'background .2s ease, color .2s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = INK }}
                onMouseLeave={e => { e.currentTarget.style.background = INK; e.currentTarget.style.color = PAPER }}
              >
                Explore the Platform
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━ OUR TEAM ━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="team" style={{ background: PAPER, borderTop: `1px solid ${RULE}`, position: 'relative', zIndex: 10, scrollMarginTop: '124px' }}>
        <div style={{
          maxWidth: '1100px', margin: '0 auto',
          padding: 'clamp(3rem, 6vw, 5rem) clamp(1.25rem, 3vw, 2.5rem)',
        }}>
          <Reveal>
            <SectionHead label="Our Team" title="One mission, strong partnership." />
          </Reveal>

          <div className="sa-grid-2" style={{ margin: 'clamp(1.75rem, 3.5vw, 2.75rem) 0 clamp(2rem, 4vw, 2.75rem)' }}>
            {TEAM.map((t, i) => (
              <Reveal key={t.name} delay={i * 90}>
                <div style={{
                  background: t.tint.bg, border: `1px solid ${RULE}`, borderRadius: '10px',
                  padding: 'clamp(20px, 2.4vw, 30px)', height: '100%', boxSizing: 'border-box',
                }}>
                  <h3 style={{ ...STRONG, fontSize: 'clamp(16px, 1.5vw, 19px)', color: INK, margin: '0 0 10px' }}>
                    {t.name}
                  </h3>
                  <p style={{ ...BODY, fontSize: 'clamp(13px, 1.05vw, 14.5px)', lineHeight: 1.7, color: INK_BODY, margin: 0 }}>
                    {t.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={100}>
            <p style={{
              ...BODY, fontSize: 'clamp(13.5px, 1.15vw, 15.5px)', lineHeight: 1.75,
              color: INK_BODY, textAlign: 'center', maxWidth: '620px', margin: '0 auto',
            }}>
              Together, we&rsquo;re building India&rsquo;s first mobile stroke-response network —
              combining telehealth, AI-assisted imaging, and a coordinated ambulance network into a
              single race against the clock.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━ WHY STROKE AI ━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        id="benefits"
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '100svh',
          overflow: 'hidden',
          zIndex: 10,
          scrollMarginTop: '124px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0,
            /* One hand holding, the other operating, screen turned away — the
               patient's way in to a doctor, which is what this section argues.
               CC0 via Openverse (StockSnap ODN23L0AC9), hosted locally. */
            backgroundImage: "url('/benefits-phone.webp')",
            backgroundSize: 'cover',
            /* Focal point sits on the phone (≈45% across), so the tall crop a
               phone viewport takes still frames the hands rather than a shoulder. */
            backgroundPosition: '45% 42%',
            filter: 'brightness(0.46) contrast(1.06)',
          }}
        />
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(90deg,rgba(0,0,0,0.45) 0%,rgba(0,0,0,0) 28%,rgba(0,0,0,0) 72%,rgba(0,0,0,0.45) 100%)',
        }} />
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(to top,rgba(0,0,0,0.32) 0%,rgba(0,0,0,0) 55%)',
        }} />

        <div style={{
          position: 'relative', zIndex: 2,
          paddingTop: 'clamp(1.6rem, 3.5vh, 2.6rem)',
          display: 'flex', justifyContent: 'center',
        }}>
          <Reveal y={-14}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span aria-hidden="true" style={{ width: '22px', height: '1px', background: 'rgba(255,255,255,0.4)' }} />
              <span style={{
                ...STRONG, fontSize: '11px', letterSpacing: '0.14em',
                textTransform: 'uppercase', color: 'rgba(255,255,255,0.78)',
              }}>
                Why Stroke AI
              </span>
            </div>
          </Reveal>
        </div>

        <div style={{
          position: 'relative', zIndex: 2, width: '100%',
          padding: 'clamp(1rem, 2vw, 1.5rem) clamp(1rem, 3vw, 2.5rem) clamp(1.5rem, 3.5vh, 2.8rem)',
          boxSizing: 'border-box',
        }}>
          <div className="sa-bento" style={{ maxWidth: '1320px', margin: '0 auto' }}>
            {/* 01 — light panel */}
            <Reveal delay={0} style={{ display: 'flex' }}>
              <div style={{
                background: 'rgba(245, 250, 255, 0.93)',
                borderRadius: '4px',
                padding: 'clamp(18px, 2vw, 26px)',
                display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'space-between',
                gap: 'clamp(24px, 3vw, 40px)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.7)',
                boxSizing: 'border-box',
              }}>
                <span style={{ ...BODY, fontSize: '11px', letterSpacing: '0.14em', color: INK_SUBTLE }}>01</span>
                <div>
                  <h3 style={{ ...STRONG, fontSize: 'clamp(15px, 1.4vw, 18px)', lineHeight: 1.25, color: INK, margin: '0 0 6px' }}>
                    Golden hour focus
                  </h3>
                  <p style={{ ...BODY, fontSize: 'clamp(12.5px, 0.95vw, 13.5px)', lineHeight: 1.65, color: INK_BODY, margin: 0 }}>
                    Every step is built around reaching treatment inside the critical first hour.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* 02 — dark glass */}
            <Reveal delay={110} style={{ display: 'flex' }}>
              <div style={{
                background: 'rgba(18, 22, 28, 0.68)',
                borderRadius: '4px',
                padding: 'clamp(18px, 2vw, 26px)',
                display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'space-between',
                gap: 'clamp(24px, 3vw, 40px)',
                backdropFilter: 'blur(22px) saturate(1.3)',
                WebkitBackdropFilter: 'blur(22px) saturate(1.3)',
                border: '1px solid rgba(255,255,255,0.10)',
                boxSizing: 'border-box',
              }}>
                <span style={{ ...BODY, fontSize: '11px', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.42)' }}>02</span>
                <div>
                  <h3 style={{ ...STRONG, fontSize: 'clamp(15px, 1.4vw, 18px)', lineHeight: 1.25, color: '#FFFDF8', margin: '0 0 6px' }}>
                    A verified care network
                  </h3>
                  <p style={{ ...BODY, fontSize: 'clamp(12.5px, 0.95vw, 13.5px)', lineHeight: 1.65, color: 'rgba(255,255,255,0.66)', margin: 0 }}>
                    You are connected only to hospitals and stroke specialists we have vetted.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* 03 — tall panel with the chart */}
            <Reveal delay={55} style={{ display: 'flex' }}>
              <div style={{
                background: '#a8d4f5',
                borderRadius: '4px',
                padding: 'clamp(18px, 2vw, 26px)',
                display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'space-between',
                minHeight: 'clamp(220px, 28vw, 360px)',
                border: '1px solid rgba(255,255,255,0.35)',
                boxSizing: 'border-box',
              }}>
                <span style={{ ...BODY, fontSize: '11px', letterSpacing: '0.14em', color: 'rgba(22,22,15,0.45)' }}>03</span>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: 'clamp(12px, 2.5vw, 28px) 0', minHeight: 0 }}>
                  <BentoLineChart />
                </div>
                <div>
                  <h3 style={{ ...STRONG, fontSize: 'clamp(15px, 1.4vw, 18px)', lineHeight: 1.25, color: INK, margin: '0 0 6px' }}>
                    Cover around the clock
                  </h3>
                  <p style={{ ...BODY, fontSize: 'clamp(12.5px, 0.95vw, 13.5px)', lineHeight: 1.65, color: INK_BODY, margin: 0 }}>
                    The command centre is monitored day and night, so help is always ready.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  )
}
