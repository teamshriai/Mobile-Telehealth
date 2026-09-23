import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { env } from '../config/env.config';

// ─────────────────────────────────────────────────────────────────────────────
// AppError — Operational Error Class
//
// Throw AppError for expected failures (invalid credentials, not found, etc.).
// Unexpected errors (programming errors) bubble up as generic 500s.
// ─────────────────────────────────────────────────────────────────────────────

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * The one refusal that is NOT uniform.
 *
 * ⚠️ UI_ATLAS §3.2 / DD-014. A clinician who holds the capability but has no
 * care relationship with an EXISTING patient is not refused — they are offered
 * break-glass. Every other cause of refusal (wrong role, no such patient,
 * deleted patient) keeps the uniform 404 in careRelationship.service, because
 * a refusal that distinguishes its causes is a relationship-existence oracle.
 *
 * This deliberately does reveal, to a capability-holder only, that a patient
 * exists. That is the trade the atlas makes on purpose: "an authorization
 * model that can block resuscitation is the wrong model."
 */
export class BreakGlassRequiredError extends AppError {
  /**
   * The UHID is carried on the error because the caller may not have it.
   * A clinician who opened `/encounter/VIS-…/note` from a handover list holds
   * a VISIT id, not a patient id, and the break-glass gate cannot ask for a
   * reason about a patient it cannot name. This reveals nothing the 403
   * itself does not already reveal: only a capability-holder ever sees it,
   * and by then the existence of the patient is established.
   */
  readonly shriPatientId?: string;

  constructor(message = 'No care relationship with this patient.', shriPatientId?: string) {
    super(message, 403);
    this.name = 'BreakGlassRequiredError';
    this.shriPatientId = shriPatientId;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Global Error Handler
// Must be registered as the LAST middleware in app.ts.
// All errors — thrown or forwarded via next(err) — flow here.
// ─────────────────────────────────────────────────────────────────────────────

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // ── Zod Validation Error ────────────────────────────────────────────────
  if (err instanceof ZodError) {
    res
      .status(400)
      .json(
        ApiResponseBuilder.error(
          'Validation failed.',
          err.flatten().fieldErrors as Record<string, string[]>,
          req.requestId,
        ),
      );
    return;
  }

  // ── JWT Errors ──────────────────────────────────────────────────────────
  if (err instanceof TokenExpiredError) {
    res
      .status(401)
      .json(
        ApiResponseBuilder.error('Session expired. Please log in again.', undefined, req.requestId),
      );
    return;
  }

  if (err instanceof JsonWebTokenError) {
    res
      .status(401)
      .json(ApiResponseBuilder.error('Invalid authentication token.', undefined, req.requestId));
    return;
  }

  // ── Prisma Known Errors ─────────────────────────────────────────────────
  // Duck-typed check: works before and after `prisma generate`.
  // Prisma known errors always carry a `code` string field.
  if (err.constructor.name === 'PrismaClientKnownRequestError' && 'code' in err) {
    const prismaErr = err as Error & { code: string };
    if (prismaErr.code === 'P2002') {
      res
        .status(409)
        .json(
          ApiResponseBuilder.error(
            'A record with this value already exists.',
            undefined,
            req.requestId,
          ),
        );
      return;
    }
    if (prismaErr.code === 'P2025') {
      res.status(404).json(ApiResponseBuilder.error('Record not found.', undefined, req.requestId));
      return;
    }
    res
      .status(400)
      .json(ApiResponseBuilder.error('Database operation failed.', undefined, req.requestId));
    return;
  }

  // ── Operational Errors (AppError) ───────────────────────────────────────
  // Must be tested BEFORE the generic AppError branch — it is a subclass.
  if (err instanceof BreakGlassRequiredError) {
    res
      .status(err.statusCode)
      .json(ApiResponseBuilder.breakGlassRequired(err.message, req.requestId, err.shriPatientId));
    return;
  }

  if (err instanceof AppError && err.isOperational) {
    res
      .status(err.statusCode)
      .json(ApiResponseBuilder.error(err.message, undefined, req.requestId));
    return;
  }

  // ── Unknown / Programming Errors ────────────────────────────────────────
  // Log internally, never expose stack trace or internal message to client
  console.error(`[ERROR] ${req.method} ${req.url}`, {
    message: err.message,
    stack: err.stack,
    requestId: req.requestId,
  });

  res
    .status(500)
    .json(
      ApiResponseBuilder.error(
        env.NODE_ENV === 'production'
          ? 'An unexpected error occurred. Please try again later.'
          : err.message,
        undefined,
        req.requestId,
      ),
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// 404 Handler — registered after all routes, before errorHandler
// ─────────────────────────────────────────────────────────────────────────────

export const notFoundHandler = (req: Request, res: Response): void => {
  res
    .status(404)
    .json(
      ApiResponseBuilder.error(
        `Route ${req.method} ${req.url} not found.`,
        undefined,
        req.requestId,
      ),
    );
};
