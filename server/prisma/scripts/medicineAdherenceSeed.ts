import type { PrismaClient } from '@prisma/client';
import { adherence, doseSlots, istDayBounds } from '../../src/portal/medicationSchedule';
import { replacedAt } from '../../src/portal/medicationPeriod';

// ─────────────────────────────────────────────────────────────────────────────
// Demo dose history — what the patient "told us" they took.
//
// ⚠️ DEMO DATA, DETERMINISTIC, AND NEVER OVER THE TOP OF A REAL ENTRY. Rows
// are inserted with skipDuplicates on (medicine line, dose time), so anything
// someone recorded while demoing is kept exactly as they left it.
//
// ⚠️ A TOP-UP, NOT A ONE-OFF. Adherence reflects only what is logged, so a
// demo account nobody uses drifts down a dose a day. Each run fills the days
// since the last one from the same pattern. The pattern is anchored to the
// calendar (which doses are missed depends on the date, not on when the seed
// ran), so repeated runs agree with each other.
//
// ⚠️ TODAY IS LEFT UNLOGGED on purpose, so the Today schedule shows live
// "due" doses to tick off during a demo.
//
// SD-P-01's levothyroxine follows UI_ATLAS S-26-07's own sample, 86% over
// 30 days (±1 dose — 30 doses cannot all land on an exact percentage).
// ─────────────────────────────────────────────────────────────────────────────

const DAY = 86_400_000;
const IST_OFFSET_MS = 330 * 60_000;

interface Target {
  email: string;
  /** Wanted 30-day adherence for each medicine, 0–100. */
  percentByDrug: Record<string, number>;
}

const TARGETS: Target[] = [
  { email: 'demo.patient.krishnan@stroke-ai.invalid', percentByDrug: { Levothyroxine: 86 } },
  {
    email: 'demouser.strokeai@gmail.com',
    percentByDrug: { Clopidogrel: 93, Atorvastatin: 86, Amlodipine: 93 },
  },
];

/** Doses per day, for numbering doses consecutively along the calendar. */
const PER_DAY: Record<string, number> = { OD: 1, HS: 1, BD: 2, TDS: 3, QDS: 4 };

/**
 * A dose's absolute number: consecutive doses of a course get consecutive
 * numbers, anchored to the IST calendar (so every run numbers them alike).
 */
function doseNumber(at: Date, frequency: string): number {
  const ist = at.getTime() + IST_OFFSET_MS;
  const day = Math.floor(ist / DAY);
  const f = frequency.trim().toUpperCase();
  if (f === 'WEEKLY') return Math.floor(day / 7);
  const perDay = PER_DAY[f] ?? 1;
  // Position within the day from the hour: the default times are ascending.
  const hour = Math.floor((ist % DAY) / 3_600_000);
  const position = Math.min(perDay - 1, Math.floor((hour * perDay) / 24));
  return day * perDay + position;
}

/**
 * Which doses are not taken: spread evenly (Bresenham-style) along the dose
 * number, so any N consecutive doses hold the target share to within one.
 * Every other not-taken dose was marked "skipped"; the rest read as missed.
 */
function patternFor(n: number, percent: number): 'Taken' | 'Skipped' | null {
  const miss = 1 - percent / 100;
  const before = Math.floor(n * miss);
  if (Math.floor((n + 1) * miss) === before) return 'Taken';
  return before % 2 === 0 ? 'Skipped' : null;
}

export async function seedMedicineAdherence(prisma: PrismaClient): Promise<void> {
  const now = new Date();
  const { start: todayStart } = istDayBounds(now);
  const windowStart = new Date(now.getTime() - 30 * DAY);
  let written = 0;

  for (const t of TARGETS) {
    const patient = await prisma.patientProfile.findFirst({
      where: { user: { email: t.email } },
      select: { id: true },
    });
    if (patient === null) continue;

    const items = await prisma.prescriptionItem.findMany({
      where: { prescription: { patientId: patient.id, status: 'Signed' } },
      select: {
        id: true,
        drugId: true,
        frequency: true,
        durationDays: true,
        drug: { select: { genericName: true } },
        prescription: { select: { id: true, signedAt: true, createdAt: true } },
      },
    });
    const lines = items.map((i) => ({
      drugId: i.drugId,
      prescriptionId: i.prescription.id,
      signedAt: i.prescription.signedAt ?? i.prescription.createdAt,
    }));

    for (const [idx, item] of items.entries()) {
      const want = t.percentByDrug[item.drug.genericName];
      if (want === undefined) continue;
      const startedAt = item.prescription.signedAt ?? item.prescription.createdAt;
      const course = {
        frequency: item.frequency,
        startedAt,
        durationDays: item.durationDays,
        replacedAt: replacedAt(lines[idx], lines),
      };
      // Only the part of each course inside the window — a renewed course's
      // doses stop where the renewal starts, so nothing is counted twice.
      const past = doseSlots(course, windowStart, todayStart);
      if (past.length === 0) continue;

      // ⚠️ Only AFTER the latest entry already there. A gap before it is a
      // dose this history already calls missed (or one a person left alone
      // while demoing); filling it would quietly raise the figure.
      const last = await prisma.medicationDoseLog.findFirst({
        where: { prescriptionItemId: item.id },
        orderBy: { scheduledFor: 'desc' },
        select: { scheduledFor: true },
      });
      const fresh = past.filter((at) => last === null || at > last.scheduledFor);

      const salt = [...item.drug.genericName].reduce((a, c) => a + c.charCodeAt(0), 0);
      const n = (at: Date): number => doseNumber(at, item.frequency) + salt;
      const rows = fresh.flatMap((at) => {
        const status = patternFor(n(at), want);
        if (status === null) return [];
        return [
          {
            patientId: patient.id,
            prescriptionItemId: item.id,
            scheduledFor: at,
            status,
            recordedAt: new Date(at.getTime() + (status === 'Taken' ? 12 : 40) * 60_000),
          },
        ];
      });
      const { count } = await prisma.medicationDoseLog.createMany({
        data: rows,
        skipDuplicates: true,
      });
      written += count;

      const logged = await prisma.medicationDoseLog.findMany({
        where: { prescriptionItemId: item.id, scheduledFor: { gte: windowStart } },
        select: { scheduledFor: true, status: true },
      });
      const check = adherence(
        past,
        new Map(logged.map((r) => [r.scheduledFor.getTime(), r.status])),
        now,
      );
      console.log(
        `  · ${t.email.split('@')[0]} ${item.drug.genericName}: ${check.percent}% of ${check.due} doses before today`,
      );
    }
  }
  console.log(`✓ dose history: ${written} new patient-reported dose entries`);
}
