import type {
  AlcoholStatus,
  AppointmentMode,
  AppointmentStatus,
  BloodGroup,
  EncounterType,
  Gender,
  HealthNoteSource,
  PhysicalActivity,
  SmokingStatus,
  TobaccoStatus,
} from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env.config';
import { decryptProfile } from '../../profile/profile.repository';
import { decryptAppointment } from '../../appointment/appointment.repository';
import { decryptEncounter, decryptAssessment } from '../../encounter/encounter.repository';
import { decryptFieldOptional } from '../../utils/encryption';
import {
  medicationService,
  type MedicineView,
  type MedicinesSummary,
  type TodayDose,
} from '../../medication/medication.service';
import {
  adherence,
  doseSlots,
  istDayBounds,
  type AdherenceCount,
} from '../../portal/medicationSchedule';
import { portalService, type InstructionView } from '../../portal/portal.service';
import { labsRepository, type LabReportView } from '../../reports/labs.service';
import { vitalsRepository, type VitalReading } from '../../reports/vitals.service';
import { imagingRepository, type ImagingReportText } from '../../reports/imaging.service';

// ─────────────────────────────────────────────────────────────────────────────
// The patient's record, loaded and decrypted for the assistant.
//
// ⚠️ PORTAL PARITY. The assistant may see what the patient portal shows the
// patient, and one thing more that the product owner decided on 25 Sep 2026:
// the Assessment and Plan of SIGNED visit notes. It never sees:
//  - unsigned visits, draft prescriptions, preliminary reports;
//  - the history (subjective) or examination (objective) of any note — the
//    note query below selects ONLY `assessment` and `plan`, so those fields
//    are never read, let alone decrypted;
//  - address, emergency contact, occupation, identifiers.
// `AI_INCLUDE_NOTE_ASSESSMENT_PLAN=false` withholds the A&P as well.
//
// This module does I/O and nothing else. Turning the data into text is
// recordRender.ts, which is pure and unit-tested.
// ─────────────────────────────────────────────────────────────────────────────

/** How many visits carry an Assessment and Plan excerpt (newest first). */
const AP_VISITS = 6;
const DAY = 86_400_000;

export interface VisitData {
  id: string;
  visitId: string;
  type: EncounterType;
  startedAt: Date;
  location: string | null;
  reason: string | null;
  seenBy: string[];
  diagnoses: string[];
  medicines: string[];
  instructions: string[];
  symptomsReported: string[];
  lastKnownWell: { at: Date; certainty: string } | null;
  assessment: string | null;
  plan: string | null;
  amended: boolean;
  updatedAt: Date;
}

export interface RecordData {
  now: Date;
  patientId: string;
  isSyntheticData: boolean;
  profile: {
    id: string;
    updatedAt: Date;
    firstName: string | null;
    dateOfBirth: Date | null;
    gender: Gender | null;
    bloodGroup: BloodGroup | null;
    allergies: string | null;
    selfListedMedicines: string | null;
    existingDiseases: string | null;
    familyHistory: string | null;
    previousSurgeries: string | null;
    smoking: SmokingStatus | null;
    alcohol: AlcoholStatus | null;
    tobacco: TobaccoStatus | null;
    activity: PhysicalActivity | null;
  };
  conditions: Array<{
    id: string;
    code: string;
    title: string;
    status: string;
    onsetDate: Date | null;
    resolvedAt: Date | null;
    recordedAt: Date;
  }>;
  medicines: {
    current: MedicineView[];
    past: MedicineView[];
    summary: MedicinesSummary;
    today: TodayDose[];
    /** Per current scheduled medicine: the 7 days before today. */
    last7: Map<string, AdherenceCount>;
  } | null;
  appointments: Array<{
    id: string;
    scheduledAt: Date;
    mode: AppointmentMode;
    status: AppointmentStatus;
    reason: string | null;
    locationName: string | null;
    doctor: { name: string; specialty: string | null; hospital: string | null } | null;
    updatedAt: Date;
  }>;
  careTeam: Array<{
    id: string;
    name: string;
    careRole: string;
    isPrimary: boolean;
    specialty: string | null;
    hospital: string | null;
    updatedAt: Date;
  }>;
  visits: VisitData[];
  labs: LabReportView[];
  vitals: VitalReading[];
  imaging: Array<ImagingReportText>;
  instructions: InstructionView[];
  healthNotes: Array<{
    id: string;
    recordedAt: Date;
    source: HealthNoteSource;
    text: string;
    updatedAt: Date;
  }>;
}

