// ─────────────────────────────────────────────────────────────────────────────
// When each prescribed dose is due, and how the patient is doing.
//
// ⚠️ PURE AND DETERMINISTIC. No database, no clock of its own (`now` is always
// passed in), so every rule here is unit-tested exactly.
//
// ⚠️ A SCHEDULE WE DERIVE, NOT ONE THE DOCTOR WROTE. A prescription says
// "twice a day", not "08:00 and 20:00". These are conventional default times
// (India time), shown to the patient as a guide; the directions the doctor
// wrote (e.g. "on an empty stomach") are always shown beside them and win.
//
// India has no daylight saving, so IST is a fixed UTC+05:30 and the slot
// instants below are exact.
// ─────────────────────────────────────────────────────────────────────────────

const IST_OFFSET_MIN = 330;
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Default times of day (India time), by the prescriber's frequency code. */
const TIMES: Record<string, string[]> = {
  OD: ['08:00'],
  BD: ['08:00', '20:00'],
  TDS: ['08:00', '14:00', '20:00'],
  QDS: ['08:00', '12:00', '16:00', '20:00'],
  HS: ['22:00'],
};

/** Taken "as needed" — never scheduled, never counted as missed. */
const AS_NEEDED = new Set(['SOS', 'PRN', 'STAT']);

export type ScheduleKind = 'scheduled' | 'weekly' | 'as_needed' | 'unknown';

export function scheduleKind(frequency: string): ScheduleKind {
  const f = frequency.trim().toUpperCase();
  if (TIMES[f] !== undefined) return 'scheduled';
  if (f === 'WEEKLY') return 'weekly';
  if (AS_NEEDED.has(f)) return 'as_needed';
  return 'unknown';
}

/** An IST wall-clock date + "HH:MM" → the exact instant. */
function istInstant(y: number, m: number, d: number, hhmm: string): Date {
  const [hh, mm] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(y, m, d, hh, mm) - IST_OFFSET_MIN * MIN);
}

/** The IST calendar date (y, m, d) an instant falls on. */
function istDate(at: Date): { y: number; m: number; d: number; weekday: number } {
  const shifted = new Date(at.getTime() + IST_OFFSET_MIN * MIN);
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth(),
    d: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
  };
}

export interface CourseForSchedule {
  frequency: string;
  /** When the prescription was signed — no dose is due before this. */
  startedAt: Date;
  durationDays: number | null;
  /** A newer prescription for the same medicine took over from this instant. */
  replacedAt?: Date | null;
}

/** The first instant AFTER the course: signing time + duration, or the
 *  renewal that replaced it, whichever comes first. */
export function courseEnd(course: CourseForSchedule): Date | null {
  const natural =
    course.durationDays === null || course.durationDays <= 0
      ? null
      : course.startedAt.getTime() + course.durationDays * DAY;
  const replaced = course.replacedAt?.getTime() ?? null;
  if (natural === null && replaced === null) return null;
  return new Date(
    Math.min(natural ?? Number.POSITIVE_INFINITY, replaced ?? Number.POSITIVE_INFINITY),
  );
}

/**
 * Every dose instant of a course that falls in [from, to).
 *
 * A dose earlier on the signing day than the signing itself is not due — a
 * prescription signed at 10:30 starts with the evening dose, not a missed
 * morning one.
 */
export function doseSlots(course: CourseForSchedule, from: Date, to: Date): Date[] {
  const kind = scheduleKind(course.frequency);
  if (kind === 'as_needed' || kind === 'unknown') return [];
  const times = kind === 'weekly' ? ['08:00'] : TIMES[course.frequency.trim().toUpperCase()];
  const signedWeekday = istDate(course.startedAt).weekday;
  const end = courseEnd(course);

  const lower = Math.max(from.getTime(), course.startedAt.getTime());
  const upper = Math.min(to.getTime(), end?.getTime() ?? Number.POSITIVE_INFINITY);
  if (lower >= upper) return [];

  const out: Date[] = [];
  // Walk IST calendar days from the day `lower` falls on.
  const start = istDate(new Date(lower));
  for (let i = 0; ; i++) {
    const dayStart = istInstant(start.y, start.m, start.d + i, '00:00').getTime();
    if (dayStart >= upper) break;
    const day = istDate(new Date(dayStart));
    if (kind === 'weekly' && day.weekday !== signedWeekday) continue;
    for (const t of times) {
      const at = istInstant(day.y, day.m, day.d, t);
      if (at.getTime() >= lower && at.getTime() < upper) out.push(at);
    }
  }
  return out;
}

