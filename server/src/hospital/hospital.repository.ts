import { prisma } from '../lib/prisma';

// ─────────────────────────────────────────────────────────────────────────────
// Hospital Repository — the picker Doctor/HospitalAdmin onboarding reads
// from when joining an existing hospital rather than creating a new one.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_LISTED = 500;

export const hospitalRepository = {
  async listActive() {
    return prisma.hospital.findMany({
      where: { isActive: true },
      select: { id: true, name: true, city: true, state: true },
      orderBy: { name: 'asc' },
      take: MAX_LISTED,
    });
  },
};