const SYMPTOMS: Array<[string, keyof ReturnType<typeof decryptAssessment>]> = [
  ['facial weakness', 'facialWeakness'],
  ['arm weakness', 'armWeakness'],
  ['leg weakness', 'legWeakness'],
  ['speech difficulty', 'speechDifficulty'],
  ['sudden confusion', 'suddenConfusion'],
  ['vision problems', 'visionProblem'],
  ['severe headache', 'severeHeadache'],
  ['balance problems', 'balanceProblem'],
  ['loss of consciousness', 'lossOfConsciousness'],
];

async function loadMedicines(
  userId: string,
  patientId: string,
  now: Date,
): Promise<RecordData['medicines']> {
  const overview = await medicationService.overview(userId, now);
  // The 7 days before today, counted exactly as the 30-day figure is.
  const { start } = istDayBounds(now);
  const from = new Date(start.getTime() - 7 * DAY);
  const scheduled = overview.current.filter(
    (m) => m.schedule === 'scheduled' || m.schedule === 'weekly',
  );
  const logs = await prisma.medicationDoseLog.findMany({
    where: {
      patientId,
      prescriptionItemId: { in: scheduled.map((m) => m.id) },
      scheduledFor: { gte: from, lt: start },
    },
    select: { prescriptionItemId: true, scheduledFor: true, status: true },
  });
  const last7 = new Map<string, AdherenceCount>();
  for (const m of scheduled) {
    const slots = doseSlots(
      {
        frequency: m.frequency,
        startedAt: m.startedAt,
        durationDays: m.durationDays,
        replacedAt: m.replacedAt,
      },
      from,
      start,
    );
    const status = new Map<number, 'Taken' | 'Skipped'>();
    for (const l of logs)
      if (l.prescriptionItemId === m.id) status.set(l.scheduledFor.getTime(), l.status);
    last7.set(m.id, adherence(slots, status, now));
  }
  return {
    current: overview.current,
    past: overview.past,
    summary: overview.summary,
    today: overview.today,
    last7,
  };
}

async function loadVisits(patientId: string): Promise<VisitData[]> {
  const rows = await prisma.encounter.findMany({
    where: { patientId, clinicalNotes: { some: { status: 'Signed' } } },
    orderBy: { startedAt: 'desc' },
    take: 12,
    include: {
      strokeAssessment: true,
      // ⚠️ ONLY assessment and plan. Never subjective / objective.
      clinicalNotes: {
        where: { status: 'Signed' },
        orderBy: { signedAt: 'desc' },
        select: {
          signerName: true,
          assessment: true,
          plan: true,
          _count: { select: { addenda: true } },
        },
      },
      problems: { select: { codeTitle: true, code: true } },
      prescriptions: {
        where: { status: 'Signed' },
        select: {
          items: {
            select: { dose: true, doseUnit: true, drug: { select: { genericName: true } } },
          },
        },
      },
      instructions: { select: { title: true, titleEnglish: true } },
    },
  });
  return rows.map((raw, index) => {
    const e = decryptEncounter(raw);
    const latest = raw.clinicalNotes[0];
    const withAp = env.AI_INCLUDE_NOTE_ASSESSMENT_PLAN && index < AP_VISITS;
    const assessment =
      raw.strokeAssessment === null ? null : decryptAssessment(raw.strokeAssessment);
    return {
      id: raw.id,
      visitId: e.visitId,
      type: e.type,
      startedAt: e.startedAt,
      location: e.locationName,
      reason: e.chiefComplaint,
      seenBy: [
        ...new Set(raw.clinicalNotes.map((n) => n.signerName).filter((n): n is string => !!n)),
      ],
      diagnoses: raw.problems.map((p) => `${p.codeTitle} (${p.code})`),
      medicines: raw.prescriptions.flatMap((p) =>
        p.items.map((i) => `${i.drug.genericName} ${i.dose.toString()} ${i.doseUnit}`),
      ),
      // Titles are stored in plain text (only the bodies are encrypted).
      instructions: raw.instructions.map((i) => i.titleEnglish ?? i.title).filter(Boolean),
      symptomsReported:
        assessment === null
          ? []
          : SYMPTOMS.filter(([, key]) => assessment[key] === true).map(([label]) => label),
      lastKnownWell:
        assessment !== null && assessment.lkwAt !== null
          ? { at: assessment.lkwAt, certainty: assessment.lkwCertainty }
          : null,
      assessment: withAp ? (decryptFieldOptional(latest?.assessment) ?? null) : null,
      plan: withAp ? (decryptFieldOptional(latest?.plan) ?? null) : null,
      amended: raw.clinicalNotes.some((n) => n._count.addenda > 0),
      updatedAt: raw.updatedAt,
    };
  });
}

