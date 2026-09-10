import { z } from 'zod';
import {
  Gender,
  BloodGroup,
  MaritalStatus,
  SmokingStatus,
  AlcoholStatus,
  TobaccoStatus,
  PhysicalActivity,
} from '@prisma/client';

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

// ─────────────────────────────────────────────────────────────────────────────
// Health History Schema
//
// These columns already existed on PatientProfile and were already encrypted
// at rest — but they were absent from both updateProfileSchema and the read
// shaper, so a patient could neither see nor set them. This schema is what
// makes them reachable.
//
// Kept SEPARATE from updateProfileSchema on purpose: identity/contact details
// and medical information are different kinds of data with different
// sensitivity, and the UI presents them as different tasks. One combined
// endpoint would also mean a contact-details save had to round-trip the
// patient's medical summary.
//
// Every field is free text rather than a normalised table. That matches the
// existing column design and is honest about what it is: a patient-authored
// summary, not a structured clinical record. Normalising it is a later
// decision that needs a real clinical requirement behind it.
// ─────────────────────────────────────────────────────────────────────────────

/** Free-text medical summary field: trimmed, capped, clearable with null. */
const medicalText = (max = 1000) =>
  z.string().trim().max(max, `Please keep this under ${max} characters.`).nullable().optional();

export const updateHealthHistorySchema = z.object({
  knownAllergies: medicalText(),
  currentMedications: medicalText(),
  existingDiseases: medicalText(),
  familyHistory: medicalText(),
  previousSurgeries: medicalText(),

  smokingStatus: z.nativeEnum(SmokingStatus).nullable().optional(),
  alcoholStatus: z.nativeEnum(AlcoholStatus).nullable().optional(),
  tobaccoStatus: z.nativeEnum(TobaccoStatus).nullable().optional(),
  physicalActivity: z.nativeEnum(PhysicalActivity).nullable().optional(),

  occupation: z
    .string()
    .trim()
    .max(100, 'Please keep this under 100 characters.')
    .nullable()
    .optional(),
});

export type UpdateHealthHistoryDto = z.infer<typeof updateHealthHistorySchema>;
