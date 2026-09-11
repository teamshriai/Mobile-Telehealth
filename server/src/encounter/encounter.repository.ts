import type { Encounter, StrokeAssessment, StrokeLkwRevision, Prisma } from '@prisma/client';
import { EncounterStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { encryptFieldOptional, decryptFieldOptional } from '../utils/encryption';

// ─────────────────────────────────────────────────────────────────────────────
// Encounter Repository
//
// The only layer that touches prisma for this domain. locationName and
// chiefComplaint are free text naming a real place / a real medical concern,
// so — following the exact rule appointment.repository.ts applies to
// reason/notes — both are encrypted at rest.
//
// StrokeAssessment's lkwNote and otherSymptomNote are likewise encrypted;
// StrokeLkwRevision.reason is encrypted too (it can describe *why* a time
// changed in enough detail to be identifying, e.g. "correcting after
// speaking to the patient's daughter by phone").
// ─────────────────────────────────────────────────────────────────────────────

const ENCOUNTER_ENCRYPTED_FIELDS = ['locationName', 'chiefComplaint'] as const;
const ASSESSMENT_ENCRYPTED_FIELDS = ['lkwNote', 'otherSymptomNote'] as const;

function decryptEncounter<T extends Encounter>(row: T): T {
  const out = { ...row };
  for (const field of ENCOUNTER_ENCRYPTED_FIELDS) {
    out[field] = decryptFieldOptional(row[field]) as never;
  }
  return out;
}

function decryptAssessment<T extends StrokeAssessment>(row: T): T {
  const out = { ...row };
  for (const field of ASSESSMENT_ENCRYPTED_FIELDS) {
    out[field] = decryptFieldOptional(row[field]) as never;
  }
  return out;
}

function decryptRevision<T extends StrokeLkwRevision>(row: T): T {
  return { ...row, reason: decryptFieldOptional(row.reason) as string };
}

export interface CreateEncounterInput {
  visitId: string;
  patientId: string;
  type: Prisma.EncounterCreateInput['type'];
  locationName?: string | null;
  chiefComplaint?: string | null;
  appointmentId?: string | null;
  createdByUserId: string;
}

export const encounterRepository = {
  async create(data: CreateEncounterInput): Promise<Encounter> {
    const row = await prisma.encounter.create({
      data: {
        visitId: data.visitId,
        patientId: data.patientId,
        type: data.type,
        locationName: encryptFieldOptional(data.locationName),
        chiefComplaint: encryptFieldOptional(data.chiefComplaint),
        appointmentId: data.appointmentId,
        createdByUserId: data.createdByUserId,
      },
    });
    return decryptEncounter(row);
  },

  async findById(id: string): Promise<Encounter | null> {
    const row = await prisma.encounter.findUnique({ where: { id } });
    return row ? decryptEncounter(row) : null;
  },

  /** Scoped by patientId as well as id — matches appointment.repository.ts's
   *  findByIdForPatient convention exactly: an id alone is never enough. */
  async findByIdForPatient(id: string, patientId: string): Promise<Encounter | null> {
    const row = await prisma.encounter.findFirst({ where: { id, patientId } });
    return row ? decryptEncounter(row) : null;
  },

  async listForPatient(
    patientId: string,
    page: number,
    pageSize: number,
  ): Promise<{ results: Encounter[]; total: number }> {
    const [rows, total] = await prisma.$transaction([
      prisma.encounter.findMany({
        where: { patientId },
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.encounter.count({ where: { patientId } }),
    ]);
    return { results: rows.map(decryptEncounter), total };
  },

  /** updateMany so the id+patientId ownership predicate is part of the WHERE
   *  — same TOCTOU-avoidance rationale as appointment.repository.ts's
   *  cancelForPatient. A count of 0 means "not found, or already closed". */
  async closeForPatient(
    id: string,
    patientId: string,
    status: 'Completed' | 'Cancelled',
  ): Promise<number> {
    const { count } = await prisma.encounter.updateMany({
      where: { id, patientId, status: EncounterStatus.InProgress },
      data: { status, endedAt: new Date() },
    });
    return count;
  },

  async getAssessment(encounterId: string): Promise<StrokeAssessment | null> {
    const row = await prisma.strokeAssessment.findUnique({ where: { encounterId } });
    return row ? decryptAssessment(row) : null;
  },

  /**
   * Creates or updates the assessment AND, when LKW fields actually changed,
   * writes a StrokeLkwRevision row IN THE SAME TRANSACTION. This is the one
   * place in the codebase two writes are deliberately coupled rather than
   * left to the fire-and-forget audit log — see the schema comment on
   * StrokeLkwRevision for why LKW specifically earns this treatment.
   */
  async upsertAssessment(input: {
    encounterId: string;
    data: Omit<Prisma.StrokeAssessmentUncheckedCreateInput, 'encounterId'>;
    lkwChangeReason: string | null;
    changedByUserId: string | null;
  }): Promise<StrokeAssessment> {
    return prisma.$transaction(async (tx) => {
      const previous = await tx.strokeAssessment.findUnique({
        where: { encounterId: input.encounterId },
      });

      // Explicit null-vs-Date comparison rather than relying on
      // `?.getTime() !== ?.valueOf()` coincidentally producing the right
      // answer when one side is null — this value gates a mandatory-reason
      // check, so the comparison itself must be unambiguous to read.
      const newLkwAtTime = input.data.lkwAt instanceof Date ? input.data.lkwAt.getTime() : null;
      const previousLkwAtTime = previous?.lkwAt instanceof Date ? previous.lkwAt.getTime() : null;
      const lkwChanged =
        previous !== null &&
        (previousLkwAtTime !== newLkwAtTime ||
          previous.lkwCertainty !== input.data.lkwCertainty ||
          previous.lkwSource !== input.data.lkwSource);

      const isNewAssessment = previous === null;
      const encryptedData: Prisma.StrokeAssessmentUncheckedCreateInput = {
        ...input.data,
        encounterId: input.encounterId,
        lkwNote: encryptFieldOptional(input.data.lkwNote),
        otherSymptomNote: encryptFieldOptional(input.data.otherSymptomNote),
      };

      const saved = await tx.strokeAssessment.upsert({
        where: { encounterId: input.encounterId },
        create: encryptedData,
        update: encryptedData,
      });

      // Revision log fires on genuine LKW change on an EXISTING assessment.
      // The very first save of a brand-new assessment is not a "revision" of
      // anything — there is no previous value to record a change from.
      if (!isNewAssessment && lkwChanged) {
        if (!input.lkwChangeReason) {
          throw new Error(
            'lkwChangeReason is required when Last Known Well is being changed on an existing assessment.',
          );
        }
        await tx.strokeLkwRevision.create({
          data: {
            assessmentId: saved.id,
            previousLkwAt: previous.lkwAt,
            previousCertainty: previous.lkwCertainty,
            newLkwAt: saved.lkwAt,
            newCertainty: saved.lkwCertainty,
            newSource: saved.lkwSource,
            reason: encryptFieldOptional(input.lkwChangeReason) as string,
            changedByUserId: input.changedByUserId,
          },
        });
      }

      return decryptAssessment(saved);
    });
  },

  async listLkwRevisions(assessmentId: string): Promise<StrokeLkwRevision[]> {
    const rows = await prisma.strokeLkwRevision.findMany({
      where: { assessmentId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(decryptRevision);
  },
};