/**
 * Returns null when the user has no patient record to ground answers on (a
 * staff account, or a patient not yet registered) — callers treat that as
 * "no context", not as an error.
 */
export async function loadRecordData(
  userId: string,
  now: Date = new Date(),
): Promise<RecordData | null> {
  const row = await prisma.patientProfile.findFirst({ where: { userId, deletedAt: null } });
  if (row === null) return null;
  const p = decryptProfile(row);
  const patientId = row.id;

  const [
    conditions,
    medicines,
    appointments,
    careTeam,
    visits,
    labs,
    vitals,
    imaging,
    instructions,
    notes,
  ] = await Promise.all([
    prisma.problem.findMany({
      where: { patientId },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 40,
    }),
    loadMedicines(userId, patientId, now).catch(() => null),
    prisma.appointment.findMany({
      where: { patientId },
      orderBy: { scheduledAt: 'desc' },
      take: 30,
      include: {
        doctor: {
          select: {
            firstName: true,
            lastName: true,
            specialty: true,
            hospitalName: true,
            hospital: { select: { name: true } },
          },
        },
      },
    }),
    prisma.careTeamMember.findMany({
      where: { patientId, activeTo: null },
      include: {
        doctor: {
          select: {
            firstName: true,
            lastName: true,
            specialty: true,
            hospitalName: true,
            hospital: { select: { name: true } },
          },
        },
      },
    }),
    loadVisits(patientId),
    labsRepository.reportsFor(patientId, 40),
    vitalsRepository.readingsFor(patientId, 200),
    imagingRepository.reportTextsFor(patientId, 20),
    portalService.instructions(userId).then((list) => list.slice(0, 8)),
    prisma.patientHealthNote.findMany({
      where: { patientId, status: 'Confirmed', deletedAt: null },
      orderBy: { recordedAt: 'desc' },
      take: 12,
    }),
  ]);

  return {
    now,
    patientId,
    isSyntheticData: row.isSyntheticData,
    profile: {
      id: row.id,
      updatedAt: row.updatedAt,
      firstName: p.firstName,
      dateOfBirth: p.dateOfBirth,
      gender: p.gender,
      bloodGroup: p.bloodGroup,
      allergies: p.knownAllergies,
      selfListedMedicines: p.currentMedications,
      existingDiseases: p.existingDiseases,
      familyHistory: p.familyHistory,
      previousSurgeries: p.previousSurgeries,
      smoking: p.smokingStatus,
      alcohol: p.alcoholStatus,
      tobacco: p.tobaccoStatus,
      activity: p.physicalActivity,
    },
    conditions: conditions.map((c) => ({
      id: c.id,
      code: c.code,
      title: c.codeTitle,
      status: c.status,
      onsetDate: c.onsetDate,
      resolvedAt: c.resolvedAt,
      recordedAt: c.createdAt,
    })),
    medicines,
    appointments: appointments.map((raw) => {
      const a = decryptAppointment(raw);
      return {
        id: a.id,
        scheduledAt: a.scheduledAt,
        mode: a.mode,
        status: a.status,
        reason: a.reason,
        locationName: a.locationName,
        doctor:
          raw.doctor === null
            ? null
            : {
                name: `Dr ${raw.doctor.firstName} ${raw.doctor.lastName}`.trim(),
                specialty: raw.doctor.specialty,
                hospital: raw.doctor.hospital?.name ?? raw.doctor.hospitalName,
              },
        updatedAt: a.updatedAt,
      };
    }),
    careTeam: careTeam.map((m) => ({
      id: m.id,
      name: `Dr ${m.doctor.firstName} ${m.doctor.lastName}`.trim(),
      careRole: m.careRole,
      isPrimary: m.isPrimary,
      specialty: m.doctor.specialty,
      hospital: m.doctor.hospital?.name ?? m.doctor.hospitalName,
      updatedAt: m.updatedAt,
    })),
    visits,
    labs,
    vitals,
    imaging,
    instructions,
    healthNotes: notes
      .map((n) => ({
        id: n.id,
        recordedAt: n.recordedAt,
        source: n.source,
        text: decryptFieldOptional(n.body) ?? '',
        updatedAt: n.updatedAt,
      }))
      .filter((n) => n.text.trim() !== ''),
  };
}
