-- Query performance indexes — Phase 7.
--
-- Additive only: three CREATE INDEX statements, no drops, no data changes, no
-- constraint changes. Safe to run against a live database; safe to re-run.
--
-- CONCURRENTLY is deliberately NOT used: Prisma Migrate wraps each migration
-- in a transaction, and CREATE INDEX CONCURRENTLY cannot run inside one. The
-- tables involved are small at this stage; if that stops being true, these
-- should be re-issued concurrently by hand outside the migration runner.

-- ── 1 + 2. Case-insensitive patient name search ──────────────────────────────
-- patient.repository.searchByName and patient.identity.service both match with
-- Prisma's `mode: 'insensitive'`, which compiles to ILIKE. ILIKE cannot use the
-- plain B-tree @@index([lastName, firstName]) — despite an in-code comment that
-- claimed it could — so every patient registration was sequentially scanning
-- patient_profiles as part of duplicate detection.
--
-- Functional indexes on the lowered columns are what ILIKE can actually use,
-- for both equality (identity matching) and prefix (`startsWith`) search.
CREATE INDEX IF NOT EXISTS "patient_profiles_lower_last_first_idx"
  ON "patient_profiles" (LOWER("last_name"), LOWER("first_name"));

-- text_pattern_ops is required for a prefix (LIKE 'x%') scan to use an index
-- on installations whose collation is not C.
CREATE INDEX IF NOT EXISTS "patient_profiles_lower_last_pattern_idx"
  ON "patient_profiles" (LOWER("last_name") text_pattern_ops);

-- ── 3. Bookable clinician directory ──────────────────────────────────────────
-- doctor.repository.listBookable filters on (deleted_at IS NULL, is_verified)
-- and sorts by (specialty, last_name); neither predicate column was indexed.
-- A partial index keeps it small — soft-deleted and unverified rows are never
-- in the result set, so they do not belong in the index either.
CREATE INDEX IF NOT EXISTS "doctor_profiles_bookable_idx"
  ON "doctor_profiles" ("specialty", "last_name")
  WHERE "deleted_at" IS NULL AND "is_verified" = true;
