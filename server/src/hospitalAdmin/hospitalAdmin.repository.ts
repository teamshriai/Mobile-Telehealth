import { prisma } from '../lib/prisma';
import { hospitalScopeWhere } from './appointmentScope';

// ─────────────────────────────────────────────────────────────────────────────
// Hospital Admin Repository — every query here is scoped to one hospital.
//
// "Patients associated with this hospital" is deliberately a DERIVED query
// (via CareTeamMember/Appointment → DoctorProfile.hospitalId), never a
// direct PatientProfile query — see the schema comment on the Hospital
// model. A patient is not owned by one hospital; a hospital's view of
// "its" patients is exactly those with a doctor there.
// ─────────────────────────────────────────────────────────────────────────────

export const hospitalAdminRepository = {
  async findHospitalIdByUserId(userId: string): Promise<string | null> {
    const staff = await prisma.staffProfile.findFirst({
      where: { userId, deletedAt: null },
      select: { hospitalId: true },
    });
    return staff?.hospitalId ?? null;
  },

  async findHospitalById(id: string) {
    return prisma.hospital.findUnique({ where: { id } });
  },

  async updateHospital(id: string, data: { name?: string; city?: string; state?: string }) {
    return prisma.hospital.update({ where: { id }, data });
  },

  async listDoctorsByHospital(hospitalId: string) {
    return prisma.doctorProfile.findMany({
      where: { hospitalId, deletedAt: null },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        specialty: true,
        qualifications: true,
        yearsExperience: true,
        isVerified: true,
        verifiedAt: true,
        phoneNumber: true,
        registrationNumber: true,
        onboardingCompletedAt: true,
        user: { select: { isActive: true, email: true } },
        availability: {
          select: { dayOfWeek: true, startTime: true, endTime: true, isActive: true },
        },
      },
      orderBy: [{ lastName: 'asc' }],
    });
  },

  /** Confirms this doctor row actually belongs to this hospital before any
   *  write — the same 404-not-403 scoping discipline as
   *  careRelationship.service.ts. */
  async findDoctorInHospital(hospitalId: string, doctorId: string) {
    return prisma.doctorProfile.findFirst({
      where: { id: doctorId, hospitalId, deletedAt: null },
      select: { id: true, userId: true },
    });
  },

  async verifyDoctor(doctorId: string, adminUserId: string) {
    return prisma.doctorProfile.update({
      where: { id: doctorId },
      data: { isVerified: true, verifiedAt: new Date(), verifiedByUserId: adminUserId },
    });
  },

  async setDoctorUserActive(doctorUserId: string, isActive: boolean) {
    return prisma.user.update({ where: { id: doctorUserId }, data: { isActive } });
  },

  async listPatientsByHospital(hospitalId: string) {
    const [careTeamRows, appointmentRows] = await Promise.all([
      prisma.careTeamMember.findMany({
        where: { activeTo: null, doctor: { hospitalId } },
        select: {
          patient: { select: { id: true, firstName: true, lastName: true } },
          doctor: { select: { firstName: true, lastName: true } },
          activeFrom: true,
        },
      }),
      prisma.appointment.findMany({
        where: { doctor: { hospitalId } },
        select: {
          patient: { select: { id: true, firstName: true, lastName: true } },
          doctor: { select: { firstName: true, lastName: true } },
          scheduledAt: true,
        },
        orderBy: { scheduledAt: 'desc' },
        take: 1000,
      }),
    ]);

    type Row = { id: string; name: string; doctorName: string; lastActivity: Date };
    const byPatient = new Map<string, Row>();

    for (const row of careTeamRows) {
      const existing = byPatient.get(row.patient.id);
      if (existing === undefined || row.activeFrom > existing.lastActivity) {
        byPatient.set(row.patient.id, {
          id: row.patient.id,
          name: `${row.patient.firstName} ${row.patient.lastName}`.trim(),
          doctorName: `Dr. ${row.doctor.firstName} ${row.doctor.lastName}`.trim(),
          lastActivity: row.activeFrom,
        });
      }
    }
    for (const row of appointmentRows) {
      if (row.doctor === null) continue;
      const existing = byPatient.get(row.patient.id);
      if (existing === undefined || row.scheduledAt > existing.lastActivity) {
        byPatient.set(row.patient.id, {
          id: row.patient.id,
          name: `${row.patient.firstName} ${row.patient.lastName}`.trim(),
          doctorName: `Dr. ${row.doctor.firstName} ${row.doctor.lastName}`.trim(),
          lastActivity: row.scheduledAt,
        });
      }
    }

    return Array.from(byPatient.values()).sort(
      (a, b) => b.lastActivity.getTime() - a.lastActivity.getTime(),
    );
  },

  /**
   * Care-team memberships for one patient, restricted to doctors at this
   * hospital. The hospital filter is what keeps an admin from reading (or
   * later ending) a membership belonging to another facility's clinician.
   */
  async listCareTeamForPatient(hospitalId: string, patientId: string) {
    return prisma.careTeamMember.findMany({
      where: { patientId, activeTo: null, doctor: { hospitalId } },
      select: {
        id: true,
        careRole: true,
        isPrimary: true,
        activeFrom: true,
        doctor: { select: { id: true, firstName: true, lastName: true, specialty: true } },
      },
      orderBy: { activeFrom: 'desc' },
    });
  },

  async findActiveCareTeamMember(patientId: string, doctorId: string, careRole: string) {
    return prisma.careTeamMember.findFirst({
      where: { patientId, doctorId, careRole },
      select: { id: true, activeTo: true },
    });
  },

  async assignCareTeamMember(data: {
    patientId: string;
    doctorId: string;
    careRole: string;
    isPrimary: boolean;
  }) {
    // The composite unique is (patientId, doctorId, careRole), so an upsert
    // also revives a membership that was previously ended rather than
    // colliding with its row.
    return prisma.careTeamMember.upsert({
      where: {
        patientId_doctorId_careRole: {
          patientId: data.patientId,
          doctorId: data.doctorId,
          careRole: data.careRole,
        },
      },
      update: { isPrimary: data.isPrimary, activeTo: null, activeFrom: new Date() },
      create: { ...data, activeFrom: new Date() },
      select: { id: true },
    });
  },

  /** Ending a membership is a soft close — the row stays for the audit trail
   *  and for any history that referenced it. Scoped by hospital so an admin
   *  cannot end another facility's assignment. */
  async endCareTeamMember(hospitalId: string, membershipId: string): Promise<boolean> {
    const { count } = await prisma.careTeamMember.updateMany({
      where: { id: membershipId, activeTo: null, doctor: { hospitalId } },
      data: { activeTo: new Date() },
    });
    return count > 0;
  },

  /** True when this patient has any link to the hospital at all — a care-team
   *  row or an appointment with one of its doctors. */
  async patientBelongsToHospital(hospitalId: string, patientId: string): Promise<boolean> {
    const [careTeam, appointment] = await Promise.all([
      prisma.careTeamMember.findFirst({
        where: { patientId, doctor: { hospitalId } },
        select: { id: true },
      }),
      prisma.appointment.findFirst({
        where: { patientId, doctor: { hospitalId } },
        select: { id: true },
      }),
    ]);
    return careTeam !== null || appointment !== null;
  },

  async listAppointmentsByHospital(hospitalId: string, take = 200) {
    return prisma.appointment.findMany({
      // ⚠️ Includes unassigned requests from this hospital's patients — see
      // appointmentApproval.ts; without them "no preference" requests would
      // be visible to no administrator anywhere.
      where: hospitalScopeWhere(hospitalId),
      select: {
        id: true,
        scheduledAt: true,
        durationMins: true,
        status: true,
        mode: true,
        doctorId: true,
        doctor: { select: { firstName: true, lastName: true } },
        patient: { select: { firstName: true, lastName: true } },
      },
      orderBy: { scheduledAt: 'desc' },
      take,
    });
  },

  async countDoctors(hospitalId: string): Promise<number> {
    return prisma.doctorProfile.count({ where: { hospitalId, deletedAt: null } });
  },

  async appointmentCountsByStatus(hospitalId: string) {
    return prisma.appointment.groupBy({
      by: ['status'],
      where: { doctor: { hospitalId } },
      _count: { _all: true },
    });
  },

  async appointmentsSince(hospitalId: string, since: Date) {
    return prisma.appointment.findMany({
      where: { doctor: { hospitalId }, scheduledAt: { gte: since } },
      select: { scheduledAt: true },
    });
  },

  async listFeedbackByHospital(hospitalId: string) {
    return prisma.feedback.findMany({
      where: { doctor: { hospitalId } },
      select: {
        id: true,
        rating: true,
        category: true,
        comment: true,
        createdAt: true,
        doctor: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  },
};
