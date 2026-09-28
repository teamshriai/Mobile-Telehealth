/**
 * The fixed hues behind IconTile, and behind the tinted glyphs in the
 * desktop navigation. One source, so a destination is the same colour
 * wherever it appears. Mid-saturation tones that hold white glyphs legibly in
 * both themes (after the system palette phones use for settings icons).
 */
export type IconTone = 'blue' | 'teal' | 'green' | 'amber' | 'orange' | 'red' | 'pink' | 'violet' | 'indigo' | 'gray'

export const TONE_HEX: Record<IconTone, string> = {
  blue: '#0A84FF',
  teal: '#30B0C7',
  green: '#34C759',
  amber: '#FF9F0A',
  orange: '#FF6B2C',
  red: '#FF3B30',
  pink: '#FF2D55',
  violet: '#AF52DE',
  indigo: '#5856D6',
  gray: '#8E8E93',
}

/** A tone at low strength, for a surface tinted in a destination's colour. */
export function toneTint(tone: IconTone, alpha: number): string {
  const hex = TONE_HEX[tone]
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Inline style for a card tinted in a tone: the tint is LAYERED over the
 * element's own surface colour (keep a `bg-surface-*` class on it), so it is
 * an opaque, theme-aware tint rather than see-through to the page behind.
 */
export function tintedSurface(tone: IconTone, alpha = 0.08): { backgroundImage: string; borderColor: string } {
  const tint = toneTint(tone, alpha)
  return { backgroundImage: `linear-gradient(${tint}, ${tint})`, borderColor: toneTint(tone, Math.min(alpha * 3.5, 0.45)) }
}
