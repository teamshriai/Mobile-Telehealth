import { z } from 'zod';
import { Gender, RegistrationSource } from '@prisma/client';
import { normalizeMobile } from '../utils/phone';
import { isValidShriPatientId, normalizeShriPatientId } from '../utils/shriId';

// ─────────────────────────────────────────────────────────────────────────────
// Patient Registration & Search Validation
//
// Two schemas govern the entire module's input surface: registerPatientSchema
// (creating a patient, with or without a login account) and
// searchPatientsSchema (finding one). Both are deliberately strict — this is
// the module through which a stranger to the system (an ambulance worker, a
// clinic front desk) first touches patient data, so validation here carries
// more weight than almost anywhere else in the codebase.
// ─────────────────────────────────────────────────────────────────────────────

const phoneSchema = z
  .string()
  .trim()
  .refine(
    (val) => normalizeMobile(val) !== null,
    'Please enter a valid 10-digit Indian mobile number (e.g. +91 9876543210 or 9876543210).',
  );

/** 14-digit ABHA number, digits only (the format ABDM issues today). */
const abhaIdSchema = z
  .string()
  .trim()
  .regex(/^\d{14}$/, 'Please enter a valid 14-digit ABHA number.');

export const registerPatientSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    middleName: z.string().trim().max(100).nullable().optional(),
    lastName: z.string().trim().min(1).max(100).optional(),

    // Nullable/estimated for the case a DOB genuinely cannot be obtained
    // (an unconscious patient with no accompanying family). dobIsEstimated
    // distinguishes a real recorded value from a clinician's best guess —
    // age-based dosing decisions must know which they are looking at.
    dateOfBirth: z
      .string()
      .refine((val) => !Number.isNaN(new Date(val).getTime()), 'Please enter a valid date.')
      .refine(
        (val) => new Date(val).getTime() <= Date.now(),
        'Date of birth cannot be in the future.',
      )
      .nullable()
      .optional(),
    dobIsEstimated: z.boolean().default(false),

    gender: z.nativeEnum(Gender).optional(),

    mobile: phoneSchema.nullable().optional(),
    abhaId: abhaIdSchema.nullable().optional(),

    village: z.string().trim().max(120).nullable().optional(),
    district: z.string().trim().max(120).nullable().optional(),
    state: z.string().trim().max(120).nullable().optional(),

    emergencyContactName: z.string().trim().max(120).nullable().optional(),
    emergencyContactPhone: phoneSchema.nullable().optional(),

    registrationSource: z.nativeEnum(RegistrationSource),

    /** True when the patient could not identify themselves at intake. */
    isUnidentified: z.boolean().default(false),

    /**
     * Set only after the caller has already seen the duplicate-candidate
     * list from a prior attempt (or a client-side pre-check) and confirmed
     * this is genuinely a new patient. Bypasses the `moderate`-confidence
     * refusal in patient.identity.service — never the `strong` one; see
     * that service for the full policy.
     */
    acknowledgedDuplicates: z.boolean().default(false),
  })
  .refine(
    (data) => data.isUnidentified === true || (Boolean(data.firstName) && Boolean(data.lastName)),
    {
      message: 'A first and last name are required unless the patient is unidentified.',
      path: ['firstName'],
    },
  );

export type RegisterPatientDto = z.infer<typeof registerPatientSchema>;

const shriIdFieldSchema = z
  .string()
  .trim()
  .transform((val) => normalizeShriPatientId(val))
  .refine(
    (val) => isValidShriPatientId(val),
    'That does not look like a valid SHRI-AI Patient ID.',
  );

/**
 * `by` selects exactly one search mode; the corresponding field must be
 * present, and — for name search specifically — accompanied by enough other
 * detail to be a genuine lookup rather than a population scan. This second
 * rule is a SECURITY control, not a UX nicety: `by: 'name', lastName: 'a'`
 * would otherwise let any authorized caller enumerate the patient population
 * one broad query at a time.
 */
export const searchPatientsSchema = z
  .object({
    by: z.enum(['abha', 'mobile', 'shriId', 'name']),

    abha: abhaIdSchema.optional(),
    mobile: phoneSchema.optional(),
    shriId: shriIdFieldSchema.optional(),
    lastName: z.string().trim().min(2).max(100).optional(),
    firstName: z.string().trim().min(1).max(100).optional(),
    dateOfBirth: z
      .string()
      .refine((val) => !Number.isNaN(new Date(val).getTime()), 'Please enter a valid date.')
      .optional(),

    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
  })
  .refine(
    (data) => {
      if (data.by === 'abha') return Boolean(data.abha);
      if (data.by === 'mobile') return Boolean(data.mobile);
      if (data.by === 'shriId') return Boolean(data.shriId);
      return true; // 'name' checked by the next refine
    },
    { message: 'The value for the selected search type is required.', path: ['by'] },
  )
  .refine(
    (data) => {
      if (data.by !== 'name') return true;
      return Boolean(data.lastName) && (Boolean(data.firstName) || Boolean(data.dateOfBirth));
    },
    {
      message: 'Name search needs a surname plus either a given name or a date of birth.',
      path: ['lastName'],
    },
  );

export type SearchPatientsDto = z.infer<typeof searchPatientsSchema>;
