import type { ComponentType, ReactNode } from 'react'
import type { LucideProps } from 'lucide-react'
import SoftIconTile from '../common/SoftIconTile'
import type { IconTone } from '../common/iconTones'

/**
 * A Home section's title, led by a small, softly tinted icon in the hue of the
 * page the section belongs to (the navigation's hues, PATIENT_NAV) — quiet
 * colour that tells sections apart without competing with the content. The
 * icon is decorative; the words are the name.
 */
export default function SectionHeading({
  id,
  icon,
  tone,
  children,
  className = 'text-ink',
}: {
  id?: string
  icon: ComponentType<LucideProps>
  tone: IconTone
  children: ReactNode
  className?: string
}): ReactNode {
  return (
    // min-h-11: the same height as a heading row that carries a "View all"
    // link, so cards side by side in the grid start level with each other.
    <h2 id={id} className={`flex min-h-11 min-w-0 items-center gap-2 text-sm font-semibold ${className}`}>
      <SoftIconTile icon={icon} tone={tone} size="sm" />
      <span className="min-w-0">{children}</span>
    </h2>
  )
}
