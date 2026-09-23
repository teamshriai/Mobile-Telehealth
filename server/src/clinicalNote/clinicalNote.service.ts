import { ClinicalNoteStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { auditService, AuditAction, AuditSeverity } from '../services/audit.service';
import { careRelationshipService } from '../services/careRelationship.service';
import { roleHasPermission, Permission } from '../config/permissions';
import { clinicalNoteRepository } from './clinicalNote.repository';
import { checkDocumentationQuality, type AbbreviationFinding } from './bannedAbbreviations';
import type { RoleName } from '../types/auth.types';
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

  /**
   * Open a note for an encounter.
   *
   * ⚠️ RETURNS THE EXISTING DRAFT RATHER THAN CREATING A SECOND ONE.
   *
   * A visit has one note. Two drafts for one encounter is a documentation
   * defect: whichever one the clinician happens to be looking at, the other is
   * an orphan that still appears in the chart, on the timeline, and in the
   * co-sign queue if it is ever submitted.
   *
   * This is not hypothetical. React StrictMode double-invokes effects in
   * development, so the note screen's "load, and create one if none exists"
   * fired twice on every open; both passes read an empty list and both
   * created. The demo database had accumulated two drafts for every encounter
   * a test had ever opened.
   *
   * The guard belongs here rather than in the client because the client is not
   * the only caller and cannot be: two browser tabs, a retried request, or a
   * double-tap on a slow connection all produce the same race. Scoped to the
   * same author as well as the same encounter, so a resident opening a
   * consultant's encounter still gets their own note.
   */
  async create(actor: Actor, dto: CreateNoteDto, meta: Meta) {
    await careRelationshipService.requirePatientAccess(actor, dto.patientId, meta);

    if (dto.encounterId !== undefined && dto.encounterId !== null) {
      const existing = await clinicalNoteRepository.findOpenDraftForEncounter(
        dto.encounterId,
        actor.id,
      );
      if (existing !== null) return existing;
    }

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
    if (existing.status === ClinicalNoteStatus.CosignPending) {
      throw new AppError(
        'This note is awaiting a counter-signature. Use the co-sign queue instead.',
        409,
      );
    }
    if (existing.authorUserId !== actor.id) {
      // Signing is attesting to YOUR OWN entry. Counter-signing someone
      // else's is the separate `cosign` verb with its own capability and its
      // own queue (S-06-09) — allowing it here would misattribute the legal
      // record to the wrong clinician.
      throw new AppError('Only the author can sign this note. Use co-sign instead.', 403);
    }

    const missing: string[] = [];
    if (!existing.assessment?.trim()) missing.push('Assessment');
    if (!existing.plan?.trim()) missing.push('Plan');
    if (missing.length > 0) {
      throw new AppError(`Please complete ${missing.join(' and ')} before signing.`, 400);
    }

    // ⚠️ CMP-NABH-05. UI_ATLAS S-06-03 gates Sign on "banned abbreviations
    // cleared", so this is a hard block, not a warning — and it is checked
    // HERE as well as on blur in the UI, because a client-side-only
    // documentation rule is a suggestion.
    const quality = this.checkQuality(existing);
    if (quality.length > 0) {
      const terms = [...new Set(quality.map((q) => q.term))].join(', ');
      throw new AppError(
        `Unsafe abbreviations must be written out before signing: ${terms}.`,
        400,
      );
    }

    // ⚠️ THE CO-SIGN DECISION, and the only place it is made.
    //
    // Read from the actor's CAPABILITIES, never from their role name
    // (UI_ATLAS §3.2). An author who cannot attest to the legal record
    // alone — a Resident, today — produces a note in CosignPending that a
    // consultant must counter-sign (CMP-NABH-03). Adding another role with
    // the same constraint requires no change here.
    const canAttestAlone = roleHasPermission(actor.roleName as RoleName, Permission.NoteSignOwn);

    const attestation = await attestationFor(actor.id);
    const signed = await clinicalNoteRepository.sign(noteId, {
      signedByUserId: actor.id,
      ...attestation,
      requiresCosign: !canAttestAlone,
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
      metadata: { patientId: existing.patientId, requiresCosign: !canAttestAlone },
    });

    return clinicalNoteRepository.findById(noteId);
  },

  /**
   * Run the documentation-quality rules over every narrative section.
   *
   * Exposed so the UI can call it on blur (S-06-03 checks Subjective on
   * blur) and reused by sign() so the two can never disagree.
   */
  checkQuality(note: {
    subjective?: string | null;
    objective?: string | null;
    assessment?: string | null;
    plan?: string | null;
  }): Array<AbbreviationFinding & { section: string }> {
    const sections: Array<[string, string | null | undefined]> = [
      ['Subjective', note.subjective],
      ['Objective', note.objective],
      ['Assessment', note.assessment],
      ['Plan', note.plan],
    ];

    return sections.flatMap(([section, text]) =>
      checkDocumentationQuality(text).map((finding) => ({ ...finding, section })),
    );
  },

  /**
   * The consultant co-sign queue (S-06-09).
   *
   * ⚠️ Returns identifying metadata only — patient name, author, age of the
   * pending item — and never note content. A queue is a triage surface; the
   * content is read on the note screen, through the same row-level gate as
   * every other clinical read.
   */
  async listCosignQueue(actor: Actor) {
    const rows = await clinicalNoteRepository.listAwaitingCosign();
    const now = Date.now();

    // Filter to the patients this consultant may actually act on. Done here
    // rather than in SQL because the relationship rules (care team, field
    // relationship, live break-glass grant) all live in one service and must
    // not be reimplemented as a query.
    const visible = [];
    for (const row of rows) {
      try {
        await careRelationshipService.requirePatientAccess(actor, row.patientId, {});
      } catch {
        continue;
      }
      visible.push({
        id: row.id,
        patientId: row.patientId,
        shriPatientId: row.patient.shriPatientId,
        patientName: `${row.patient.firstName} ${row.patient.lastName}`.trim(),
        authoredBy: row.signerName,
        authoredAt: row.signedAt,
        problemText: row.problemText,
        ageHours:
          row.signedAt === null ? 0 : Math.floor((now - row.signedAt.getTime()) / 3_600_000),
      });
    }
    return visible;
  },

  /**
   * Counter-sign another clinician's note.
   *
   * ⚠️ The co-signature is stamped ALONGSIDE the author's attestation, never
   * replacing it. The record must always show who wrote it and who stood
   * behind it — that is the whole content of CMP-NABH-03.
   */
  async cosign(actor: Actor, noteId: string, meta: Meta) {
    const existing = await clinicalNoteRepository.findById(noteId);
    if (existing === null) throw new AppError('Note not found.', 404);
    await careRelationshipService.requirePatientAccess(actor, existing.patientId, meta);

    if (!roleHasPermission(actor.roleName as RoleName, Permission.NoteCosignAssigned)) {
      throw new AppError('You are not authorised to counter-sign a note.', 403);
    }
    if (existing.status !== ClinicalNoteStatus.CosignPending) {
      throw new AppError('This note is not awaiting a counter-signature.', 409);
    }
    if (existing.authorUserId === actor.id) {
      // A co-signature by the author is not a second opinion.
      throw new AppError('You cannot counter-sign your own note.', 403);
    }

    const attestation = await attestationFor(actor.id);
    const ok = await clinicalNoteRepository.cosign(noteId, {
      cosignedByUserId: actor.id,
      cosignerName: attestation.signerName,
      cosignerRegistrationNumber: attestation.signerRegistrationNumber,
    });
    if (!ok) throw new AppError('This note is not awaiting a counter-signature.', 409);

    auditService.log({
      action: AuditAction.NoteCosigned,
      userId: actor.id,
      severity: AuditSeverity.Info,
      resource: 'clinical_note',
      resourceId: noteId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { patientId: existing.patientId, authorUserId: existing.authorUserId },
    });

    return clinicalNoteRepository.findById(noteId);
  },

  /**
   * Send it back instead. ⚠️ A reason is mandatory and the author is
   * notified — a note that silently reappears as a draft, with no reason
   * attached, is indistinguishable from a bug to the person who wrote it.
   */
  async returnToAuthor(actor: Actor, noteId: string, reason: string, meta: Meta) {
    const existing = await clinicalNoteRepository.findById(noteId);
    if (existing === null) throw new AppError('Note not found.', 404);
    await careRelationshipService.requirePatientAccess(actor, existing.patientId, meta);

    if (!roleHasPermission(actor.roleName as RoleName, Permission.NoteCosignAssigned)) {
      throw new AppError('You are not authorised to return this note.', 403);
    }
    if (existing.status !== ClinicalNoteStatus.CosignPending) {
      throw new AppError('This note is not awaiting a counter-signature.', 409);
    }

    const ok = await clinicalNoteRepository.returnToAuthor(noteId, reason);
    if (!ok) throw new AppError('This note is not awaiting a counter-signature.', 409);

    await prisma.notification.create({
      data: {
        userId: existing.authorUserId,
        type: 'General',
        title: 'A note was returned for revision',
        // The reason itself is NOT copied into the notification: notifications
        // are not encrypted, and this text is clinical commentary. The author
        // reads it on the note.
        body: 'A consultant has asked for changes before counter-signing your note.',
        actionUrl: `/encounter/${existing.encounterId ?? ''}/note`,
      },
    });

    auditService.log({
      action: AuditAction.NoteReturnedToAuthor,
      userId: actor.id,
      severity: AuditSeverity.Info,
      resource: 'clinical_note',
      resourceId: noteId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { patientId: existing.patientId, authorUserId: existing.authorUserId },
    });
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
