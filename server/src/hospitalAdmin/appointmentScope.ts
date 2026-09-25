import type { Prisma } from '@prisma/client';

/** In this hospital's scope: its doctor's appointment, or an unassigned
 *  request from a patient under one of its doctors. */
export function hospitalScopeWhere(hospitalId: string): Prisma.AppointmentWhereInput {
  return {
    OR: [
      { doctor: { hospitalId } },
      {
        doctorId: null,
        patient: {
          careTeam: { some: { activeTo: null, doctor: { hospitalId, deletedAt: null } } },
        },
      },
    ],
  };
}
