import type { Request, Response } from 'express';
import { doctorPatientsService } from './doctorPatients.service';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../lib/prisma';

export const listOwnPatients = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const patients = await doctorPatientsService.listOwn(req.user!.id);
  res.status(200).json(ApiResponseBuilder.success('Patients retrieved.', { patients }));
});

/**
 * Every encounter this clinician has open, across all their patients.
 *
 * ⚠️ Own-scope by construction: the query is built from the session user's
 * own doctor profile, so there is no patient id to gate and no way to widen
 * it by tampering with a parameter — the same pattern doctorDashboard uses.
 *
 * Needed because S-06-01 must show "consultations in progress" and there was
 * no cross-patient encounter query at all: the only listing was per-patient,
 * which cannot answer "what have I left open?".
 */
export const listOpenEncounters = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const doctor = await prisma.doctorProfile.findUnique({
      where: { userId: req.user!.id },
      select: { id: true },
    });
    if (doctor === null) {
      res.status(200).json(ApiResponseBuilder.success('Encounters retrieved.', { encounters: [] }));
      return;
    }

    // An encounter is "mine" if I opened it, or if it belongs to a patient on
    // my active care team — a colleague opening the encounter does not make
    // the patient disappear from my worklist.
    const rows = await prisma.encounter.findMany({
      where: {
        status: 'InProgress',
        OR: [
          { createdByUserId: req.user!.id },
          { patient: { careTeam: { some: { doctorId: doctor.id, activeTo: null } } } },
        ],
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        visitId: true,
        type: true,
        startedAt: true,
        patientId: true,
        patient: { select: { firstName: true, lastName: true, shriPatientId: true } },
      },
    });

    const encounters = rows.map((r) => ({
      id: r.id,
      visitId: r.visitId,
      type: r.type,
      startedAt: r.startedAt,
      patientId: r.patientId,
      shriPatientId: r.patient.shriPatientId,
      patientName: `${r.patient.firstName} ${r.patient.lastName}`.trim(),
    }));

    res.status(200).json(ApiResponseBuilder.success('Encounters retrieved.', { encounters }));
  },
);
