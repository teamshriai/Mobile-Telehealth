import type { ClinicalNote, ClinicalNoteAddendum } from '@prisma/client';
import { ClinicalNoteStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { decryptFieldOptional, encryptFieldOptional, encryptField, decryptField } from '../utils/encryption';

// ─────────────────────────────────────────────────────────────────────────────
// Clinical note repository.
//
// The only layer that touches prisma for this domain and the only layer that
// knows about encryption — the service works in plaintext throughout, the
// same split appointment.repository.ts uses.
//
// ⚠️ THE IMMUTABILITY RULE LIVES HERE, NOT IN THE UI.
// `updateDraft` scopes its write to `status: Draft` through updateMany, so a
// signed note cannot be edited even by a caller that skips the service layer.
// Hiding the edit button would not be enforcement; this is.
// ─────────────────────────────────────────────────────────────────────────────

/** Clinician free text about a patient — PHI, encrypted at rest. The coded
 *  problem is deliberately NOT in this list: a diagnosis code is reported on
 *  and filtered by, and it is meaningless detached from the patient row that
 *  carries it, which is itself access-controlled. */
const NOTE_ENCRYPTED_FIELDS = ['subjective', 'objective', 'assessment', 'plan'] as const;

function decryptNote<T extends ClinicalNote>(row: T): T {
  const out = { ...row };
  for (const field of NOTE_ENCRYPTED_FIELDS) {
    out[field] = decryptFieldOptional(row[field]) as never;
  }
  return out;
}

function decryptAddendum<T extends ClinicalNoteAddendum>(row: T): T {
  return { ...row, body: decryptField(row.body) };
}

type NoteContent = {
  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  plan?: string | null;
  problemCode?: string | null;
  problemText?: string | null;
};

function encryptContent(data: NoteContent) {
  const encrypted: Record<string, unknown> = {};
  for (const field of NOTE_ENCRYPTED_FIELDS) {
    if (data[field] !== undefined) encrypted[field] = encryptFieldOptional(data[field] ?? null);
  }
  if (data.problemCode !== undefined) encrypted.problemCode = data.problemCode;
  if (data.problemText !== undefined) encrypted.problemText = data.problemText;
  return encrypted;
}

export const clinicalNoteRepository = {
  async listForPatient(patientId: string) {
    const rows = await prisma.clinicalNote.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: { addenda: { orderBy: { createdAt: 'asc' } } },
    });
    return rows.map((row) => ({
      ...decryptNote(row),
      addenda: row.addenda.map(decryptAddendum),
    }));
  },

  async findById(id: string) {
    const row = await prisma.clinicalNote.findUnique({
      where: { id },
      include: { addenda: { orderBy: { createdAt: 'asc' } } },
    });
    if (row === null) return null;
    return { ...decryptNote(row), addenda: row.addenda.map(decryptAddendum) };
  },

  /** Patient id only — used by the service to run the access check before it
   *  reads any content. */
  async findOwnerPatientId(id: string): Promise<string | null> {
    const row = await prisma.clinicalNote.findUnique({
      where: { id },
      select: { patientId: true },
    });
    return row?.patientId ?? null;
  },

  async create(data: NoteContent & {
    patientId: string;
    authorUserId: string;
    encounterId?: string | null;
    appointmentId?: string | null;
  }) {
    const created = await prisma.clinicalNote.create({
      data: {
        patientId: data.patientId,
        authorUserId: data.authorUserId,
        encounterId: data.encounterId ?? null,
        appointmentId: data.appointmentId ?? null,
        status: ClinicalNoteStatus.Draft,
        ...encryptContent(data),
      },
    });
    return decryptNote(created);
  },

  /**
   * Content update, possible ONLY while the note is a draft.
   * Returns false when nothing matched — which means either no such note, or
   * it is signed. The service turns that into the right message.
   */
  async updateDraft(id: string, data: NoteContent): Promise<boolean> {
    const { count } = await prisma.clinicalNote.updateMany({
      where: { id, status: ClinicalNoteStatus.Draft },
      data: encryptContent(data),
    });
    return count > 0;
  },

  /**
   * Sign. Also scoped to Draft, so signing twice is impossible and a second
   * attempt cannot overwrite the original attestation or its timestamp.
   */
  async sign(
    id: string,
    attestation: { signedByUserId: string; signerName: string; signerRegistrationNumber: string | null },
  ): Promise<boolean> {
    const { count } = await prisma.clinicalNote.updateMany({
      where: { id, status: ClinicalNoteStatus.Draft },
      data: {
        status: ClinicalNoteStatus.Signed,
        signedAt: new Date(),
        signedByUserId: attestation.signedByUserId,
        signerName: attestation.signerName,
        signerRegistrationNumber: attestation.signerRegistrationNumber,
      },
    });
    return count > 0;
  },

  async addAddendum(data: {
    noteId: string;
    body: string;
    authorUserId: string;
    authorName: string;
    authorRegistrationNumber: string | null;
  }) {
    const created = await prisma.clinicalNoteAddendum.create({
      data: { ...data, body: encryptField(data.body) },
    });
    return decryptAddendum(created);
  },

  async deleteDraft(id: string, authorUserId: string): Promise<boolean> {
    // Only the author, and only while unsigned. A signed note is part of the
    // legal record and is never deleted — CMP-NABH-10.
    const { count } = await prisma.clinicalNote.deleteMany({
      where: { id, authorUserId, status: ClinicalNoteStatus.Draft },
    });
    return count > 0;
  },
};
