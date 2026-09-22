import { AppointmentStatus } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Scheduling — the pure core.
//
// Everything here is a pure function over plain data: no Prisma, no clock
// reads except what the caller passes in. That is deliberate. Slot arithmetic
// and status transitions are precisely the logic that is painful to verify
// against a live database and trivial to verify as functions, and this
// codebase's existing tests (patient/identityScoring, utils/shriId) follow
// the same shape.
//
// ── THE TIMEZONE PROBLEM, SOLVED ONCE ───────────────────────────────────────
// Three representations meet here and they do not agree:
//   DoctorAvailability  "09:00"–"13:00"  wall clock, NO zone
//   DoctorLeave         @db.Date          a calendar day, NO time
//   Appointment         scheduledAt       an absolute UTC instant
//
// Reconciling them needs one declared zone. The platform is India-only by
// design (UI_ATLAS §2.1 A7, data residency), and India observes no daylight
// saving — so the offset is a constant, and a fixed-offset conversion is
// exactly correct rather than an approximation. That is why there is no
// date library here: with no DST there is no rule table to consult.
//
// If the product ever runs outside IST this constant stops being sufficient
// and every function below needs a real zone, not an offset. It is a single
// constant precisely so that change is findable.
// ─────────────────────────────────────────────────────────────────────────────

export const CLINIC_TZ_OFFSET_MINUTES = 330; // IST, UTC+05:30
export const CLINIC_TZ_LABEL = 'Asia/Kolkata';

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_DAY = 1440;

/** "HH:mm" → minutes past clinic-local midnight. Returns null if malformed. */
export function parseWallClock(value: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (m === null) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** minutes past clinic-local midnight → "HH:mm". */
export function formatWallClock(minutes: number): string {
  const wrapped = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h = Math.floor(wrapped / 60);
  const mm = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** "YYYY-MM-DD" (clinic-local) + minutes past local midnight → UTC instant. */
export function clinicLocalToInstant(isoDate: string, minutesPastMidnight: number): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  const localMidnightAsIfUtc = Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  return new Date(
    localMidnightAsIfUtc + (minutesPastMidnight - CLINIC_TZ_OFFSET_MINUTES) * MS_PER_MINUTE,
  );
}

/** A UTC instant → the clinic-local calendar day and time it falls on. */
export function instantToClinicLocal(instant: Date): {
  isoDate: string;
  minutesPastMidnight: number;
  dayOfWeek: number;
} {
  const shifted = new Date(instant.getTime() + CLINIC_TZ_OFFSET_MINUTES * MS_PER_MINUTE);
  const isoDate = shifted.toISOString().slice(0, 10);
  const minutesPastMidnight = shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
  return { isoDate, minutesPastMidnight, dayOfWeek: shifted.getUTCDay() };
}

/** Clinic-local day-of-week (0=Sun) for a "YYYY-MM-DD" date string. */
export function dayOfWeekForDate(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).getUTCDay();
}

/** Half-open overlap: [aStart, aEnd) against [bStart, bEnd). Two appointments
 *  that merely touch — one ending exactly as the next begins — do not
 *  overlap, which is the whole point of a back-to-back slot grid. */
export function intervalsOverlap(
  aStart: number,
  aDurationMins: number,
  bStart: number,
  bDurationMins: number,
): boolean {
  return aStart < bStart + bDurationMins * MS_PER_MINUTE
    && bStart < aStart + aDurationMins * MS_PER_MINUTE;
}

export type AvailabilityWindow = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMins: number;
  isActive: boolean;
};

export type LeaveRange = { startDate: Date; endDate: Date };

export type BookedSlot = { scheduledAt: Date; durationMins: number };

export type GeneratedSlot = {
  /** UTC instant the slot begins. */
  startsAt: Date;
  durationMins: number;
  /** Clinic-local "HH:mm", for display without re-deriving the zone. */
  label: string;
};

/** True when a clinic-local calendar day falls inside an inclusive leave
 *  range. DoctorLeave.startDate/endDate are @db.Date, so only the calendar
 *  day is meaningful — comparing instants would make a leave that starts
 *  "today" begin at 00:00 UTC, which is 05:30 local. */
export function isOnLeave(isoDate: string, leaves: LeaveRange[]): boolean {
  return leaves.some((leave) => {
    const from = leave.startDate.toISOString().slice(0, 10);
    const to = leave.endDate.toISOString().slice(0, 10);
    return isoDate >= from && isoDate <= to;
  });
}

/**
 * Free, bookable slots for one clinic-local day.
 *
 * Subtracts, in order: inactive windows, leave days, anything already booked
 * that overlaps, and (when `now` is given) slots that have already started.
 * A slot that would run past its window's end time is not emitted — a 30
 * minute slot does not fit in the last 20 minutes of a clinic.
 */
export function generateSlotsForDate(input: {
  isoDate: string;
  availability: AvailabilityWindow[];
  leaves: LeaveRange[];
  booked: BookedSlot[];
  now?: Date;
}): GeneratedSlot[] {
  const { isoDate, availability, leaves, booked, now } = input;

  if (isOnLeave(isoDate, leaves)) return [];

  const dayOfWeek = dayOfWeekForDate(isoDate);
  const slots: GeneratedSlot[] = [];

  for (const window of availability) {
    if (!window.isActive || window.dayOfWeek !== dayOfWeek) continue;

    const start = parseWallClock(window.startTime);
    const end = parseWallClock(window.endTime);
    const step = window.slotDurationMins;
    // A malformed or non-advancing window would otherwise loop forever.
    if (start === null || end === null || step <= 0 || end <= start) continue;

    for (let minute = start; minute + step <= end; minute += step) {
      const startsAt = clinicLocalToInstant(isoDate, minute);

      if (now !== undefined && startsAt.getTime() <= now.getTime()) continue;

      const clash = booked.some((b) =>
        intervalsOverlap(startsAt.getTime(), step, b.scheduledAt.getTime(), b.durationMins),
      );
      if (clash) continue;

      slots.push({ startsAt, durationMins: step, label: formatWallClock(minute) });
    }
  }

  return slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

// ─────────────────────────────────────────────────────────────────────────────
// Status transitions
//
// Before this, nothing in the codebase ever wrote Confirmed, Completed or
// NoShow — those rows existed only in seed data, and there was no rule about
// what could follow what. An explicit table is what stops a cancelled
// appointment being silently completed.
// ─────────────────────────────────────────────────────────────────────────────

export const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  [AppointmentStatus.Requested]: [AppointmentStatus.Confirmed, AppointmentStatus.Cancelled],
  [AppointmentStatus.Confirmed]: [
    AppointmentStatus.Completed,
    AppointmentStatus.NoShow,
    AppointmentStatus.Cancelled,
  ],
  // Terminal. A completed visit did happen; a cancelled one did not; a
  // no-show is a recorded clinical fact. None of the three is revisable —
  // correcting one is a new appointment, not a rewritten old one.
  [AppointmentStatus.Completed]: [],
  [AppointmentStatus.Cancelled]: [],
  [AppointmentStatus.NoShow]: [],
};

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** Only a future, not-yet-terminal appointment can be moved. */
export function canReschedule(status: AppointmentStatus): boolean {
  return status === AppointmentStatus.Requested || status === AppointmentStatus.Confirmed;
}
