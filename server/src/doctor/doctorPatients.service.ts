import { AppError } from '../middleware/errorHandler';
import { doctorPatientsRepository } from './doctorPatients.repository';

export const doctorPatientsService = {
  async listOwn(userId: string) {
    const doctorId = await doctorPatientsRepository.findDoctorProfileIdByUserId(userId);
    if (doctorId === null) {
      throw new AppError('Doctor profile not found.', 404);
    }

    const rows = await doctorPatientsRepository.listActiveCareTeamPatients(doctorId);

    return rows.map((row) => ({
      patientId: row.patient.id,
      shriPatientId: row.patient.shriPatientId,
      name: `${row.patient.firstName} ${row.patient.lastName}`.trim(),
      careRole: row.careRole,
      isPrimary: row.isPrimary,
      since: row.activeFrom,
      lastAppointment: row.patient.appointments[0] ?? null,
    }));
  },
};
