/**
 * YYYY-MM-DD for an instant, in India time — the zone every appointment time
 * in the portal is displayed in. Shared by the calendar and the pages that
 * filter by the day it selects, so they can never disagree about a date.
 */
export function dayKey(iso: string | Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(typeof iso === 'string' ? new Date(iso) : iso)
}
