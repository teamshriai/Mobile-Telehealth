import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

// ─────────────────────────────────────────────────────────────────────────────
// Doctor Repository — patient-facing directory
//
// Read-only, and a deliberately narrow projection. A patient booking a visit
// needs a name, a specialty and a place; they must never receive
// registrationNumber, hprId, phoneNumber, or the doctor's userId. Selecting an
// explicit column list (rather than filtering after the query) means a future
// column added to DoctorProfile cannot silently start leaking.
// ─────────────────────────────────────────────────────────────────────────────

const PUBLIC_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  specialty: true,
  qualifications: true,
  hospitalName: true,
  yearsExperience: true,
  isVerified: true,
} satisfies Prisma.DoctorProfileSelect;

export type PublicDoctor = Prisma.DoctorProfileGetPayload<{ select: typeof PUBLIC_SELECT }>;

/** Ceiling on the bookable-clinician directory. */
const MAX_BOOKABLE = 200;

export const doctorRepository = {
  /**
   * Only verified, non-deleted clinicians appear. An unverified DoctorProfile
   * is an unchecked credential claim — it must not be bookable.
   */
  async listBookable(): Promise<PublicDoctor[]> {
    return prisma.doctorProfile.findMany({
      where: { deletedAt: null, isVerified: true },
      select: PUBLIC_SELECT,
      orderBy: [{ specialty: 'asc' }, { lastName: 'asc' }],
      // The directory is rendered as a single picker, so it was unbounded by
      // omission rather than by intent. The partial index added in
      // 20260917090000_query_performance_indexes covers the predicate.
      take: MAX_BOOKABLE,
    });
  },
};
