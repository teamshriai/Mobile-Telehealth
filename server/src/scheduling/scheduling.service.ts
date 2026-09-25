import { AppointmentStatus, Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { auditService, AuditAction, AuditSeverity } from '../services/audit.service';
import { careRelationshipService } from '../services/careRelationship.service';
import { schedulingRepository } from './scheduling.repository';
import {
  generateSlotsForDate,
  instantToClinicLocal,
  canTransition,
  canReschedule,
  intervalsOverlap,
} from './scheduling';

// ─────────────────────────────────────────────────────────────────────────────
// Scheduling service — slot lookup and the doctor-side appointment writes.
//
// Permission.AppointmentManageAssigned has been granted to Doctor since the
// hospital-admin phase but was wired to nothing; these are its first users.
//
// ⚠️ DOUBLE-BOOKING IS GUARDED TWICE, ON PURPOSE.
// This service checks for an overlap before writing, which produces a clear
// message. That check alone loses a concurrent race — two requests can both
// read "free" before either writes — so the database also carries a partial
// unique index on (doctor_id, scheduled_at) excluding cancelled rows. The
// service check is for humans; the index is what makes the collision
// impossible. P2002 from that index is caught below and reported as a clash
// rather than a 500.
// ─────────────────────────────────────────────────────────────────────────────

type Meta = { ipAddress?: string; userAgent?: string };
type Actor = { id: string; roleName: string };

/** How far either side of a candidate time to look for a colliding booking.
 *  Longer than any plausible single appointment, so a long one starting
 *  earlier is still found. */
const OVERLAP_SEARCH_PADDING_MINUTES = 240;

const MAX_RANGE_DAYS = 62;

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

async function requireOwnDoctorId(userId: string): Promise<string> {
  const id = await schedulingRepository.findDoctorProfileIdByUserId(userId);
  if (id === null) throw new AppError('Doctor profile not found.', 404);
  return id;
}

/** Days from `from` to `to` inclusive, as clinic-local ISO date strings. */
function datesBetween(from: Date, to: Date): string[] {
  const out: string[] = [];
  const cursor = new Date(instantToClinicLocal(from).isoDate);
  const last = instantToClinicLocal(to).isoDate;
  for (let i = 0; i < MAX_RANGE_DAYS; i++) {
    const iso = cursor.toISOString().slice(0, 10);
    out.push(iso);
    if (iso >= last) break;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

export const schedulingService = {
  /**
   * Free slots for a doctor across a date range.
   *
   * Used by the doctor's own calendar AND by the patient booking flow, which
   * is the point — one generator means the two sides cannot disagree about
   * what is bookable. Not access-gated on the patient side beyond
   * authentication: a doctor's published availability is what a patient is
   * meant to see in order to book, and it carries no patient data.
   */
  async listSlots(doctorId: string, from: Date, to: Date, now: Date = new Date()) {
    const exists = await schedulingRepository.doctorExists(doctorId);
    if (!exists) throw new AppError('Clinician not found.', 404);

    const [availability, leaves, booked] = await Promise.all([
      schedulingRepository.listAvailability(doctorId),
      schedulingRepository.listLeaves(doctorId, from, to),
      schedulingRepository.listBlocking(doctorId, from, to),
    ]);

    return datesBetween(from, to).map((isoDate) => ({
      date: isoDate,
      slots: generateSlotsForDate({ isoDate, availability, leaves, booked, now }),
    }));
  },

  async listOwnSlots(userId: string, from: Date, to: Date) {
    const doctorId = await requireOwnDoctorId(userId);
    return schedulingService.listSlots(doctorId, from, to);
  },

  /**
   * Refuses when the requested time collides with something already in the
   * diary. Shared by create and reschedule so the two cannot drift.
   */
  async assertSlotFree(
    doctorId: string,
    scheduledAt: Date,
    durationMins: number,
    excludeAppointmentId?: string,
  ): Promise<void> {
    const nearby = await schedulingRepository.listBlockingAround(
      doctorId,
      scheduledAt,
      OVERLAP_SEARCH_PADDING_MINUTES,
      excludeAppointmentId,
    );
    const clash = nearby.find((b) =>
      intervalsOverlap(scheduledAt.getTime(), durationMins, b.scheduledAt.getTime(), b.durationMins),
    );
    if (clash !== undefined) {
      throw new AppError('That time is no longer free. Please choose another slot.', 409);
    }
  },

  /**
   * Can this doctor take this appointment? Used when a hospital administrator
   * APPROVES a patient's request.
   *
   * Two questions, answered separately so the administrator is told which:
   *  1. Is the time inside the doctor's published working hours and not on
   *     leave? (A free-text "no preference" request need not sit on a slot
   *     boundary, so this checks the whole interval fits a working window.)
   *  2. Does it overlap a CONFIRMED appointment? Other pending requests do not
   *     block — whichever is approved first takes the time.
   */
  async checkAvailability(
    doctorId: string,
    scheduledAt: Date,
    durationMins: number,
    excludeAppointmentId: string,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    const { isoDate } = instantToClinicLocal(scheduledAt);
    const dayStart = new Date(scheduledAt);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 2);
    const [availability, leaves] = await Promise.all([
      schedulingRepository.listAvailability(doctorId),
      schedulingRepository.listLeaves(doctorId, dayStart, dayEnd),
    ]);
    // Slots as if the diary were empty: what the doctor's hours ALLOW.
    const workingSlots = generateSlotsForDate({ isoDate, availability, leaves, booked: [] });
    const start = scheduledAt.getTime();
    const end = start + durationMins * 60_000;
    const inHours = workingSlots.some((s, i) => {
      if (start < s.startsAt.getTime()) return false;
      // Walk forward over contiguous slots until the interval is covered.
      let coveredUntil = s.startsAt.getTime() + s.durationMins * 60_000;
      for (let j = i + 1; coveredUntil < end && j < workingSlots.length; j++) {
        if (workingSlots[j].startsAt.getTime() !== coveredUntil) break;
        coveredUntil += workingSlots[j].durationMins * 60_000;
      }
      return start < s.startsAt.getTime() + s.durationMins * 60_000 && coveredUntil >= end;
    });
    if (!inHours) {
      return { ok: false, reason: 'The doctor is not working at that time (outside their hours or on leave).' };
    }
    const nearby = await schedulingRepository.listConfirmedAround(
      doctorId, scheduledAt, OVERLAP_SEARCH_PADDING_MINUTES, excludeAppointmentId,
    );
    const clash = nearby.find((b) =>
      intervalsOverlap(start, durationMins, b.scheduledAt.getTime(), b.durationMins),
    );
    if (clash !== undefined) {
      return { ok: false, reason: 'The doctor already has a confirmed appointment at that time.' };
    }
    return { ok: true };
  },

  /** True when the instant is the start of a published, still-free slot. */
  async isPublishedSlot(doctorId: string, scheduledAt: Date): Promise<boolean> {
    const { isoDate } = instantToClinicLocal(scheduledAt);
    const dayStart = new Date(scheduledAt);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 2);

    const [availability, leaves, booked] = await Promise.all([
      schedulingRepository.listAvailability(doctorId),
      schedulingRepository.listLeaves(doctorId, dayStart, dayEnd),
      schedulingRepository.listBlocking(doctorId, dayStart, dayEnd),
    ]);

    const slots = generateSlotsForDate({ isoDate, availability, leaves, booked });
    return slots.some((s) => s.startsAt.getTime() === scheduledAt.getTime());
  },

  /** Doctor books a patient in. */
  async createForPatient(
    actor: Actor,
    dto: {
      patientId: string;
      scheduledAt: string;
      durationMins?: number;
      mode: 'InPerson' | 'Video' | 'Phone';
      reason?: string | null;
      locationName?: string | null;
    },
    meta: Meta,
  ) {
    const doctorId = await requireOwnDoctorId(actor.id);
    // The doctor must already have a relationship with this patient — booking
    // is not a way to acquire one.
    await careRelationshipService.requirePatientAccess(actor, dto.patientId, meta);

    const scheduledAt = new Date(dto.scheduledAt);
    const durationMins = dto.durationMins ?? 30;
    await schedulingService.assertSlotFree(doctorId, scheduledAt, durationMins);

    let created;
    try {
      created = await schedulingRepository.create({
        patientId: dto.patientId,
        doctorId,
        scheduledAt,
        durationMins,
        mode: dto.mode,
        // A doctor booking their own diary is confirmed by definition —
        // Requested exists for a patient asking to be seen.
        status: AppointmentStatus.Confirmed,
        reason: dto.reason ?? null,
        locationName: dto.locationName ?? null,
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new AppError('That time was just taken. Please choose another slot.', 409);
      }
      throw err;
    }

    auditService.log({
      action: AuditAction.AppointmentCreated,
      userId: actor.id,
      severity: AuditSeverity.Info,
      resource: 'appointment',
      resourceId: created.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      // Never the reason text — that is the patient's own words about a
      // medical concern.
      metadata: { patientId: dto.patientId, mode: dto.mode, bookedBy: 'doctor' },
    });

    return created;
  },

  async reschedule(actor: Actor, appointmentId: string, scheduledAtIso: string, meta: Meta) {
    const doctorId = await requireOwnDoctorId(actor.id);
    const existing = await schedulingRepository.findAppointment(appointmentId);
    if (existing === null || existing.doctorId !== doctorId) {
      throw new AppError('Appointment not found.', 404);
    }
    if (!canReschedule(existing.status)) {
      throw new AppError(
        `A ${existing.status.toLowerCase()} appointment cannot be rescheduled.`,
        409,
      );
    }

    const scheduledAt = new Date(scheduledAtIso);
    if (scheduledAt.getTime() <= Date.now()) {
      throw new AppError('Please choose a date and time in the future.', 400);
    }
    await schedulingService.assertSlotFree(
      doctorId,
      scheduledAt,
      existing.durationMins,
      appointmentId,
    );

    let updated;
    try {
      updated = await schedulingRepository.reschedule(appointmentId, scheduledAt);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new AppError('That time was just taken. Please choose another slot.', 409);
      }
      throw err;
    }

    auditService.log({
      action: AuditAction.AppointmentRescheduled,
      userId: actor.id,
      severity: AuditSeverity.Info,
      resource: 'appointment',
      resourceId: appointmentId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { from: existing.scheduledAt.toISOString(), to: scheduledAt.toISOString() },
    });

    return updated;
  },

  async changeStatus(
    actor: Actor,
    appointmentId: string,
    to: AppointmentStatus,
    extra: { cancelReason?: string | null; notes?: string | null },
    meta: Meta,
  ) {
    const doctorId = await requireOwnDoctorId(actor.id);
    const existing = await schedulingRepository.findAppointment(appointmentId);
    if (existing === null || existing.doctorId !== doctorId) {
      throw new AppError('Appointment not found.', 404);
    }

    // ⚠️ A patient's REQUEST is approved by the hospital administrator, after
    // checking this doctor's availability — not by the doctor, and never by
    // the patient. The doctor still records what happened (completed, no-show)
    // and may cancel.
    if (existing.status === AppointmentStatus.Requested && to === AppointmentStatus.Confirmed) {
      throw new AppError(
        'Appointment requests are approved by your hospital administrator.',
        403,
      );
    }

    if (!canTransition(existing.status, to)) {
      throw new AppError(
        `An appointment that is ${existing.status.toLowerCase()} cannot be marked ${to.toLowerCase()}.`,
        409,
      );
    }

    const updated = await schedulingRepository.setStatus(appointmentId, to, {
      cancelledByUserId: actor.id,
      cancelReason: extra.cancelReason ?? null,
      notes: extra.notes,
    });

    auditService.log({
      action:
        to === AppointmentStatus.Cancelled
          ? AuditAction.AppointmentCancelled
          : AuditAction.AppointmentStatusChanged,
      userId: actor.id,
      severity: AuditSeverity.Info,
      resource: 'appointment',
      resourceId: appointmentId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      // The reason text is deliberately absent — only the transition.
      metadata: { from: existing.status, to },
    });

    return updated;
  },
};
