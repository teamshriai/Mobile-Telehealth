import { Prisma, type DoseLogStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { auditService, AuditAction, AuditSeverity } from '../services/audit.service';
import { decryptFieldOptional } from '../utils/encryption';
import { requireOwnPatientId } from '../portal/ownPatient';
import {
  loadSignedPrescriptions,
  toMedications,
  type MedicationView,
} from '../portal/portal.service';
import {
  adherence,
  canLogSlot,
  doseSlots,
  isDoseSlot,
  istDayBounds,
  istDayNumber,
  partOfDay,
  scheduleKind,
  slotState,
  type AdherenceCount,
  type ScheduleKind,
  type SlotState,
} from '../portal/medicationSchedule';
import { refillService, type RefillView } from './refill.service';
import { findReplacement } from './replacement';

// ─────────────────────────────────────────────────────────────────────────────
// The patient's Medicines section.
//
// ⚠️ TWO KINDS OF FACT, NEVER BLENDED. What was PRESCRIBED comes from signed
// prescriptions (clinician-authored, read-only here). What was TAKEN comes
// only from the patient's own dose log. Adherence is therefore "what you have
// told us", and every surface says so; a dose taken but never tapped counts as
// missed, and no figure is presented as clinical fact.
//
// ⚠️ Every query is scoped by the server-resolved patient id; an item id from
// the client is only ever looked up TOGETHER with it.
// ─────────────────────────────────────────────────────────────────────────────

const DAY = 86_400_000;
const ADHERENCE_WINDOW_DAYS = 30;

/**
 * The adherence window: the 30 days BEFORE today (India time).
 *
 * ⚠️ Today is left out on purpose. A morning dose not yet tapped would
 * otherwise count as missed from 11:00, and the figure would sag every day
 * until the patient caught up — the Today card is where today is counted.
 */
function adherenceWindow(now: Date): { from: Date; to: Date } {
  const { start } = istDayBounds(now);
  return { from: new Date(start.getTime() - ADHERENCE_WINDOW_DAYS * DAY), to: start };
}

type Meta = { ipAddress?: string; userAgent?: string };

export interface MedicineView extends MedicationView {
  /** The drug's group, e.g. "Statin" — from the formulary, never invented. */
  drugClass: string | null;
  /** What it was prescribed for, from the linked diagnosis. */
  indication: { code: string; title: string } | null;
  prescriber: { name: string | null; specialty: string | null; hospital: string | null };
  schedule: ScheduleKind;
  /** Days of supply left on a current course (0 on its last day). */
  supplyDaysLeft: number | null;
  adherence30: AdherenceCount | null;
  refill: RefillView | null;
}

export interface TodayDose {
  /** Stable key for the slot: item id + instant. */
  key: string;
  itemId: string;
  name: string;
  dose: string;
  doseUnit: string;
  form: string;
  at: Date;
  partOfDay: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
  state: SlotState;
  logId: string | null;
  canLog: boolean;
  instructions: string | null | undefined;
}

export interface MedicinesSummary {
  currentCount: number;
  pastCount: number;
  doctors: string[];
  /** `remaining`: still ahead or due now. `notMarked`: past its window, not yet
   *  tapped — it can still be marked for two days. */
  today: { taken: number; skipped: number; total: number; remaining: number; notMarked: number };
  nextDose: { name: string; at: Date } | null;
  adherence30: AdherenceCount;
  refillsDueSoon: number;
  asNeededCount: number;
  /** As the PATIENT reported them — there is no structured allergy record. */
  allergies: string | null;
}

type LogIndex = Map<string, Map<number, { id: string; status: DoseLogStatus }>>;

async function loadLogs(patientId: string, from: Date): Promise<LogIndex> {
  const rows = await prisma.medicationDoseLog.findMany({
    where: { patientId, scheduledFor: { gte: from } },
    select: { id: true, prescriptionItemId: true, scheduledFor: true, status: true },
  });
  const byItem: LogIndex = new Map();
  for (const r of rows) {
    const m =
      byItem.get(r.prescriptionItemId) ?? new Map<number, { id: string; status: DoseLogStatus }>();
    m.set(r.scheduledFor.getTime(), { id: r.id, status: r.status });
    byItem.set(r.prescriptionItemId, m);
  }
  return byItem;
}

function statusMap(
  m: Map<number, { id: string; status: DoseLogStatus }> | undefined,
): Map<number, 'Taken' | 'Skipped'> {
  const out = new Map<number, 'Taken' | 'Skipped'>();
  for (const [k, v] of m ?? []) out.set(k, v.status);
  return out;
}

async function load(
  patientId: string,
  now: Date,
): Promise<{ medicines: MedicineView[]; logs: LogIndex }> {
  // Close any refill a newer prescription has already answered, BEFORE the
  // list is built, so the page never shows a request that was fulfilled.
  await refillService.autoFulfil(patientId);

  const rx = await loadSignedPrescriptions(patientId);
  const views = toMedications(rx, now);

  const signerIds = [
    ...new Set(rx.map((p) => p.signedByUserId).filter((v): v is string => v !== null)),
  ];
  const doctors = await prisma.doctorProfile.findMany({
    where: { userId: { in: signerIds } },
    select: {
      userId: true,
      specialty: true,
      hospitalName: true,
      hospital: { select: { name: true } },
    },
  });
  const doctorByUser = new Map(doctors.map((d) => [d.userId, d]));

  const codes = [
    ...new Set(
      rx.flatMap((p) => p.items.map((i) => i.indicationCode)).filter((c): c is string => !!c),
    ),
  ];
  const [problems, dx] = await Promise.all([
    prisma.problem.findMany({
      where: { patientId, code: { in: codes } },
      select: { code: true, codeTitle: true },
    }),
    prisma.diagnosisCode.findMany({
      where: { code: { in: codes } },
      select: { code: true, title: true },
    }),
  ]);
  const titleByCode = new Map<string, string>();
  for (const d of dx) titleByCode.set(d.code, d.title);
  for (const p of problems) titleByCode.set(p.code, p.codeTitle);

  const itemById = new Map(
    rx.flatMap((p) => p.items.map((i) => [i.id, { item: i, rx: p }] as const)),
  );
  const refills = await refillService.latestForItems(patientId, [...itemById.keys()]);
  const logs = await loadLogs(
    patientId,
    new Date(now.getTime() - (ADHERENCE_WINDOW_DAYS + 2) * DAY),
  );
  const window = adherenceWindow(now);

  const medicines: MedicineView[] = views.map((v) => {
    const { item, rx: p } = itemById.get(v.id)!;
    const doctor = p.signedByUserId !== null ? doctorByUser.get(p.signedByUserId) : undefined;
    const course = {
      frequency: v.frequency,
      startedAt: v.startedAt,
      durationDays: v.durationDays,
      replacedAt: v.replacedAt,
    };
    const kind = scheduleKind(v.frequency);
    const slots = doseSlots(course, window.from, window.to);
    return {
      ...v,
      drugClass: item.drug.therapeuticClass,
      indication:
        item.indicationCode !== null && titleByCode.has(item.indicationCode)
          ? { code: item.indicationCode, title: titleByCode.get(item.indicationCode)! }
          : null,
      prescriber: {
        name: v.prescribedBy,
        specialty: doctor?.specialty ?? null,
        hospital: doctor?.hospital?.name ?? doctor?.hospitalName ?? null,
      },
      schedule: kind,
      // Calendar days after today (India time) to the last day covered; 0 on it.
      supplyDaysLeft:
        v.status === 'current' && v.endsAt !== null
          ? Math.max(0, istDayNumber(v.endsAt) - istDayNumber(now))
          : null,
      adherence30:
        kind === 'scheduled' || kind === 'weekly'
          ? adherence(slots, statusMap(logs.get(v.id)), now)
          : null,
      refill: refills.get(v.id) ?? null,
    };
  });
  return { medicines, logs };
}

function todayDoses(medicines: MedicineView[], logs: LogIndex, now: Date): TodayDose[] {
  const { start, end } = istDayBounds(now);
  const out: TodayDose[] = [];
  for (const m of medicines) {
    if (m.status !== 'current') continue;
    const course = {
      frequency: m.frequency,
      startedAt: m.startedAt,
      durationDays: m.durationDays,
      replacedAt: m.replacedAt,
    };
    for (const at of doseSlots(course, start, end)) {
      const log = logs.get(m.id)?.get(at.getTime()) ?? null;
      out.push({
        key: `${m.id}:${at.toISOString()}`,
        itemId: m.id,
        name: m.name,
        dose: m.dose,
        doseUnit: m.doseUnit,
        form: m.form,
        at,
        partOfDay: partOfDay(at),
        state: slotState(at, log?.status ?? null, now),
        logId: log?.id ?? null,
        canLog: canLogSlot(at, now),
        instructions: m.instructions,
      });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime() || a.name.localeCompare(b.name));
}

export const medicationService = {
  async overview(userId: string, now = new Date()) {
    const patientId = await requireOwnPatientId(userId);
    const [{ medicines, logs }, profile] = await Promise.all([
      load(patientId, now),
      prisma.patientProfile.findUnique({
        where: { id: patientId },
        select: { knownAllergies: true, currentMedications: true },
      }),
    ]);
    const current = medicines.filter((m) => m.status === 'current');
    const past = medicines.filter((m) => m.status === 'completed');
    const today = todayDoses(medicines, logs, now);

    // Overall 30-day adherence across every scheduled course, current or not.
    const window = adherenceWindow(now);
    const allSlots: Array<{ at: Date; status: 'Taken' | 'Skipped' | null }> = [];
    for (const m of medicines) {
      if (m.schedule !== 'scheduled' && m.schedule !== 'weekly') continue;
      const course = {
        frequency: m.frequency,
        startedAt: m.startedAt,
        durationDays: m.durationDays,
        replacedAt: m.replacedAt,
      };
      const map = statusMap(logs.get(m.id));
      for (const at of doseSlots(course, window.from, window.to))
        allSlots.push({ at, status: map.get(at.getTime()) ?? null });
    }
    // ⚠️ Counted per (medicine, slot): two medicines due at the same instant
    // are two doses, so a map keyed on the instant alone would merge them.
    const exact = allSlots.reduce(
      (acc, s) => {
        const st = slotState(s.at, s.status, now);
        if (st === 'taken') acc.taken += 1;
        else if (st === 'skipped') acc.skipped += 1;
        else if (st === 'missed') acc.missed += 1;
        return acc;
      },
      { taken: 0, skipped: 0, missed: 0 },
    );
    const due = exact.taken + exact.skipped + exact.missed;

    const next = today.find((d) => d.state === 'upcoming' || d.state === 'due') ?? null;
    const summary: MedicinesSummary = {
      currentCount: current.length,
      pastCount: past.length,
      doctors: [...new Set(current.map((m) => m.prescriber.name).filter((n): n is string => !!n))],
      today: {
        taken: today.filter((d) => d.state === 'taken').length,
        skipped: today.filter((d) => d.state === 'skipped').length,
        total: today.length,
        remaining: today.filter((d) => d.state === 'upcoming' || d.state === 'due').length,
        notMarked: today.filter((d) => d.state === 'missed').length,
      },
      nextDose:
        next === null ? null : { name: `${next.name} ${next.dose} ${next.doseUnit}`, at: next.at },
      adherence30: {
        ...exact,
        due,
        percent: due === 0 ? null : Math.round((exact.taken / due) * 100),
      },
      refillsDueSoon: current.filter((m) => m.supplyDaysLeft !== null && m.supplyDaysLeft <= 7)
        .length,
      asNeededCount: current.filter((m) => m.schedule === 'as_needed').length,
      allergies: (() => {
        const a = decryptFieldOptional(profile?.knownAllergies)?.trim() ?? '';
        return a === '' || /^(none|nil|no known)/i.test(a) ? null : a;
      })(),
    };
    return {
      summary,
      current,
      past,
      today,
      selfReported: decryptFieldOptional(profile?.currentMedications)?.trim() || null,
      generatedAt: now,
    };
  },

  /**
   * "I took it" / "I skipped it", for one scheduled dose. Idempotent per slot:
   * logging the same slot again changes the answer rather than adding a row.
   */
  async logDose(
    userId: string,
    dto: { itemId: string; scheduledFor: string; status: DoseLogStatus },
    meta: Meta,
  ) {
    const patientId = await requireOwnPatientId(userId);
    const item = await prisma.prescriptionItem.findFirst({
      where: { id: dto.itemId, prescription: { patientId, status: 'Signed' } },
      select: {
        id: true,
        drugId: true,
        frequency: true,
        durationDays: true,
        prescription: { select: { id: true, signedAt: true, createdAt: true } },
      },
    });
    if (item === null) throw new AppError('Medicine not found.', 404);
    const at = new Date(dto.scheduledFor);
    const startedAt = item.prescription.signedAt ?? item.prescription.createdAt;
    const course = {
      frequency: item.frequency,
      startedAt,
      durationDays: item.durationDays,
      // Doses after a renewal belong to the NEW prescription's line.
      replacedAt: await findReplacement(patientId, {
        drugId: item.drugId,
        prescriptionId: item.prescription.id,
        signedAt: startedAt,
      }),
    };
    if (!isDoseSlot(course, at))
      throw new AppError('That is not a scheduled time for this medicine.', 400);
    if (!canLogSlot(at, new Date())) {
      throw new AppError(
        'This dose can be recorded from an hour before it is due until two days after.',
        409,
      );
    }
    const row = await prisma.medicationDoseLog.upsert({
      where: { prescriptionItemId_scheduledFor: { prescriptionItemId: item.id, scheduledFor: at } },
      create: { patientId, prescriptionItemId: item.id, scheduledFor: at, status: dto.status },
      update: { status: dto.status, recordedAt: new Date() },
      select: { id: true, status: true, scheduledFor: true },
    });
    auditService.log({
      action: AuditAction.DoseLogged,
      userId,
      severity: AuditSeverity.Info,
      resource: 'medication_dose_log',
      resourceId: row.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { status: dto.status },
    });
    return row;
  },

  /** Undo — for a mis-tap. Scoped by (id, patientId). */
  async undoDose(userId: string, logId: string, meta: Meta) {
    const patientId = await requireOwnPatientId(userId);
    try {
      const { count } = await prisma.medicationDoseLog.deleteMany({
        where: { id: logId, patientId },
      });
      if (count === 0) throw new AppError('Dose record not found.', 404);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError)
        throw new AppError('Dose record not found.', 404);
      throw err;
    }
    auditService.log({
      action: AuditAction.DoseLogRemoved,
      userId,
      severity: AuditSeverity.Info,
      resource: 'medication_dose_log',
      resourceId: logId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  },
};
