import { doctorRepository, type PublicDoctor } from './doctor.repository';

// ─────────────────────────────────────────────────────────────────────────────
// Doctor Service — the directory a patient picks from when requesting a visit.
// ─────────────────────────────────────────────────────────────────────────────

function toResponseShape(d: PublicDoctor) {
  return {
    id: d.id,
    name: `Dr. ${d.firstName} ${d.lastName}`.trim(),
    specialty: d.specialty,
    qualifications: d.qualifications,
    hospitalName: d.hospitalName,
    yearsExperience: d.yearsExperience,
  };
}

export type DoctorResponse = ReturnType<typeof toResponseShape>;

export const doctorService = {
  async listBookable(): Promise<DoctorResponse[]> {
    const doctors = await doctorRepository.listBookable();
    return doctors.map(toResponseShape);
  },
};
