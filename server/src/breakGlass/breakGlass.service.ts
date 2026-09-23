import type { BreakGlassGrant } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { auditService, AuditAction, AuditSeverity } from '../services/audit.service';
import { breakGlassRepository } from './breakGlass.repository';
import type { RequestBreakGlassDto, ReviewBreakGlassDto } from './breakGlass.validator';

// ─────────────────────────────────────────────────────────────────────────────
// Break-Glass Service — emergency access to a patient with no care relationship
//
// ⚠️ UI_ATLAS §3.2 / DD-014, verbatim: an actor with the capability but no
// relationship "is not refused — they are offered break-glass: state a reason,
// proceed, and the access is logged and reviewed within 24 hours… an
// authorization model that can block resuscitation is the wrong model."
//
// Three properties this module exists to guarantee:
//   1. NOTHING CLINICAL IS SHOWN BEFORE THE REASON IS GIVEN. `getIdentity`
//      returns a name and a UHID and nothing else, so the clinician can
//      confirm they are about to open the right record without that
//      confirmation itself being an unlogged read.
//   2. THE AUDIT WRITE CANNOT BLOCK ACCESS, but its failure is an alert. See
//      auditService.logCritical.
//   3. GRANTS EXPIRE. A grant is a shift-length exception, not a relationship.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * How long a grant lives. One shift: long enough to cover the episode of care
 * that justified it, short enough that it cannot quietly become permanent.
 */
const GRANT_TTL_HOURS = 12;

/** The minimal identity shown in the break-glass modal. Deliberately tiny. */
export interface BreakGlassIdentity {
  shriPatientId: string;
  fullName: string;
}

export interface ActiveGrantView {
  id: string;
  patientId: string;
  shriPatientId: string;
  patientName: string;
  reasonCategory: string;
  grantedAt: Date;
  expiresAt: Date;
}

async function findPatientOrThrow(
  shriPatientId: string,
): Promise<{ id: string; shriPatientId: string; firstName: string; lastName: string }> {
  const patient = await prisma.patientProfile.findFirst({
    where: { shriPatientId, deletedAt: null },
    select: { id: true, shriPatientId: true, firstName: true, lastName: true },
  });
  // Uniform 404 — a patient that does not exist must look identical to one the
  // caller may not see. Break-glass never reveals a patient that isn't there.
  if (patient === null) throw new AppError('Patient record not found.', 404);
  return patient;
}

