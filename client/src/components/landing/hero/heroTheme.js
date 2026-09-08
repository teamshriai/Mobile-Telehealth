/* ═══════════════════════════════════════════════════════════════════
   Hero design tokens — the "reading room" system.

   Scoped to the hero + ticker only: a dark, blue-shifted clinical palette
   drawn from CT perfusion imaging, deliberately distinct from the warm
   cream/Playfair editorial system the rest of the landing page uses (see
   ../theme.js). The hero is the one section that reads as a clinical
   instrument; everything below it hands off to the editorial page.
═══════════════════════════════════════════════════════════════════ */

export const INK      = '#0A1520'  /* base — reading-room dark */
export const SLATE     = '#16242F' /* raised surfaces: ticker, media frame */
export const HAIRLINE  = '#24343F' /* 1px rules / borders */
export const BONE      = '#E9EEF2' /* primary text */
export const BONE_DIM  = '#8CA0AF' /* subhead, stat labels, nav rest state */
export const CORE      = '#FF4D6D' /* infarct core — hot accent, time-critical only */
export const PENUMBRA  = '#5FE0BE' /* salvageable tissue — live/active states only */

/* ── Type ──
   Archivo (self-hosted variable, public/fonts/archivo) — width axis carries
   the display sizes, so a single family holds the whole hero without a
   second face. */
export const DISPLAY = {
  fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif",
  fontWeight: 600,
  fontStretch: '115%',
  fontSynthesis: 'none',
  WebkitFontSmoothing: 'antialiased',
}

export const BODY = {
  fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif",
  fontWeight: 400,
  fontStretch: '100%',
  fontSynthesis: 'none',
  WebkitFontSmoothing: 'antialiased',
}

export const STRONG = { ...BODY, fontWeight: 500 }

export const TABULAR = { fontVariantNumeric: 'tabular-nums' }

export const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

export const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
