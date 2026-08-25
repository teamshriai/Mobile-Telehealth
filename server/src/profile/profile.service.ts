import type { PatientProfile, Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { auditService, AuditAction, AuditSeverity } from '../services/audit.service';
import { profileRepository } from './profile.repository';
import type { UpdateProfileDto, PreferencesDto } from './profile.validator';

// ─────────────────────────────────────────────────────────────────────────────
// Profile Service
// ─────────────────────────────────────────────────────────────────────────────

/** Age is derived from dateOfBirth on every read — never stored, so it can
 * never drift out of sync with the actual date of birth. */
function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > dateOfBirth.getMonth() ||
    (today.getMonth() === dateOfBirth.getMonth() && today.getDate() >= dateOfBirth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

/** Never return the profile row as-is — always shape it through here so a
 * derived `age` and masked Aadhaar display are added consistently, and so
 * adding a new sensitive column later doesn't silently leak it by default. */
function toResponseShape(profile: PatientProfile) {
  return {
    id: profile.id,
    firstName: profile.firstName,
    middleName: profile.middleName,
    lastName: profile.lastName,
    dateOfBirth: profile.dateOfBirth,
    age: calculateAge(profile.dateOfBirth),
    gender: profile.gender,
    bloodGroup: profile.bloodGroup,
    maritalStatus: profile.maritalStatus,

    abhaId: profile.abhaId,
    passportNumber: profile.passportNumber,
    aadhaarMasked: profile.aadhaarLast4 ? `XXXX-XXXX-${profile.aadhaarLast4}` : null,

    phoneNumber: profile.phoneNumber,
    alternatePhone: profile.alternatePhone,

    addressLine1: profile.addressLine1,
    addressLine2: profile.addressLine2,
    village: profile.village,
    city: profile.city,
    district: profile.district,
    state: profile.state,
    country: profile.country,
    postalCode: profile.postalCode,

    emergencyContactName: profile.emergencyContactName,
    emergencyContactPhone: profile.emergencyContactPhone,
    emergencyContactRelation: profile.emergencyContactRelation,

    preferences: (profile.preferences as PreferencesDto | null) ?? {},

    updatedAt: profile.updatedAt,
  };
}

export type ProfileResponse = ReturnType<typeof toResponseShape>;

export const profileService = {
  /**
   * Get the authenticated user's own patient profile.
   * Returns null if none exists yet — callers render an onboarding/empty
   * state, never a fabricated profile.
   */
  async getProfile(userId: string): Promise<ProfileResponse | null> {
    const profile = await profileRepository.findByUserId(userId);
    return profile ? toResponseShape(profile) : null;
  },

  /**
   * Update the authenticated user's own patient profile.
   * `userId` always comes from the authenticated request (req.user.id),
   * never from the request body — there is no code path for updating
   * another user's profile.
   */
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<ProfileResponse> {
    const existing = await profileRepository.findByUserId(userId);
    if (existing === null) {
      throw new AppError('Patient profile not found.', 404);
    }

    const updated = await profileRepository.updateByUserId(userId, {
      ...dto,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
    });

    // Never log field values (especially aadhaarLast4/abhaId/address) — only
    // that an update happened, on which resource, by whom.
    auditService.log({
      action: AuditAction.ProfileUpdated,
      userId,
      severity: AuditSeverity.Info,
      resource: 'patient_profile',
      resourceId: updated.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { fieldsChanged: Object.keys(dto) },
    });

    return toResponseShape(updated);
  },

  /**
   * Update the authenticated user's Settings preferences. Category-level
   * shallow merge — a PATCH containing only `{ notifications: {...} }`
   * leaves `privacy`/`accessibility`/`language` untouched.
   */
  async updatePreferences(userId: string, dto: PreferencesDto): Promise<ProfileResponse> {
    const existing = await profileRepository.findByUserId(userId);
    if (existing === null) {
      throw new AppError('Patient profile not found.', 404);
    }

    const currentPreferences = (existing.preferences as PreferencesDto | null) ?? {};
    const merged: PreferencesDto = { ...currentPreferences };
    for (const [category, values] of Object.entries(dto)) {
      merged[category as keyof PreferencesDto] = {
        ...currentPreferences[category as keyof PreferencesDto],
        ...values,
      } as never;
    }

    const updated = await profileRepository.updatePreferences(
      userId,
      merged as Prisma.InputJsonValue,
    );

    return toResponseShape(updated);
  },
};
