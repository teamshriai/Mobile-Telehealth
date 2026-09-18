import type { Appointment, Prisma } from '@prisma/client';
import { AppointmentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { decryptFieldOptional, encryptFieldOptional } from '../utils/encryption';

// ─────────────────────────────────────────────────────────────────────────────
// Appointment Repository
//
// The only layer that touches prisma for this domain, and the only layer that
// knows about encryption — the service works in plaintext throughout.
//
// `reason` and `notes` are free text a patient or clinician wrote about a
// medical concern, so they are PHI and encrypted at rest exactly like the
// profile's medical-summary fields. The schema comment already claimed this;
// until now no code implemented it.
// ─────────────────────────────────────────────────────────────────────────────

const ENCRYPTED_FIELDS = ['reason', 'notes'] as const;

/** Doctor columns safe to show a patient. Never registrationNumber / hprId. */
const DOCTOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  specialty: true,
  hospitalName: true,
} satisfies Prisma.DoctorProfileSelect;

export type AppointmentWithDoctor = Appointment & {
  doctor: Prisma.DoctorProfileGetPayload<{ select: typeof DOCTOR_SELECT }> | null;
};

function decryptAppointment<T extends Appointment>(row: T): T {
  const out = { ...row };
  for (const field of ENCRYPTED_FIELDS) {
    out[field] = decryptFieldOptional(row[field]) as never;
  }
  return out;
}

/** Hard ceiling on any one appointment listing. */
const MAX_LIST_ROWS = 200;

export const appointmentRepository = {
  /**
   * Resolve the caller's own patient profile id. Every other method is scoped
   * by this, which is what makes cross-patient access impossible by
   * construction — no method here accepts a patient id from the client.
   */
  async findPatientProfileIdByUserId(userId: string): Promise<string | null> {
    const profile = await prisma.patientProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    return profile?.id ?? null;
  },

  /**
   * Scoped by `patient: { userId }` rather than by a pre-resolved patient id,
   * which folds the old separate `findPatientProfileIdByUserId` round trip
   * into this query's join. The service still distinguishes "no profile" (404)
   * from "no appointments" (empty list) — see appointment.service.ts.
   */
  async listForUser(
    userId: string,
    scope: 'upcoming' | 'past' | 'all',
  ): Promise<AppointmentWithDoctor[]> {
    const now = new Date();

    // "Upcoming" excludes cancelled: a cancelled future slot is history to the
    // patient, not something they still need to attend.
    const where: Prisma.AppointmentWhereInput =
      scope === 'upcoming'
        ? {
            patient: { userId },
            scheduledAt: { gte: now },
            status: { notIn: [AppointmentStatus.Cancelled, AppointmentStatus.Completed] },
          }
        : scope === 'past'
          ? {
              patient: { userId },
              OR: [
                { scheduledAt: { lt: now } },
                { status: { in: [AppointmentStatus.Cancelled, AppointmentStatus.Completed] } },
              ],
            }
          : { patient: { userId } };

    const rows = await prisma.appointment.findMany({
      where,
      include: { doctor: { select: DOCTOR_SELECT } },
      // Upcoming reads soonest-first (what do I do next?); past reads
      // most-recent-first (what happened last?).
      orderBy: { scheduledAt: scope === 'upcoming' ? 'asc' : 'desc' },
      // A patient years into follow-up accumulates an unbounded history, and
      // every row here is decrypted individually. No screen in the product
      // renders more than a page of these.
      take: MAX_LIST_ROWS,
    });

    return rows.map(decryptAppointment);
  },

  /** Scoped by patientId as well as id — an id alone is never enough. */
  async findByIdForPatient(id: string, patientId: string): Promise<AppointmentWithDoctor | null> {
    const row = await prisma.appointment.findFirst({
      where: { id, patientId },
      include: { doctor: { select: DOCTOR_SELECT } },
    });
    return row ? decryptAppointment(row) : null;
  },

  async create(data: {
    patientId: string;
    doctorId: string | null;
    scheduledAt: Date;
    mode: Prisma.AppointmentCreateInput['mode'];
    reason: string;
  }): Promise<AppointmentWithDoctor> {
    const row = await prisma.appointment.create({
      data: {
        patientId: data.patientId,
        doctorId: data.doctorId,
        scheduledAt: data.scheduledAt,
        mode: data.mode,
        status: AppointmentStatus.Requested,
        reason: encryptFieldOptional(data.reason),
      },
      include: { doctor: { select: DOCTOR_SELECT } },
    });
    return decryptAppointment(row);
  },

  /**
   * Cancel, scoped to the owning patient.
   *
   * updateMany (not update) so the patientId predicate is part of the WHERE:
   * `update` would need a unique selector, which would mean checking ownership
   * separately and leaving a TOCTOU gap between the check and the write.
   * A count of 0 means "not yours, or not found" — the caller cannot tell which,
   * which is the intended behaviour.
   */
  async cancelForPatient(
    id: string,
    patientId: string,
    cancelledByUserId: string,
    cancelReason: string | null,
  ): Promise<number> {
    const { count } = await prisma.appointment.updateMany({
      where: {
        id,
        patientId,
        // Cancelling an already-cancelled or completed visit is a no-op, not an
        // error the patient needs to see.
        status: { in: [AppointmentStatus.Requested, AppointmentStatus.Confirmed] },
      },
      data: {
        status: AppointmentStatus.Cancelled,
        cancelledAt: new Date(),
        cancelledBy: cancelledByUserId,
        cancelReason,
      },
    });
    return count;
  },

  /** Confirms a doctor exists and is not soft-deleted, before referencing them. */
  async doctorExists(doctorId: string): Promise<boolean> {
    const found = await prisma.doctorProfile.findFirst({
      where: { id: doctorId, deletedAt: null },
      select: { id: true },
    });
    return found !== null;
  },
};
