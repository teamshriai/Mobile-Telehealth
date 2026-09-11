import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { auditService, AuditAction, AuditSeverity } from '../services/audit.service';
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
   *   - Doctor            → only patients on their active care team.
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
   * Always throws 404, never 403, on a failed check. A 403 confirms the
   * patient record exists, which is itself a disclosure — an attacker could
   * enumerate valid patient ids by the status code alone.
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

    if (role === RoleName.Doctor) {
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: actor.id },
        select: { id: true },
      });

      if (doctorProfile === null) {
        return deny('clinician_without_doctor_profile');
      }

      const onTeam = await this.isOnCareTeam(doctorProfile.id, patientProfileId);
      if (onTeam) return;

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
        return deny('clinician_not_on_care_team');
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
};
