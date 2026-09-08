/* ═══════════════════════════════════════════════════════════════════
   Landing page design tokens — single source of truth.

   Type pairing: Playfair Display for display headings, Lato for everything
   else. The palette is a warm cream/ink editorial system: two grounds, two
   ink weights, one hairline. Colour beyond that is used only as a thin
   accent, never as a fill.
═══════════════════════════════════════════════════════════════════ */

/* ── Type roles ── */
export const DISPLAY = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
  fontWeight: 400,
  fontSynthesis: 'none',
  WebkitFontSmoothing: 'antialiased',
}

export const BODY = {
  fontFamily: "'Lato', system-ui, -apple-system, 'Segoe UI', sans-serif",
  fontWeight: 400,
  fontSynthesis: 'none',
  WebkitFontSmoothing: 'antialiased',
}

/* Sub-headings and anything that needs weight — the reference sets these in
   bold sans, not in the display face. */
export const STRONG = {
  ...BODY,
  fontWeight: 700,
}

/* Eyebrows / small caps labels. */
export const LABEL = {
  ...BODY,
  fontWeight: 700,
  fontSize: '11px',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
}

/* ── Palette ── */
export const CREAM = '#F7F5EF'
export const PAPER = '#FFFDF8'
export const INK = '#16160F'
export const INK_BODY = '#55554D'
export const INK_SUBTLE = '#8A8A80'
export const RULE = 'rgba(22, 22, 15, 0.13)'
export const RULE_SOFT = 'rgba(22, 22, 15, 0.07)'

/* Flow-diagram accents. Two colours that each carry a meaning: amber is the
   response path moving forward, blue is the two-way link to the command centre. */
/* Bright yellow-orange: the arrows are thick, decorative and redundant with
   the numbered steps, so brightness wins over the 3:1 graphic guideline here. */
export const FLOW_AMBER = '#F7941D'
/* The amber above is tuned for contrast on cream; on the command centre's
   navy it would sink, so the dark ground gets its own brighter gold. */
export const FLOW_GOLD = '#E0A93E'
export const FLOW_NAVY = '#16203A'
export const FLOW_BLUE = '#2F6CA6'

/* ── Tints ───────────────────────────────────────────────────────────
   One shared set of grounds, walking warm → cool → warm. The flow diagram
   established them; every other panel on the page draws from the same five so
   the colour reads as one system rather than as decoration. Each pairs with a
   deeper shade of itself for numerals and labels — all of them clear AA on
   their own ground.
──────────────────────────────────────────────────────────────────── */
export const TINT = {
  sand: { bg: '#F4EDE0', ink: '#7E6128' },
  sky:  { bg: '#E8EFF6', ink: '#3A6288' },
  teal: { bg: '#E6F0EE', ink: '#3C6B63' },
  clay: { bg: '#F6E9E4', ink: '#8B5544' },
  sage: { bg: '#E9F0E6', ink: '#4C6B46' },
}

/* Inverted set, for the two photographic sections. */
export const ON_DARK = 'rgba(255, 255, 255, 0.92)'
export const ON_DARK_BODY = 'rgba(255, 255, 255, 0.70)'
export const ON_DARK_RULE = 'rgba(255, 255, 255, 0.24)'

/* Measures for the display face: a heading wider than this stops reading as a
   statement and starts reading as a paragraph. */
export const HEAD_MEASURE = '26ch'

/* ── Motion ── */
export const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

/* Honoured by every scroll effect on the page: reveals, count-ups and the
   hero pin all fall back to their finished state when the OS asks for less
   motion. */
export const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
