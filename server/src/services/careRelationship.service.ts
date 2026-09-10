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
   * Authorize a user to act on a specific patient's data, or throw.
   *
   * Rules, in order:
   *   - Patient  → only their own record.
   *   - Doctor / HealthcareWorker → only patients on their active care team.
   *   - Admin    → denied. Administrators manage accounts, not clinical
   *                records; if an admin ever needs clinical access it must be
   *                an explicit, separately audited break-glass flow, never a
   *                silent side effect of being an admin.
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

    if (role === RoleName.Doctor || role === RoleName.HealthcareWorker) {
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: actor.id },
        select: { id: true },
      });

      if (doctorProfile === null) {
        return deny('clinician_without_doctor_profile');
      }

      const onTeam = await this.isOnCareTeam(doctorProfile.id, patientProfileId);
      if (!onTeam) {
        return deny('clinician_not_on_care_team');
      }
      return;
    }

    return deny('role_has_no_clinical_access');
  },
};
