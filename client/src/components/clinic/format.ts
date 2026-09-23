/**
 * Date and time formatting for the doctor portal.
 *
 * UI_ATLAS §5.4 is explicit and this is a clinical-safety rule, not a style
 * preference: dates are DD-MMM-YYYY, times are 24-hour, and MM/DD is
 * forbidden everywhere because staff who read 03/04 as 3 April will
 * eventually read it on something that matters.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type DateInput = Date | string | number | null | undefined

function toDate(value: DateInput): Date | null {
  const d = value instanceof Date ? value : new Date(value ?? '')
  return Number.isNaN(d.getTime()) ? null : d
}

/** 21-Sep-2026 */
export function formatDate(value: DateInput): string {
  const d = toDate(value)
  if (d === null) return '—'
  return `${String(d.getDate()).padStart(2, '0')}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`
}

/** Mon 21-Sep-2026 */
export function formatDayDate(value: DateInput): string {
  const d = toDate(value)
  if (d === null) return '—'
  return `${DAYS[d.getDay()]} ${formatDate(d)}`
}

/** 14:30 — never 2:30 PM. */
export function formatTime(value: DateInput): string {
  const d = toDate(value)
  if (d === null) return '—'
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function greetingFor(date: Date = new Date()): string {
  const h = date.getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

/** Initials for an avatar chip. "R. Lakshmanan" → "RL". */
export function initials(name: string | null | undefined): string {
  if (typeof name !== 'string') return '?'
  const parts = name
    .replace(/\./g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : ''
  return (first + last).toUpperCase()
}
