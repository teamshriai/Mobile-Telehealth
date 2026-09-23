import { prisma } from '../lib/prisma';
import { AppError, BreakGlassRequiredError } from '../middleware/errorHandler';
import { auditService, AuditAction, AuditSeverity } from '../services/audit.service';
import { breakGlassRepository } from '../breakGlass/breakGlass.repository';
import { Permission, roleHasPermission } from '../config/permissions';
import { RoleName } from '../types/auth.types';

// ─────────────────────────────────────────────────────────────────────────────
// Care Relationship Service — ROW-level authorization
//
// The permission layer answers "may this ROLE ever read a patient record?".
// This answers the question that actually protects patients: "may THIS user
// read THIS patient's record?".
//
// Phase 1 found profile.routes.ts deliberately exposing no `/:id` endpoint,
// because there was no patient↔doctor relationship to authorise against. The
// CareTeamMember table is that relationship; this service is the only place it
// should be checked, so the rule cannot drift between endpoints.
//
// The Doctor portal is not built in Phase 2. This exists now so that when it
// is, the authorization decision is already written, tested and centralised —
// rather than improvised per endpoint under delivery pressure.
// ─────────────────────────────────────────────────────────────────────────────

// Phase 6: a field/registration worker has no CareTeamMember row (that FK
// points at DoctorProfile, and HealthcareWorker users get a StaffProfile —
// there is no schema path to put a HealthcareWorker "on a care team"). Their
// access grant is therefore narrower and time-bounded rather than open-ended
// like a Doctor's: they may act on a patient they personally registered, or
// on a patient whose encounter they personally opened, and only within a
// short window after the fact. A dedicated staff-assignment table is the
// right long-term answer once there is a real multi-shift/handover
// requirement to justify it — this is deliberately not that.
const HEALTHCARE_WORKER_ACCESS_WINDOW_HOURS = 24;

