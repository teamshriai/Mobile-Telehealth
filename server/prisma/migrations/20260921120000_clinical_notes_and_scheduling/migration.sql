-- ============================================================================
-- Clinical notes, care-team/appointment audit actions, and the double-booking
-- guard.
--
-- Additive throughout: new enum values (appended, never reordered — the enum
-- is declared append-only in schema.prisma), two new tables, and one new
-- index. No existing column is altered, renamed or dropped, so this is safe
-- to run against a populated database.
-- ============================================================================

-- ── New audit actions ───────────────────────────────────────────────────────
-- Postgres requires each ADD VALUE in its own statement, and they cannot run
-- inside a transaction block with other uses of the same enum.
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'CareTeamAssigned';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'CareTeamEnded';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'AppointmentCreated';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'AppointmentRescheduled';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'AppointmentStatusChanged';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'AppointmentCancelled';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'NoteCreated';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'NoteSigned';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'NoteAmended';

-- ── Clinical notes ──────────────────────────────────────────────────────────
CREATE TYPE "clinical_note_status" AS ENUM ('Draft', 'Signed');

CREATE TABLE "clinical_notes" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "encounter_id" UUID,
    "appointment_id" UUID,
    "author_user_id" UUID NOT NULL,
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "problem_code" TEXT,
    "problem_text" TEXT,
    "status" "clinical_note_status" NOT NULL DEFAULT 'Draft',
    "signed_at" TIMESTAMP(3),
    "signed_by_user_id" UUID,
    "signer_name" TEXT,
    "signer_registration_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "clinical_notes_patient_id_created_at_idx" ON "clinical_notes"("patient_id", "created_at");
CREATE INDEX "clinical_notes_author_user_id_created_at_idx" ON "clinical_notes"("author_user_id", "created_at");
CREATE INDEX "clinical_notes_encounter_id_idx" ON "clinical_notes"("encounter_id");
CREATE INDEX "clinical_notes_status_idx" ON "clinical_notes"("status");

ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_encounter_id_fkey"
    FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_appointment_id_fkey"
    FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "clinical_note_addenda" (
    "id" UUID NOT NULL,
    "note_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "author_user_id" UUID NOT NULL,
    "author_name" TEXT NOT NULL,
    "author_registration_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_note_addenda_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "clinical_note_addenda_note_id_created_at_idx" ON "clinical_note_addenda"("note_id", "created_at");

ALTER TABLE "clinical_note_addenda" ADD CONSTRAINT "clinical_note_addenda_note_id_fkey"
    FOREIGN KEY ("note_id") REFERENCES "clinical_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Double-booking guard ────────────────────────────────────────────────────
-- Until now nothing anywhere prevented two patients holding the same doctor
-- at the same instant. The service layer performs a full overlap check
-- (durations vary), but a service check alone loses a concurrent race — two
-- requests can both read "free" before either writes. This partial unique
-- index is the backstop that makes the collision impossible rather than
-- unlikely.
--
-- Partial, excluding Cancelled: a cancelled 10:00 slot must not block someone
-- else booking 10:00. Rows with a NULL doctor_id are excluded too — an
-- unassigned request is not holding anyone's diary.
CREATE UNIQUE INDEX "appointments_doctor_slot_unique"
    ON "appointments"("doctor_id", "scheduled_at")
    WHERE "doctor_id" IS NOT NULL AND "status" <> 'Cancelled';
