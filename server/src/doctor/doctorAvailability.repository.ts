import { prisma } from '../lib/prisma';

// ─────────────────────────────────────────────────────────────────────────────
// Doctor Availability Repository — self-service recurring hours + leave.
//
// Deliberately NOT wired into appointment booking yet (Appointment.scheduledAt
// is still freely chosen) — see the schema comment on DoctorAvailability.
// Today this data is visible to the doctor themself and to their Hospital
// Admin (see hospitalAdmin.repository.ts).
// ─────────────────────────────────────────────────────────────────────────────

export const doctorAvailabilityRepository = {
  async findDoctorProfileIdByUserId(userId: string): Promise<string | null> {
    const profile = await prisma.doctorProfile.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true },
    });
    return profile?.id ?? null;
  },

  async listByDoctorId(doctorId: string) {
    return prisma.doctorAvailability.findMany({
      where: { doctorId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  },

  async create(
    doctorId: string,
    data: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      slotDurationMins: number;
      isActive: boolean;
    },
  ) {
    return prisma.doctorAvailability.create({ data: { doctorId, ...data } });
  },

  async remove(doctorId: string, id: string): Promise<boolean> {
    const result = await prisma.doctorAvailability.deleteMany({ where: { id, doctorId } });
    return result.count > 0;
  },

  /** updateMany, not update: the doctorId in the filter is what makes this
   *  own-scope. `update` keyed on id alone would let any doctor toggle any
   *  slot, which is the same mistake `remove` above already avoids. */
  async setActive(doctorId: string, id: string, isActive: boolean): Promise<boolean> {
    const result = await prisma.doctorAvailability.updateMany({
      where: { id, doctorId },
      data: { isActive },
    });
    return result.count > 0;
  },

  async listLeaves(doctorId: string) {
    return prisma.doctorLeave.findMany({
      where: { doctorId },
      orderBy: { startDate: 'asc' },
    });
  },

  async createLeave(doctorId: string, data: { startDate: Date; endDate: Date; reason?: string }) {
    return prisma.doctorLeave.create({ data: { doctorId, ...data } });
  },

  async removeLeave(doctorId: string, id: string): Promise<boolean> {
    const result = await prisma.doctorLeave.deleteMany({ where: { id, doctorId } });
    return result.count > 0;
  },
};
