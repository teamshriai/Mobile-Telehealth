import { z } from 'zod';
import { Gender, BloodGroup, MaritalStatus } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Update Patient Profile Schema
//
// PATCH is a partial update — every field is optional. Only fields present in
// the request body are validated/changed; omitted fields are left untouched.
//
// Phone regex matches the one already used in auth.validator.ts (Indian
// mobile numbers) for consistency.
//
// Deliberately NOT included here (out of scope for this phase): email
// (lives on User, changing it is a separate/more sensitive flow), and the
// lifestyle/medical-summary fields (smoking/alcohol/allergies/etc.) — those
// belong to a future clinical-data module, not patient identity.
// ─────────────────────────────────────────────────────────────────────────────

const phoneSchema = z
  .string()
  .trim()
  .regex(
    /^(\+91[\s-]?)?[6-9]\d{9}$/,
    'Please enter a valid 10-digit Indian mobile number (e.g. +91 9876543210 or 9876543210).',
  );

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  middleName: z.string().trim().max(100).nullable().optional(),
  lastName: z.string().trim().min(1).max(100).optional(),

  dateOfBirth: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      if (isNaN(date.getTime())) return false;
      const now = new Date();
      return date <= now && date.getFullYear() >= 1900;
    }, 'Please provide a valid date of birth.')
    .optional(),

  gender: z.nativeEnum(Gender).nullable().optional(),
  bloodGroup: z.nativeEnum(BloodGroup).nullable().optional(),
  maritalStatus: z.nativeEnum(MaritalStatus).nullable().optional(),

  // Identification
  abhaId: z.string().trim().max(50).nullable().optional(),
  passportNumber: z.string().trim().max(20).nullable().optional(),
  // Only the last 4 digits — see schema.prisma comment. Never accept more.
  aadhaarLast4: z
    .string()
    .trim()
    .regex(/^\d{4}$/, 'Enter exactly the last 4 digits of the Aadhaar number.')
    .nullable()
    .optional(),

  // Contact
  phoneNumber: phoneSchema.nullable().optional(),
  alternatePhone: phoneSchema.nullable().optional(),

  // Address
  addressLine1: z.string().trim().max(255).nullable().optional(),
  addressLine2: z.string().trim().max(255).nullable().optional(),
  village: z.string().trim().max(100).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  district: z.string().trim().max(100).nullable().optional(),
  state: z.string().trim().max(100).nullable().optional(),
  country: z.string().trim().max(100).optional(),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Please enter a valid 6-digit PIN code.')
    .nullable()
    .optional(),

  // Emergency contact
  emergencyContactName: z.string().trim().max(100).nullable().optional(),
  emergencyContactPhone: phoneSchema.nullable().optional(),
  emergencyContactRelation: z.string().trim().max(50).nullable().optional(),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Preferences Schema (Settings page)
//
// Not sensitive PII — stored as plaintext JSON (PatientProfile.preferences),
// not encrypted. PATCH is a category-level partial update: the client sends
// only the category it changed (e.g. { notifications: {...} }); the service
// shallow-merges it into the existing JSON so other categories are untouched.
// ─────────────────────────────────────────────────────────────────────────────

export const preferencesSchema = z
  .object({
    notifications: z
      .object({
        apptReminders: z.boolean().optional(),
        labResults: z.boolean().optional(),
        aiInsights: z.boolean().optional(),
        reportReviews: z.boolean().optional(),
        emailNotifs: z.boolean().optional(),
        smsNotifs: z.boolean().optional(),
        pushNotifs: z.boolean().optional(),
        marketingEmails: z.boolean().optional(),
        weeklyDigest: z.boolean().optional(),
      })
      .partial()
      .optional(),
    privacy: z
      .object({
        dataSharing: z.boolean().optional(),
        researchOpt: z.boolean().optional(),
        analytics: z.boolean().optional(),
        thirdParty: z.boolean().optional(),
      })
      .partial()
      .optional(),
    accessibility: z
      .object({
        largeText: z.boolean().optional(),
        highContrast: z.boolean().optional(),
        reduceMotion: z.boolean().optional(),
        screenReader: z.boolean().optional(),
        keyboardNav: z.boolean().optional(),
        focusIndicators: z.boolean().optional(),
      })
      .partial()
      .optional(),
    language: z
      .object({
        language: z.string().trim().max(10).optional(),
        timezone: z.string().trim().max(50).optional(),
        dateFormat: z.string().trim().max(20).optional(),
      })
      .partial()
      .optional(),
  })
  .strict();

export type PreferencesDto = z.infer<typeof preferencesSchema>;
