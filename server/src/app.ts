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
  // 10kb limit prevents large-payload DoS attacks
  app.use(express.json({ limit: '10kb' }));
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
        service: 'oncotrace-server',
        environment: env.NODE_ENV,
        timestamp: new Date().toISOString(),
      }),
    );
  });

  // ── API Routes ────────────────────────────────────────────────────────────
  app.use('/api/v1/auth', authRouter);

  // ── 404 ───────────────────────────────────────────────────────────────────
  app.use(notFoundHandler);

  // ── Global Error Handler (must be last) ───────────────────────────────────
  app.use(errorHandler);

  return app;
}
