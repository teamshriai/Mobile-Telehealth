import { AppError } from '../middleware/errorHandler';
import { auditService, AuditAction, AuditSeverity } from '../services/audit.service';
import { doctorAvailabilityRepository } from './doctorAvailability.repository';
import type { UpsertAvailabilityDto, CreateLeaveDto } from './doctorAvailability.validator';

async function requireOwnDoctorProfileId(userId: string): Promise<string> {
  const id = await doctorAvailabilityRepository.findDoctorProfileIdByUserId(userId);
  if (id === null) {
    throw new AppError('Doctor profile not found.', 404);
  }
  return id;
}

export const doctorAvailabilityService = {
  async list(userId: string) {
    const doctorId = await requireOwnDoctorProfileId(userId);
    const [slots, leaves] = await Promise.all([
      doctorAvailabilityRepository.listByDoctorId(doctorId),
      doctorAvailabilityRepository.listLeaves(doctorId),
    ]);
    return { slots, leaves };
  },

  async addSlot(
    userId: string,
    dto: UpsertAvailabilityDto,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    const doctorId = await requireOwnDoctorProfileId(userId);
    const slot = await doctorAvailabilityRepository.create(doctorId, dto);

    auditService.log({
      action: AuditAction.DoctorAvailabilityUpdated,
      userId,
      severity: AuditSeverity.Info,
      resource: 'doctor_availability',
      resourceId: slot.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return slot;
  },

  async removeSlot(userId: string, slotId: string): Promise<void> {
    const doctorId = await requireOwnDoctorProfileId(userId);
    const removed = await doctorAvailabilityRepository.remove(doctorId, slotId);
    if (!removed) {
      throw new AppError('Availability slot not found.', 404);
    }
  },

  /** Pause or resume a recurring slot without deleting it — a doctor who is
   *  away for a month should not have to re-enter their whole week after. */
  async setSlotActive(
    userId: string,
    slotId: string,
    isActive: boolean,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    const doctorId = await requireOwnDoctorProfileId(userId);
    const updated = await doctorAvailabilityRepository.setActive(doctorId, slotId, isActive);
    if (!updated) {
      throw new AppError('Availability slot not found.', 404);
    }

    auditService.log({
      action: AuditAction.DoctorAvailabilityUpdated,
      userId,
      severity: AuditSeverity.Info,
      resource: 'doctor_availability',
      resourceId: slotId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { isActive },
    });
  },

  async addLeave(
    userId: string,
    dto: CreateLeaveDto,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    const doctorId = await requireOwnDoctorProfileId(userId);
    const leave = await doctorAvailabilityRepository.createLeave(doctorId, {
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      reason: dto.reason,
    });

    auditService.log({
      action: AuditAction.DoctorAvailabilityUpdated,
      userId,
      severity: AuditSeverity.Info,
      resource: 'doctor_leave',
      resourceId: leave.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return leave;
  },

  async removeLeave(userId: string, leaveId: string): Promise<void> {
    const doctorId = await requireOwnDoctorProfileId(userId);
    const removed = await doctorAvailabilityRepository.removeLeave(doctorId, leaveId);
    if (!removed) {
      throw new AppError('Leave period not found.', 404);
    }
  },
};
