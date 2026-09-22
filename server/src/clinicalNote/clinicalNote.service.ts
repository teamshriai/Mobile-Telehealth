import { ClinicalNoteStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { auditService, AuditAction, AuditSeverity } from '../services/audit.service';
import { careRelationshipService } from '../services/careRelationship.service';
import { clinicalNoteRepository } from './clinicalNote.repository';
import type { CreateNoteDto, UpdateNoteDto, AddendumDto } from './clinicalNote.validator';

// ─────────────────────────────────────────────────────────────────────────────
// Clinical note service.
//
// Two rules govern everything here.
//
// 1. EVERY operation is row-gated by careRelationshipService.requirePatientAccess
//    before it touches note content. Holding `note:write:assigned` answers
//    "may a Doctor ever write a note"; it does not answer "may THIS doctor
//    write on THIS patient". A permission check alone would let any doctor
//    author on any patient in the system.
//
// 2. A SIGNED NOTE IS NEVER EDITED (CMP-NABH-10). Corrections are addenda,
//    separately attributed and separately timestamped, with the original
//    left intact. The repository enforces it at the query level; the service
//    is what turns a refusal into an explanation.
// ─────────────────────────────────────────────────────────────────────────────

type Actor = { id: string; roleName: string };
type Meta = { ipAddress?: string; userAgent?: string };

/**
 * The attestation stamped onto a signed note — read from the session user's
 * own doctor profile, never accepted from the request. CMP-NABH-11 requires
 * the author's identity and registration number on the legal record, and a
 * value the client could supply is not an attestation.
 */
async function attestationFor(userId: string) {
  const profile = await prisma.doctorProfile.findFirst({
    where: { userId, deletedAt: null },
    select: { firstName: true, lastName: true, registrationNumber: true },
  });
  if (profile === null) {
    throw new AppError('Only a clinician with a doctor profile can sign a note.', 403);
  }
  return {
    signerName: `Dr. ${profile.firstName} ${profile.lastName}`.trim(),
    signerRegistrationNumber: profile.registrationNumber,
  };
}

export const clinicalNoteService = {
  async listForPatient(actor: Actor, patientId: string, meta: Meta) {
    await careRelationshipService.requirePatientAccess(actor, patientId, meta);
    return clinicalNoteRepository.listForPatient(patientId);
  },

  async getById(actor: Actor, noteId: string, meta: Meta) {
    // Resolve the owning patient FIRST and gate on that, so a note id from
    // another patient's record reveals nothing — not even that it exists.
    const patientId = await clinicalNoteRepository.findOwnerPatientId(noteId);
    if (patientId === null) throw new AppError('Note not found.', 404);
    await careRelationshipService.requirePatientAccess(actor, patientId, meta);

    const note = await clinicalNoteRepository.findById(noteId);
    if (note === null) throw new AppError('Note not found.', 404);
    return note;
  },

  async create(actor: Actor, dto: CreateNoteDto, meta: Meta) {
    await careRelationshipService.requirePatientAccess(actor, dto.patientId, meta);

    const note = await clinicalNoteRepository.create({ ...dto, authorUserId: actor.id });

    auditService.log({
      action: AuditAction.NoteCreated,
      userId: actor.id,
      severity: AuditSeverity.Info,
      resource: 'clinical_note',
      resourceId: note.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      // Never the note text — that is exactly the PHI the audit trail exists
      // to protect.
      metadata: { patientId: dto.patientId },
    });

    return note;
  },

  async update(actor: Actor, noteId: string, dto: UpdateNoteDto, meta: Meta) {
    const patientId = await clinicalNoteRepository.findOwnerPatientId(noteId);
    if (patientId === null) throw new AppError('Note not found.', 404);
    await careRelationshipService.requirePatientAccess(actor, patientId, meta);

    const updated = await clinicalNoteRepository.updateDraft(noteId, dto);
    if (!updated) {
      // The row exists (we just read its patient), so the only way the
      // scoped update matched nothing is that it is already signed.
      throw new AppError(
        'This note has been signed and can no longer be edited. Add an amendment instead.',
        409,
      );
    }

    return clinicalNoteRepository.findById(noteId);
  },

  /**
   * Sign and commit to the legal record. Irreversible.
   *
   * A note must actually say something to be signable — signing an empty
   * note would put an attestation on a blank record. UI_ATLAS S-06-03 asks
   * for all four SOAP sections; this requires the two that carry the
   * clinical decision (assessment and plan) and lets the narrative sections
   * be brief, rather than blocking a signature over a short Objective.
   */
  async sign(actor: Actor, noteId: string, meta: Meta) {
    const existing = await clinicalNoteRepository.findById(noteId);
    if (existing === null) throw new AppError('Note not found.', 404);
    await careRelationshipService.requirePatientAccess(actor, existing.patientId, meta);

    if (existing.status === ClinicalNoteStatus.Signed) {
      throw new AppError('This note is already signed.', 409);
    }
    if (existing.authorUserId !== actor.id) {
      // Counter-signing another clinician's note is a distinct act with its
      // own permission (UI_ATLAS's cosign verb) and no queue exists for it
      // yet. Refusing is honest; silently allowing it would misattribute the
      // legal record.
      throw new AppError('Only the author can sign this note.', 403);
    }

    const missing: string[] = []
    if (!existing.assessment?.trim()) missing.push('Assessment')
    if (!existing.plan?.trim()) missing.push('Plan')
    if (missing.length > 0) {
      throw new AppError(`Please complete ${missing.join(' and ')} before signing.`, 400);
    }

    const attestation = await attestationFor(actor.id);
    const signed = await clinicalNoteRepository.sign(noteId, {
      signedByUserId: actor.id,
      ...attestation,
    });
    if (!signed) throw new AppError('This note is already signed.', 409);

    auditService.log({
      action: AuditAction.NoteSigned,
      userId: actor.id,
      severity: AuditSeverity.Info,
      resource: 'clinical_note',
      resourceId: noteId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { patientId: existing.patientId },
    });

    return clinicalNoteRepository.findById(noteId);
  },

  /** The only way to change a signed note. */
  async amend(actor: Actor, noteId: string, dto: AddendumDto, meta: Meta) {
    const existing = await clinicalNoteRepository.findById(noteId);
    if (existing === null) throw new AppError('Note not found.', 404);
    await careRelationshipService.requirePatientAccess(actor, existing.patientId, meta);

    if (existing.status !== ClinicalNoteStatus.Signed) {
      throw new AppError(
        'Only a signed note can be amended. Edit the draft directly instead.',
        409,
      );
    }

    const attestation = await attestationFor(actor.id);
    const addendum = await clinicalNoteRepository.addAddendum({
      noteId,
      body: dto.body,
      authorUserId: actor.id,
      authorName: attestation.signerName,
      authorRegistrationNumber: attestation.signerRegistrationNumber,
    });

    auditService.log({
      action: AuditAction.NoteAmended,
      userId: actor.id,
      severity: AuditSeverity.Info,
      resource: 'clinical_note',
      resourceId: noteId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { patientId: existing.patientId, addendumId: addendum.id },
    });

    return clinicalNoteRepository.findById(noteId);
  },

  async deleteDraft(actor: Actor, noteId: string, meta: Meta): Promise<void> {
    const patientId = await clinicalNoteRepository.findOwnerPatientId(noteId);
    if (patientId === null) throw new AppError('Note not found.', 404);
    await careRelationshipService.requirePatientAccess(actor, patientId, meta);

    const deleted = await clinicalNoteRepository.deleteDraft(noteId, actor.id);
    if (!deleted) {
      throw new AppError('Only your own unsigned draft can be discarded.', 409);
    }
  },
};
