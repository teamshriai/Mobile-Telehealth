import { AppointmentStatus, NotificationType, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { auditService, AuditAction, AuditSeverity } from '../services/audit.service';
import { notificationService } from '../notification/notification.service';
import { schedulingService } from '../scheduling/scheduling.service';
import { encryptFieldOptional } from '../utils/encryption';
import { hospitalAdminRepository } from './hospitalAdmin.repository';
import { hospitalScopeWhere } from './appointmentScope';

// ─────────────────────────────────────────────────────────────────────────────
// Approving patients' appointment requests — the hospital administrator's job.
//
// ⚠️ THE WORKFLOW, STATED ONCE. A patient only ever REQUESTS (a new booking,
// or a new time for an existing one); every request lands as `Requested`.
// The hospital administrator then APPROVES it — after the server checks the
// doctor is actually working then and not already booked — or DECLINES it
// with a reason the patient is told. A doctor cannot confirm a request
// (scheduling.service refuses that transition).
//
// ⚠️ SCOPE. An administrator sees and acts on requests for doctors at their
// own hospital, plus "no preference" requests (no doctor yet) from patients
// who have an active doctor at their hospital — otherwise those would be
// visible to nobody. An unassigned request gets a doctor during approval.
// Anything out of scope is 404, never 403, so an id is not confirmed to exist.
// ─────────────────────────────────────────────────────────────────────────────

type Meta = { ipAddress?: string; userAgent?: string };

export const approveSchema = z.object({ doctorId: z.string().uuid().optional() }).strict();
export const declineSchema = z
  .object({ reason: z.string().trim().min(3, 'Please give the patient a short reason.').max(300) })
  .strict();

async function requireHospitalScope(userId: string): Promise<string> {
  const hospitalId = await hospitalAdminRepository.findHospitalIdByUserId(userId);
  if (hospitalId === null) throw new AppError('Your hospital is not set up yet.', 400);
  return hospitalId;
}

function when(d: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(d);
}

const SCOPED_INCLUDE = {
  doctor: { select: { id: true, firstName: true, lastName: true, hospitalId: true } },
  patient: { select: { userId: true } },
} satisfies Prisma.AppointmentInclude;

type ScopedAppointment = Prisma.AppointmentGetPayload<{ include: typeof SCOPED_INCLUDE }>;

async function loadInScope(hospitalId: string, id: string): Promise<ScopedAppointment> {
  const row = await prisma.appointment.findFirst({
    where: { id, ...hospitalScopeWhere(hospitalId) },
    include: SCOPED_INCLUDE,
  });
  if (row === null) throw new AppError('Appointment not found.', 404);
  return row;
}

export const appointmentApproval = {
  /** Availability for each pending, future request — shown beside Approve. */
  async availabilityFor(
    rows: Array<{
      id: string;
      status: AppointmentStatus;
      scheduledAt: Date;
      durationMins: number;
      doctorId: string | null;
    }>,
  ) {
    const out = new Map<string, { ok: boolean; reason?: string }>();
    const now = Date.now();
    for (const r of rows) {
      if (
        r.status !== AppointmentStatus.Requested ||
        r.scheduledAt.getTime() <= now ||
        r.doctorId === null
      )
        continue;
      const res = await schedulingService.checkAvailability(
        r.doctorId,
        r.scheduledAt,
        r.durationMins,
        r.id,
      );
      out.set(r.id, res.ok ? { ok: true } : { ok: false, reason: res.reason });
    }
    return out;
  },

  async approve(userId: string, id: string, dto: z.infer<typeof approveSchema>, meta: Meta) {
    const hospitalId = await requireHospitalScope(userId);
    const appt = await loadInScope(hospitalId, id);
    if (appt.status !== AppointmentStatus.Requested) {
      throw new AppError(`This appointment is already ${appt.status.toLowerCase()}.`, 409);
    }
    if (appt.scheduledAt.getTime() <= Date.now()) {
      throw new AppError(
        'This request is for a time that has passed. Decline it so the patient can choose again.',
        409,
      );
    }

    // An unassigned request needs a doctor from THIS hospital.
    let doctorId = appt.doctorId;
    if (doctorId === null) {
      if (dto.doctorId === undefined) throw new AppError('Choose a doctor for this request.', 400);
      const doctor = await prisma.doctorProfile.findFirst({
        where: { id: dto.doctorId, hospitalId, deletedAt: null },
        select: { id: true },
      });
      if (doctor === null) throw new AppError('That doctor is not at your hospital.', 400);
      doctorId = doctor.id;
    }

    const check = await schedulingService.checkAvailability(
      doctorId,
      appt.scheduledAt,
      appt.durationMins,
      appt.id,
    );
    if (!check.ok) throw new AppError(check.reason, 409);

    let count: number;
    try {
      ({ count } = await prisma.appointment.updateMany({
        where: { id, status: AppointmentStatus.Requested },
        data: { status: AppointmentStatus.Confirmed, doctorId },
      }));
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppError('The doctor already has an appointment at exactly that time.', 409);
      }
      throw err;
    }
    if (count === 0)
      throw new AppError('This request was changed meanwhile. Refresh and try again.', 409);

    const doctor = await prisma.doctorProfile.findUnique({
      where: { id: doctorId },
      select: { firstName: true, lastName: true },
    });
    auditService.log({
      action: AuditAction.AppointmentStatusChanged,
      userId,
      severity: AuditSeverity.Info,
      resource: 'appointment',
      resourceId: id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: {
        from: 'Requested',
        to: 'Confirmed',
        by: 'hospital_admin',
        assignedDoctor: appt.doctorId === null,
      },
    });
    if (appt.patient.userId !== null) {
      notificationService.notify({
        userId: appt.patient.userId,
        type: NotificationType.Appointment,
        title: 'Appointment confirmed',
        body: `Your appointment on ${when(appt.scheduledAt)}${doctor ? ` with Dr. ${doctor.firstName} ${doctor.lastName}` : ''} is confirmed.`,
        actionUrl: '/app/appointments',
      });
    }
    return { id, status: AppointmentStatus.Confirmed };
  },

  async decline(userId: string, id: string, dto: z.infer<typeof declineSchema>, meta: Meta) {
    const hospitalId = await requireHospitalScope(userId);
    const appt = await loadInScope(hospitalId, id);
    if (appt.status !== AppointmentStatus.Requested) {
      throw new AppError(`This appointment is already ${appt.status.toLowerCase()}.`, 409);
    }
    const { count } = await prisma.appointment.updateMany({
      where: { id, status: AppointmentStatus.Requested },
      data: {
        status: AppointmentStatus.Cancelled,
        cancelledAt: new Date(),
        cancelledBy: userId,
        cancelReason: encryptFieldOptional(dto.reason),
      },
    });
    if (count === 0)
      throw new AppError('This request was changed meanwhile. Refresh and try again.', 409);

    auditService.log({
      action: AuditAction.AppointmentCancelled,
      userId,
      severity: AuditSeverity.Info,
      resource: 'appointment',
      resourceId: id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      // The reason is PHI-adjacent free text — recorded on the row, not here.
      metadata: { from: 'Requested', to: 'Cancelled', by: 'hospital_admin', declined: true },
    });
    if (appt.patient.userId !== null) {
      notificationService.notify({
        userId: appt.patient.userId,
        type: NotificationType.Appointment,
        title: 'Appointment request not approved',
        body: `Your request for ${when(appt.scheduledAt)} could not be approved. Please choose another time.`,
        actionUrl: '/app/appointments',
      });
    }
    return { id, status: AppointmentStatus.Cancelled };
  },
};
