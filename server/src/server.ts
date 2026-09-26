import { createApp } from './app';
import { env } from './config/env.config';
import { prisma } from './lib/prisma';
import { transcriptionService } from './transcription/transcription.service';
import { healthNoteService } from './healthNote/healthNote.service';

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

  // ⚠️ A production server configured for local speech-to-text must have the
  // verified model on disk BEFORE it takes traffic — finding out on a
  // patient's first recording is too late. Outside production a missing model
  // only disables voice (the portal offers typed notes and says why).
  if (env.NODE_ENV === 'production') {
    await transcriptionService.assertReady();
  } else {
    transcriptionService.assertReady().catch((err: unknown) => {
      console.warn(`⚠️  Voice health notes unavailable: ${(err as Error).message}`);
    });
  }

  // Unconfirmed voice drafts (audio included) are not kept beyond 24 hours.
  void healthNoteService.purgeStaleDrafts();
  setInterval(() => void healthNoteService.purgeStaleDrafts(), 60 * 60 * 1000).unref();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log(`🚀 SHRI HEALTH server running on port ${env.PORT} [${env.NODE_ENV.toUpperCase()}]`);
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
