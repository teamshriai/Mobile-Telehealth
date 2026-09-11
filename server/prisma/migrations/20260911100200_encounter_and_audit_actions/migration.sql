-- Phase 6 — Migration C: Encounter model + new AuditAction values.
--
-- Entirely additive: new enums, one new table, new indexes/FKs referencing
-- existing tables (patient_profiles, appointments) with no ALTER on those
-- tables themselves in this file. Zero impact on existing rows.
--
-- The 10 ALTER TYPE ... ADD VALUE statements only add enum labels; no row
-- anywhere is inserted or updated using them in this migration, so the
-- Postgres restriction on using a new enum value within the same
-- transaction it was added in (relevant on some PG versions) does not
-- apply here. The Phase 2 migration already added three audit_action
-- values in one migration on this same database — a proven pattern.

-- CreateEnum
CREATE TYPE "encounter_type" AS ENUM ('ClinicVisit', 'AmbulanceIntake', 'Emergency', 'Telehealth', 'FollowUp', 'Screening', 'FieldRegistration');

-- CreateEnum
CREATE TYPE "encounter_status" AS ENUM ('InProgress', 'Completed', 'Cancelled');

-- AlterEnum: extend audit_action with Phase 6 values.
ALTER TYPE "audit_action" ADD VALUE 'PatientRegistered';
ALTER TYPE "audit_action" ADD VALUE 'PatientSearched';
ALTER TYPE "audit_action" ADD VALUE 'PatientRecordViewed';
ALTER TYPE "audit_action" ADD VALUE 'PatientDuplicateDetected';
ALTER TYPE "audit_action" ADD VALUE 'PatientDuplicateAcknowledged';
ALTER TYPE "audit_action" ADD VALUE 'PatientAccountLinked';
ALTER TYPE "audit_action" ADD VALUE 'EncounterCreated';
ALTER TYPE "audit_action" ADD VALUE 'EncounterClosed';
ALTER TYPE "audit_action" ADD VALUE 'AssessmentCreated';
ALTER TYPE "audit_action" ADD VALUE 'AssessmentUpdated';

-- CreateTable
CREATE TABLE "encounters" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "visit_id" TEXT NOT NULL,
    "type" "encounter_type" NOT NULL,
    "status" "encounter_status" NOT NULL DEFAULT 'InProgress',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "location_name" TEXT,
    "created_by_user_id" UUID,
    "appointment_id" UUID,
    "chief_complaint" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "encounters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "encounters_visit_id_key" ON "encounters"("visit_id");
CREATE UNIQUE INDEX "encounters_appointment_id_key" ON "encounters"("appointment_id");
CREATE INDEX "encounters_patient_id_started_at_idx" ON "encounters"("patient_id", "started_at");
CREATE INDEX "encounters_status_idx" ON "encounters"("status");
CREATE INDEX "encounters_type_started_at_idx" ON "encounters"("type", "started_at");
CREATE INDEX "encounters_created_by_user_id_started_at_idx" ON "encounters"("created_by_user_id", "started_at");

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
