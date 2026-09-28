import { useState } from 'react'

/**
 * A person's portrait, or their initials when there is no photo.
 *
 * ⚠️ DECORATIVE BY DEFAULT. An avatar almost always sits beside the person's
 * visible name, so the image has `alt=""` and the initials are hidden from
 * assistive technology — otherwise every name is read out twice. Pass
 * `labelled` only where the avatar stands alone.
 *
 * Initials skip honorifics: "Dr. Anitha Selvam" is "AS", not "DA" (before, the
 * "D" of "Dr." was the first letter of every doctor). The fill is one of the
 * fixed tile colours with white text, chosen from the WHOLE name, so it keeps
 * its contrast in dark mode and different people get different colours.
 *
 * `src` is a URL the server has already vetted (utils/avatarUrl). If it fails
 * to load, the initials take its place rather than a broken image.
 */

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
export type AvatarStatus = 'online' | 'away' | 'busy' | 'offline'

const SIZES: Record<AvatarSize, { box: string; px: number; text: string }> = {
  xs: { box: 'h-6 w-6', px: 24, text: 'text-[10px]' },
  sm: { box: 'h-8 w-8', px: 32, text: 'text-[11px]' },
  md: { box: 'h-10 w-10', px: 40, text: 'text-xs' },
  lg: { box: 'h-12 w-12', px: 48, text: 'text-sm' },
  xl: { box: 'h-16 w-16', px: 64, text: 'text-base' },
  '2xl': { box: 'h-20 w-20', px: 80, text: 'text-xl' },
  '3xl': { box: 'h-24 w-24', px: 96, text: 'text-2xl' },
}

const STATUS_COLORS: Record<AvatarStatus, string> = {
  online: 'bg-success-fg',
  away: 'bg-warning-fg',
  busy: 'bg-danger',
  offline: 'bg-border-strong',
}

/** Fixed fills that hold white text in both themes. Amber is left out: Home
 *  uses it for allergies. */
const FILLS = ['bg-tile-blue', 'bg-tile-teal', 'bg-tile-violet'] as const

const HONORIFIC = /^(dr|prof|mr|mrs|ms|miss|smt|shri|sri)\.?$/i

function firstGrapheme(word: string): string {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const first = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(word)[Symbol.iterator]().next()
    if (!first.done) return first.value.segment
  }
  return Array.from(word)[0] ?? ''
}

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter((w) => w !== '' && !HONORIFIC.test(w))
  if (words.length === 0) return '?'
  const picked = words.length === 1 ? [words[0]] : [words[0], words[words.length - 1]]
  return picked.map(firstGrapheme).join('').toUpperCase()
}

function fillFor(name: string): string {
  let hash = 0
  for (const ch of name.trim().toLowerCase()) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0
  return FILLS[hash % FILLS.length]
}

export interface AvatarProps {
  name?: string
  src?: string | null
  size?: AvatarSize
  status?: AvatarStatus
  rounded?: 'full' | 'xl'
  /** Announce the name — only where no visible name sits beside the avatar. */
  labelled?: boolean
  className?: string
}

export default function Avatar({
  name = '',
  src,
  size = 'md',
  status,
  rounded = 'full',
  labelled = false,
  className = '',
}: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const { box, px, text } = SIZES[size] ?? SIZES.md
  const radius = rounded === 'full' ? 'rounded-full' : 'rounded-xl'
  const showImage = typeof src === 'string' && src !== '' && failedSrc !== src

  return (
    <span
      data-print="hide"
      className={`relative inline-flex flex-shrink-0 ${className}`}
      role={labelled && !showImage ? 'img' : undefined}
      aria-label={labelled && !showImage ? name : undefined}
    >
      {showImage ? (
        <img
          src={src}
          alt={labelled ? name : ''}
          width={px}
          height={px}
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(src)}
          className={`${box} ${radius} bg-surface-2 object-cover ring-1 ring-border-soft`}
        />
      ) : (
        <span
          aria-hidden="true"
          className={`${box} ${radius} ${fillFor(name)} ${text} flex select-none items-center justify-center font-bold text-white`}
        >
          {initialsOf(name)}
        </span>
      )}

      {status && (
        <span
          aria-hidden="true"
          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-surface-1 ${STATUS_COLORS[status] || STATUS_COLORS.offline}`}
        />
      )}
    </span>
  )
}
