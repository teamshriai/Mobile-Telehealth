import { useEffect, useRef } from 'react'
import { DISPLAY, BODY, STRONG, HEAD_MEASURE, INK, INK_BODY, RULE, EASE, reducedMotion } from './theme.js'

/* ═══════════════════════════════════════════════════════════════════
   Shared landing primitives — the reveal and the section opener, used by
   every section so the page keeps one motion and typographic vocabulary.
═══════════════════════════════════════════════════════════════════ */

/* Fade + rise, one-shot, skipped entirely when the OS asks for less motion. */
export function Reveal({ children, delay = 0, y = 18, style }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || reducedMotion()) return
    el.style.opacity = '0'
    el.style.transform = `translateY(${y}px)`
    el.style.transition = `opacity 0.9s ${EASE} ${delay}ms, transform 0.9s ${EASE} ${delay}ms`
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        el.style.opacity = '1'
        el.style.transform = 'translateY(0)'
        obs.disconnect()
      }
    }, { threshold: 0.12 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [delay, y])
  return <div ref={ref} style={style}>{children}</div>
}

/* Eyebrow, display heading, optional lede, and the hairline rule that
   separates the heading from whatever follows it. */
export function SectionHead({ label, title, lede, tone = 'dark', align = 'left' }) {
  const ink = tone === 'dark' ? INK : 'rgba(255,255,255,0.94)'
  const body = tone === 'dark' ? INK_BODY : 'rgba(255,255,255,0.70)'
  const rule = tone === 'dark' ? RULE : 'rgba(255,255,255,0.24)'
  const centred = align === 'center'

  return (
    <div style={{ textAlign: centred ? 'center' : 'left' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        justifyContent: centred ? 'center' : 'flex-start',
        marginBottom: 'clamp(1rem, 2vw, 1.5rem)',
      }}>
        <span aria-hidden="true" style={{ width: '22px', height: '1px', background: rule, flexShrink: 0 }} />
        {/* INK_SUBTLE would only clear 3.2:1 on cream — fine for a hairline,
            not for 11px caps. */}
        <span style={{
          ...STRONG, fontSize: '11px', letterSpacing: '0.14em',
          textTransform: 'uppercase', color: tone === 'dark' ? INK_BODY : 'rgba(255,255,255,0.78)',
        }}>
          {label}
        </span>
      </div>

      <h2 style={{
        ...DISPLAY,
        fontSize: 'clamp(2rem, 4.6vw, 3.6rem)',
        lineHeight: 1.06,
        letterSpacing: '-0.012em',
        color: ink,
        margin: 0,
        maxWidth: centred ? '20ch' : HEAD_MEASURE,
        marginLeft: centred ? 'auto' : 0,
        marginRight: centred ? 'auto' : 0,
      }}>
        {title}
      </h2>

      {lede && (
        <p style={{
          ...BODY,
          fontSize: 'clamp(13.5px, 1.15vw, 15.5px)',
          lineHeight: 1.7,
          color: body,
          maxWidth: '54ch',
          margin: centred ? 'clamp(0.9rem, 1.8vw, 1.25rem) auto 0' : 'clamp(0.9rem, 1.8vw, 1.25rem) 0 0',
        }}>
          {lede}
        </p>
      )}

      <div aria-hidden="true" style={{
        height: '1px', background: rule, width: '100%',
        margin: 'clamp(1.6rem, 3.4vw, 2.75rem) 0 0',
      }} />
    </div>
  )
}
