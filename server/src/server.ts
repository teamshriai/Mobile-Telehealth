import { createApp } from './app';
import { env } from './config/env.config';
import { prisma } from './lib/prisma';

// ─────────────────────────────────────────────────────────────────────────────
// Server Entry Point
//
// Validates DB connectivity before accepting traffic.
// Implements graceful shutdown on SIGTERM / SIGINT.
// Handles unhandled rejections and uncaught exceptions — exits cleanly.
// ─────────────────────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  // Verify DB is reachable before opening the port
  await prisma.$connect();
  console.log('✅ Database connection established');

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log(`🚀 OncoTrace server running on port ${env.PORT} [${env.NODE_ENV.toUpperCase()}]`);
  });

  // ── Graceful Shutdown ──────────────────────────────────────────────────────
  const shutdown = (signal: string): void => {
    console.log(`\n${signal} received — shutting down gracefully...`);

    server.close(() => {
      prisma
        .$disconnect()
        .then(() => {
          console.log('✅ HTTP server closed. Database disconnected.');
          process.exit(0);
        })
        .catch(() => process.exit(0));
    });

    // Force exit if graceful shutdown stalls
    setTimeout(() => {
      console.error('⚠️  Graceful shutdown timed out. Forcing exit.');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });

  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });

  // ── Safety Nets ────────────────────────────────────────────────────────────
  process.on('unhandledRejection', (reason: unknown) => {
    console.error('[UnhandledRejection]', reason);
    process.exit(1);
  });

  process.on('uncaughtException', (err: Error) => {
    console.error('[UncaughtException]', err.message);
    process.exit(1);
  });
}

bootstrap().catch((err: unknown) => {
  console.error('❌ Server startup failed:', err);
  process.exit(1);
});
