import { prisma } from '../lib/prisma';

/**
 * When a later signed prescription for the same medicine replaced this line —
 * the database form of `replacedAt` in portal/medicationPeriod.ts, for the
 * write paths that look at one line rather than the whole list.
 */
export async function findReplacement(
  patientId: string,
  line: { drugId: string; prescriptionId: string; signedAt: Date },
): Promise<Date | null> {
  const newer = await prisma.prescription.findFirst({
    where: {
      patientId,
      status: 'Signed',
      id: { not: line.prescriptionId },
      signedAt: { gt: line.signedAt },
      items: { some: { drugId: line.drugId } },
    },
    orderBy: { signedAt: 'asc' },
    select: { signedAt: true },
  });
  return newer?.signedAt ?? null;
}
