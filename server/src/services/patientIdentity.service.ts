import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { generateShriPatientId } from '../utils/shriId';
import { hmacBlindIndex } from '../utils/encryption';
import { normalizeMobile } from '../utils/phone';

// ─────────────────────────────────────────────────────────────────────────────
// Patient Identity — shared generation helpers
//
// Two things every PatientProfile creation path needs, regardless of whether
// the patient is self-registering (auth module) or being registered by staff
// (patient module): a collision-safe shriPatientId, and a correctly-computed
// phoneNumberHash. Both paths import this file rather than duplicating the
// logic — the collision-retry loop in particular must not be reimplemented
// twice with subtly different behavior.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_GENERATION_ATTEMPTS = 5;

/** Prisma's error code for a unique-constraint violation. */
function isUniqueConstraintViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

function targetsColumn(err: unknown, column: string): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  const target = err.meta?.target;
  if (Array.isArray(target)) return target.includes(column);
  if (typeof target === 'string') return target.includes(column);
  return false;
}

/**
 * Generates a candidate value and attempts the given create operation with
 * it. On a unique-constraint collision targeting the named database column,
 * regenerates and retries; any other error propagates immediately.
 *
 * We do NOT pre-check availability with a SELECT: that is a TOCTOU race
 * (another request could claim the same id between the check and the
 * insert). Generate-then-attempt-insert is the only race-free approach with
 * a single-instance Postgres uniqueness constraint as the source of truth.
 *
 * At 32^6 ≈ 1.07 billion possible ids (the keyspace both `generateShriPatientId`
 * and the ENC-prefixed encounter visit ID share), the expected number of
 * retries at any realistic volume is effectively zero — this loop exists for
 * correctness under an astronomically unlikely event, not for throughput.
 *
 * Generic over the id-generator function so both the SHRI-AI Patient ID path
 * and the Encounter visit-ID path (see encounter.service.ts) share one
 * retry implementation rather than each hand-rolling its own — a collision
 * handled only for one of the two would be an inconsistency with no
 * principled reason behind it.
 */
async function withGeneratedId<T>(
  generateCandidate: () => string,
  targetColumn: string,
  attemptCreate: (candidate: string) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const candidate = generateCandidate();
    try {
      return await attemptCreate(candidate);
    } catch (err) {
      // Only retry on a genuine id collision. Any other error (a different
      // unique constraint, a validation failure, a connection error) must
      // propagate immediately — silently retrying those would mask real bugs
      // and could duplicate side effects.
      if (isUniqueConstraintViolation(err) && targetsColumn(err, targetColumn)) {
        continue;
      }
      throw err;
    }
  }

  throw new Error(
    `Failed to generate a unique value for "${targetColumn}" after ${MAX_GENERATION_ATTEMPTS} attempts.`,
  );
}

/** Thin, backward-compatible wrapper — the original call sites (auth
 *  self-registration, staff patient registration) keep their exact existing
 *  signature. */
export async function withGeneratedShriPatientId<T>(
  attemptCreate: (shriPatientId: string) => Promise<T>,
): Promise<T> {
  return withGeneratedId(generateShriPatientId, 'shri_patient_id', attemptCreate);
}

/**
 * Same collision-retry guarantee as withGeneratedShriPatientId, for
 * Encounter.visitId. The candidate generator reuses generateShriPatientId's
 * Crockford-Base32-plus-checksum scheme with the prefix swapped from
 * "SHRI-" to "ENC-" — same keyspace, same collision odds, same reason a
 * retry loop belongs here rather than a single unguarded insert.
 */
export async function withGeneratedVisitId<T>(
  attemptCreate: (visitId: string) => Promise<T>,
): Promise<T> {
  const generateVisitId = (): string => generateShriPatientId().replace('SHRI-', 'ENC-');
  return withGeneratedId(generateVisitId, 'visit_id', attemptCreate);
}

/**
 * Computes the blind-index hash for a mobile number, or null if the input
 * is absent or does not normalize to a valid Indian mobile number. Callers
 * must run every phone number through this exact function before writing —
 * never hash a raw, unnormalized string, or search-by-mobile will silently
 * fail to match.
 */
export function computePhoneNumberHash(rawPhone: string | null | undefined): string | null {
  if (rawPhone === null || rawPhone === undefined || rawPhone.trim() === '') return null;
  const normalized = normalizeMobile(rawPhone);
  return normalized ? hmacBlindIndex(normalized) : null;
}

/**
 * True if a SHRI-AI Patient ID is already in use. Used only for the rare
 * operational/support case of checking an id by hand — the registration
 * write path uses withGeneratedShriPatientId's generate-then-insert pattern,
 * never this check, to avoid the TOCTOU race described above.
 */
export async function shriPatientIdExists(shriPatientId: string): Promise<boolean> {
  const row = await prisma.patientProfile.findUnique({
    where: { shriPatientId },
    select: { id: true },
  });
  return row !== null;
}
