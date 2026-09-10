import { AppError } from '../middleware/errorHandler';
import { careTeamRepository, type CareTeamMemberWithDoctor } from './careteam.repository';

// ─────────────────────────────────────────────────────────────────────────────
// Care Team Service
// Scoped to the caller's own patient profile — no patient id is ever accepted
// from the client.
// ─────────────────────────────────────────────────────────────────────────────

function toResponseShape(m: CareTeamMemberWithDoctor) {
  return {
    id: m.id,
    /** Role on THIS patient's team ("Neurologist"), not the platform role. */
    careRole: m.careRole,
    isPrimary: m.isPrimary,
    activeFrom: m.activeFrom,
    doctor: {
      id: m.doctor.id,
      name: `Dr. ${m.doctor.firstName} ${m.doctor.lastName}`.trim(),
      specialty: m.doctor.specialty,
      qualifications: m.doctor.qualifications,
      hospitalName: m.doctor.hospitalName,
      isVerified: m.doctor.isVerified,
    },
  };
}

export type CareTeamMemberResponse = ReturnType<typeof toResponseShape>;

export const careTeamService = {
  async listForUser(userId: string): Promise<CareTeamMemberResponse[]> {
    const patientId = await careTeamRepository.findPatientProfileIdByUserId(userId);
    if (patientId === null) {
      throw new AppError('Patient profile not found.', 404);
    }

    const members = await careTeamRepository.listActiveForPatient(patientId);
    return members.map(toResponseShape);
  },
};
