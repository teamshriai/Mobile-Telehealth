import { AppointmentMode, AppointmentStatus, NotificationType, Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { schedulingService } from '../scheduling/scheduling.service';
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
  RescheduleAppointmentDto,
} from './appointment.validator';
import { canReschedule } from '../scheduling/scheduling';

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
    /** Same rule the reschedule endpoint enforces: open and in the future.
     *  With a named doctor the new time must be one of their free slots;
     *  without one it is a new preferred time for the hospital to arrange. */
    canReschedule: isOpen && !isPast,

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
    // One query in the normal case: the ownership predicate lives in the
    // query's own join rather than in a preceding profile lookup.
    const rows = await appointmentRepository.listForUser(userId, dto.scope);

    // An empty result is ambiguous — no appointments, or no patient profile at
    // all — and those must not answer the same way. Only that rare case pays
    // for the second query, and only to preserve the 404.
    if (rows.length === 0) {
      await requireOwnPatientId(userId);
    }

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

    const scheduledAt = new Date(dto.scheduledAt);

    if (dto.doctorId) {
      const exists = await appointmentRepository.doctorExists(dto.doctorId);
      if (!exists) {
        throw new AppError('The selected clinician is not available.', 400);
      }

      // The request must land on a slot the clinician actually published and
      // that is still free. Until now scheduledAt was a completely free
      // date+time: nothing checked availability, nothing checked leave, and
      // nothing stopped two patients requesting the same instant. Validating
      // against the same generator the doctor's own calendar uses is what
      // makes the two sides agree about what is bookable.
      const free = await schedulingService.isPublishedSlot(dto.doctorId, scheduledAt);
      if (!free) {
        throw new AppError(
          'That time is not available. Please choose one of the offered slots.',
          409,
        );
      }
    }

    let created;
    try {
      created = await appointmentRepository.create({
        patientId,
        doctorId: dto.doctorId ?? null,
        scheduledAt,
        mode: dto.mode,
        reason: dto.reason,
      });
    } catch (err) {
      // The partial unique index on (doctor_id, scheduled_at) is the backstop
      // for two requests that both passed the check above concurrently.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppError('That time was just taken. Please choose another slot.', 409);
      }
      throw err;
    }

    auditService.log({
      action: AuditAction.AppointmentCreated,
      userId,
      severity: AuditSeverity.Info,
      resource: 'appointment',
      resourceId: created.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      // Never the reason text — that is PHI.
      metadata: { mode: dto.mode, bookedBy: 'patient' },
    });

    notificationService.notify({
      userId,
      type: NotificationType.Appointment,
      title: 'Appointment requested',
      body: `We have received your request for ${formatWhen(created.scheduledAt)}. The hospital will confirm it once they have checked the doctor's availability.`,
      actionUrl: '/app/appointments',
    });

    return toResponseShape(created);
  },

  /**
   * The patient moves their own appointment to another PUBLISHED, free slot.
   *
   * ⚠️ Only an appointment with a named clinician can move: without one there
   * is no diary to validate against, and "any time you like" is not a slot.
   * The new instant must be a slot the clinician published and nobody holds —
   * `isPublishedSlot`, the same check booking uses — with the partial unique
   * index as the backstop for a concurrent booking.
   */
  async reschedule(
    userId: string,
    id: string,
    dto: RescheduleAppointmentDto,
    meta: Meta,
  ): Promise<AppointmentResponse> {
    const patientId = await requireOwnPatientId(userId);
    const existing = await appointmentRepository.findByIdForPatient(id, patientId);
    if (existing === null) {
      throw new AppError('Appointment not found.', 404);
    }
    if (!canReschedule(existing.status)) {
      throw new AppError(`A ${existing.status.toLowerCase()} appointment cannot be moved.`, 409);
    }
    if (existing.scheduledAt.getTime() < Date.now()) {
      throw new AppError('This appointment has already taken place and cannot be moved.', 409);
    }
    const scheduledAt = new Date(dto.scheduledAt);
    if (scheduledAt.getTime() === existing.scheduledAt.getTime()) {
      throw new AppError('That is already the time of this appointment.', 400);
    }
    // With a named doctor, only one of their published, free slots. Without
    // one, the new time is a preference the hospital arranges on approval —
    // the same rule as a "no preference" booking.
    if (existing.doctorId !== null) {
      const free = await schedulingService.isPublishedSlot(existing.doctorId, scheduledAt);
      if (!free) {
        throw new AppError('That time is not available. Please choose one of the offered slots.', 409);
      }
    }

    let count: number;
    try {
      count = await appointmentRepository.rescheduleForPatient(id, patientId, scheduledAt);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppError('That time was just taken. Please choose another slot.', 409);
      }
      throw err;
    }
    if (count === 0) {
      throw new AppError('This appointment can no longer be moved.', 409);
    }

    auditService.log({
      action: AuditAction.AppointmentRescheduled,
      userId,
      severity: AuditSeverity.Info,
      resource: 'appointment',
      resourceId: id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: {
        from: existing.scheduledAt.toISOString(),
        to: scheduledAt.toISOString(),
        rescheduledBy: 'patient',
      },
    });

    notificationService.notify({
      userId,
      type: NotificationType.Appointment,
      title: 'Appointment moved',
      body: `Your appointment is now requested for ${formatWhen(scheduledAt)}. The hospital will confirm the new time once they have checked the doctor's availability.`,
      actionUrl: '/app/appointments',
    });

    // ⚠️ No patient name in the clinician's notification: titles and bodies
    // are stored in plaintext and may be emailed. The diary shows who.
    const doctorUserId =
      existing.doctorId === null ? null : await appointmentRepository.doctorUserId(existing.doctorId);
    if (doctorUserId !== null) {
      notificationService.notify({
        userId: doctorUserId,
        type: NotificationType.Appointment,
        title: 'A patient moved their appointment',
        body: `An appointment was moved from ${formatWhen(existing.scheduledAt)} to ${formatWhen(scheduledAt)} and needs confirming.`,
        actionUrl: '/clinician',
      });
    }

    const updated = await appointmentRepository.findByIdForPatient(id, patientId);
    return toResponseShape(updated!);
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
      action: AuditAction.AppointmentCancelled,
      userId,
      severity: AuditSeverity.Info,
      resource: 'appointment',
      resourceId: id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { cancelledBy: 'patient' },
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
