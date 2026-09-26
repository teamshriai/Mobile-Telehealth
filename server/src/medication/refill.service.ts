import { NotificationType, Prisma, RefillStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { auditService, AuditAction, AuditSeverity } from '../services/audit.service';
import { notificationService } from '../notification/notification.service';
import { decryptFieldOptional, encryptFieldOptional } from '../utils/encryption';
import { requireOwnPatientId } from '../portal/ownPatient';
import { courseEnd } from '../portal/medicationSchedule';
import { findReplacement } from './replacement';

// ─────────────────────────────────────────────────────────────────────────────
// Refill requests — the patient's side, and the rule that closes them.
//
// ⚠️ A REQUEST, NEVER A PRESCRIPTION. The flow is: patient requests → the
// hospital administrator forwards it to a doctor (or declines, with a reason
// the patient sees) → the doctor prescribes through the normal signed path →
// the request closes itself as Fulfilled. Nothing here dispenses a medicine.
//
// ⚠️ Notifications carry NO medicine name or patient name: titles and bodies
// are stored in plaintext and may be emailed. The detail is behind sign-in.
// ─────────────────────────────────────────────────────────────────────────────

const DAY = 86_400_000;
/** A course that ended longer ago than this needs a visit, not a refill. */
const REFILL_AFTER_END_LIMIT_DAYS = 60;
const OPEN: RefillStatus[] = [RefillStatus.Requested, RefillStatus.Forwarded];
type Meta = { ipAddress?: string; userAgent?: string };

export interface RefillView {
  id: string;
  status: RefillStatus;
  requestedAt: Date;
  forwardedToName: string | null;
  declineReason: string | null;
  resolvedAt: Date | null;
}

function toView(r: {
  id: string;
  status: RefillStatus;
  requestedAt: Date;
  forwardedToName: string | null;
  declineReason: string | null;
  resolvedAt: Date | null;
}): RefillView {
  return {
    id: r.id,
    status: r.status,
    requestedAt: r.requestedAt,
    forwardedToName: r.forwardedToName,
    declineReason: decryptFieldOptional(r.declineReason) ?? null,
    resolvedAt: r.resolvedAt,
  };
}

/** Hospital ids that should see this patient's refill: the prescriber's, and
 *  every hospital where the patient has an active doctor. */
async function hospitalsFor(patientId: string, signedByUserId: string | null): Promise<string[]> {
  const [prescriber, team] = await Promise.all([
    signedByUserId === null
      ? Promise.resolve(null)
      : prisma.doctorProfile.findUnique({
          where: { userId: signedByUserId },
          select: { hospitalId: true },
        }),
    prisma.careTeamMember.findMany({
      where: { patientId, activeTo: null, doctor: { hospitalId: { not: null } } },
      select: { doctor: { select: { hospitalId: true } } },
    }),
  ]);
  const ids = new Set<string>();
  if (prescriber?.hospitalId) ids.add(prescriber.hospitalId);
  for (const t of team) if (t.doctor.hospitalId) ids.add(t.doctor.hospitalId);
  return [...ids];
}

export const refillService = {
  /** The newest request per medicine line, for the list. */
  async latestForItems(patientId: string, itemIds: string[]): Promise<Map<string, RefillView>> {
    if (itemIds.length === 0) return new Map();
    const rows = await prisma.refillRequest.findMany({
      where: { patientId, prescriptionItemId: { in: itemIds } },
      orderBy: { requestedAt: 'desc' },
    });
    const out = new Map<string, RefillView>();
    for (const r of rows)
      if (!out.has(r.prescriptionItemId)) out.set(r.prescriptionItemId, toView(r));
    return out;
  },

  /**
   * Close any open request that a NEWER signed prescription for the same drug
   * has already answered. Run on read, so it holds however the doctor wrote
   * the prescription.
   */
  async autoFulfil(patientId: string): Promise<number> {
    const open = await prisma.refillRequest.findMany({
      where: { patientId, status: { in: OPEN } },
      select: { id: true, requestedAt: true, item: { select: { drugId: true } } },
    });
    let closed = 0;
    for (const r of open) {
      const newer = await prisma.prescriptionItem.findFirst({
        where: {
          drugId: r.item.drugId,
          prescription: { patientId, status: 'Signed', signedAt: { gt: r.requestedAt } },
        },
        select: { id: true },
      });
      if (newer === null) continue;
      const { count } = await prisma.refillRequest.updateMany({
        where: { id: r.id, status: { in: OPEN } },
        data: { status: RefillStatus.Fulfilled, resolvedAt: new Date() },
      });
      if (count === 0) continue;
      closed += 1;
      auditService.log({
        action: AuditAction.RefillFulfilled,
        severity: AuditSeverity.Info,
        resource: 'refill_request',
        resourceId: r.id,
        metadata: { by: 'newer_signed_prescription' },
      });
      const patient = await prisma.patientProfile.findUnique({
        where: { id: patientId },
        select: { userId: true },
      });
      if (patient?.userId) {
        notificationService.notify({
          userId: patient.userId,
          type: NotificationType.Medication,
          title: 'Refill prescribed',
          body: 'Your doctor has written a new prescription for a medicine you asked to refill.',
          actionUrl: '/app/medicines',
        });
      }
    }
    return closed;
  },

  async request(
    userId: string,
    itemId: string,
    note: string | undefined,
    meta: Meta,
  ): Promise<RefillView> {
    const patientId = await requireOwnPatientId(userId);
    const item = await prisma.prescriptionItem.findFirst({
      where: { id: itemId, prescription: { patientId, status: 'Signed' } },
      select: {
        id: true,
        drugId: true,
        frequency: true,
        durationDays: true,
        prescription: {
          select: { id: true, signedAt: true, createdAt: true, signedByUserId: true },
        },
      },
    });
    if (item === null) throw new AppError('Medicine not found.', 404);
    const replaced = await findReplacement(patientId, {
      drugId: item.drugId,
      prescriptionId: item.prescription.id,
      signedAt: item.prescription.signedAt ?? item.prescription.createdAt,
    });
    if (replaced !== null) {
      throw new AppError(
        'Your doctor has already written a newer prescription for this medicine.',
        409,
      );
    }

    const end = courseEnd({
      frequency: item.frequency,
      startedAt: item.prescription.signedAt ?? item.prescription.createdAt,
      durationDays: item.durationDays,
    });
    if (end !== null && Date.now() - end.getTime() > REFILL_AFTER_END_LIMIT_DAYS * DAY) {
      throw new AppError(
        'This course ended some time ago. Please book a visit so your doctor can review it.',
        409,
      );
    }

    let row;
    try {
      row = await prisma.refillRequest.create({
        data: {
          patientId,
          prescriptionItemId: item.id,
          note: encryptFieldOptional(note?.trim() || null),
        },
      });
    } catch (err) {
      // The partial unique index: one open request per medicine line.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppError('A refill has already been requested for this medicine.', 409);
      }
      throw err;
    }

    auditService.log({
      action: AuditAction.RefillRequested,
      userId,
      severity: AuditSeverity.Info,
      resource: 'refill_request',
      resourceId: row.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    // Tell the administrators who can act on it — no medicine or patient name.
    const hospitals = await hospitalsFor(patientId, item.prescription.signedByUserId);
    const admins = await prisma.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        role: { name: 'HospitalAdmin' },
        staffProfile: { hospitalId: { in: hospitals } },
      },
      select: { id: true },
    });
    for (const a of admins) {
      notificationService.notify({
        userId: a.id,
        type: NotificationType.Medication,
        title: 'Refill request waiting',
        body: 'A patient has asked for more of a medicine. Review it in Refill requests.',
        actionUrl: '/hospital-admin/refills',
      });
    }
    return toView(row);
  },

  /** The patient may withdraw a request the hospital has not acted on yet. */
  async cancel(userId: string, refillId: string, meta: Meta): Promise<void> {
    const patientId = await requireOwnPatientId(userId);
    const { count } = await prisma.refillRequest.updateMany({
      where: { id: refillId, patientId, status: RefillStatus.Requested },
      data: { status: RefillStatus.Cancelled, resolvedAt: new Date() },
    });
    if (count === 0) throw new AppError('This request can no longer be cancelled.', 409);
    auditService.log({
      action: AuditAction.RefillCancelled,
      userId,
      severity: AuditSeverity.Info,
      resource: 'refill_request',
      resourceId: refillId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  },
};
