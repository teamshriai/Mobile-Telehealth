import type { FeedbackCategory, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const feedbackRepository = {
  async findPatientProfileIdByUserId(userId: string): Promise<string | null> {
    const profile = await prisma.patientProfile.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true },
    });
    return profile?.id ?? null;
  },

  /**
   * Ownership check — never trust a client-supplied appointmentId without
   * confirming it is really this patient's own, same discipline as every
   * other row-level check in this codebase (see careRelationship.service.ts).
   */
  async appointmentBelongsToPatient(appointmentId: string, patientId: string): Promise<boolean> {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, patientId },
      select: { id: true },
    });
    return appointment !== null;
  },

  async create(data: {
    patientId: string;
    doctorId?: string;
    appointmentId?: string;
    category: FeedbackCategory;
    rating: number;
    comment: string | null;
  }) {
    return prisma.feedback.create({ data: data satisfies Prisma.FeedbackUncheckedCreateInput });
  },
};