export const careRelationshipService = {
  /**
   * Is this doctor on this patient's ACTIVE care team?
   * activeTo === null means the assignment has not been ended.
   */
  async isOnCareTeam(doctorProfileId: string, patientProfileId: string): Promise<boolean> {
    const link = await prisma.careTeamMember.findFirst({
      where: {
        doctorId: doctorProfileId,
        patientId: patientProfileId,
        activeTo: null,
      },
      select: { id: true },
    });

    return link !== null;
  },

  /**
   * Did this HealthcareWorker register this patient, or open an encounter on
   * them, within the recent access window? This is the HW equivalent of
   * isOnCareTeam — a narrower, auditable substitute for a care-team row that
   * cannot exist for this role (see the module comment above).
   */
  async hasRecentFieldRelationship(
    actorUserId: string,
    patientProfileId: string,
  ): Promise<boolean> {
    const windowStart = new Date(
      Date.now() - HEALTHCARE_WORKER_ACCESS_WINDOW_HOURS * 60 * 60 * 1000,
    );

    const registeredByThisWorker = await prisma.patientProfile.findFirst({
      where: { id: patientProfileId, registeredByUserId: actorUserId },
      select: { id: true },
    });
    if (registeredByThisWorker !== null) return true;

    const openedEncounter = await prisma.encounter.findFirst({
      where: {
        patientId: patientProfileId,
        createdByUserId: actorUserId,
        startedAt: { gte: windowStart },
      },
      select: { id: true },
    });
    return openedEncounter !== null;
  },

  /**
   * Authorize a user to act on a specific patient's data, or throw.
   *
   * Rules, in order:
   *   - Patient           → only their own record.
   *   - Doctor / Resident → patients on their active care team, patients they
   *                         personally registered or opened an encounter on,
   *                         or patients they hold a live break-glass grant for.
   *   - HealthcareWorker  → only a patient they personally registered, or
   *                         whose encounter they personally opened within
   *                         the last 24h (see hasRecentFieldRelationship —
   *                         HW users have no CareTeamMember row, so the
   *                         Doctor care-team check does not apply to them).
   *   - Admin             → denied. Administrators manage accounts, not
   *                         clinical records; if an admin ever needs clinical
   *                         access it must be an explicit, separately
   *                         audited break-glass flow, never a silent side
   *                         effect of being an admin.
   *
   * ⚠️ REFUSALS ARE UNIFORM — with exactly one sanctioned exception.
   *
   * The default is 404, never 403, for every cause: no relationship, no such
   * patient, wrong role, deleted record. A 403 would confirm the record
   * exists, letting an attacker enumerate valid patient ids by status code
   * alone (UI_ATLAS §3.2).
   *
   * The exception is break-glass. A clinician who holds
   * `breakglass:request:any` and meets an EXISTING patient they have no
   * relationship with gets a 403 carrying `breakGlass: true`, because
   * DD-014 requires them to be offered emergency access rather than refused.
   * See offerBreakGlassOrDeny below for the full reasoning and the trade.
   */
  async requirePatientAccess(
    actor: { id: string; roleName: string },
    patientProfileId: string,
    context: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<void> {
    const role = actor.roleName as RoleName;

    const deny = (reason: string): never => {
      auditService.log({
        action: AuditAction.UnauthorizedAccess,
        userId: actor.id,
        severity: AuditSeverity.Warning,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: { reason, role, targetPatientId: patientProfileId },
      });
      throw new AppError('Patient record not found.', 404);
    };

    if (role === RoleName.Patient) {
      const own = await prisma.patientProfile.findUnique({
        where: { userId: actor.id },
        select: { id: true },
      });

      if (own?.id !== patientProfileId) {
        return deny('patient_accessing_other_patient');
      }
      return;
    }

    // Doctor and Resident share one relationship model: both are clinicians
    // with a DoctorProfile, and care-team membership is the same row for
    // either. ⚠️ This branch selects WHICH relationship model applies to the
    // actor — it is not a permission check. Whether they may perform the
    // operation at all was already decided by requirePermission upstream,
    // from capabilities, per UI_ATLAS §3.2.
    if (role === RoleName.Doctor || role === RoleName.Resident) {
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: actor.id },
        select: { id: true },
      });

      if (doctorProfile === null) {
        return deny('clinician_without_doctor_profile');
      }

      const onTeam = await this.isOnCareTeam(doctorProfile.id, patientProfileId);
      if (onTeam) return;

      // An active break-glass grant IS a relationship, for as long as it
      // lives. Checked before the field-relationship fallback because it is
      // the cheaper and more explicit of the two.
      const grant = await breakGlassRepository.findActiveGrant(actor.id, patientProfileId);
      if (grant !== null) return;

      // A Doctor who personally registered a patient, or opened an encounter
      // on them, has a legitimate reason to read that record even before a
      // formal CareTeamMember row exists — the same narrow, time-bounded
      // grant a HealthcareWorker gets (see hasRecentFieldRelationship).
      // Deliberately NOT a blanket "any Doctor may read any patient" grant:
      // that would be exactly the kind of broad clinical-record access this
      // service exists to prevent, matching the same reasoning that already
      // denies Admin unconditional clinical access below.
      const hasFieldRelationship = await this.hasRecentFieldRelationship(
        actor.id,
        patientProfileId,
      );
      if (!hasFieldRelationship) {
        return this.offerBreakGlassOrDeny(actor, patientProfileId, deny, context);
      }
      return;
    }

    if (role === RoleName.HealthcareWorker) {
      const hasRelationship = await this.hasRecentFieldRelationship(actor.id, patientProfileId);
      if (!hasRelationship) {
        return deny('healthcare_worker_no_recent_field_relationship');
      }
      return;
    }

    return deny('role_has_no_clinical_access');
  },

  /**
   * The one refusal that is not uniform.
   *
   * ⚠️ UI_ATLAS §3.2 / DD-014. A clinician who HOLDS the capability but has no
   * relationship with an EXISTING patient is offered break-glass rather than
   * refused: "an authorization model that can block resuscitation is the
   * wrong model." Everything else — no such patient, a deleted patient, an
   * actor without the break-glass capability — falls through to the uniform
   * 404, because a refusal that distinguishes its causes is a
   * relationship-existence oracle (§3.2).
   *
   * ⚠️ The trade being made, stated plainly: this DOES tell a capability-
   * holding clinician that a given patient exists. The atlas accepts that
   * deliberately, and it is bounded — the caller already had to authenticate,
   * already had to hold `breakglass:request:any`, and the probe is audited
   * below whether or not they go on to break glass.
   */
  async offerBreakGlassOrDeny(
    actor: { id: string; roleName: string },
    patientProfileId: string,
    deny: (reason: string) => never,
    context: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    const canBreakGlass = roleHasPermission(
      actor.roleName as RoleName,
      Permission.BreakGlassRequest,
    );
    if (!canBreakGlass) return deny('clinician_not_on_care_team');

    const patientExists = await prisma.patientProfile.findFirst({
      where: { id: patientProfileId, deletedAt: null },
      select: { id: true, shriPatientId: true },
    });
    if (patientExists === null) return deny('clinician_not_on_care_team');

    auditService.log({
      action: AuditAction.BreakGlassRequested,
      userId: actor.id,
      resource: 'patient_profile',
      resourceId: patientProfileId,
      severity: AuditSeverity.Warning,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { stage: 'offered', role: actor.roleName },
    });

    throw new BreakGlassRequiredError(undefined, patientExists.shriPatientId);
  },
};
