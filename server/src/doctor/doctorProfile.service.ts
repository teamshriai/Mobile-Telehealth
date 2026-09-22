import type { Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { auditService, AuditAction, AuditSeverity } from '../services/audit.service';
import {
  doctorProfileRepository,
  type DoctorProfileWithHospital,
} from './doctorProfile.repository';
import type { UpdateDoctorProfileDto } from './doctorProfile.validator';

// ─────────────────────────────────────────────────────────────────────────────
// Doctor Profile Service — self-service, plus the response shape reused by
// GET /auth/me (see auth.service.ts's getProfile, which had no branch for
// Doctor/HospitalAdmin at all before this).
// ─────────────────────────────────────────────────────────────────────────────

function toResponseShape(profile: DoctorProfileWithHospital) {
  return {
    id: profile.id,
    firstName: profile.firstName,
    lastName: profile.lastName,
    gender: profile.gender,
    specialty: profile.specialty,
    qualifications: profile.qualifications,
    hospitalId: profile.hospitalId,
    hospital: profile.hospital
      ? {
          id: profile.hospital.id,
          name: profile.hospital.name,
          city: profile.hospital.city,
          state: profile.hospital.state,
        }
      : null,
    // Free-text fallback only rendered when no structured Hospital is linked.
    hospitalName: profile.hospital ? profile.hospital.name : profile.hospitalName,
    yearsExperience: profile.yearsExperience,
    registrationNumber: profile.registrationNumber,
    hprId: profile.hprId,
    // Never a login gate — see the schema comment on this column. A badge
    // the client renders, set only by a Hospital Admin/Admin action.
    isVerified: profile.isVerified,
    verifiedAt: profile.verifiedAt,
    phoneNumber: profile.phoneNumber,
    profilePhoto: profile.profilePhoto,
    onboardingCompletedAt: profile.onboardingCompletedAt,
    updatedAt: profile.updatedAt,
  };
}

export { toResponseShape as toDoctorProfileResponseShape };
export type DoctorProfileResponse = ReturnType<typeof toResponseShape>;

/** The Required-onboarding-tier fields per the plan: specialty, years of
 *  experience, and a hospital choice (a real Hospital, or explicitly
 *  independent via free-text hospitalName). */
function hasRequiredFields(p: DoctorProfileWithHospital): boolean {
  const hasSpecialty = p.specialty !== null && p.specialty.trim() !== '';
  const hasExperience = p.yearsExperience !== null;
  const hasHospitalChoice =
    p.hospitalId !== null || (p.hospitalName !== null && p.hospitalName.trim() !== '');
  return hasSpecialty && hasExperience && hasHospitalChoice;
}

export const doctorProfileService = {
  async getOwnProfile(userId: string): Promise<DoctorProfileResponse | null> {
    const profile = await doctorProfileRepository.findByUserId(userId);
    return profile ? toResponseShape(profile) : null;
  },

  async updateOwnProfile(
    userId: string,
    dto: UpdateDoctorProfileDto,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<DoctorProfileResponse> {
    const existing = await doctorProfileRepository.findByUserId(userId);
    if (existing === null) {
      throw new AppError('Doctor profile not found.', 404);
    }

    const data: Prisma.DoctorProfileUpdateInput = { ...dto };
    // Picking a real Hospital and typing free text are the same concept —
    // setting one clears the other so they never silently disagree.
    if (dto.hospitalId !== undefined && dto.hospitalId !== null) {
      data.hospitalName = null;
      data.hospital = { connect: { id: dto.hospitalId } };
      delete (data as { hospitalId?: unknown }).hospitalId;
    } else if (dto.hospitalId === null) {
      data.hospital = { disconnect: true };
      delete (data as { hospitalId?: unknown }).hospitalId;
    }

    const updated = await doctorProfileRepository.updateByUserId(userId, data);

    auditService.log({
      action: AuditAction.ProfileUpdated,
      userId,
      severity: AuditSeverity.Info,
      resource: 'doctor_profile',
      resourceId: updated.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { fieldsChanged: Object.keys(dto) },
    });

    return toResponseShape(updated);
  },

  async completeOnboarding(userId: string): Promise<DoctorProfileResponse> {
    const existing = await doctorProfileRepository.findByUserId(userId);
    if (existing === null) {
      throw new AppError('Doctor profile not found.', 404);
    }

    if (!hasRequiredFields(existing)) {
      throw new AppError(
        'Please provide your specialty, years of experience, and hospital before continuing.',
        400,
      );
    }

    await doctorProfileRepository.markOnboardingComplete(userId);
    const updated = await doctorProfileRepository.findByUserId(userId);
    return toResponseShape(updated!);
  },
};
