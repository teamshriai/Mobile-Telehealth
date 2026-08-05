import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.config';

// ─────────────────────────────────────────────────────────────────────────────
// PrismaClient Singleton
//
// Prevents multiple PrismaClient instances during development hot-reloads.
// In production, a single instance is created and reused for the process lifetime.
// ─────────────────────────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

if (env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}
