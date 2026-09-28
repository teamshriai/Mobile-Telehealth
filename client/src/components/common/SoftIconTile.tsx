import type { ComponentType, CSSProperties } from 'react'
import type { LucideProps } from 'lucide-react'
import { TONE_HEX, type IconTone } from './iconTones'

/**
 * The quiet counterpart of IconTile: a softly tinted square with the glyph in
 * the tone's own colour — the way the navigation tints its icons — for places
 * where a solid, saturated tile would shout (Home's section headings).
 *
 * The glyph is a shade darker than the tone on light surfaces, so it stays
 * crisp on its tint, and the tone itself on dark ones. Decorative
 * (`aria-hidden`): the words beside it are the name.
 */
const SIZE = {
  sm: { box: 'h-7 w-7 rounded-[8px]', glyph: 15 },
  md: { box: 'h-9 w-9 rounded-[10px]', glyph: 18 },
  lg: { box: 'h-11 w-11 rounded-xl', glyph: 20 },
} as const

export default function SoftIconTile({
  icon: Icon,
  tone,
  size = 'md',
}: {
  icon: ComponentType<LucideProps>
  tone: IconTone
  size?: keyof typeof SIZE
}) {
  const s = SIZE[size]
  return (
    <span
      aria-hidden="true"
      style={{ '--tone': TONE_HEX[tone] } as CSSProperties}
      className={`inline-flex flex-shrink-0 items-center justify-center bg-[color-mix(in_oklab,var(--tone)_12%,transparent)] text-[color-mix(in_oklab,var(--tone)_72%,black)] dark:bg-[color-mix(in_oklab,var(--tone)_18%,transparent)] dark:text-[var(--tone)] ${s.box}`}
    >
      <Icon size={s.glyph} strokeWidth={2} />
    </span>
  )
}
