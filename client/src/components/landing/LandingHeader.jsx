import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

/* ═══════════════════════════════════════════════════════════════════
   LandingHeader — Hero + Features + How It Works + Benefits Bento
   Font contract:
     Hero h1 / section headings  → Plus Jakarta Sans 400
     Body / desc / subtitles     → Helvetica Light 300
═══════════════════════════════════════════════════════════════════ */

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

/* ── Feature card data ── */
const FEATURES = [
  {
    num: '01',
    title: 'Video\nConsultations',
    bg: '#c9e156',
    photo: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=700&q=75',
    desc: 'Connect with specialist doctors face-to-face from the comfort of your home, on any device',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    ),
  },
  {
    num: '02',
    title: 'Smart\nScheduling',
    bg: '#afd5ef',
    photo: null,
    desc: 'Book and manage appointments in seconds — no waiting rooms, no phone calls, no stress',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Expert\nSpecialists',
    bg: '#b4c5bc',
    photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=700&q=75',
    desc: 'Access top oncologists and specialists without leaving home or waiting months for a slot',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="2" x2="12" y2="22"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
        <line x1="4.93" y1="19.07" x2="19.07" y2="4.93"/>
      </svg>
    ),
  },
]

/* ── Scroll-reveal ── */
function Reveal({ children, delay = 0, y = 28 }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.opacity = '0'
    el.style.transform = `translateY(${y}px)`
    el.style.transition = `opacity 0.68s ease ${delay}ms, transform 0.68s ease ${delay}ms`
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        el.style.opacity = '1'
        el.style.transform = 'translateY(0)'
        obs.disconnect()
      }
    }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [delay, y])
  return <div ref={ref} style={{ willChange: 'opacity, transform' }}>{children}</div>
}

/* ── Feature card ── */
function FeatureCard({ card, delay }) {
  return (
    <Reveal delay={delay}>
      <article style={{
        borderRadius: '18px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: 'clamp(380px, 44vw, 500px)',
        minWidth: 0,
      }}>
        <div style={{ background: card.bg, padding: 'clamp(16px, 2.2vw, 24px)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
            <h3 style={{
              ...DISPLAY,
              fontSize: 'clamp(16px, 2vw, 24px)',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              color: '#0f172a',
              margin: 0,
              whiteSpace: 'pre-line',
            }}>
              {card.title}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0, paddingTop: '2px' }}>
              <span style={{ ...HELV, fontSize: '10.5px', letterSpacing: '0.04em', color: 'rgba(0,0,0,0.45)' }}>
                ({card.num})
              </span>
              <div style={{
                width: 32, height: 32,
                background: 'rgba(255,255,255,0.68)',
                borderRadius: '9px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#333', flexShrink: 0,
              }}>
                {card.icon}
              </div>
            </div>
          </div>
        </div>
        <div style={{ position: 'relative', flex: 1, background: card.bg, overflow: 'hidden' }}>
          {card.photo && (
            <img
              src={card.photo}
              alt={card.title.replace('\n', ' ')}
              loading="lazy"
              decoding="async"
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'cover', objectPosition: 'center top',
              }}
            />
          )}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: 'clamp(14px, 2vw, 22px)',
            background: card.photo
              ? 'linear-gradient(to top, rgba(0,0,0,0.68) 0%, rgba(0,0,0,0) 100%)'
              : 'transparent',
          }}>
            <p style={{
              ...HELV,
              fontSize: 'clamp(11px, 1.05vw, 13px)',
              letterSpacing: '0.02em',
              lineHeight: 1.7,
              color: card.photo ? 'rgba(255,255,255,0.90)' : 'rgba(0,0,0,0.58)',
              margin: 0,
            }}>
              {card.desc}
            </p>
          </div>
        </div>
      </article>
    </Reveal>
  )
}

