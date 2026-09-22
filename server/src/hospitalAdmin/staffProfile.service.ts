import { AppError } from '../middleware/errorHandler';
import { auditService, AuditAction, AuditSeverity } from '../services/audit.service';
import { staffProfileRepository, type StaffProfileWithHospital } from './staffProfile.repository';
import type {
  UpdateStaffProfileDto,
  CreateHospitalDto,
  JoinHospitalDto,
} from './staffProfile.validator';

// ─────────────────────────────────────────────────────────────────────────────
// Staff Profile Service — self-service, plus the response shape reused by
// GET /auth/me for the HospitalAdmin role (see auth.service.ts's getProfile).
// ─────────────────────────────────────────────────────────────────────────────

function toResponseShape(profile: StaffProfileWithHospital) {
  return {
    id: profile.id,
    firstName: profile.firstName,
    lastName: profile.lastName,
    jobTitle: profile.jobTitle,
    department: profile.department,
    phoneNumber: profile.phoneNumber,
    hospitalId: profile.hospitalId,
    hospital: profile.hospital
      ? {
          id: profile.hospital.id,
          name: profile.hospital.name,
          city: profile.hospital.city,
          state: profile.hospital.state,
        }
      : null,
    // Never a login gate — same discipline as DoctorProfile.isVerified.
    isVerified: profile.isVerified,
    verifiedAt: profile.verifiedAt,
    onboardingCompletedAt: profile.onboardingCompletedAt,
    updatedAt: profile.updatedAt,
  };
}

export { toResponseShape as toStaffProfileResponseShape };
export type StaffProfileResponse = ReturnType<typeof toResponseShape>;

/** Required tier for Hospital Admin onboarding: a hospital, created or
 *  joined. Job title/department/phone are Recommended/Optional. */
function hasRequiredFields(p: StaffProfileWithHospital): boolean {
  return p.hospitalId !== null;
}

export const staffProfileService = {
  async getOwnProfile(userId: string): Promise<StaffProfileResponse | null> {
    const profile = await staffProfileRepository.findByUserId(userId);
    return profile ? toResponseShape(profile) : null;
  },

  async updateOwnProfile(
    userId: string,
    dto: UpdateStaffProfileDto,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<StaffProfileResponse> {
    const existing = await staffProfileRepository.findByUserId(userId);
    if (existing === null) {
      throw new AppError('Staff profile not found.', 404);
    }

    const updated = await staffProfileRepository.updateByUserId(userId, dto);

    auditService.log({
      action: AuditAction.ProfileUpdated,
      userId,
      severity: AuditSeverity.Info,
      resource: 'staff_profile',
      resourceId: updated.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { fieldsChanged: Object.keys(dto) },
    });

    return toResponseShape(updated);
  },

  async createHospital(userId: string, dto: CreateHospitalDto): Promise<StaffProfileResponse> {
    const existing = await staffProfileRepository.findByUserId(userId);
    if (existing === null) {
      throw new AppError('Staff profile not found.', 404);
    }
    if (existing.hospitalId !== null) {
      throw new AppError('You are already linked to a hospital.', 409);
    }

    const updated = await staffProfileRepository.createHospitalAndJoin(userId, dto);
    return toResponseShape(updated);
  },

  async joinHospital(userId: string, dto: JoinHospitalDto): Promise<StaffProfileResponse> {
    const existing = await staffProfileRepository.findByUserId(userId);
    if (existing === null) {
      throw new AppError('Staff profile not found.', 404);
    }
    if (existing.hospitalId !== null) {
      throw new AppError('You are already linked to a hospital.', 409);
    }

    const updated = await staffProfileRepository.updateByUserId(userId, {
      hospital: { connect: { id: dto.hospitalId } },
    });
    return toResponseShape(updated);
  },

  async completeOnboarding(userId: string): Promise<StaffProfileResponse> {
    const existing = await staffProfileRepository.findByUserId(userId);
    if (existing === null) {
      throw new AppError('Staff profile not found.', 404);
    }

    if (!hasRequiredFields(existing)) {
      throw new AppError('Please create or join a hospital before continuing.', 400);
    }

    await staffProfileRepository.markOnboardingComplete(userId);
    const updated = await staffProfileRepository.findByUserId(userId);
    return toResponseShape(updated!);
  },
};
