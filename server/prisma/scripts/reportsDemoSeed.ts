import type { PrismaClient } from '@prisma/client';
import { encryptFieldOptional } from '../../src/utils/encryption';
import { LAB_NAME, LAB_REPORTS, VALIDATOR_ROLE, VITALS, type DayAnchor } from './reportsDemoData';

// ─────────────────────────────────────────────────────────────────────────────
// Seeds the pitch account's lab reports and vital signs (data in
// reportsDemoData.ts). Idempotent: a lab report is matched on (patient, panel,
// collected-at); vitals on their unique key, so re-runs add nothing.
//
// ⚠️ SYNTHETIC PATIENTS ONLY. Refuses a profile without `isSyntheticData`.
// ⚠️ Dates come from her record: the emergency admission (the encounter with
// the stroke assessment) and the stroke-clinic follow-up. If either is
// missing the seed says which script to run and stops.
// ─────────────────────────────────────────────────────────────────────────────

export const PITCH_EMAIL = 'demouser.strokeai@gmail.com';
const IST_OFFSET_MS = 330 * 60_000;
const DAY = 86_400_000;

/** The IST calendar date of an instant, as a UTC-midnight timestamp. */
function istMidnight(at: Date): number {
  const shifted = new Date(at.getTime() + IST_OFFSET_MS);
  return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
}

/** IST "HH:MM" on an anchor day → the exact instant. */
function istAt(dayMidnightUtc: number, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(dayMidnightUtc + (h * 60 + m) * 60_000 - IST_OFFSET_MS);
}

export interface ReportAnchors {
  patientId: string;
  admission: { id: string; day: number };
  followUp: { id: string; day: number };
}

export async function loadAnchors(prisma: PrismaClient): Promise<ReportAnchors> {
  const patient = await prisma.patientProfile.findFirst({
    where: { user: { email: PITCH_EMAIL } },
    select: { id: true, isSyntheticData: true },
  });
  if (patient === null)
    throw new Error(`Demo patient ${PITCH_EMAIL} not found — run the base seed first.`);
  if (!patient.isSyntheticData)
    throw new Error('Refusing: the demo patient is not marked synthetic.');
  const admission = await prisma.encounter.findFirst({
    where: { patientId: patient.id, type: 'Emergency', strokeAssessment: { isNot: null } },
    orderBy: { startedAt: 'asc' },
    select: { id: true, startedAt: true },
  });
  const followUp = await prisma.encounter.findFirst({
    where: { patientId: patient.id, type: 'FollowUp' },
    orderBy: { startedAt: 'desc' },
    select: { id: true, startedAt: true },
  });
  if (admission === null)
    throw new Error('No admission with a stroke assessment — run db:demo:enrich first.');
  if (followUp === null)
    throw new Error('No stroke-clinic follow-up visit — run db:demo:clinic first.');
  return {
    patientId: patient.id,
    admission: { id: admission.id, day: istMidnight(admission.startedAt) },
    followUp: { id: followUp.id, day: istMidnight(followUp.startedAt) },
  };
}

export function anchorDay(a: ReportAnchors, d: DayAnchor): number {
  switch (d) {
    case 'admit':
      return a.admission.day;
    case 'admit+1':
      return a.admission.day + DAY;
    case 'followup-1':
      return a.followUp.day - DAY;
    case 'followup':
      return a.followUp.day;
    case 'followup+1':
      return a.followUp.day + DAY;
  }
}

export async function seedReportsDemo(prisma: PrismaClient): Promise<void> {
  const a = await loadAnchors(prisma);

  // ── Lab reports ───────────────────────────────────────────────────────────
  const last = await prisma.labReport.findFirst({
    where: { reportNumber: { startsWith: 'LAB/26-27/' } },
    orderBy: { reportNumber: 'desc' },
    select: { reportNumber: true },
  });
  let seq = last === null ? 4100 : Number(last.reportNumber.split('/').pop() ?? '4100');
  let reports = 0;
  let results = 0;
  for (const r of LAB_REPORTS) {
    const day = anchorDay(a, r.day);
    const collectedAt = istAt(day, r.collected);
    const exists = await prisma.labReport.findFirst({
      where: { patientId: a.patientId, panelName: r.panelName, collectedAt },
      select: { id: true },
    });
    if (exists !== null) continue;
    seq += 1;
    const encounterId = r.day === 'admit' || r.day === 'admit+1' ? a.admission.id : null;
    await prisma.labReport.create({
      data: {
        patientId: a.patientId,
        encounterId,
        reportNumber: `LAB/26-27/${String(seq).padStart(6, '0')}`,
        panelName: r.panelName,
        panelCode: r.panelCode ?? null,
        specimen: r.specimen,
        fasting: r.fasting ?? null,
        collectedAt,
        receivedAt: new Date(collectedAt.getTime() + 10 * 60_000),
        reportedAt: istAt(day, r.reported),
        status: 'Final',
        labName: LAB_NAME,
        validatedByRole: VALIDATOR_ROLE,
        orderedByName: r.orderedBy,
        comment: encryptFieldOptional(r.comment ?? null),
        isAtlasVocabulary: r.isAtlasVocabulary,
        results: {
          create: r.results.map((x, i) => ({
            patientId: a.patientId,
            sortOrder: i,
            analyteCode: x.code,
            analyteName: x.name,
            value: x.value,
            valueNumeric: Number.isFinite(Number(x.value)) ? Number(x.value) : null,
            unit: x.unit ?? null,
            referenceRangeText: x.rangeText ?? null,
            referenceLow: x.low ?? null,
            referenceHigh: x.high ?? null,
            flag: x.flag ?? null,
            method: x.method ?? null,
            collectedAt,
          })),
        },
      },
    });
    reports += 1;
    results += r.results.length;
  }

  // ── Vital signs ───────────────────────────────────────────────────────────
  const rows = VITALS.map((v) => ({
    patientId: a.patientId,
    encounterId:
      v.source !== 'Facility' ? null : v.day === 'followup' ? a.followUp.id : a.admission.id,
    type: v.type,
    value: v.value,
    value2: v.value2 ?? null,
    unit: v.unit,
    qualifier: v.qualifier ?? null,
    source: v.source,
    placeName: v.placeName ?? null,
    recordedByRole: v.recordedByRole ?? null,
    deviceName: v.deviceName ?? null,
    isDerived: v.isDerived ?? false,
    measuredAt: istAt(anchorDay(a, v.day), v.time),
  }));
  const { count } = await prisma.vitalSign.createMany({ data: rows, skipDuplicates: true });

  console.log(
    `✓ reports demo: ${reports} lab report(s) with ${results} result(s), ${count} vital sign(s) added`,
  );
}
