import { useEffect, useRef, useState } from 'react'
import { INK, SLATE, HAIRLINE, BONE_DIM, CORE, PENUMBRA, BODY, TABULAR, reducedMotion } from './heroTheme.js'

/* Loop length the clock counts across, and the coded animation is timed to. */
const LOOP_MS = 10000
const CLOCK_END_S = 4 * 60 + 12 // 04:12

function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = Math.floor(totalSeconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/* ═══════════════════════════════════════════════════════════════════
   HeroMedia — the section's focal element.

   No perfusion/vessel video exists to license or shoot (see
   stroke-ai-hero-spec.md Part 11, open question 3), and the spec is explicit
   that a stock-video substitute is worse than rethinking the composition —
   so this renders a coded, synthetic SVG loop instead: a non-contrast CT
   disc, an occlusion marker on one vessel branch, and a perfusion overlay
   that separates core from penumbra. Nothing here is a real (or implied
   real) patient scan, so the de-identification concern in 3.7 doesn't apply.
═══════════════════════════════════════════════════════════════════ */
export default function HeroMedia() {
  const [reduced, setReduced] = useState(reducedMotion)
  const [clockLabel, setClockLabel] = useState(reducedMotion() ? formatClock(CLOCK_END_S) : '00:00')
  const rafRef = useRef(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (reduced) {
      setClockLabel(formatClock(CLOCK_END_S))
      return
    }
    const start = performance.now()
    const tick = (now) => {
      const elapsed = (now - start) % LOOP_MS
      const seconds = (elapsed / LOOP_MS) * CLOCK_END_S
      setClockLabel(formatClock(seconds))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [reduced])

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '4 / 5',
        background: SLATE,
        border: `1px solid ${HAIRLINE}`,
        borderRadius: 0,
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes sa-hm-occlude { 0%, 20% { opacity: 0; } 30%, 65% { opacity: 1; } 78%, 100% { opacity: 0; } }
        @keyframes sa-hm-core    { 0%, 40% { opacity: 0; transform: scale(0.4); } 55%, 100% { opacity: 1; transform: scale(1); } }
        @keyframes sa-hm-penumbra{ 0%, 50% { opacity: 0; transform: scale(0.55); } 68%, 100% { opacity: 1; transform: scale(1); } }
        @keyframes sa-hm-sweep   { 0% { transform: translateY(-100%); } 100% { transform: translateY(220%); } }
        .sa-hm-occlusion  { animation: sa-hm-occlude ${LOOP_MS}ms ease-in-out infinite; transform-origin: center; }
        .sa-hm-core       { animation: sa-hm-core ${LOOP_MS}ms ease-in-out infinite; transform-origin: center; }
        .sa-hm-penumbra   { animation: sa-hm-penumbra ${LOOP_MS}ms ease-in-out infinite; transform-origin: center; }
        .sa-hm-sweep      { animation: sa-hm-sweep ${LOOP_MS}ms linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .sa-hm-occlusion { animation: none; opacity: 1; }
          .sa-hm-core      { animation: none; opacity: 1; transform: none; }
          .sa-hm-penumbra  { animation: none; opacity: 1; transform: none; }
          .sa-hm-sweep     { animation: none; display: none; }
        }
      `}</style>

      <svg
        viewBox="0 0 400 500"
        width="100%" height="100%"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label="Illustrated animation of a non-contrast CT scan progressing to a vessel-occlusion marker and a perfusion overlay separating salvageable tissue from infarct core"
        style={{ position: 'absolute', inset: 0, display: 'block' }}
      >
        <defs>
          <radialGradient id="sa-hm-vignette" cx="50%" cy="42%" r="65%">
            <stop offset="0%" stopColor="#1C2E3B" />
            <stop offset="100%" stopColor={INK} />
          </radialGradient>
          <clipPath id="sa-hm-disc">
            <circle cx="200" cy="230" r="150" />
          </clipPath>
        </defs>

        <rect x="0" y="0" width="400" height="500" fill={INK} />
        <rect x="0" y="0" width="400" height="500" fill="url(#sa-hm-vignette)" />

        {/* Cranial disc — a plain axial slice, deliberately schematic rather
            than photoreal so it never reads as an actual patient image. */}
        <circle cx="200" cy="230" r="150" fill="none" stroke={BONE_DIM} strokeOpacity="0.5" strokeWidth="1.5" />
        <circle cx="200" cy="230" r="150" fill="#0D1D28" />

        <g clipPath="url(#sa-hm-disc)">
          {/* Vessel tree */}
          <g stroke={BONE_DIM} strokeOpacity="0.45" strokeWidth="2.5" fill="none" strokeLinecap="round">
            <path d="M200 100 C 200 150, 170 165, 150 200 C 135 226, 120 240, 90 250" />
            <path d="M200 100 C 200 150, 230 165, 250 200 C 265 226, 280 240, 310 250" />
            <path d="M150 200 C 145 215, 152 228, 168 236" />
            <path d="M250 200 C 255 215, 248 228, 232 236" />
          </g>

          {/* Occlusion marker on the right vessel branch */}
          <circle className="sa-hm-occlusion" cx="255" cy="205" r="7" fill={CORE} opacity="0" />
          <circle className="sa-hm-occlusion" cx="255" cy="205" r="14" fill="none" stroke={CORE} strokeWidth="1.5" opacity="0" />

          {/* Perfusion overlay: infarct core, then the wider salvageable penumbra ring */}
          <circle className="sa-hm-penumbra" cx="252" cy="222" r="46" fill={PENUMBRA} opacity="0" fillOpacity="0.22" stroke={PENUMBRA} strokeOpacity="0.55" strokeWidth="1.5" />
          <circle className="sa-hm-core" cx="252" cy="222" r="18" fill={CORE} opacity="0" fillOpacity="0.55" />

          {/* Scan-line sweep, the one bit of continuous motion under the discrete phases */}
          <rect className="sa-hm-sweep" x="50" y="0" width="300" height="60" fill={BONE_DIM} opacity="0.06" />
        </g>

        <circle cx="200" cy="230" r="150" fill="none" stroke={HAIRLINE} strokeWidth="1" />
      </svg>

      {/* Bottom scrim so the clock chip stays legible over any phase of the loop */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `linear-gradient(to top, ${INK} 0%, transparent 40%)`,
        }}
      />

      {/* Clock overlay — decorative; the loop it counts is illustrative of
          "time is brain," not a measured product statistic. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', left: '20px', bottom: '20px',
          display: 'flex', alignItems: 'baseline', gap: '8px',
          padding: '10px 14px',
          borderRadius: '8px',
          background: 'rgba(10, 21, 32, 0.88)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: `1px solid ${HAIRLINE}`,
        }}
      >
        <span style={{ ...BODY, ...TABULAR, fontWeight: 600, fontSize: '17px', color: CORE }}>
          {clockLabel}
        </span>
        <span style={{ ...BODY, fontSize: '13px', color: BONE_DIM }}>to needle</span>
      </div>
    </div>
  )
}
