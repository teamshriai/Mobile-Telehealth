import type { ClinicalNote, ClinicalNoteAddendum } from '@prisma/client';
import { ClinicalNoteStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  decryptFieldOptional,
  encryptFieldOptional,
  encryptField,
  decryptField,
} from '../utils/encryption';

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
  /**
   * ⚠️ Includes the encounter's `visitId`, not just its internal id.
   *
   * Clinician-facing URLs are keyed on the visit id — the number printed on the
   * patient's paperwork — so a note row that carries only `encounterId` cannot
   * link back to the consultation it was written at. The chart's Notes tab was
   * building `/encounter/{uuid}/note` from it and would have 404'd on every
   * row. Returning the visit id is what makes the note list navigable.
   */
  async listForPatient(patientId: string) {
    const rows = await prisma.clinicalNote.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: {
        addenda: { orderBy: { createdAt: 'asc' } },
        encounter: { select: { visitId: true } },
      },
    });
    return rows.map((row) => ({
      ...decryptNote(row),
      encounterVisitId: row.encounter?.visitId ?? null,
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

  /**
   * The author's existing open draft for an encounter, if there is one.
   *
   * ⚠️ A visit has ONE note. This is what lets `create` be idempotent per
   * (encounter, author) so a double-invoked effect, a retried request or a
   * second browser tab cannot leave two drafts behind — see the service.
   *
   * Scoped to Draft on purpose: once a note is signed or awaiting co-signature
   * it is no longer the thing an author would resume, and a genuinely new note
   * for the same encounter (an addendum-worthy second entry) is a different
   * act that should create a row.
   *
   * Ordered oldest-first so that where duplicates already exist, the original
   * is the one resumed and the orphan is left to be cleaned up rather than
   * becoming the live note.
   */
  async findOpenDraftForEncounter(encounterId: string, authorUserId: string) {
    const row = await prisma.clinicalNote.findFirst({
      where: { encounterId, authorUserId, status: ClinicalNoteStatus.Draft },
      include: { addenda: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'asc' },
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

  async create(
    data: NoteContent & {
      patientId: string;
      authorUserId: string;
      encounterId?: string | null;
      appointmentId?: string | null;
    },
  ) {
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
    attestation: {
      signedByUserId: string;
      signerName: string;
      signerRegistrationNumber: string | null;
      /**
       * ⚠️ When true the note lands in CosignPending, NOT Signed — it is
       * attested by its author but is not yet the legal record until a
       * consultant counter-signs (CMP-NABH-03). Decided by the caller from
       * the author's CAPABILITIES, never from their role name.
       */
      requiresCosign?: boolean;
    },
  ): Promise<boolean> {
    const requiresCosign = attestation.requiresCosign === true;
    const { count } = await prisma.clinicalNote.updateMany({
      where: { id, status: ClinicalNoteStatus.Draft },
      data: {
        status: requiresCosign ? ClinicalNoteStatus.CosignPending : ClinicalNoteStatus.Signed,
        requiresCosign,
        signedAt: new Date(),
        signedByUserId: attestation.signedByUserId,
        signerName: attestation.signerName,
        signerRegistrationNumber: attestation.signerRegistrationNumber,
      },
    });
    return count > 0;
  },

  /**
   * Counter-sign. ⚠️ Scoped to CosignPending, so a note cannot be co-signed
   * twice and a co-signature can never overwrite the author's attestation —
   * both identities survive on the row, which is the point (CMP-NABH-03).
   */
  async cosign(
    id: string,
    cosigner: {
      cosignedByUserId: string;
      cosignerName: string;
      cosignerRegistrationNumber: string | null;
    },
  ): Promise<boolean> {
    const { count } = await prisma.clinicalNote.updateMany({
      where: { id, status: ClinicalNoteStatus.CosignPending },
      data: {
        status: ClinicalNoteStatus.Signed,
        cosignedAt: new Date(),
        cosignedByUserId: cosigner.cosignedByUserId,
        cosignerName: cosigner.cosignerName,
        cosignerRegistrationNumber: cosigner.cosignerRegistrationNumber,
      },
    });
    return count > 0;
  },

  /**
   * Return to the author for revision. Goes back to Draft so they can edit,
   * clearing the author's attestation — they will attest again when they
   * re-submit, and an attestation on a note that was sent back would be a lie.
   */
  async returnToAuthor(id: string, reason: string): Promise<boolean> {
    const { count } = await prisma.clinicalNote.updateMany({
      where: { id, status: ClinicalNoteStatus.CosignPending },
      data: {
        status: ClinicalNoteStatus.Draft,
        returnedAt: new Date(),
        returnReason: encryptField(reason),
        signedAt: null,
        signedByUserId: null,
        signerName: null,
        signerRegistrationNumber: null,
      },
    });
    return count > 0;
  },

  /**
   * The co-sign queue: every note awaiting a counter-signature, oldest
   * first. ⚠️ Not scoped to one consultant — UI_ATLAS S-06-09 treats this as
   * a shared consultant queue, and a note stuck behind one person's absence
   * is the failure this screen exists to prevent.
   */
  async listAwaitingCosign(): Promise<
    Array<{
      id: string;
      patientId: string;
      authorUserId: string;
      signerName: string | null;
      signedAt: Date | null;
      problemText: string | null;
      patient: { firstName: string; lastName: string; shriPatientId: string };
    }>
  > {
    return prisma.clinicalNote.findMany({
      where: { status: ClinicalNoteStatus.CosignPending },
      orderBy: { signedAt: 'asc' },
      take: 100,
      select: {
        id: true,
        patientId: true,
        authorUserId: true,
        signerName: true,
        signedAt: true,
        problemText: true,
        patient: { select: { firstName: true, lastName: true, shriPatientId: true } },
      },
    });
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
