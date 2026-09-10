import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

// ─────────────────────────────────────────────────────────────────────────────
// Care Team Repository
//
// Read-only for patients. Assignment is a clinical act performed by the care
// team, not something a patient can do to themselves, so there is deliberately
// no create/update path here — it arrives with the doctor portal.
// ─────────────────────────────────────────────────────────────────────────────

/** Doctor columns safe to show a patient — never registrationNumber / hprId. */
const DOCTOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  specialty: true,
  qualifications: true,
  hospitalName: true,
  isVerified: true,
} satisfies Prisma.DoctorProfileSelect;

const MEMBER_INCLUDE = { doctor: { select: DOCTOR_SELECT } } satisfies Prisma.CareTeamMemberInclude;

export type CareTeamMemberWithDoctor = Prisma.CareTeamMemberGetPayload<{
  include: typeof MEMBER_INCLUDE;
}>;

export const careTeamRepository = {
  async findPatientProfileIdByUserId(userId: string): Promise<string | null> {
    const profile = await prisma.patientProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    return profile?.id ?? null;
  },

  /** Active members only (activeTo null) — uses the [patientId, activeTo] index. */
  async listActiveForPatient(patientId: string): Promise<CareTeamMemberWithDoctor[]> {
    return prisma.careTeamMember.findMany({
      where: { patientId, activeTo: null },
      include: MEMBER_INCLUDE,
      // Primary clinician first, then stable alphabetical order so the list
      // does not reshuffle between loads.
      orderBy: [{ isPrimary: 'desc' }, { careRole: 'asc' }],
    });
  },
};
