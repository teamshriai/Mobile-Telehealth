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
