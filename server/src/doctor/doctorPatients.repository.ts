import { prisma } from '../lib/prisma';

// ─────────────────────────────────────────────────────────────────────────────
// Doctor's own assigned-patients summary — read-only, minimal projection.
//
// Deliberately NOT the same access path as
// careRelationship.service.requirePatientAccess, which gates full clinical
// record access. This is a doctor's own "who is on my active care team"
// list — name, care role, and last appointment only. No clinical detail.
// ─────────────────────────────────────────────────────────────────────────────

export const doctorPatientsRepository = {
  async findDoctorProfileIdByUserId(userId: string): Promise<string | null> {
    const profile = await prisma.doctorProfile.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true },
    });
    return profile?.id ?? null;
  },

  async listActiveCareTeamPatients(doctorId: string) {
    return prisma.careTeamMember.findMany({
      where: { doctorId, activeTo: null },
      select: {
        careRole: true,
        isPrimary: true,
        activeFrom: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            // Scoped to the viewing doctor. Unscoped, "Last visit" showed the
            // patient's most recent appointment with ANY clinician, so a
            // doctor could read a date they were never part of as their own.
            appointments: {
              where: { doctorId },
              orderBy: { scheduledAt: 'desc' },
              take: 1,
              select: { scheduledAt: true, status: true },
            },
          },
        },
      },
      orderBy: { activeFrom: 'desc' },
    });
  },
};
