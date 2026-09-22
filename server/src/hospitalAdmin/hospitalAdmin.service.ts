import { AppError } from '../middleware/errorHandler';
import { auditService, AuditAction, AuditSeverity } from '../services/audit.service';
import { decryptFieldOptional } from '../utils/encryption';
import { hospitalAdminRepository } from './hospitalAdmin.repository';
import type { UpdateHospitalDto, AssignCareTeamDto } from './staffProfile.validator';

// ─────────────────────────────────────────────────────────────────────────────
// Hospital Admin Service — the "manager dashboard" backend.
//
// Every read/write here is scoped to the acting admin's OWN hospital via
// requireHospitalScope, modelled directly on
// careRelationship.service.requirePatientAccess: resolve the actor's own
// hospital first, then confirm the target row actually belongs to it before
// any write, 404 (not 403) on a scope failure to avoid confirming a row
// exists at all.
// ─────────────────────────────────────────────────────────────────────────────

async function requireHospitalScope(userId: string): Promise<string> {
  const hospitalId = await hospitalAdminRepository.findHospitalIdByUserId(userId);
  if (hospitalId === null) {
    throw new AppError('Complete your hospital setup before continuing.', 400);
  }
  return hospitalId;
}

function toDoctorSummary(
  d: Awaited<ReturnType<typeof hospitalAdminRepository.listDoctorsByHospital>>[number],
) {
  return {
    id: d.id,
    name: `Dr. ${d.firstName} ${d.lastName}`.trim(),
    specialty: d.specialty,
    qualifications: d.qualifications,
    yearsExperience: d.yearsExperience,
    registrationNumber: d.registrationNumber,
    isVerified: d.isVerified,
    verifiedAt: d.verifiedAt,
    isActive: d.user.isActive,
    email: d.user.email,
    phoneNumber: d.phoneNumber,
    onboardingCompletedAt: d.onboardingCompletedAt,
    availability: d.availability,
  };
}

