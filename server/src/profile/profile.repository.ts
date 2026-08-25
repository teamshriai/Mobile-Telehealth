import type { PatientProfile, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  decryptFieldOptional,
  encryptFieldOptional,
  hmacBlindIndex,
} from '../utils/encryption';

// ─────────────────────────────────────────────────────────────────────────────
// Profile Repository
//
// All database access for the patient-profile domain lives here.
// Services never call prisma directly — they go through this layer.
//
// This is also the ONLY layer that knows about field-level encryption —
// profile.service.ts works with plain decrypted values throughout, exactly
// as it did before encryption was introduced. See server/src/utils/encryption.ts
// for the scheme and why abhaId needs a separate blind-index column.
// ─────────────────────────────────────────────────────────────────────────────

/** Columns encrypted at rest. abhaId is handled separately (needs its hash). */
const ENCRYPTED_FIELDS = [
  'phoneNumber',
  'alternatePhone',
  'addressLine1',
  'addressLine2',
  'village',
  'city',
  'district',
  'state',
  'postalCode',
  'emergencyContactName',
  'emergencyContactPhone',
  'emergencyContactRelation',
  'passportNumber',
  'aadhaarLast4',
  'knownAllergies',
  'currentMedications',
  'existingDiseases',
  'familyHistory',
  'previousSurgeries',
] as const;

type EncryptedField = (typeof ENCRYPTED_FIELDS)[number];

/**
 * Decrypts a PatientProfile row fetched via any path — exported so other
 * modules that also return a raw PatientProfile (currently: auth.service's
 * GET /me) don't duplicate this logic or, worse, forget it and leak
 * ciphertext to the client.
 */
export function decryptProfile(profile: PatientProfile): PatientProfile {
  const decrypted = { ...profile };
  for (const field of ENCRYPTED_FIELDS) {
    decrypted[field] = decryptFieldOptional(profile[field]) as never;
  }
  if (profile.abhaId) {
    decrypted.abhaId = decryptFieldOptional(profile.abhaId) as never;
  }
  return decrypted;
}

/**
 * Encrypts every recognized field present in a partial update payload.
 * Fields not present in `data` are left untouched (Prisma only updates keys
 * that exist on the object). abhaId additionally gets its blind-index hash
 * computed here so the caller never has to think about it.
 */
function encryptProfileData(
  data: Prisma.PatientProfileUpdateInput,
): Prisma.PatientProfileUpdateInput {
  const encrypted: Prisma.PatientProfileUpdateInput = { ...data };

  for (const field of ENCRYPTED_FIELDS as readonly EncryptedField[]) {
    if (field in data) {
      const value = data[field] as string | null | undefined;
      (encrypted as Record<string, unknown>)[field] = encryptFieldOptional(value);
    }
  }

  if ('abhaId' in data) {
    const value = data.abhaId as string | null | undefined;
    encrypted.abhaId = encryptFieldOptional(value);
    encrypted.abhaIdHash = value ? hmacBlindIndex(value) : null;
  }

  return encrypted;
}

export const profileRepository = {
  /**
   * Find a patient profile by its owning user's ID.
   * Returns null if the user has no profile (e.g. non-Patient roles) or it
   * was soft-deleted — callers must treat null as "no profile yet", not an error.
   */
  async findByUserId(userId: string): Promise<PatientProfile | null> {
    const profile = await prisma.patientProfile.findFirst({
      where: { userId, deletedAt: null },
    });
    return profile ? decryptProfile(profile) : null;
  },

  /**
   * Update a patient profile owned by the given user. Always scoped by
   * userId in the WHERE clause — callers never pass a profile ID directly,
   * so there is no code path where one user's request can target another
   * user's row.
   *
   * Duplicate abhaId is enforced by the DB's unique constraint on
   * abhaIdHash — a conflict surfaces as a Prisma P2002 error, already
   * translated into a friendly 409 by the global error handler (the same
   * path used for duplicate-email at registration).
   */
  async updateByUserId(
    userId: string,
    data: Prisma.PatientProfileUpdateInput,
  ): Promise<PatientProfile> {
    const updated = await prisma.patientProfile.update({
      where: { userId },
      data: encryptProfileData(data),
    });
    return decryptProfile(updated);
  },

  /**
   * Overwrite the preferences JSON blob outright — callers (profile.service)
   * are responsible for merging categories into the existing value first,
   * since this is a plain replace, not a deep merge at the DB level.
   */
  async updatePreferences(
    userId: string,
    preferences: Prisma.InputJsonValue,
  ): Promise<PatientProfile> {
    const updated = await prisma.patientProfile.update({
      where: { userId },
      data: { preferences },
    });
    return decryptProfile(updated);
  },
};
