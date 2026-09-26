// ─────────────────────────────────────────────────────────────────────────────
// Formatting for the assistant's view of the record.
//
// Dates are India time and written the one way ("25 Sep 2026") so that the
// model can repeat them verbatim and the output guard can match them.
// Free text is collapsed, capped, and scrubbed of identifiers that have no
// business reaching a model: a phone number or an Aadhaar in a health note is
// the patient's, and the answer to "what did I write" never needs it.
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const IST_OFFSET_MS = 330 * 60_000;

function parts(d: Date): { y: number; m: number; day: number; wd: number; hh: string; mm: string } {
  const s = new Date(d.getTime() + IST_OFFSET_MS);
  return {
    y: s.getUTCFullYear(),
    m: s.getUTCMonth(),
    day: s.getUTCDate(),
    wd: s.getUTCDay(),
    hh: String(s.getUTCHours()).padStart(2, '0'),
    mm: String(s.getUTCMinutes()).padStart(2, '0'),
  };
}

/** "25 Sep 2026" */
export function istDate(d: Date): string {
  const p = parts(d);
  return `${p.day} ${MONTHS[p.m]} ${p.y}`;
}

/** "25 Sep 2026, 08:05" */
export function istDateTime(d: Date): string {
  const p = parts(d);
  return `${istDate(d)}, ${p.hh}:${p.mm}`;
}

/** "Thu 1 Oct 2026, 10:30" */
export function istWeekdayDateTime(d: Date): string {
  const p = parts(d);
  return `${DAYS[p.wd]} ${istDate(d)}, ${p.hh}:${p.mm}`;
}

/** "08:05" */
export function istTime(d: Date): string {
  const p = parts(d);
  return `${p.hh}:${p.mm}`;
}

/** "Friday, 25 Sep 2026, 14:05 (India time)" — for the question turn. */
export function todayLine(now: Date): string {
  const p = parts(now);
  return `Today is ${DAYS_LONG[p.wd]}, ${istDate(now)}, ${p.hh}:${p.mm} (India time).`;
}

/** Whole calendar days from `a` to `b` in India time. */
export function istDaysBetween(a: Date, b: Date): number {
  const day = (d: Date): number => Math.floor((d.getTime() + IST_OFFSET_MS) / 86_400_000);
  return day(b) - day(a);
}

/** Collapse whitespace, strip control characters, cap at `max` characters. */
export function sanitiseFreeText(text: string, max: number): string {
  const t = text
    // eslint-disable-next-line no-control-regex -- stripping control characters is the point
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, ' ')
    .replace(/\p{Extended_Pictographic}\uFE0F?/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Masks identifiers: Indian mobile numbers, email addresses, 12-digit Aadhaar
 * and 14-digit ABHA numbers, and ABHA addresses. Clinical numbers (doses,
 * results, dates) are too short or too differently shaped to match.
 */
export function scrubIdentifiers(text: string): string {
  return text
    .replace(/\b[\w.+-]+@(abdm|sbx)\b/gi, '[ABHA address removed]')
    .replace(/\b[\w.+-]+@[\w-]+(\.[\w-]+)+\b/g, '[email removed]')
    .replace(/\b\d{2}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[ABHA number removed]')
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[Aadhaar removed]')
    .replace(/(?:\+?91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b/g, '[phone removed]');
}

/** Free text from the record, made safe to place in front of the model. */
export function recordText(text: string | null | undefined, max: number): string | null {
  if (text === null || text === undefined || text.trim() === '') return null;
  return scrubIdentifiers(sanitiseFreeText(text, max));
}
