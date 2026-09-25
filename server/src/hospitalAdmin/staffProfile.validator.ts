import { z } from 'zod';

export const updateStaffProfileSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    jobTitle: z.string().trim().max(150).optional(),
    department: z.string().trim().max(150).optional(),
    phoneNumber: z
      .string()
      .trim()
      .regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number.')
      .optional(),
  })
  .strict();

export type UpdateStaffProfileDto = z.infer<typeof updateStaffProfileSchema>;

export const createHospitalSchema = z.object({
  name: z.string().trim().min(2, 'Hospital name is required.').max(200),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
});

export type CreateHospitalDto = z.infer<typeof createHospitalSchema>;

export const joinHospitalSchema = z.object({
  hospitalId: z.string().uuid('Please select a valid hospital.'),
});

export type JoinHospitalDto = z.infer<typeof joinHospitalSchema>;

export const setDoctorActiveSchema = z.object({
  isActive: z.boolean(),
});

export type SetDoctorActiveDto = z.infer<typeof setDoctorActiveSchema>;

export const updateHospitalSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    city: z.string().trim().max(100).optional(),
    state: z.string().trim().max(100).optional(),
  })
  .strict();

export type UpdateHospitalDto = z.infer<typeof updateHospitalSchema>;

/**
 * Assigning a patient to a doctor's care team.
 *
 * `careRole` is free text on CareTeamMember (e.g. "Consultant Neurologist")
 * and forms part of its composite unique key, so it is required and trimmed —
 * a blank or whitespace-only role would create a second, indistinguishable
 * membership for the same pair.
 */
export const assignCareTeamSchema = z
  .object({
    patientId: z.string().uuid('Please choose a valid patient.'),
    doctorId: z.string().uuid('Please choose a valid doctor.'),
    careRole: z
      .string()
      .trim()
      .min(2, 'Please describe the care role.')
      .max(100, 'Please keep the care role under 100 characters.'),
    isPrimary: z.boolean().optional().default(false),
  })
  .strict();

export type AssignCareTeamDto = z.infer<typeof assignCareTeamSchema>;

/**
 * Provisioning a doctor.
 *
 * ⚠️ NO PASSWORD FIELD, and that is the design. The account authenticates by
 * mobile + OTP, so an administrator never handles a credential for somebody
 * else — which removes the "share the temporary password over WhatsApp" step
 * that undoes most onboarding security.
 *
 * ⚠️ The mobile regex is the SAME one the login box and the profile writer
 * use. An admin who could register a number the login box cannot parse would
 * be creating an account that can never sign in.
 */
/**
 * ⚠️ A CLOSED SET, AND THE OMISSIONS ARE THE POINT. `HospitalAdmin` and
 * `Admin` are absent: a hospital administrator must not be able to create a
 * peer or a superior, because that turns one compromised admin account into
 * every admin account. Creating a HospitalAdmin is a super-admin act
 * (`POST /admin/hospital-admins`); creating an Admin is a CLI act.
 *
 * `Resident` needs no special handling beyond this enum — it is a
 * `DoctorProfile` with a different `roleId`, exactly as the clinical seed
 * builds it. `HealthcareWorker` and `LabTechnician` use `StaffProfile`.
 */
export const PROVISIONABLE_ROLES = [
  'Doctor',
  'Resident',
  'HealthcareWorker',
  'LabTechnician',
] as const;

export const provisionStaffSchema = z
  .object({
    role: z.enum(PROVISIONABLE_ROLES).default('Doctor'),
    firstName: z.string().trim().min(1, 'First name is required.').max(80),
    lastName: z.string().trim().min(1, 'Last name is required.').max(80),
    email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
    mobile: z
      .string()
      .trim()
      .regex(
        /^(\+91[\s-]?)?[6-9]\d{9}$/,
        'Enter a 10-digit Indian mobile number starting 6, 7, 8 or 9.',
      ),
    /** Required for a clinician; a job title for other staff. */
    specialty: z.string().trim().min(2).max(120),
    registrationNumber: z.string().trim().min(3).max(60).optional(),
    qualifications: z.string().trim().max(200).optional(),
    /**
     * ⚠️ REQUIRED, and it is the field the first version forgot.
     * `doctorProfileService.completeOnboarding` refuses unless
     * `yearsExperience` is set, so a provisioned doctor was dumped into the
     * onboarding screen and blocked there — by the one value the provisioning
     * form never asked for. Collecting it here is what lets a provisioned
     * clinician go straight to work.
     */
    yearsExperience: z.coerce.number().int().min(0).max(70),
  })
  .strict();

export type ProvisionStaffDto = z.infer<typeof provisionStaffSchema>;