/** True when `at` is exactly one of the course's dose instants. */
export function isDoseSlot(course: CourseForSchedule, at: Date): boolean {
  const probe = doseSlots(course, new Date(at.getTime() - MIN), new Date(at.getTime() + MIN));
  return probe.some((s) => s.getTime() === at.getTime());
}

/** The India-time calendar day an instant falls on, as a day number — for
 *  counting whole days ("5 days left") that change at midnight, not at the
 *  time of day a prescription happened to be signed. */
export function istDayNumber(at: Date): number {
  return Math.floor((at.getTime() + IST_OFFSET_MIN * MIN) / DAY);
}

/** Start and end of "today" in India time, for an instant. */
export function istDayBounds(now: Date): { start: Date; end: Date } {
  const t = istDate(now);
  const start = istInstant(t.y, t.m, t.d, '00:00');
  return { start, end: new Date(start.getTime() + DAY) };
}

// ── Slot state ───────────────────────────────────────────────────────────────

/** A dose can be marked from an hour before it until the window closes. */
export const DUE_OPENS_BEFORE_MS = 1 * HOUR;
/** After this long with nothing logged, a dose counts as missed. */
export const DUE_CLOSES_AFTER_MS = 3 * HOUR;
/** How far back a late entry is accepted ("I took it last night"). */
export const LATE_LOG_LIMIT_MS = 48 * HOUR;

export type SlotState = 'taken' | 'skipped' | 'due' | 'upcoming' | 'missed';

export function slotState(at: Date, logged: 'Taken' | 'Skipped' | null, now: Date): SlotState {
  if (logged === 'Taken') return 'taken';
  if (logged === 'Skipped') return 'skipped';
  const t = at.getTime();
  const n = now.getTime();
  if (n < t - DUE_OPENS_BEFORE_MS) return 'upcoming';
  if (n <= t + DUE_CLOSES_AFTER_MS) return 'due';
  return 'missed';
}

/** Whether the patient may log this slot now (not the far future, not ancient). */
export function canLogSlot(at: Date, now: Date): boolean {
  const t = at.getTime();
  const n = now.getTime();
  return n >= t - DUE_OPENS_BEFORE_MS && n <= t + LATE_LOG_LIMIT_MS;
}

// ── Adherence ────────────────────────────────────────────────────────────────

export interface AdherenceCount {
  taken: number;
  skipped: number;
  missed: number;
  /** Doses that were due in the window (taken + skipped + missed). */
  due: number;
  /** taken ÷ due, 0–100, or null when nothing was due yet. */
  percent: number | null;
}

/**
 * Adherence over a window: of the doses that were DUE (their window has
 * closed, or the patient already logged them), how many were taken.
 *
 * ⚠️ Only what the patient logged. A dose taken but never tapped counts as
 * missed — the screen says so rather than presenting this as a clinical fact.
 */
export function adherence(
  slots: Date[],
  logs: Map<number, 'Taken' | 'Skipped'>,
  now: Date,
): AdherenceCount {
  let taken = 0;
  let skipped = 0;
  let missed = 0;
  for (const s of slots) {
    const state = slotState(s, logs.get(s.getTime()) ?? null, now);
    if (state === 'taken') taken += 1;
    else if (state === 'skipped') skipped += 1;
    else if (state === 'missed') missed += 1;
  }
  const due = taken + skipped + missed;
  return {
    taken,
    skipped,
    missed,
    due,
    percent: due === 0 ? null : Math.round((taken / due) * 100),
  };
}

/** "Morning" | "Afternoon" | "Evening" | "Night", by IST hour. */
export function partOfDay(at: Date): 'Morning' | 'Afternoon' | 'Evening' | 'Night' {
  const h = new Date(at.getTime() + IST_OFFSET_MIN * MIN).getUTCHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  if (h < 21) return 'Evening';
  return 'Night';
}
