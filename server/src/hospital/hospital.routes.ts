import { Router } from 'express';
import { listHospitals } from './hospital.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.get('/', authenticate, listHospitals);

export { router as hospitalRouter };
