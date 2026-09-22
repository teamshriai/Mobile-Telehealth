import type { Request, Response } from 'express';
import { hospitalAdminService } from './hospitalAdmin.service';
import {
  updateHospitalSchema,
  setDoctorActiveSchema,
  assignCareTeamSchema,
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
