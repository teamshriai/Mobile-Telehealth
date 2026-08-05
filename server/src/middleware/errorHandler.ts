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
        ),
      );
    return;
  }

  // ── JWT Errors ──────────────────────────────────────────────────────────
  if (err instanceof TokenExpiredError) {
    res.status(401).json(ApiResponseBuilder.error('Session expired. Please log in again.'));
    return;
  }

  if (err instanceof JsonWebTokenError) {
    res.status(401).json(ApiResponseBuilder.error('Invalid authentication token.'));
    return;
  }

  // ── Prisma Known Errors ─────────────────────────────────────────────────
  // Duck-typed check: works before and after `prisma generate`.
  // Prisma known errors always carry a `code` string field.
  if (err.constructor.name === 'PrismaClientKnownRequestError' && 'code' in err) {
    const prismaErr = err as Error & { code: string };
    if (prismaErr.code === 'P2002') {
      res.status(409).json(ApiResponseBuilder.error('A record with this value already exists.'));
      return;
    }
    if (prismaErr.code === 'P2025') {
      res.status(404).json(ApiResponseBuilder.error('Record not found.'));
      return;
    }
    res.status(400).json(ApiResponseBuilder.error('Database operation failed.'));
    return;
  }

  // ── Operational Errors (AppError) ───────────────────────────────────────
  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json(ApiResponseBuilder.error(err.message));
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
      ),
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// 404 Handler — registered after all routes, before errorHandler
// ─────────────────────────────────────────────────────────────────────────────

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json(ApiResponseBuilder.error(`Route ${req.method} ${req.url} not found.`));
};