export const hospitalAdminService = {
  async getOwnHospital(userId: string) {
    const hospitalId = await requireHospitalScope(userId);
    return hospitalAdminRepository.findHospitalById(hospitalId);
  },

  async updateOwnHospital(userId: string, dto: UpdateHospitalDto) {
    const hospitalId = await requireHospitalScope(userId);
    return hospitalAdminRepository.updateHospital(hospitalId, dto);
  },

  async listDoctors(userId: string) {
    const hospitalId = await requireHospitalScope(userId);
    const doctors = await hospitalAdminRepository.listDoctorsByHospital(hospitalId);
    return doctors.map(toDoctorSummary);
  },

  async verifyDoctor(
    userId: string,
    doctorId: string,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    const hospitalId = await requireHospitalScope(userId);
    const doctor = await hospitalAdminRepository.findDoctorInHospital(hospitalId, doctorId);
    if (doctor === null) {
      throw new AppError('Doctor not found.', 404);
    }

    await hospitalAdminRepository.verifyDoctor(doctorId, userId);

    auditService.log({
      action: AuditAction.ProfileUpdated,
      userId,
      severity: AuditSeverity.Info,
      resource: 'doctor_profile',
      resourceId: doctorId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { action: 'verified_by_hospital_admin' },
    });
  },

  async setDoctorActive(
    userId: string,
    doctorId: string,
    isActive: boolean,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    const hospitalId = await requireHospitalScope(userId);
    const doctor = await hospitalAdminRepository.findDoctorInHospital(hospitalId, doctorId);
    if (doctor === null) {
      throw new AppError('Doctor not found.', 404);
    }

    await hospitalAdminRepository.setDoctorUserActive(doctor.userId, isActive);

    auditService.log({
      action: isActive ? AuditAction.AccountUnlocked : AuditAction.AccountLocked,
      userId,
      severity: AuditSeverity.Info,
      resource: 'user',
      resourceId: doctor.userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: {
        action: isActive ? 'activated_by_hospital_admin' : 'deactivated_by_hospital_admin',
      },
    });
  },

  /** Derived, care-team/appointment-scoped list — name, last activity and
   *  assigned doctor only. No clinical detail is surfaced here; that stays
   *  behind the existing doctor-scoped requirePatientAccess, untouched. */
  async listPatients(userId: string) {
    const hospitalId = await requireHospitalScope(userId);
    return hospitalAdminRepository.listPatientsByHospital(hospitalId);
  },

  /**
   * The care team for one patient, restricted to this hospital's doctors.
   *
   * The patient must already have some link to the hospital (a care-team row
   * or an appointment with one of its doctors). Without that check an admin
   * could enumerate the entire patient table one uuid at a time through this
   * endpoint, which is the same disclosure careRelationship.service avoids by
   * returning 404 rather than 403.
   */
  async listCareTeam(userId: string, patientId: string) {
    const hospitalId = await requireHospitalScope(userId);
    const belongs = await hospitalAdminRepository.patientBelongsToHospital(hospitalId, patientId);
    if (!belongs) {
      throw new AppError('Patient not found.', 404);
    }

    const rows = await hospitalAdminRepository.listCareTeamForPatient(hospitalId, patientId);
    return rows.map((row) => ({
      id: row.id,
      careRole: row.careRole,
      isPrimary: row.isPrimary,
      since: row.activeFrom,
      doctorId: row.doctor.id,
      doctorName: `Dr. ${row.doctor.firstName} ${row.doctor.lastName}`.trim(),
      specialty: row.doctor.specialty,
    }));
  },

  /**
   * Assign a patient to one of this hospital's doctors.
   *
   * ⚠️ This is an AUTHORIZATION GRANT, not an administrative detail. Care-team
   * membership is precisely what careRelationship.requirePatientAccess reads
   * to decide whether a doctor may open a clinical record, so this endpoint
   * is the supported way that access comes into existence — and it is
   * deliberately an administrative act rather than something a doctor can do
   * for themselves.
   *
   * Both ends are validated against the admin's own hospital: the doctor must
   * work here, and the patient must already be connected to here.
   */
  async assignCareTeam(
    userId: string,
    dto: AssignCareTeamDto,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    const hospitalId = await requireHospitalScope(userId);

    const doctor = await hospitalAdminRepository.findDoctorInHospital(hospitalId, dto.doctorId);
    if (doctor === null) {
      throw new AppError('Doctor not found.', 404);
    }

    const belongs = await hospitalAdminRepository.patientBelongsToHospital(
      hospitalId,
      dto.patientId,
    );
    if (!belongs) {
      throw new AppError('Patient not found.', 404);
    }

    const membership = await hospitalAdminRepository.assignCareTeamMember({
      patientId: dto.patientId,
      doctorId: dto.doctorId,
      careRole: dto.careRole,
      isPrimary: dto.isPrimary,
    });

    auditService.log({
      action: AuditAction.CareTeamAssigned,
      userId,
      severity: AuditSeverity.Info,
      resource: 'care_team_member',
      resourceId: membership.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      // Ids and the role only — never the patient's name or any clinical
      // detail. The audit log is not a place to accumulate PHI.
      metadata: { patientId: dto.patientId, doctorId: dto.doctorId, careRole: dto.careRole },
    });

    return membership;
  },

  /** Ends a membership — a soft close, so the history of who had access when
   *  survives. Revoking access is as audit-worthy as granting it. */
  async endCareTeam(
    userId: string,
    membershipId: string,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    const hospitalId = await requireHospitalScope(userId);
    const ended = await hospitalAdminRepository.endCareTeamMember(hospitalId, membershipId);
    if (!ended) {
      throw new AppError('Care team assignment not found.', 404);
    }

    auditService.log({
      action: AuditAction.CareTeamEnded,
      userId,
      severity: AuditSeverity.Info,
      resource: 'care_team_member',
      resourceId: membershipId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  },

  async listAppointments(userId: string) {
    const hospitalId = await requireHospitalScope(userId);
    const rows = await hospitalAdminRepository.listAppointmentsByHospital(hospitalId);
    return rows.map((r) => ({
      id: r.id,
      scheduledAt: r.scheduledAt,
      status: r.status,
      mode: r.mode,
      doctorName: r.doctor ? `Dr. ${r.doctor.firstName} ${r.doctor.lastName}`.trim() : 'Unassigned',
      patientName: `${r.patient.firstName} ${r.patient.lastName}`.trim(),
    }));
  },

  /**
   * Real, database-backed numbers only — no fabricated or placeholder
   * metrics. An empty hospital returns real zeros, which the client renders
   * as an honest "no data yet" state rather than a decorative chart.
   */
  async getAnalytics(userId: string) {
    const hospitalId = await requireHospitalScope(userId);
    const ACTIVE_WINDOW_DAYS = 90;
    const TREND_WINDOW_DAYS = 30;

    const [patients, doctorCount, statusCounts, trendRows] = await Promise.all([
      hospitalAdminRepository.listPatientsByHospital(hospitalId),
      hospitalAdminRepository.countDoctors(hospitalId),
      hospitalAdminRepository.appointmentCountsByStatus(hospitalId),
      hospitalAdminRepository.appointmentsSince(
        hospitalId,
        new Date(Date.now() - TREND_WINDOW_DAYS * 86_400_000),
      ),
    ]);

    const activeSince = new Date(Date.now() - ACTIVE_WINDOW_DAYS * 86_400_000);
    const activePatients = patients.filter((p) => p.lastActivity >= activeSince).length;

    // Group the trend window's appointments by calendar day for a simple,
    // real bar/line series — never interpolated or padded with fake values.
    const trendByDay = new Map<string, number>();
    for (const row of trendRows) {
      const day = row.scheduledAt.toISOString().slice(0, 10);
      trendByDay.set(day, (trendByDay.get(day) ?? 0) + 1);
    }

    return {
      totalPatients: patients.length,
      activePatients,
      doctorCount,
      appointmentsByStatus: Object.fromEntries(statusCounts.map((s) => [s.status, s._count._all])),
      appointmentTrend: Array.from(trendByDay.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count })),
    };
  },

  async listFeedback(userId: string) {
    const hospitalId = await requireHospitalScope(userId);
    const rows = await hospitalAdminRepository.listFeedbackByHospital(hospitalId);

    const feedback = rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      category: r.category,
      comment: decryptFieldOptional(r.comment) ?? null,
      createdAt: r.createdAt,
      doctorName: r.doctor ? `Dr. ${r.doctor.firstName} ${r.doctor.lastName}`.trim() : null,
    }));

    const averageRating =
      feedback.length > 0
        ? Math.round((feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length) * 10) / 10
        : null;

    return { feedback, averageRating, count: feedback.length };
  },
};
