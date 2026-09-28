import { prisma } from '../lib/prisma';
import { avatarUrl } from '../utils/avatarUrl';

/**
 * Portraits of the clinicians who signed or issued something a patient sees
 * (a prescription, a note, an instruction, a refill), keyed by user id.
 *
 * ⚠️ Looked up HERE so a clinician's user id never has to leave the server —
 * the patient-facing directory deliberately never sends one
 * (doctor.repository.ts). Callers attach only the resulting URL.
 */
export async function clinicianPhotosByUserId(
  userIds: ReadonlyArray<string | null | undefined>,
): Promise<Map<string, string | null>> {
  const ids = [...new Set(userIds.filter((v): v is string => typeof v === 'string' && v !== ''))];
  if (ids.length === 0) return new Map();
  const rows = await prisma.doctorProfile.findMany({
    where: { userId: { in: ids } },
    select: { userId: true, profilePhoto: true },
  });
  return new Map(rows.map((r) => [r.userId, avatarUrl(r.profilePhoto)]));
}
