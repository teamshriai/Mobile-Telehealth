import { ClinicalNoteStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { auditService, AuditAction } from '../services/audit.service';
import { careRelationshipService } from '../services/careRelationship.service';
import { problemRepository } from './problem.repository';
import type { AddProblemDto } from './problem.validator';

// ─────────────────────────────────────────────────────────────────────────────
// Problem List & Diagnosis Coding — S-06-05
//
// Two rules from the atlas that this file enforces and the UI merely reflects:
//   1. ⚠️ PARENT-ONLY ICD-10 CODES ARE BLOCKED. "J18" is a category, not a
//      diagnosis. Coding to a parent is how a record becomes unbillable and,
//      worse, clinically vague.
//   2. ⚠️ RESOLVING NEVER DELETES. A resolved problem is still history.
// ─────────────────────────────────────────────────────────────────────────────

type Actor = { id: string; roleName: string };
type Meta = { ipAddress?: string; userAgent?: string };

export const problemService = {
  async searchCodes(query: string) {
    return problemRepository.searchCodes(query);
  },

  async listForPatient(actor: Actor, patientId: string, meta: Meta) {
    await careRelationshipService.requirePatientAccess(actor, patientId, meta);
    return problemRepository.listForPatient(patientId);
  },

  async add(actor: Actor, dto: AddProblemDto, meta: Meta) {
    await careRelationshipService.requirePatientAccess(actor, dto.patientId, meta);

    const code = await problemRepository.findCode(dto.code);
    if (!code?.isActive) {
      throw new AppError('That diagnosis code is not in the catalogue.', 400);
    }

    // ⚠️ The leaf rule (S-06-05).
    if (!code.isLeaf) {
      throw new AppError(
        `${code.code} is a category, not a diagnosis. Choose a more specific code beneath it.`,
        400,
      );
    }

    /**
     * ⚠️ A PROBLEM CANNOT BE ATTRIBUTED TO A VISIT WHOSE NOTE IS SIGNED.
     *
     * `CMP-NABH-10` closes a signed note to editing, and `onsetEncounterId`
     * writes into that closed record by another route: it says "this diagnosis
     * was made at that visit", after the visit's account of itself was final.
     * The screen hides the form, but a form is not a control — this is.
     *
     * Scoped to the encounter, not the patient: the problem list is
     * patient-level and must stay open. Only the attribution is refused, and
     * the message says where the record is still writable.
     */
    if (dto.encounterId !== undefined && dto.encounterId !== null) {
      const notes = await prisma.clinicalNote.findMany({
        where: { encounterId: dto.encounterId },
        select: { status: true },
      });
      const closed = notes.length > 0 && notes.every((n) => n.status !== ClinicalNoteStatus.Draft);
      if (closed) {
        throw new AppError(
          "That visit's note has been signed, so a problem can no longer be coded against it. " +
            'Add an addendum to the note, or code the problem at the next visit.',
          409,
        );
      }
    }

    // ⚠️ Dedupe against the ACTIVE list only — the same code may legitimately
    // recur after being resolved. A DB-level partial unique index backs this
    // up against a concurrent double-submit.
    const existing = await problemRepository.findActiveByCode(dto.patientId, dto.code);
    if (existing !== null) {
      throw new AppError(`${code.code} is already on this patient's active problem list.`, 409);
    }

    const problem = await problemRepository.create({
      patientId: dto.patientId,
      onsetEncounterId: dto.encounterId ?? null,
      code: code.code,
      codeTitle: code.title,
      onsetDate: dto.onsetDate ?? null,
      note: dto.note ?? null,
      recordedByUserId: actor.id,
    });

    auditService.log({
      action: AuditAction.ProblemAdded,
      userId: actor.id,
      resource: 'problem',
      resourceId: problem.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { code: code.code, patientId: dto.patientId },
    });

    return problem;
  },

  async resolve(actor: Actor, id: string, meta: Meta) {
    const patientId = await problemRepository.findOwnerPatientId(id);
    if (patientId === null) throw new AppError('Problem not found.', 404);
    await careRelationshipService.requirePatientAccess(actor, patientId, meta);

    const ok = await problemRepository.resolve(id);
    if (!ok) throw new AppError('That problem is already resolved.', 409);

    auditService.log({
      action: AuditAction.ProblemResolved,
      userId: actor.id,
      resource: 'problem',
      resourceId: id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  },
};
