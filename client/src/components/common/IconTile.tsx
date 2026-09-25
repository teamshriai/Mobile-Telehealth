import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'
import { TONE_HEX, type IconTone } from './iconTones'

/**
 * A coloured rounded-square icon, in the manner of a phone's settings list:
 * a white glyph on a soft, saturated tile. One tone per destination so a
 * section is recognised by colour AND shape — never colour alone, because
 * the label always sits beside it.
 *
 * ⚠️ Decorative by default (`aria-hidden`); the text next to it is the name.
 * Tones are fixed hues that stay legible in dark mode (white on a mid tone).
 */
const SIZE = {
  sm: { box: 'h-7 w-7 rounded-[8px]', glyph: 15 },
  md: { box: 'h-9 w-9 rounded-[10px]', glyph: 18 },
  lg: { box: 'h-12 w-12 rounded-[14px]', glyph: 24 },
} as const

export default function IconTile({ icon: Icon, tone, size = 'md' }: { icon: ComponentType<LucideProps>; tone: IconTone; size?: keyof typeof SIZE }) {
  const s = SIZE[size]
  return (
    <span aria-hidden="true" className={`inline-flex flex-shrink-0 items-center justify-center text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.12)] ${s.box}`}
      style={{ backgroundColor: TONE_HEX[tone] }}>
      <Icon size={s.glyph} strokeWidth={2.2} />
    </span>
  )
}