export const breakGlassService = {
  /**
   * Name and UHID only.
   *
   * ⚠️ This is the ONE read permitted before a reason is recorded, and it is
   * still audited. It exists so a clinician can verify they are about to break
   * glass on the right patient — a wrong-patient break-glass is worse than the
   * refusal it replaced.
   */
  async getIdentity(
    actor: { id: string; roleName: string },
    shriPatientId: string,
    meta: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<BreakGlassIdentity> {
    const patient = await findPatientOrThrow(shriPatientId);

    auditService.log({
      action: AuditAction.BreakGlassRequested,
      userId: actor.id,
      resource: 'patient_profile',
      resourceId: patient.id,
      severity: AuditSeverity.Warning,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { stage: 'identity_viewed', role: actor.roleName },
    });

    return {
      shriPatientId: patient.shriPatientId,
      fullName: `${patient.firstName} ${patient.lastName}`.trim(),
    };
  },

  /**
   * Grant emergency access.
   *
   * ⚠️ Order of operations is deliberate: the grant row is written FIRST, then
   * the critical audit record, then the grant is returned. Access is never
   * withheld because the audit write failed — but the failure is alerted on,
   * and the audit outcome is recorded in the grant's own review note so a
   * reviewer can see that this particular access has an incomplete trail.
   */
  async requestGrant(
    actor: { id: string; roleName: string },
    shriPatientId: string,
    dto: RequestBreakGlassDto,
    meta: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<{ grant: BreakGlassGrant; audited: boolean }> {
    const patient = await findPatientOrThrow(shriPatientId);

    // An existing live grant is reused rather than stacked — repeatedly
    // re-stating a reason during one episode of care is friction with no
    // review value, and it would inflate the queue with duplicates.
    const existing = await breakGlassRepository.findActiveGrant(actor.id, patient.id);
    if (existing !== null) return { grant: existing, audited: true };

    const actorName = await resolveActorName(actor.id);

    const grant = await breakGlassRepository.create({
      patientId: patient.id,
      actorUserId: actor.id,
      actorName,
      reasonCategory: dto.reasonCategory,
      reason: dto.reason,
      expiresAt: new Date(Date.now() + GRANT_TTL_HOURS * 60 * 60 * 1000),
    });

    const audited = await auditService.logCritical({
      action: AuditAction.BreakGlassGranted,
      userId: actor.id,
      resource: 'break_glass_grant',
      resourceId: grant.id,
      severity: AuditSeverity.Critical,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      // ⚠️ The reason text itself is NOT copied here. It is PHI-adjacent and
      // already stored encrypted on the grant; duplicating it into audit
      // metadata would put it in a second store under a different retention
      // rule, which UI_ATLAS §4.9 explicitly warns against.
      metadata: {
        role: actor.roleName,
        reasonCategory: dto.reasonCategory,
        patientId: patient.id,
        expiresAt: grant.expiresAt.toISOString(),
      },
    });

    return { grant, audited };
  },

  /** Every live grant this clinician holds — the GP-10 banner's data source. */
  async listActiveForActor(actorUserId: string): Promise<ActiveGrantView[]> {
    const grants = await breakGlassRepository.listActiveForActor(actorUserId);
    if (grants.length === 0) return [];

    const patients = await prisma.patientProfile.findMany({
      where: { id: { in: grants.map((g) => g.patientId) } },
      select: { id: true, shriPatientId: true, firstName: true, lastName: true },
    });
    const byId = new Map(patients.map((p) => [p.id, p]));

    return grants.map((g) => {
      const p = byId.get(g.patientId);
      return {
        id: g.id,
        patientId: g.patientId,
        shriPatientId: p?.shriPatientId ?? '',
        patientName: p ? `${p.firstName} ${p.lastName}`.trim() : 'Unknown patient',
        reasonCategory: g.reasonCategory,
        grantedAt: g.grantedAt,
        expiresAt: g.expiresAt,
      };
    });
  },

  /**
   * The review queue (DD-014: reviewed within 24 hours).
   *
   * ⚠️ Reading the queue is ITSELF audited. A review surface over emergency
   * access is a surface over who-read-whose-record, and it would be
   * incoherent to leave it unlogged.
   */
  async listForReview(
    actor: { id: string },
    includeReviewed: boolean,
    meta: { ipAddress?: string; userAgent?: string } = {},
  ) {
    const rows = await breakGlassRepository.listForReview(includeReviewed);

    auditService.log({
      action: AuditAction.BreakGlassReviewed,
      userId: actor.id,
      resource: 'break_glass_grant',
      severity: AuditSeverity.Info,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { stage: 'queue_viewed', count: rows.length, includeReviewed },
    });

    const now = Date.now();
    return rows.map((r) => ({
      id: r.id,
      patientName: `${r.patient.firstName} ${r.patient.lastName}`.trim(),
      shriPatientId: r.patient.shriPatientId,
      actorName: r.actorName,
      reasonCategory: r.reasonCategory,
      reason: r.reason,
      grantedAt: r.grantedAt,
      expiresAt: r.expiresAt,
      isExpired: r.expiresAt.getTime() <= now,
      reviewedAt: r.reviewedAt,
      outcome: r.outcome,
      reviewNote: r.reviewNote,
      /** Hours since the access. The 24h review clock runs from here. */
      ageHours: Math.floor((now - r.grantedAt.getTime()) / 3_600_000),
    }));
  },

  async review(
    actor: { id: string },
    grantId: string,
    dto: ReviewBreakGlassDto,
    meta: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<void> {
    const ok = await breakGlassRepository.markReviewed(
      grantId,
      actor.id,
      dto.outcome,
      dto.reviewNote ?? null,
    );
    if (!ok) {
      throw new AppError('This access has already been reviewed.', 409);
    }

    auditService.log({
      action: AuditAction.BreakGlassReviewed,
      userId: actor.id,
      resource: 'break_glass_grant',
      resourceId: grantId,
      severity: AuditSeverity.Warning,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { stage: 'reviewed', outcome: dto.outcome },
    });
  },
};

/**
 * The acting clinician's display name, copied onto the grant rather than
 * joined — the same reasoning as ClinicalNote's copied attestation: the record
 * must still read correctly after the person changes their name or leaves.
 */
async function resolveActorName(userId: string): Promise<string> {
  const doctor = await prisma.doctorProfile.findUnique({
    where: { userId },
    select: { firstName: true, lastName: true },
  });
  if (doctor !== null) return `Dr. ${doctor.firstName} ${doctor.lastName}`.trim();

  const staff = await prisma.staffProfile.findUnique({
    where: { userId },
    select: { firstName: true, lastName: true },
  });
  if (staff !== null) return `${staff.firstName} ${staff.lastName}`.trim();

  return 'Unknown clinician';
}
