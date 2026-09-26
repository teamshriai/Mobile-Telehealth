-- ============================================================================
-- Patient portal — medicines: dose logging, refill requests, AI summary cache.
--
-- ⚠️ ADDITIVE ONLY. Three new tables, two new enums, eight appended audit
-- actions. No existing column changes.
--
-- ⚠️ `medication_dose_logs` holds only what the PATIENT reported. A scheduled
-- dose with no row is "missed" by derivation; nothing is stored for it.
--
-- ⚠️ Hand-written: a generated diff also proposes dropping and renaming three
-- unrelated indexes (pre-existing drift), deliberately left out.
-- ============================================================================

CREATE TYPE "dose_log_status" AS ENUM ('Taken', 'Skipped');
CREATE TYPE "refill_status" AS ENUM ('Requested', 'Forwarded', 'Fulfilled', 'Declined', 'Cancelled');
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'DoseLogged';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'DoseLogRemoved';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'RefillRequested';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'RefillForwarded';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'RefillDeclined';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'RefillCancelled';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'RefillFulfilled';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'MedicationSummaryGenerated';
CREATE TABLE "medication_dose_logs" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "prescription_item_id" UUID NOT NULL,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "status" "dose_log_status" NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "medication_dose_logs_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "refill_requests" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "prescription_item_id" UUID NOT NULL,
    "status" "refill_status" NOT NULL DEFAULT 'Requested',
    "note" TEXT,
    "decline_reason" TEXT,
    "forwarded_to_user_id" UUID,
    "forwarded_to_name" TEXT,
    "handled_by_user_id" UUID,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "refill_requests_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "medication_summary_cache" (
    "patient_id" UUID NOT NULL,
    "context_hash" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "medication_summary_cache_pkey" PRIMARY KEY ("patient_id")
);
CREATE INDEX "medication_dose_logs_patient_id_scheduled_for_idx" ON "medication_dose_logs"("patient_id", "scheduled_for");
CREATE UNIQUE INDEX "medication_dose_logs_prescription_item_id_scheduled_for_key" ON "medication_dose_logs"("prescription_item_id", "scheduled_for");
CREATE INDEX "refill_requests_patient_id_status_idx" ON "refill_requests"("patient_id", "status");
CREATE INDEX "refill_requests_status_requested_at_idx" ON "refill_requests"("status", "requested_at");
ALTER TABLE "medication_dose_logs" ADD CONSTRAINT "medication_dose_logs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "medication_dose_logs" ADD CONSTRAINT "medication_dose_logs_prescription_item_id_fkey" FOREIGN KEY ("prescription_item_id") REFERENCES "prescription_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refill_requests" ADD CONSTRAINT "refill_requests_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refill_requests" ADD CONSTRAINT "refill_requests_prescription_item_id_fkey" FOREIGN KEY ("prescription_item_id") REFERENCES "prescription_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "medication_summary_cache" ADD CONSTRAINT "medication_summary_cache_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- At most ONE open refill request per medicine line. Prisma cannot express a
-- partial unique index, so it lives here only: a double-tap, or two devices,
-- cannot queue the same request twice for the hospital administrator.
CREATE UNIQUE INDEX "refill_requests_one_open_per_item"
    ON "refill_requests"("prescription_item_id")
    WHERE "status" IN ('Requested', 'Forwarded');
