import type { Request, Response } from 'express';
import { z } from 'zod';
import { hospitalAdminService } from './hospitalAdmin.service';
import { appointmentApproval, approveSchema, declineSchema } from './appointmentApproval';
import { refillQueue, forwardSchema, declineRefillSchema } from './refillQueue';
import {
  updateHospitalSchema,
  setDoctorActiveSchema,
  assignCareTeamSchema,
  provisionStaffSchema,
} from './staffProfile.validator';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { getRequestMeta } from '../utils/requestMeta';
import { AppError } from '../middleware/errorHandler';

export const getOwnHospital = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const hospital = await hospitalAdminService.getOwnHospital(req.user!.id);
  res.status(200).json(ApiResponseBuilder.success('Hospital retrieved.', { hospital }));
});

export const updateOwnHospital = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const dto = updateHospitalSchema.parse(req.body);
    const hospital = await hospitalAdminService.updateOwnHospital(req.user!.id, dto);
    res.status(200).json(ApiResponseBuilder.success('Hospital updated.', { hospital }));
  },
);

export const listHospitalDoctors = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const doctors = await hospitalAdminService.listDoctors(req.user!.id);
    res.status(200).json(ApiResponseBuilder.success('Doctors retrieved.', { doctors }));
  },
);

/**
 * POST /api/v1/hospital-admin/doctors
 *
 * ⚠️ The response never echoes the mobile number back in full, and never
 * contains a credential — there isn't one. The provisioned doctor signs in by
 * setting a password through the emailed invitation link.
 */
export const provisionHospitalStaff = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const dto = provisionStaffSchema.parse(req.body);
    const created = await hospitalAdminService.provisionStaff(
      req.user!.id,
      dto,
      getRequestMeta(req),
    );
    res.status(201).json(
      ApiResponseBuilder.success(
        created.inviteSent
          ? `${dto.role} added. A link to set their password has been emailed to them.`
          : `${dto.role} added. The set-password email could not be sent — they can use `
            + '"Forgot password" on the sign-in page with the email you registered.',
        created,
      ),
    );
  },
);

export const verifyHospitalDoctor = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const doctorId = req.params.doctorId;
    if (doctorId === undefined) throw new AppError('Doctor id is required.', 400);
    await hospitalAdminService.verifyDoctor(req.user!.id, doctorId, getRequestMeta(req));
    res.status(200).json(ApiResponseBuilder.success('Doctor verified.'));
  },
);

export const setHospitalDoctorActive = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const doctorId = req.params.doctorId;
    if (doctorId === undefined) throw new AppError('Doctor id is required.', 400);
    const { isActive } = setDoctorActiveSchema.parse(req.body);

    await hospitalAdminService.setDoctorActive(
      req.user!.id,
      doctorId,
      isActive,
      getRequestMeta(req),
    );
    res
      .status(200)
      .json(ApiResponseBuilder.success(isActive ? 'Doctor activated.' : 'Doctor deactivated.'));
  },
);

export const listHospitalPatients = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const patients = await hospitalAdminService.listPatients(req.user!.id);
    res.status(200).json(ApiResponseBuilder.success('Patients retrieved.', { patients }));
  },
);

export const listHospitalAppointments = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const appointments = await hospitalAdminService.listAppointments(req.user!.id);
    res.status(200).json(ApiResponseBuilder.success('Appointments retrieved.', { appointments }));
  },
);

export const approveHospitalAppointment = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const id = z.string().uuid('Invalid appointment reference.').parse(req.params.id);
    const dto = approveSchema.parse(req.body ?? {});
    const appointment = await appointmentApproval.approve(req.user!.id, id, dto, getRequestMeta(req));
    res.status(200).json(ApiResponseBuilder.success('Appointment approved.', { appointment }));
  },
);

export const declineHospitalAppointment = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const id = z.string().uuid('Invalid appointment reference.').parse(req.params.id);
    const dto = declineSchema.parse(req.body ?? {});
    const appointment = await appointmentApproval.decline(req.user!.id, id, dto, getRequestMeta(req));
    res.status(200).json(ApiResponseBuilder.success('Appointment request declined.', { appointment }));
  },
);

export const listRefillRequests = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const [refills, doctors] = await Promise.all([refillQueue.list(req.user!.id), refillQueue.doctors(req.user!.id)]);
  res.status(200).json(ApiResponseBuilder.success('Refill requests retrieved.', { refills, doctors }));
});

export const forwardRefillRequest = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = z.string().uuid('Invalid reference.').parse(req.params.id);
  const refill = await refillQueue.forward(req.user!.id, id, forwardSchema.parse(req.body ?? {}), getRequestMeta(req));
  res.status(200).json(ApiResponseBuilder.success('Refill request sent to the doctor.', { refill }));
});

export const declineRefillRequest = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = z.string().uuid('Invalid reference.').parse(req.params.id);
  const refill = await refillQueue.decline(req.user!.id, id, declineRefillSchema.parse(req.body ?? {}), getRequestMeta(req));
  res.status(200).json(ApiResponseBuilder.success('Refill request declined.', { refill }));
});

export const getHospitalAnalytics = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const analytics = await hospitalAdminService.getAnalytics(req.user!.id);
    res.status(200).json(ApiResponseBuilder.success('Analytics retrieved.', { analytics }));
  },
);

export const listHospitalFeedback = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await hospitalAdminService.listFeedback(req.user!.id);
    res.status(200).json(ApiResponseBuilder.success('Feedback retrieved.', result));
  },
);

export const listPatientCareTeam = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const patientId = req.params.patientId;
    if (patientId === undefined) throw new AppError('Patient id is required.', 400);
    const careTeam = await hospitalAdminService.listCareTeam(req.user!.id, patientId);
    res.status(200).json(ApiResponseBuilder.success('Care team retrieved.', { careTeam }));
  },
);

export const assignPatientCareTeam = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const dto = assignCareTeamSchema.parse(req.body);
    const membership = await hospitalAdminService.assignCareTeam(
      req.user!.id,
      dto,
      getRequestMeta(req),
    );
    res.status(201).json(ApiResponseBuilder.success('Care team updated.', { membership }));
  },
);

export const endPatientCareTeam = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    if (id === undefined) throw new AppError('Assignment id is required.', 400);
    await hospitalAdminService.endCareTeam(req.user!.id, id, getRequestMeta(req));
    res.status(200).json(ApiResponseBuilder.success('Care team assignment ended.'));
  },
);
