/**
 * Clinical date and time, always in India time — "25-Jun-2026 · 08:05".
 *
 * DD-MMM-YYYY and a 24-hour clock are what a hospital prints on a report
 * (UI_ATLAS §5.4 forbids MM/DD as a safety hazard). Fixed to Asia/Kolkata, so
 * a report reads the same on a phone set to any other zone.
 */
// Three-letter months, always: some ICU builds print "Sept" for en-GB.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const PARTS = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' })
const TIME = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' })

function ist(iso: string | Date): { day: string; month: string; year: string } {
  const parts = PARTS.formatToParts(new Date(iso))
  const get = (t: string): string => parts.find((p) => p.type === t)?.value ?? ''
  return { day: get('day'), month: MONTHS[Number(get('month')) - 1] ?? '', year: get('year') }
}

export function clinicalDate(iso: string | Date): string {
  const d = ist(iso)
  return `${d.day}-${d.month}-${d.year}`
}

export function clinicalTime(iso: string | Date): string {
  return TIME.format(new Date(iso))
}

export function clinicalDateTime(iso: string | Date): string {
  return `${clinicalDate(iso)} · ${clinicalTime(iso)}`
}

/** "26-Jun" — for trend labels. */
export function clinicalDayMonth(iso: string | Date): string {
  const d = ist(iso)
  return `${d.day}-${d.month}`
}
