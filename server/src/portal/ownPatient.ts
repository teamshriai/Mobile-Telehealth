import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

/**
 * The authenticated patient's own PatientProfile id — the ONLY way any
 * `/me/*` route learns which patient it is serving.
 *
 * ⚠️ WHY THIS IS THE WHOLE AUTHORIZATION STORY FOR THE PORTAL. No `/me` route
 * accepts a patient id from the client, so there is nothing to tamper with:
 * patient A cannot ask for patient B's anything, because "which patient" is
 * never a question the request gets to answer. Every query downstream is
 * scoped by the id returned here, and a row id from the URL (a note, a visit)
 * is always looked up TOGETHER with it, so a foreign id is simply not found.
 *
 * A soft-deleted profile is treated as absent — same 404 as no profile.
 */
export async function requireOwnPatientId(userId: string): Promise<string> {
  const row = await prisma.patientProfile.findFirst({
    where: { userId, deletedAt: null },
    select: { id: true },
  });
  if (row === null) throw new AppError('Patient profile not found.', 404);
  return row.id;
}