/* ── Bento line-chart SVG ── */
function BentoLineChart() {
  const points = [
    [32, 148],
    [168, 72],
    [304, 158],
    [440, 88],
    [520, 60],
  ]
  const polyStr = points.map(([x, y]) => `${x},${y}`).join(' ')
  return (
    <svg
      viewBox="0 0 552 220"
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-hidden="true"
    >
      <polyline
        points={polyStr}
        fill="none"
        stroke="#0f172a"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="7.5" fill="#0f172a" />
      ))}
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function LandingHeader() {
  return (
    <>
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━ HERO ━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{
        position: 'relative',
        width: '100%',
        height: '100svh',
        minHeight: '640px',
        overflow: 'hidden',
      }}>
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: "url('/doctor1.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.80) contrast(1.1)',
          }}
        />
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(180deg,rgba(0,0,0,.52) 0%,rgba(0,0,0,.06) 44%,rgba(0,0,0,.58) 100%)',
        }}/>
        <div style={{
          position: 'absolute',
          bottom: 'clamp(6rem, 14vh, 11rem)',
          left: 0, right: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          textAlign: 'center',
          padding: '0 clamp(1.25rem, 5vw, 3rem)',
        }}>
          <h1 style={{
            ...DISPLAY,
            fontSize: 'clamp(2.2rem, 5.8vw, 4.6rem)',
            lineHeight: 1.04,
            letterSpacing: '-0.025em',
            color: '#fff',
            marginBottom: 'clamp(0.85rem, 2vw, 1.4rem)',
          }}>
            Your healthcare<br />connected
          </h1>
          <p style={{
            ...HELV,
            fontSize: 'clamp(11px, 1.05vw, 13px)',
            letterSpacing: '0.02em',
            textAlign: 'left',
            color: 'rgba(255,255,255,0.72)',
            lineHeight: 1.78,
            maxWidth: '340px',
            width: '100%',
            marginBottom: 'clamp(1.5rem, 3vw, 2.25rem)',
          }}>
            Specialist doctors, real-time appointments and
            secure health records — all in one place,
            accessible from anywhere on any device.
          </p>
          <Link
            to="/register"
            style={{
              ...HELV,
              fontSize: 'clamp(10.5px, 0.9vw, 12.5px)',
              letterSpacing: '0.05em',
              color: '#0f172a',
              background: 'rgba(255,255,255,0.96)',
              padding: '9px 28px',
              borderRadius: '100px',
              display: 'inline-flex', alignItems: 'center',
              textDecoration: 'none',
              transition: 'opacity .2s ease, transform .2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'scale(1.016)' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)' }}
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━ FEATURES ━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="services" style={{ background: '#ddeaf2', position: 'relative', zIndex: 10 }}>
        <div style={{
          maxWidth: '1320px', margin: '0 auto',
          padding: 'clamp(2.5rem, 5vw, 4rem) clamp(1rem, 3vw, 2.5rem)',
        }}>
          <Reveal>
            <span style={{
              ...HELV, display: 'block', fontSize: '10px',
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'rgba(0,0,0,0.35)', marginBottom: '2rem',
            }}>
              Features
            </span>
          </Reveal>
          <Reveal delay={60}>
            <h2 style={{
              ...DISPLAY,
              fontSize: 'clamp(1.8rem, 4vw, 3rem)',
              lineHeight: 1.08, letterSpacing: '-0.025em',
              color: '#111', textAlign: 'center',
              maxWidth: '520px', margin: '0 auto clamp(2.5rem, 5vw, 4rem)',
            }}>
              Built for the Modern Patient
            </h2>
          </Reveal>
          <div className="hidden md:grid" style={{
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 'clamp(10px, 1.4vw, 18px)',
          }}>
            {FEATURES.map((card, i) => (
              <FeatureCard key={card.num} card={card} delay={i * 105} />
            ))}
          </div>
          <div className="flex flex-col gap-3 md:hidden">
            {FEATURES.map((card, i) => (
              <FeatureCard key={card.num} card={card} delay={i * 80} />
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━ HOW IT WORKS ━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        id="how-it-works"
        style={{
          background: '#f8fafc',
          borderTop: '1px solid rgba(0,0,0,.06)',
          zIndex: 10, position: 'relative',
        }}
      >
        <div style={{
          maxWidth: '1320px', margin: '0 auto',
          padding: 'clamp(3rem, 6vw, 5rem) clamp(1rem, 3vw, 2.5rem)',
        }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 'clamp(2.5rem, 5vw, 4rem)' }}>
              <span style={{
                ...HELV, display: 'block', fontSize: '10px',
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: 'rgba(0,0,0,0.35)', marginBottom: '1rem',
              }}>
                Benefits
              </span>
              <h2 style={{
                ...DISPLAY,
                fontSize: 'clamp(1.8rem, 4vw, 3rem)',
                lineHeight: 1.08, letterSpacing: '-0.025em',
                color: '#111', maxWidth: '480px', margin: '0 auto',
              }}>
                3 Steps to Your First Consultation
              </h2>
            </div>
          </Reveal>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 'clamp(10px, 2vw, 18px)',
          }}>
            {[
              { num: '01', title: 'Create Your Account',     desc: 'Sign up in under 2 minutes with your name and contact details — no paperwork.' },
              { num: '02', title: 'Schedule a Consultation', desc: 'Choose your specialist and a time slot that fits your schedule perfectly.' },
              { num: '03', title: 'Join the Online Meeting', desc: 'Click "Join" from your dashboard at your appointment time — no downloads needed.' },
            ].map(({ num, title, desc }, i) => (
              <Reveal key={num} delay={i * 90}>
                <div style={{
                  background: '#fff', borderRadius: '18px',
                  border: '1px solid rgba(0,0,0,.07)',
                  padding: 'clamp(20px, 2.8vw, 32px)',
                  display: 'flex', flexDirection: 'column', gap: '14px',
                }}>
                  <span style={{ ...HELV, fontSize: '18px', letterSpacing: '0.12em', color: '#d1d5db' }}>{num}</span>
                  <h3 style={{ ...DISPLAY, fontSize: 'clamp(16px, 1.8vw, 21px)', letterSpacing: '-0.02em', color: '#111', margin: 0 }}>{title}</h3>
                  <p style={{ ...HELV, fontSize: 'clamp(11.5px, 1vw, 13px)', letterSpacing: '0.02em', lineHeight: 1.75, color: '#9ca3af', margin: 0 }}>{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━ BENEFITS BENTO ━━━━━━━━━━━━━━━━━━━━━━━━
          Full-viewport-height section.
          "Why Ride with Us" label — centred, near the top.
          Cards pinned to the bottom ~38% of the section.
          Desktop: left col = two stacked cards, right col = one tall blue card.
          Tablet:  same two-column layout, slightly compressed.
          Mobile:  single column stack.
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        id="benefits"
        style={{
          position: 'relative',
          width: '100%',
          /* Full viewport height so image fills the screen */
          minHeight: '100svh',
          overflow: 'hidden',
          zIndex: 10,
          /* Flex column so label sits top and cards sit bottom */
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* ── Background photo ── */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              "url('/hero-bg.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center 25%',
            filter: 'brightness(0.46) contrast(1.06)',
          }}
        />
        {/* Side vignettes */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(90deg,rgba(0,0,0,0.45) 0%,rgba(0,0,0,0) 28%,rgba(0,0,0,0) 72%,rgba(0,0,0,0.45) 100%)',
        }}/>
        {/* Bottom vignette — subtle darkening where cards sit */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(to top,rgba(0,0,0,0.28) 0%,rgba(0,0,0,0) 55%)',
        }}/>

        {/* ── Section label — top centre ── */}
        <div style={{
          position: 'relative',
          zIndex: 2,
          paddingTop: 'clamp(1.4rem, 3vh, 2.2rem)',
          display: 'flex',
          justifyContent: 'center',
        }}>
          <Reveal y={-14}>
            <span style={{
              ...DISPLAY,
              fontSize: 'clamp(12px, 1.1vw, 15px)',
              letterSpacing: '0.01em',
              color: 'rgba(255,255,255,0.88)',
              fontWeight: 400,
            }}>
              Why Ride with Us
            </span>
          </Reveal>
        </div>

        {/* ── Cards — bottom of the section ── */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            width: '100%',
            padding: 'clamp(1rem, 2vw, 1.5rem) clamp(1rem, 3vw, 2.5rem) clamp(1.5rem, 3.5vh, 2.8rem)',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ maxWidth: '1320px', margin: '0 auto' }}>

            {/* Desktop + Tablet: two-column bento */}
            <div
              className="hidden sm:grid"
              style={{
                gridTemplateColumns: '1fr 1fr',
                gap: 'clamp(8px, 1.2vw, 14px)',
                alignItems: 'stretch',
              }}
            >
              {/* Left: two stacked cards */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'clamp(8px, 1.2vw, 14px)',
              }}>
                {/* Card 01 — white */}
                <Reveal delay={0}>
                  <div style={{
                    background: 'rgba(245, 250, 255, 0.93)',
                    borderRadius: '18px',
                    padding: 'clamp(16px, 2vw, 24px)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'clamp(28px, 4vw, 52px)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.72)',
                    boxSizing: 'border-box',
                  }}>
                    <span style={{
                      ...HELV,
                      fontSize: 'clamp(9.5px, 0.8vw, 11.5px)',
                      letterSpacing: '0.04em',
                      color: 'rgba(0,0,0,0.36)',
                    }}>
                      (01)
                    </span>
                    <div>
                      <h3 style={{
                        ...DISPLAY,
                        fontSize: 'clamp(14px, 1.4vw, 18px)',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.2,
                        color: '#0f172a',
                        margin: '0 0 5px',
                      }}>
                        Healthier Routine
                      </h3>
                      <p style={{
                        ...HELV,
                        fontSize: 'clamp(10px, 0.85vw, 12px)',
                        letterSpacing: '0.01em',
                        lineHeight: 1.7,
                        color: '#c45a1a',
                        margin: 0,
                      }}>
                        Build active habits seamlessly into your weekday
                      </p>
                    </div>
                  </div>
                </Reveal>

                {/* Card 02 — dark glass */}
                <Reveal delay={110}>
                  <div style={{
                    background: 'rgba(18, 22, 28, 0.68)',
                    borderRadius: '18px',
                    padding: 'clamp(16px, 2vw, 24px)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'clamp(28px, 4vw, 52px)',
                    backdropFilter: 'blur(22px) saturate(1.4)',
                    WebkitBackdropFilter: 'blur(22px) saturate(1.4)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxSizing: 'border-box',
                  }}>
                    <span style={{
                      ...HELV,
                      fontSize: 'clamp(9.5px, 0.8vw, 11.5px)',
                      letterSpacing: '0.04em',
                      color: 'rgba(255,255,255,0.30)',
                    }}>
                      (02)
                    </span>
                    <div>
                      <h3 style={{
                        ...DISPLAY,
                        fontSize: 'clamp(14px, 1.4vw, 18px)',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.2,
                        color: '#ffffff',
                        margin: '0 0 5px',
                      }}>
                        Lower Emissions
                      </h3>
                      <p style={{
                        ...HELV,
                        fontSize: 'clamp(10px, 0.85vw, 12px)',
                        letterSpacing: '0.01em',
                        lineHeight: 1.7,
                        color: 'rgba(255,255,255,0.50)',
                        margin: 0,
                      }}>
                        Contribute directly to cleaner air in your immediate neighborhood
                      </p>
                    </div>
                  </div>
                </Reveal>
              </div>

              {/* Right: tall blue card */}
              <Reveal delay={55}>
                <div style={{
                  background: '#a8d4f5',
                  borderRadius: '18px',
                  padding: 'clamp(16px, 2vw, 24px)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                  minHeight: 'clamp(220px, 28vw, 360px)',
                  boxSizing: 'border-box',
                }}>
                  <span style={{
                    ...HELV,
                    fontSize: 'clamp(9.5px, 0.8vw, 11.5px)',
                    letterSpacing: '0.04em',
                    color: 'rgba(0,0,0,0.36)',
                    display: 'block',
                  }}>
                    (03)
                  </span>
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    padding: 'clamp(12px, 2.5vw, 28px) 0',
                    minHeight: 0,
                  }}>
                    <BentoLineChart />
                  </div>
                  <div>
                    <h3 style={{
                      ...DISPLAY,
                      fontSize: 'clamp(14px, 1.4vw, 18px)',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.2,
                      color: '#0f172a',
                      margin: '0 0 5px',
                    }}>
                      Community Connection
                    </h3>
                    <p style={{
                      ...HELV,
                      fontSize: 'clamp(10px, 0.85vw, 12px)',
                      letterSpacing: '0.01em',
                      lineHeight: 1.7,
                      color: 'rgba(0,0,0,0.52)',
                      margin: 0,
                    }}>
                      Join thousands of locals committed to better urban mobility
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Mobile: single column */}
            <div className="flex flex-col gap-3 sm:hidden">
              {/* Card 01 */}
              <Reveal delay={0}>
                <div style={{
                  background: 'rgba(245, 250, 255, 0.93)',
                  borderRadius: '18px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '36px',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.72)',
                }}>
                  <span style={{ ...HELV, fontSize: '11px', letterSpacing: '0.04em', color: 'rgba(0,0,0,0.36)' }}>(01)</span>
                  <div>
                    <h3 style={{ ...DISPLAY, fontSize: '16px', letterSpacing: '-0.02em', color: '#0f172a', margin: '0 0 5px' }}>Healthier Routine</h3>
                    <p style={{ ...HELV, fontSize: '11.5px', lineHeight: 1.7, color: '#c45a1a', margin: 0 }}>Build active habits seamlessly into your weekday</p>
                  </div>
                </div>
              </Reveal>

              {/* Card 02 */}
              <Reveal delay={80}>
                <div style={{
                  background: 'rgba(18, 22, 28, 0.68)',
                  borderRadius: '18px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '36px',
                  backdropFilter: 'blur(22px) saturate(1.4)',
                  WebkitBackdropFilter: 'blur(22px) saturate(1.4)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <span style={{ ...HELV, fontSize: '11px', letterSpacing: '0.04em', color: 'rgba(255,255,255,0.30)' }}>(02)</span>
                  <div>
                    <h3 style={{ ...DISPLAY, fontSize: '16px', letterSpacing: '-0.02em', color: '#ffffff', margin: '0 0 5px' }}>Lower Emissions</h3>
                    <p style={{ ...HELV, fontSize: '11.5px', lineHeight: 1.7, color: 'rgba(255,255,255,0.50)', margin: 0 }}>Contribute directly to cleaner air in your immediate neighborhood</p>
                  </div>
                </div>
              </Reveal>

              {/* Card 03 */}
              <Reveal delay={160}>
                <div style={{
                  background: '#a8d4f5',
                  borderRadius: '18px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '260px',
                }}>
                  <span style={{ ...HELV, fontSize: '11px', letterSpacing: '0.04em', color: 'rgba(0,0,0,0.36)', display: 'block', marginBottom: '12px' }}>(03)</span>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', paddingBottom: '16px' }}>
                    <BentoLineChart />
                  </div>
                  <div>
                    <h3 style={{ ...DISPLAY, fontSize: '16px', letterSpacing: '-0.02em', color: '#0f172a', margin: '0 0 5px' }}>Community Connection</h3>
                    <p style={{ ...HELV, fontSize: '11.5px', lineHeight: 1.7, color: 'rgba(0,0,0,0.52)', margin: 0 }}>Join thousands of locals committed to better urban mobility</p>
                  </div>
                </div>
              </Reveal>
            </div>

          </div>
        </div>
      </section>
    </>
  )
}