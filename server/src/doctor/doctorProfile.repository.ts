import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

// ─────────────────────────────────────────────────────────────────────────────
// Doctor Profile Repository — self-service (own profile only)
//
// Distinct from doctor.repository.ts, which is the PATIENT-facing bookable
// directory (read-only, narrow projection, verified-only). This is the
// doctor's own full view of their own row, always scoped by userId.
// ─────────────────────────────────────────────────────────────────────────────

const WITH_HOSPITAL = { hospital: true } satisfies Prisma.DoctorProfileInclude;

export type DoctorProfileWithHospital = Prisma.DoctorProfileGetPayload<{
  include: typeof WITH_HOSPITAL;
}>;

export const doctorProfileRepository = {
  async findByUserId(userId: string): Promise<DoctorProfileWithHospital | null> {
    return prisma.doctorProfile.findFirst({
      where: { userId, deletedAt: null },
      include: WITH_HOSPITAL,
    });
  },

  async updateByUserId(
    userId: string,
    data: Prisma.DoctorProfileUpdateInput,
  ): Promise<DoctorProfileWithHospital> {
    return prisma.doctorProfile.update({
      where: { userId },
      data,
      include: WITH_HOSPITAL,
    });
  },

  async markOnboardingComplete(userId: string): Promise<void> {
    await prisma.doctorProfile.update({
      where: { userId },
      data: { onboardingCompletedAt: new Date() },
    });
  },
};
