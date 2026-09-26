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
  /** When a newer prescription for the same medicine replaced this one. */
  replacedAt: Date | null;
  status: 'current' | 'completed';
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function medicationPeriod(
  signedAt: Date,
  durationDays: number | null,
  now: Date = new Date(),
  replacedAt: Date | null = null,
): MedicationPeriod {
  const replaced = replacedAt !== null && replacedAt <= now;
  if (durationDays === null || durationDays <= 0) {
    return {
      startedAt: signedAt,
      endsAt: null,
      replacedAt,
      status: replaced ? 'completed' : 'current',
    };
  }
  // Day 1 is the day it was signed, so a 7-day course covers signed day + 6.
  const endsAt = new Date(signedAt.getTime() + (durationDays - 1) * DAY_MS);
  const endOfLastDay = new Date(endsAt.getTime() + DAY_MS);
  return {
    startedAt: signedAt,
    endsAt,
    replacedAt,
    status: now < endOfLastDay && !replaced ? 'current' : 'completed',
  };
}

export interface SignedLine {
  drugId: string;
  prescriptionId: string;
  signedAt: Date;
}

/**
 * When a later signed prescription for the same medicine replaced this line,
 * or null.
 *
 * ⚠️ A RENEWAL REPLACES THE COURSE IT RENEWS. A doctor answering a refill, or
 * changing a dose, writes a new prescription; without this rule the old and
 * new courses would both read "current" and every dose would be scheduled
 * twice. Lines on the SAME prescription never replace each other — two
 * strengths of one medicine written together are meant to be taken together.
 */
export function replacedAt(line: SignedLine, all: readonly SignedLine[]): Date | null {
  let first: Date | null = null;
  for (const other of all) {
    if (other.drugId !== line.drugId || other.prescriptionId === line.prescriptionId) continue;
    if (other.signedAt.getTime() <= line.signedAt.getTime()) continue;
    if (first === null || other.signedAt < first) first = other.signedAt;
  }
  return first;
}
