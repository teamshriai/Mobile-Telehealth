import { AppointmentStatus, EncounterStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { decryptFieldOptional } from '../utils/encryption';

// ─────────────────────────────────────────────────────────────────────────────
// Doctor dashboard repository — read-only, own-scope only.
//
// Every method takes a doctorId the service resolved from req.user.id; none
// accepts an id from the client, which is what makes cross-doctor reads
// impossible by construction (the same discipline as
// doctorPatients.repository and appointment.repository).
//
// Decryption lives here, not in the service: Appointment.reason/notes are
// AES-GCM at rest (appointment.repository's ENCRYPTED_FIELDS is the canonical
// list for that table) and the service works in plaintext throughout.
// ─────────────────────────────────────────────────────────────────────────────

/** Appointments that occupy a clinic slot. Cancelled ones do not. */
const ACTIVE_STATUSES = [
  AppointmentStatus.Requested,
  AppointmentStatus.Confirmed,
  AppointmentStatus.Completed,
  AppointmentStatus.NoShow,
] as const;

export const doctorDashboardRepository = {
  async findDoctorProfileIdByUserId(userId: string): Promise<string | null> {
    const profile = await prisma.doctorProfile.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true },
    });
    return profile?.id ?? null;
  },

  /** Active care-team patients — the doctor's own panel. */
  async listPanel(doctorId: string) {
    return prisma.careTeamMember.findMany({
      where: { doctorId, activeTo: null },
      select: {
        careRole: true,
        isPrimary: true,
        activeFrom: true,
        // shriPatientId as well as id: the worklist links to the chart, and
        // clinician-facing URLs are keyed on the UHID.
        patient: { select: { id: true, shriPatientId: true, firstName: true, lastName: true } },
      },
      orderBy: { activeFrom: 'desc' },
    });
  },

  /**
   * The doctor's own appointments in a window, patient name joined.
   * `reason` is decrypted here so no caller ever sees ciphertext.
   */
  async listAppointmentsBetween(doctorId: string, from: Date, to: Date) {
    const rows = await prisma.appointment.findMany({
      where: { doctorId, scheduledAt: { gte: from, lt: to } },
      select: {
        id: true,
        scheduledAt: true,
        durationMins: true,
        mode: true,
        status: true,
        reason: true,
        locationName: true,
        // shriPatientId as well as id, for the same reason as listPanel: a
        // clinic row that cannot link to the patient's chart is a dead end.
        patient: { select: { id: true, shriPatientId: true, firstName: true, lastName: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return rows.map((row) => ({
      ...row,
      reason: decryptFieldOptional(row.reason),
    }));
  },

  /** Count of this doctor's future, non-cancelled appointments. */
  async countUpcoming(doctorId: string, now: Date): Promise<number> {
    return prisma.appointment.count({
      where: {
        doctorId,
        scheduledAt: { gte: now },
        status: { in: [AppointmentStatus.Requested, AppointmentStatus.Confirmed] },
      },
    });
  },

  /**
   * Open encounters for the given patients. Encounter has no doctor column —
   * it carries `createdByUserId` — so the panel-membership filter above is
   * what keeps this scoped to patients this doctor actually looks after.
   */
  async listOpenEncounters(patientIds: string[]) {
    if (patientIds.length === 0) return [];
    return prisma.encounter.findMany({
      where: { patientId: { in: patientIds }, status: EncounterStatus.InProgress },
      select: { id: true, patientId: true, type: true, startedAt: true },
      orderBy: { startedAt: 'desc' },
    });
  },

  /**
   * The most recent stroke assessment per patient, reached through the
   * encounter that owns it. Returned newest-first; the service keeps the
   * first row it sees per patient.
   */
  async listLatestAssessments(patientIds: string[]) {
    if (patientIds.length === 0) return [];
    const rows = await prisma.strokeAssessment.findMany({
      where: { encounter: { patientId: { in: patientIds } } },
      select: {
        id: true,
        urgentFlag: true,
        lkwAt: true,
        lkwCertainty: true,
        createdAt: true,
        facialWeakness: true,
        armWeakness: true,
        legWeakness: true,
        speechDifficulty: true,
        suddenConfusion: true,
        visionProblem: true,
        severeHeadache: true,
        balanceProblem: true,
        lossOfConsciousness: true,
        encounter: { select: { patientId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows;
  },

  /**
   * Per-day appointment counts across a window.
   *
   * ⚠️ Drives two surfaces from one query: the clinic calendar's per-day load
   * shading and the weekly visit chart. Returning rows rather than a grouped
   * aggregate because the window is small (weeks, not years) and the caller
   * needs to bucket by LOCAL day — Postgres would group by UTC and put an
   * 00:30 IST clinic on the previous day.
   */
  async listDailyLoad(doctorId: string, from: Date, to: Date) {
    return prisma.appointment.findMany({
      where: { doctorId, scheduledAt: { gte: from, lt: to } },
      select: { scheduledAt: true, status: true },
      orderBy: { scheduledAt: 'asc' },
    });
  },

  /** Appointment rows for the trend series — status + date only. */
  async listForTrend(doctorId: string, from: Date) {
    return prisma.appointment.findMany({
      where: {
        doctorId,
        scheduledAt: { gte: from },
        status: { in: [...ACTIVE_STATUSES] },
      },
      select: { scheduledAt: true, status: true },
      orderBy: { scheduledAt: 'asc' },
    });
  },
};
