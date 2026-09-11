-- Phase 6 — Migration A: additive identity columns.
--
-- Safe on all existing rows. Nothing here can fail against live data:
--   - shri_patient_id is added NULLABLE (no NOT NULL, no UNIQUE yet). The
--     backfill script populates it; Migration B adds the constraint once
--     the backfill is verified complete. This column CANNOT be populated
--     here because the Crockford-Base32 ID generator and its checksum live
--     in TypeScript (server/src/utils/shriId.ts) — reimplementing that
--     algorithm in PL/pgSQL would mean two independent implementations of a
--     checksum that must agree forever, which is a guaranteed future bug.
--   - phone_number_hash is likewise NULLABLE and NOT populated here. It is
--     mathematically impossible to populate in SQL: phoneNumber is
--     AES-256-GCM encrypted with a random IV per value, and the HMAC key
--     that would derive the hash lives in BLIND_INDEX_KEY in the
--     application environment, never in the database. Only Node code with
--     access to that env var can compute it.
--   - ALTER COLUMN ... DROP NOT NULL is a metadata-only change on PG 11+;
--     no table rewrite, no row scan. All 8 existing patient_profiles rows
--     already satisfy "non-null", so nothing changes for them.
--   - ADD COLUMN ... NOT NULL DEFAULT <literal> is also metadata-only on
--     PG 11+ (the default is stored in the catalog, not backfilled row by
--     row), so dob_is_estimated/identity_status/registration_source are
--     safe even on a large table.
--
-- Verified against live data before writing this file:
--   prisma migrate diff (schema vs live DB) reported "This is an empty
--   migration" — no drift. 8 patient_profiles rows, 0 with a null user_id,
--   0 with a null date_of_birth, 4 with a phone_number (only 3 distinct
--   after normalization — this is WHY phone_number_hash is not @unique).

-- CreateEnum
CREATE TYPE "registration_source" AS ENUM ('SelfRegistered', 'StaffRegistered', 'FieldRegistered', 'Imported');

-- CreateEnum
CREATE TYPE "identity_status" AS ENUM ('Unverified', 'Provisional', 'Verified', 'MergedAway');

-- AlterTable: relax NOT NULL, add new nullable/defaulted columns.
-- shri_patient_id is intentionally NULLABLE here — see header comment.
ALTER TABLE "patient_profiles"
  ALTER COLUMN "user_id" DROP NOT NULL,
  ALTER COLUMN "date_of_birth" DROP NOT NULL,
  ADD COLUMN "shri_patient_id" TEXT,
  ADD COLUMN "phone_number_hash" TEXT,
  ADD COLUMN "dob_is_estimated" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "registration_source" "registration_source" NOT NULL DEFAULT 'SelfRegistered',
  ADD COLUMN "registered_by_user_id" UUID,
  ADD COLUMN "identity_status" "identity_status" NOT NULL DEFAULT 'Unverified';

-- CreateIndex (non-unique — safe to create immediately, no constraint risk)
CREATE INDEX "patient_profiles_phone_number_hash_idx" ON "patient_profiles"("phone_number_hash");
CREATE INDEX "patient_profiles_date_of_birth_idx" ON "patient_profiles"("date_of_birth");
CREATE INDEX "patient_profiles_registration_source_created_at_idx" ON "patient_profiles"("registration_source", "created_at");
