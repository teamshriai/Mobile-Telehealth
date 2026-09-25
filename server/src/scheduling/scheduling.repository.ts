import { AppointmentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { decryptFieldOptional, encryptFieldOptional } from '../utils/encryption';

// ─────────────────────────────────────────────────────────────────────────────
// Scheduling repository — the DB half of the scheduling module.
//
// The arithmetic lives in scheduling.ts as pure functions; this file only
// fetches what that arithmetic needs and performs the writes.
//
// `reason`, `notes` and — new here — `cancelReason` are encrypted at rest.
// cancelReason was previously written in plaintext while its two siblings on
// the same table were encrypted, even though "cancelled: symptoms worsened,
// admitted" is exactly as identifying as the booking reason.
// ─────────────────────────────────────────────────────────────────────────────

/** Statuses that occupy a slot. A cancelled appointment frees its time. */
const BLOCKING_STATUSES = [
  AppointmentStatus.Requested,
  AppointmentStatus.Confirmed,
  AppointmentStatus.Completed,
  AppointmentStatus.NoShow,
] as const;

export const schedulingRepository = {
  async findDoctorProfileIdByUserId(userId: string): Promise<string | null> {
    const profile = await prisma.doctorProfile.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true },
    });
    return profile?.id ?? null;
  },

  async doctorExists(doctorId: string): Promise<boolean> {
    const found = await prisma.doctorProfile.findFirst({
      where: { id: doctorId, deletedAt: null },
      select: { id: true },
    });
    return found !== null;
  },

  async listAvailability(doctorId: string) {
    return prisma.doctorAvailability.findMany({
      where: { doctorId },
      select: {
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        slotDurationMins: true,
        isActive: true,
      },
    });
  },

  async listLeaves(doctorId: string, from: Date, to: Date) {
    return prisma.doctorLeave.findMany({
      where: { doctorId, startDate: { lte: to }, endDate: { gte: from } },
      select: { startDate: true, endDate: true },
    });
  },

  /** Everything already holding time in this doctor's diary in the window. */
  async listBlocking(doctorId: string, from: Date, to: Date) {
    return prisma.appointment.findMany({
      where: {
        doctorId,
        scheduledAt: { gte: from, lt: to },
        status: { in: [...BLOCKING_STATUSES] },
      },
      select: { id: true, scheduledAt: true, durationMins: true },
    });
  },

  /** Blocking appointments around one instant, for the overlap check. The
   *  window is widened either side so a long appointment starting before the
   *  target still shows up. */
  async listBlockingAround(doctorId: string, at: Date, paddingMinutes: number, excludeId?: string) {
    const from = new Date(at.getTime() - paddingMinutes * 60_000);
    const to = new Date(at.getTime() + paddingMinutes * 60_000);
    return prisma.appointment.findMany({
      where: {
        doctorId,
        id: excludeId ? { not: excludeId } : undefined,
        scheduledAt: { gte: from, lte: to },
        status: { in: [...BLOCKING_STATUSES] },
      },
      select: { id: true, scheduledAt: true, durationMins: true },
    });
  },

  /** CONFIRMED appointments around one instant — what an approval must not
   *  collide with. Other requests do not block: the first approved wins. */
  async listConfirmedAround(doctorId: string, at: Date, paddingMinutes: number, excludeId: string) {
    const from = new Date(at.getTime() - paddingMinutes * 60_000);
    const to = new Date(at.getTime() + paddingMinutes * 60_000);
    return prisma.appointment.findMany({
      where: {
        doctorId,
        id: { not: excludeId },
        scheduledAt: { gte: from, lte: to },
        status: AppointmentStatus.Confirmed,
      },
      select: { id: true, scheduledAt: true, durationMins: true },
    });
  },

  async findAppointment(id: string) {
    const row = await prisma.appointment.findUnique({ where: { id } });
    if (row === null) return null;
    return {
      ...row,
      reason: decryptFieldOptional(row.reason),
      notes: decryptFieldOptional(row.notes),
      cancelReason: decryptFieldOptional(row.cancelReason),
    };
  },

  async create(data: {
    patientId: string;
    doctorId: string;
    scheduledAt: Date;
    durationMins: number;
    mode: 'InPerson' | 'Video' | 'Phone';
    status: AppointmentStatus;
    reason: string | null;
    locationName: string | null;
  }) {
    return prisma.appointment.create({
      data: { ...data, reason: encryptFieldOptional(data.reason) },
      select: { id: true, scheduledAt: true, status: true },
    });
  },

  async reschedule(id: string, scheduledAt: Date) {
    return prisma.appointment.update({
      where: { id },
      data: { scheduledAt },
      select: { id: true, scheduledAt: true, status: true },
    });
  },

  async setStatus(
    id: string,
    status: AppointmentStatus,
    extra: { cancelledByUserId?: string; cancelReason?: string | null; notes?: string | null } = {},
  ) {
    return prisma.appointment.update({
      where: { id },
      data: {
        status,
        ...(status === AppointmentStatus.Cancelled
          ? {
              cancelledAt: new Date(),
              cancelledBy: extra.cancelledByUserId ?? null,
              cancelReason: encryptFieldOptional(extra.cancelReason ?? null),
            }
          : {}),
        ...(extra.notes !== undefined ? { notes: encryptFieldOptional(extra.notes) } : {}),
      },
      select: { id: true, status: true, scheduledAt: true },
    });
  },
};
