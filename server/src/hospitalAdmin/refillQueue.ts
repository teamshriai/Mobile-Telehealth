import { NotificationType, RefillStatus, type Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { auditService, AuditAction, AuditSeverity } from '../services/audit.service';
import { notificationService } from '../notification/notification.service';
import { decryptFieldOptional, encryptFieldOptional } from '../utils/encryption';
import { courseEnd, istDayNumber } from '../portal/medicationSchedule';
import { frequencyInWords } from '../portal/plainLanguage';
import { refillService } from '../medication/refill.service';
import { hospitalAdminRepository } from './hospitalAdmin.repository';

// ─────────────────────────────────────────────────────────────────────────────
// The hospital administrator's refill queue.
//
// ⚠️ THE ADMINISTRATOR ROUTES; A DOCTOR PRESCRIBES. Forward sends the request
// to a doctor at this hospital (the prescriber by default); Decline records a
// reason the patient sees. The request becomes Fulfilled only when a doctor
// actually signs a newer prescription for the same medicine.
//
// ⚠️ SCOPE: requests whose medicine was prescribed by one of this hospital's
// doctors, or from patients with an active doctor here. Anything else is 404.
// ─────────────────────────────────────────────────────────────────────────────

type Meta = { ipAddress?: string; userAgent?: string };
const DAY = 86_400_000;

export const forwardSchema = z.object({ doctorId: z.string().uuid().optional() }).strict();
export const declineRefillSchema = z
  .object({ reason: z.string().trim().min(3, 'Please give the patient a short reason.').max(300) })
  .strict();

async function requireHospitalScope(userId: string): Promise<string> {
  const hospitalId = await hospitalAdminRepository.findHospitalIdByUserId(userId);
  if (hospitalId === null) throw new AppError('Your hospital is not set up yet.', 400);
  return hospitalId;
}

async function scopeWhere(hospitalId: string): Promise<Prisma.RefillRequestWhereInput> {
  const doctors = await prisma.doctorProfile.findMany({
    where: { hospitalId, deletedAt: null },
    select: { userId: true },
  });
  return {
    OR: [
      { item: { prescription: { signedByUserId: { in: doctors.map((d) => d.userId) } } } },
      {
        patient: {
          careTeam: { some: { activeTo: null, doctor: { hospitalId, deletedAt: null } } },
        },
      },
    ],
  };
}

const INCLUDE = {
  patient: {
    select: { id: true, firstName: true, lastName: true, shriPatientId: true, userId: true },
  },
  item: {
    select: {
      id: true,
      dose: true,
      doseUnit: true,
      frequency: true,
      durationDays: true,
      drug: { select: { genericName: true, form: true } },
      prescription: {
        select: { signedAt: true, createdAt: true, signerName: true, signedByUserId: true },
      },
    },
  },
} satisfies Prisma.RefillRequestInclude;

type Row = Prisma.RefillRequestGetPayload<{ include: typeof INCLUDE }>;

async function loadInScope(hospitalId: string, id: string): Promise<Row> {
  const row = await prisma.refillRequest.findFirst({
    where: { id, ...(await scopeWhere(hospitalId)) },
    include: INCLUDE,
  });
  if (row === null) throw new AppError('Refill request not found.', 404);
  return row;
}

export const refillQueue = {
  async list(userId: string) {
    const hospitalId = await requireHospitalScope(userId);
    const where = await scopeWhere(hospitalId);
    // Close anything a newer prescription already answered before showing it.
    const openPatients = await prisma.refillRequest.findMany({
      where: { ...where, status: { in: [RefillStatus.Requested, RefillStatus.Forwarded] } },
      select: { patientId: true },
      distinct: ['patientId'],
    });
    for (const p of openPatients) await refillService.autoFulfil(p.patientId);

    const rows = await prisma.refillRequest.findMany({
      where,
      include: INCLUDE,
      orderBy: { requestedAt: 'desc' },
      take: 200,
    });
    const now = new Date();
    return rows.map((r) => {
      const end = courseEnd({
        frequency: r.item.frequency,
        startedAt: r.item.prescription.signedAt ?? r.item.prescription.createdAt,
        durationDays: r.item.durationDays,
      });
      return {
        id: r.id,
        status: r.status,
        requestedAt: r.requestedAt,
        resolvedAt: r.resolvedAt,
        patientName: `${r.patient.firstName} ${r.patient.lastName}`.trim(),
        shriPatientId: r.patient.shriPatientId,
        medicine: `${r.item.drug.genericName} ${r.item.dose.toString()} ${r.item.doseUnit}`,
        form: r.item.drug.form,
        frequency: frequencyInWords(r.item.frequency),
        prescribedBy: r.item.prescription.signerName,
        prescriberUserId: r.item.prescription.signedByUserId,
        // Calendar days (India time) from today to the last day covered;
        // negative once it has run out.
        supplyDaysLeft:
          end === null ? null : istDayNumber(new Date(end.getTime() - DAY)) - istDayNumber(now),
        note: decryptFieldOptional(r.note) ?? null,
        forwardedToName: r.forwardedToName,
        declineReason: decryptFieldOptional(r.declineReason) ?? null,
      };
    });
  },

  async forward(userId: string, id: string, dto: z.infer<typeof forwardSchema>, meta: Meta) {
    const hospitalId = await requireHospitalScope(userId);
    const r = await loadInScope(hospitalId, id);
    if (r.status !== RefillStatus.Requested)
      throw new AppError(`This request is already ${r.status.toLowerCase()}.`, 409);

    // Default: the doctor who prescribed it, if they work here.
    const target = await prisma.doctorProfile.findFirst({
      where: {
        hospitalId,
        deletedAt: null,
        ...(dto.doctorId !== undefined
          ? { id: dto.doctorId }
          : { userId: r.item.prescription.signedByUserId ?? '' }),
      },
      select: { userId: true, firstName: true, lastName: true },
    });
    if (target === null) {
      throw new AppError(
        dto.doctorId !== undefined
          ? 'That doctor is not at your hospital.'
          : 'The prescribing doctor is not at your hospital. Choose a doctor to send this to.',
        400,
      );
    }
    const name = `Dr. ${target.firstName} ${target.lastName}`;
    const { count } = await prisma.refillRequest.updateMany({
      where: { id, status: RefillStatus.Requested },
      data: {
        status: RefillStatus.Forwarded,
        forwardedToUserId: target.userId,
        forwardedToName: name,
        handledByUserId: userId,
      },
    });
    if (count === 0)
      throw new AppError('This request was changed meanwhile. Refresh and try again.', 409);

    auditService.log({
      action: AuditAction.RefillForwarded,
      userId,
      severity: AuditSeverity.Info,
      resource: 'refill_request',
      resourceId: id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { toPrescriber: dto.doctorId === undefined },
    });
    notificationService.notify({
      userId: target.userId,
      type: NotificationType.Medication,
      title: 'Refill request from a patient',
      body: 'A patient has asked for more of a medicine. Review their chart and prescribe if appropriate.',
      actionUrl: `/patient/${encodeURIComponent(r.patient.shriPatientId)}/chart`,
    });
    if (r.patient.userId !== null) {
      notificationService.notify({
        userId: r.patient.userId,
        type: NotificationType.Medication,
        title: 'Refill request sent to your doctor',
        body: `Your request has been passed to ${name}.`,
        actionUrl: '/app/medicines',
      });
    }
    return { id, status: RefillStatus.Forwarded, forwardedToName: name };
  },

  async decline(userId: string, id: string, dto: z.infer<typeof declineRefillSchema>, meta: Meta) {
    const hospitalId = await requireHospitalScope(userId);
    const r = await loadInScope(hospitalId, id);
    if (r.status !== RefillStatus.Requested && r.status !== RefillStatus.Forwarded) {
      throw new AppError(`This request is already ${r.status.toLowerCase()}.`, 409);
    }
    const { count } = await prisma.refillRequest.updateMany({
      where: { id, status: { in: [RefillStatus.Requested, RefillStatus.Forwarded] } },
      data: {
        status: RefillStatus.Declined,
        declineReason: encryptFieldOptional(dto.reason),
        handledByUserId: userId,
        resolvedAt: new Date(),
      },
    });
    if (count === 0)
      throw new AppError('This request was changed meanwhile. Refresh and try again.', 409);
    auditService.log({
      action: AuditAction.RefillDeclined,
      userId,
      severity: AuditSeverity.Info,
      resource: 'refill_request',
      resourceId: id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    if (r.patient.userId !== null) {
      notificationService.notify({
        userId: r.patient.userId,
        type: NotificationType.Medication,
        title: 'Refill request not approved',
        body: 'Your refill request could not be approved. The reason is on your Medicines page.',
        actionUrl: '/app/medicines',
      });
    }
    return { id, status: RefillStatus.Declined };
  },

  /** Doctors at this hospital, for choosing where to send a request. */
  async doctors(userId: string) {
    const hospitalId = await requireHospitalScope(userId);
    const rows = await prisma.doctorProfile.findMany({
      where: { hospitalId, deletedAt: null, user: { isActive: true } },
      select: { id: true, userId: true, firstName: true, lastName: true, specialty: true },
      orderBy: { lastName: 'asc' },
    });
    return rows.map((d) => ({
      id: d.id,
      userId: d.userId,
      name: `Dr. ${d.firstName} ${d.lastName}`,
      specialty: d.specialty,
    }));
  },
};
