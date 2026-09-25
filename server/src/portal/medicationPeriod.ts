/**
 * Whether a signed prescription item is still being taken.
 *
 * ⚠️ DERIVED, NOT RECORDED. There is no dispensing or "stopped" record in this
 * system, so the only honest basis is the prescription itself: it starts when
 * it was signed and runs for `durationDays`. An item with no duration is
 * ongoing until a clinician issues something else. The UI words this as
 * "prescribed until", never as "you are taking", because we cannot know
 * whether the medicine was bought or taken.
 */
export type MedicationPeriod = {
  startedAt: Date;
  /** Last day covered by the prescription, or null when no duration was set. */
  endsAt: Date | null;
  status: 'current' | 'completed';
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function medicationPeriod(
  signedAt: Date,
  durationDays: number | null,
  now: Date = new Date(),
): MedicationPeriod {
  if (durationDays === null || durationDays <= 0) {
    return { startedAt: signedAt, endsAt: null, status: 'current' };
  }
  // Day 1 is the day it was signed, so a 7-day course covers signed day + 6.
  const endsAt = new Date(signedAt.getTime() + (durationDays - 1) * DAY_MS);
  const endOfLastDay = new Date(endsAt.getTime() + DAY_MS);
  return { startedAt: signedAt, endsAt, status: now < endOfLastDay ? 'current' : 'completed' };
}
