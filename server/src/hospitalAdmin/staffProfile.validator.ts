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
