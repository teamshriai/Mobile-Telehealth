import { AppError } from '../middleware/errorHandler';
import { auditService, AuditAction, AuditSeverity } from '../services/audit.service';
import { encryptFieldOptional } from '../utils/encryption';
import { feedbackRepository } from './feedback.repository';
import type { SubmitFeedbackDto } from './feedback.validator';

export const feedbackService = {
  async submit(
    userId: string,
    dto: SubmitFeedbackDto,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    const patientId = await feedbackRepository.findPatientProfileIdByUserId(userId);
    if (patientId === null) {
      throw new AppError('Patient profile not found.', 404);
    }

    if (dto.appointmentId !== undefined) {
      const owns = await feedbackRepository.appointmentBelongsToPatient(
        dto.appointmentId,
        patientId,
      );
      if (!owns) {
        throw new AppError('Appointment not found.', 404);
      }
    }

    const feedback = await feedbackRepository.create({
      patientId,
      doctorId: dto.doctorId,
      appointmentId: dto.appointmentId,
      category: dto.category,
      rating: dto.rating,
      comment: encryptFieldOptional(dto.comment) ?? null,
    });

    // Field values (the comment) are patient-authored health/service
    // commentary — logged as a category only, never the text itself, same
    // rule as every other free-text field in this audit trail.
    auditService.log({
      action: AuditAction.FeedbackSubmitted,
      userId,
      severity: AuditSeverity.Info,
      resource: 'feedback',
      resourceId: feedback.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { category: dto.category },
    });

    return { id: feedback.id, createdAt: feedback.createdAt };
  },
};
