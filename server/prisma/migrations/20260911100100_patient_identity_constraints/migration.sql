-- Phase 6 — Migration B: enforce the shri_patient_id constraint.
--
-- MUST run only after prisma/scripts/backfill-patient-identity.ts has been
-- run against this database and reported every patient_profiles row
-- populated (its own exit code / row-count check is the gate). If any row
-- is still NULL, the SET NOT NULL below fails and the migration aborts —
-- that failure IS the verification; it is the safe outcome, not a bug to
-- work around by weakening this migration.

ALTER TABLE "patient_profiles" ALTER COLUMN "shri_patient_id" SET NOT NULL;
CREATE UNIQUE INDEX "patient_profiles_shri_patient_id_key" ON "patient_profiles"("shri_patient_id");
