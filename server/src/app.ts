import express, { type Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import hpp from 'hpp';
import crypto from 'crypto';
import { corsOptions } from './config/cors.config';
import { httpLogger } from './utils/logger';
import { globalLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { env } from './config/env.config';
import { ApiResponseBuilder } from './utils/apiResponse';
import { authRouter } from './auth/auth.routes';
import { profileRouter } from './profile/profile.routes';
import { appointmentRouter } from './appointment/appointment.routes';
import { careTeamRouter } from './careteam/careteam.routes';
import { notificationRouter } from './notification/notification.routes';
import { clinicalNoteRouter } from './clinicalNote/clinicalNote.routes';
import { breakGlassRouter } from './breakGlass/breakGlass.routes';
import { prescriptionRouter } from './prescription/prescription.routes';
import { problemRouter } from './problem/problem.routes';
import { instructionRouter } from './instruction/instruction.routes';
import { templateRouter } from './template/template.routes';
import { aiRouter } from './ai/ai.routes';
import { doctorRouter } from './doctor/doctor.routes';
import { doctorSelfRouter } from './doctor/doctorSelf.routes';
import { patientRouter } from './patient/patient.routes';
import { encounterRouter } from './encounter/encounter.routes';
import { hospitalRouter } from './hospital/hospital.routes';
import { hospitalAdminRouter } from './hospitalAdmin/hospitalAdmin.routes';
import { adminRouter } from './admin/admin.routes';
import { feedbackRouter } from './feedback/feedback.routes';
import { portalRouter } from './portal/portal.routes';
import { healthNoteRouter } from './healthNote/healthNote.routes';

const HEALTH_NOTES_PATH = '/api/v1/me/health-notes';

// ─────────────────────────────────────────────────────────────────────────────
// App Factory
//
// Returns a configured Express application instance.
// Separating the app factory from server.ts makes the app testable in isolation
// without binding to a port.
// ─────────────────────────────────────────────────────────────────────────────

export function createApp(): Application {
  const app = express();

  // ── Security Headers ──────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
        },
      },
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31_536_000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  // ── CORS ──────────────────────────────────────────────────────────────────
  app.use(cors(corsOptions));

  // ── HTTP Parameter Pollution ──────────────────────────────────────────────
  app.use(hpp());

  // ── Compression ───────────────────────────────────────────────────────────
  app.use(compression());

  // ── Body Parsing ──────────────────────────────────────────────────────────
  // 10kb limit prevents large-payload DoS attacks.
  //
  // ⚠️ ONE EXCEPTION, AND ONLY ONE: a patient's health note. Its text cap is
  // 5,000 characters, and Indic scripts are ~3 bytes per character in UTF-8,
  // so a full-length Kannada note is ~15 kB before JSON overhead — the 10kb
  // limit would refuse notes the validator allows. The exception is by path
  // prefix, so no other route's limit moves. Audio is multipart and never
  // passes through this parser (see healthNote.routes.ts).
  const jsonDefault = express.json({ limit: '10kb' });
  const jsonHealthNotes = express.json({ limit: '64kb' });
  app.use((req, res, next) =>
    req.path.startsWith(HEALTH_NOTES_PATH)
      ? jsonHealthNotes(req, res, next)
      : jsonDefault(req, res, next),
  );
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // ── Cookie Parser ─────────────────────────────────────────────────────────
  app.use(cookieParser());

  // ── HTTP Logging ──────────────────────────────────────────────────────────
  app.use(httpLogger);

  // ── Request ID ────────────────────────────────────────────────────────────
  app.use((req, res, next) => {
    req.requestId = crypto.randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    next();
  });

  // ── Trust Proxy (for rate limiting behind Nginx/load balancer) ────────────
  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // ── Global Rate Limiter ───────────────────────────────────────────────────
  app.use('/api', globalLimiter);

  // ── Health Check ──────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.status(200).json(
      ApiResponseBuilder.success('Service is healthy.', {
        service: 'stroke-ai-server',
        environment: env.NODE_ENV,
        timestamp: new Date().toISOString(),
      }),
    );
  });

  // ── API Routes ────────────────────────────────────────────────────────────
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/profile', profileRouter);
  app.use('/api/v1/appointments', appointmentRouter);
  app.use('/api/v1/care-team', careTeamRouter);
  app.use('/api/v1/notifications', notificationRouter);
  app.use('/api/v1/notes', clinicalNoteRouter);
  app.use('/api/v1/breakglass', breakGlassRouter);
  app.use('/api/v1/prescriptions', prescriptionRouter);
  app.use('/api/v1/problems', problemRouter);
  app.use('/api/v1/instructions', instructionRouter);
  app.use('/api/v1/templates', templateRouter);
  app.use('/api/v1/ai', aiRouter);
  app.use('/api/v1/doctors', doctorRouter);
  app.use('/api/v1/doctor', doctorSelfRouter);
  app.use('/api/v1/patients', patientRouter);
  app.use('/api/v1/encounters', encounterRouter);
  app.use('/api/v1/hospitals', hospitalRouter);
  app.use('/api/v1/hospital-admin', hospitalAdminRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/feedback', feedbackRouter);
  // The patient's own record. Health notes first: its path is more specific.
  app.use(HEALTH_NOTES_PATH, healthNoteRouter);
  app.use('/api/v1/me', portalRouter);

  // ── 404 ───────────────────────────────────────────────────────────────────
  app.use(notFoundHandler);

  // ── Global Error Handler (must be last) ───────────────────────────────────
  app.use(errorHandler);

  return app;
}
