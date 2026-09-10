import { AppointmentMode, AppointmentStatus, NotificationType } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { auditService, AuditAction, AuditSeverity } from '../services/audit.service';
import { notificationService } from '../notification/notification.service';
import {
  appointmentRepository,
  type AppointmentWithDoctor,
} from './appointment.repository';
import type {
  CreateAppointmentDto,
  CancelAppointmentDto,
  ListAppointmentsDto,
} from './appointment.validator';

// ─────────────────────────────────────────────────────────────────────────────
// Appointment Service
//
// Every method resolves the caller's OWN patient profile first and scopes all
// work to it. No method accepts a patient id from the client, so one patient
// can never read or change another's appointment regardless of what id they
// put in the URL.
// ─────────────────────────────────────────────────────────────────────────────

type Meta = { ipAddress?: string; userAgent?: string };

/** Human labels so the client never has to translate an enum. */
const MODE_LABEL: Record<AppointmentMode, string> = {
  [AppointmentMode.InPerson]: 'In person',
  [AppointmentMode.Video]: 'Video consultation',
  [AppointmentMode.Phone]: 'Phone call',
};

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  [AppointmentStatus.Requested]: 'Awaiting confirmation',
  [AppointmentStatus.Confirmed]: 'Confirmed',
  [AppointmentStatus.Completed]: 'Completed',
  [AppointmentStatus.Cancelled]: 'Cancelled',
  [AppointmentStatus.NoShow]: 'Missed',
};

function toResponseShape(a: AppointmentWithDoctor) {
  const isPast = a.scheduledAt.getTime() < Date.now();
  const isOpen =
    a.status === AppointmentStatus.Requested || a.status === AppointmentStatus.Confirmed;

  return {
    id: a.id,
    scheduledAt: a.scheduledAt,
    durationMins: a.durationMins,

    mode: a.mode,
    modeLabel: MODE_LABEL[a.mode],
    status: a.status,
    statusLabel: STATUS_LABEL[a.status],

    reason: a.reason,
    locationName: a.locationName,

    doctor: a.doctor
      ? {
          id: a.doctor.id,
          name: `Dr. ${a.doctor.firstName} ${a.doctor.lastName}`.trim(),
          specialty: a.doctor.specialty,
          hospitalName: a.doctor.hospitalName,
        }
      : null,

    /**
     * Derived server-side so the client never has to re-implement the rule —
     * and so a client that gets it wrong still cannot cancel a past visit.
     */
    canCancel: isOpen && !isPast,

    /**
     * Video appointments have no joining link because no video provider is
     * integrated. Stated explicitly so the UI renders an honest "not yet
     * available" state instead of a button that does nothing.
     */
    joinUrl: null as string | null,
    isVideo: a.mode === AppointmentMode.Video,

    cancelledAt: a.cancelledAt,
    cancelReason: a.cancelReason,
    createdAt: a.createdAt,
  };
}

export type AppointmentResponse = ReturnType<typeof toResponseShape>;

/** Resolves the caller's patient profile or throws the standard 404. */
async function requireOwnPatientId(userId: string): Promise<string> {
  const patientId = await appointmentRepository.findPatientProfileIdByUserId(userId);
  if (patientId === null) {
    throw new AppError('Patient profile not found.', 404);
  }
  return patientId;
}

function formatWhen(date: Date): string {
  // Asia/Kolkata: this is an India-deployed product, and a patient reading
  // "3:30 PM" must see their own clock, not the server's.
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

export const appointmentService = {
  async list(userId: string, dto: ListAppointmentsDto): Promise<AppointmentResponse[]> {
    const patientId = await requireOwnPatientId(userId);
    const rows = await appointmentRepository.listForPatient(patientId, dto.scope);
    return rows.map(toResponseShape);
  },

  async getById(userId: string, id: string): Promise<AppointmentResponse> {
    const patientId = await requireOwnPatientId(userId);
    const row = await appointmentRepository.findByIdForPatient(id, patientId);

    if (row === null) {
      // 404 rather than 403 even when the row exists but belongs to someone
      // else — a 403 would confirm the id is real and allow enumeration.
      throw new AppError('Appointment not found.', 404);
    }
    return toResponseShape(row);
  },

  async create(
    userId: string,
    dto: CreateAppointmentDto,
    meta: Meta,
  ): Promise<AppointmentResponse> {
    const patientId = await requireOwnPatientId(userId);

    if (dto.doctorId) {
      const exists = await appointmentRepository.doctorExists(dto.doctorId);
      if (!exists) {
        throw new AppError('The selected clinician is not available.', 400);
      }
    }

    const created = await appointmentRepository.create({
      patientId,
      doctorId: dto.doctorId ?? null,
      scheduledAt: new Date(dto.scheduledAt),
      mode: dto.mode,
      reason: dto.reason,
    });

    auditService.log({
      action: AuditAction.ProfileUpdated,
      userId,
      severity: AuditSeverity.Info,
      resource: 'appointment',
      resourceId: created.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      // Never the reason text — that is PHI.
      metadata: { operation: 'appointment_requested', mode: dto.mode },
    });

    notificationService.notify({
      userId,
      type: NotificationType.Appointment,
      title: 'Appointment requested',
      body: `We have received your request for ${formatWhen(created.scheduledAt)}. Your care team will confirm it shortly.`,
      actionUrl: '/app/appointments',
    });

    return toResponseShape(created);
  },

  async cancel(
    userId: string,
    id: string,
    dto: CancelAppointmentDto,
    meta: Meta,
  ): Promise<AppointmentResponse> {
    const patientId = await requireOwnPatientId(userId);

    const existing = await appointmentRepository.findByIdForPatient(id, patientId);
    if (existing === null) {
      throw new AppError('Appointment not found.', 404);
    }

    if (existing.scheduledAt.getTime() < Date.now()) {
      throw new AppError('This appointment has already taken place and cannot be cancelled.', 409);
    }

    const count = await appointmentRepository.cancelForPatient(
      id,
      patientId,
      userId,
      dto.cancelReason ?? null,
    );

    if (count === 0) {
      // The row exists and is in the future, so the only remaining reason is
      // that it is already cancelled or completed.
      throw new AppError('This appointment can no longer be cancelled.', 409);
    }

    auditService.log({
      action: AuditAction.ProfileUpdated,
      userId,
      severity: AuditSeverity.Info,
      resource: 'appointment',
      resourceId: id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { operation: 'appointment_cancelled' },
    });

    notificationService.notify({
      userId,
      type: NotificationType.Appointment,
      title: 'Appointment cancelled',
      body: `Your appointment on ${formatWhen(existing.scheduledAt)} has been cancelled.`,
      actionUrl: '/app/appointments',
    });

    const updated = await appointmentRepository.findByIdForPatient(id, patientId);
    return toResponseShape(updated!);
  },
};
