import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { decryptFieldOptional } from '../utils/encryption';
import { decryptEncounter } from '../encounter/encounter.repository';
import { decryptInstruction } from '../instruction/instruction.service';
import { requireOwnPatientId } from './ownPatient';
import { medicationPeriod, type MedicationPeriod } from './medicationPeriod';
import { frequencyInWords, routeInWords } from './plainLanguage';

// ─────────────────────────────────────────────────────────────────────────────
// Patient portal — read-only windows onto clinician-authored records.
//
// ⚠️ WHAT A PATIENT SEES, AND WHAT THEY DO NOT. These are documents written
// FOR the patient or ISSUED to them: signed prescriptions, coded diagnoses,
// issued instructions, and a summary of each signed visit. Deliberately NOT
// exposed:
//
//  - the SOAP body of any clinical note. Releasing full notes to patients
//    ("open notes") is a policy decision the hospital has not taken, and a
//    note written for colleagues read cold by a worried patient is a harm of
//    its own. The summary says who saw them, when, and what was decided.
//  - anything unsigned. A draft prescription or an unsigned visit is not yet
//    a statement the clinic stands behind.
//  - a problem's free-text `note` and an instruction's `clinicianWording`:
//    both are the clinician's working text, not the issued document.
//
// ⚠️ Every query is scoped by `requireOwnPatientId(userId)`. No function here
// takes a patient id, and a visit id from the URL is matched TOGETHER with the
// caller's own patient id, so another patient's visit is simply "not found".
// ─────────────────────────────────────────────────────────────────────────────

export interface MedicationView extends MedicationPeriod {
  id: string;
  rxNumber: string;
  visitId: string | null;
  name: string;
  form: string;
  strength: string;
  dose: string;
  doseUnit: string;
  route: string;
  routeInWords: string;
  frequency: string;
  frequencyInWords: string;
  durationDays: number | null;
  instructions: string | null | undefined;
  prescribedBy: string | null;
  prescriberRegistration: string | null;
}

export interface ConditionView {
  id: string;
  code: string;
  title: string;
  status: string;
  onsetDate: Date | null;
  resolvedAt: Date | null;
  recordedAt: Date;
}

export interface InstructionView {
  id: string;
  visitId: string | null;
  title: string;
  body: string;
  language: string;
  titleEnglish: string | null;
  bodyEnglish: string | null;
  issuedAt: Date;
  issuedByName: string;
}

const SIGNED_RX = { status: 'Signed' as const };

const RX_INCLUDE = {
  items: { include: { drug: true }, orderBy: { createdAt: 'asc' as const } },
  encounter: { select: { visitId: true } },
};

type RxRow = Prisma.PrescriptionGetPayload<{ include: typeof RX_INCLUDE }>;

function loadSignedPrescriptions(patientId: string, encounterId?: string): Promise<RxRow[]> {
  return prisma.prescription.findMany({
    where: { patientId, ...SIGNED_RX, ...(encounterId === undefined ? {} : { encounterId }) },
    include: RX_INCLUDE,
    orderBy: { signedAt: 'desc' },
    take: 200,
  });
}

function toMedications(rx: RxRow[], now = new Date()): MedicationView[] {
  return rx.flatMap((p) =>
    p.items.map((i) => {
      // A Signed row always has signedAt; the fallback keeps the type honest.
      const signedAt = p.signedAt ?? p.createdAt;
      return {
        id: i.id,
        rxNumber: p.rxNumber,
        visitId: p.encounter?.visitId ?? null,
        name: i.drug.genericName,
        form: i.drug.form,
        strength: i.drug.strength,
        dose: i.dose.toString(),
        doseUnit: i.doseUnit,
        route: i.route,
        routeInWords: routeInWords(i.route),
        frequency: i.frequency,
        frequencyInWords: frequencyInWords(i.frequency),
        durationDays: i.durationDays,
        instructions: decryptFieldOptional(i.instructions),
        prescribedBy: p.signerName,
        prescriberRegistration: p.signerRegistrationNumber,
        ...medicationPeriod(signedAt, i.durationDays, now),
      };
    }),
  );
}

function toCondition(p: {
  id: string;
  code: string;
  codeTitle: string;
  status: string;
  onsetDate: Date | null;
  resolvedAt: Date | null;
  createdAt: Date;
}): ConditionView {
  return {
    id: p.id,
    code: p.code,
    title: p.codeTitle,
    status: p.status,
    onsetDate: p.onsetDate,
    resolvedAt: p.resolvedAt,
    recordedAt: p.createdAt,
  };
}

