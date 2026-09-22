import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

// ─────────────────────────────────────────────────────────────────────────────
// Staff Profile Repository — self-service (own profile only).
//
// StaffProfile is shared by Admin/HealthcareWorker/LabTechnician/HospitalAdmin
// (see the schema's own comment on the model); only HospitalAdmin actually
// self-registers and onboards through this path today.
// ─────────────────────────────────────────────────────────────────────────────

const WITH_HOSPITAL = { hospital: true } satisfies Prisma.StaffProfileInclude;

export type StaffProfileWithHospital = Prisma.StaffProfileGetPayload<{
  include: typeof WITH_HOSPITAL;
}>;

export const staffProfileRepository = {
  async findByUserId(userId: string): Promise<StaffProfileWithHospital | null> {
    return prisma.staffProfile.findFirst({
      where: { userId, deletedAt: null },
      include: WITH_HOSPITAL,
    });
  },

  async updateByUserId(
    userId: string,
    data: Prisma.StaffProfileUpdateInput,
  ): Promise<StaffProfileWithHospital> {
    return prisma.staffProfile.update({
      where: { userId },
      data,
      include: WITH_HOSPITAL,
    });
  },

  async markOnboardingComplete(userId: string): Promise<void> {
    await prisma.staffProfile.update({
      where: { userId },
      data: { onboardingCompletedAt: new Date() },
    });
  },

  /**
   * Creates a Hospital and links the caller's own StaffProfile to it in one
   * transaction — the "create a new hospital" onboarding branch, as opposed
   * to picking an existing one from GET /api/v1/hospitals.
   */
  async createHospitalAndJoin(
    userId: string,
    data: { name: string; city?: string; state?: string },
  ): Promise<StaffProfileWithHospital> {
    return prisma.$transaction(async (tx) => {
      const hospital = await tx.hospital.create({ data });
      return tx.staffProfile.update({
        where: { userId },
        data: { hospitalId: hospital.id },
        include: WITH_HOSPITAL,
      });
    });
  },
};