function toInstruction(
  row: Parameters<typeof decryptInstruction>[0] & { encounter?: { visitId: string } | null },
): InstructionView {
  const d = decryptInstruction(row);
  return {
    id: d.id,
    visitId: row.encounter?.visitId ?? null,
    title: d.title,
    body: d.body,
    language: d.language,
    titleEnglish: d.titleEnglish,
    bodyEnglish: d.bodyEnglish,
    issuedAt: d.issuedAt,
    issuedByName: d.issuedByName,
  };
}

/** A visit the patient can see: an encounter with at least one SIGNED note. */
const SIGNED_VISIT = { clinicalNotes: { some: { status: 'Signed' as const } } };

export const portalService = {
  async medications(userId: string) {
    const patientId = await requireOwnPatientId(userId);
    const meds = toMedications(await loadSignedPrescriptions(patientId));
    return {
      current: meds.filter((m) => m.status === 'current'),
      past: meds.filter((m) => m.status === 'completed'),
    };
  },

  async conditions(userId: string) {
    const patientId = await requireOwnPatientId(userId);
    const rows = await prisma.problem.findMany({
      where: { patientId },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });
    return rows.map(toCondition);
  },

  async instructions(userId: string) {
    const patientId = await requireOwnPatientId(userId);
    const rows = await prisma.patientInstruction.findMany({
      where: { patientId },
      include: { encounter: { select: { visitId: true } } },
      orderBy: { issuedAt: 'desc' },
      take: 100,
    });
    return rows.map(toInstruction);
  },

  async visits(userId: string) {
    const patientId = await requireOwnPatientId(userId);
    const rows = await prisma.encounter.findMany({
      where: { patientId, ...SIGNED_VISIT },
      orderBy: { startedAt: 'desc' },
      take: 100,
      include: {
        clinicalNotes: {
          where: { status: 'Signed' },
          orderBy: { signedAt: 'desc' },
          take: 1,
          select: { signerName: true, signedAt: true },
        },
        _count: {
          select: {
            problems: true,
            prescriptions: { where: SIGNED_RX },
            instructions: true,
          },
        },
      },
    });
    return rows.map((raw) => {
      const e = decryptEncounter(raw);
      return {
        visitId: e.visitId,
        type: e.type,
        startedAt: e.startedAt,
        endedAt: e.endedAt,
        location: e.locationName,
        clinician: raw.clinicalNotes[0]?.signerName ?? null,
        signedAt: raw.clinicalNotes[0]?.signedAt ?? null,
        counts: {
          diagnoses: raw._count.problems,
          prescriptions: raw._count.prescriptions,
          instructions: raw._count.instructions,
        },
      };
    });
  },

  async visit(userId: string, visitId: string) {
    const patientId = await requireOwnPatientId(userId);
    // ⚠️ Matched on BOTH ids: another patient's visitId is "not found", not
    // "forbidden" — the response must not confirm that the visit exists.
    const raw = await prisma.encounter.findFirst({
      where: { visitId, patientId, ...SIGNED_VISIT },
      include: {
        clinicalNotes: {
          where: { status: 'Signed' },
          orderBy: { signedAt: 'desc' },
          select: { signerName: true, signerRegistrationNumber: true, signedAt: true },
        },
      },
    });
    if (raw === null) throw new AppError('Visit not found.', 404);
    const e = decryptEncounter(raw);

    const [problems, rx, instructions] = await Promise.all([
      prisma.problem.findMany({
        where: { patientId, onsetEncounterId: e.id },
        orderBy: { createdAt: 'asc' },
      }),
      loadSignedPrescriptions(patientId, e.id),
      prisma.patientInstruction.findMany({
        where: { patientId, encounterId: e.id },
        include: { encounter: { select: { visitId: true } } },
        orderBy: { issuedAt: 'asc' },
      }),
    ]);

    return {
      visitId: e.visitId,
      type: e.type,
      startedAt: e.startedAt,
      endedAt: e.endedAt,
      location: e.locationName,
      reasonForVisit: e.chiefComplaint,
      seenBy: raw.clinicalNotes.map((n) => ({
        name: n.signerName,
        registrationNumber: n.signerRegistrationNumber,
        signedAt: n.signedAt,
      })),
      diagnoses: problems.map(toCondition),
      medications: toMedications(rx),
      instructions: instructions.map(toInstruction),
    };
  },
};
