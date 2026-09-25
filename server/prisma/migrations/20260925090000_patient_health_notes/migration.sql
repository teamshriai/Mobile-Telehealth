-- ============================================================================
-- Patient portal, round 1: patient-generated health notes (voice or typed)
-- and an encrypted file store for their audio.
--
-- ⚠️ ADDITIVE ONLY. Two new tables, four new enums, five appended audit
-- actions. No existing column, index or constraint is touched.
--
-- ⚠️ HAND-WRITTEN, NOT `prisma migrate dev`. A generated diff against this
-- database also proposes dropping `drugs_therapeutic_class_idx` and renaming
-- two `ai_memory_chunks` indexes — pre-existing drift that belongs to other
-- migrations and is deliberately left out of this one.
--
-- ⚠️ NO FILE BYTES IN THE DATABASE. `stored_files` records where an
-- encrypted file lives on disk (FILE_STORAGE_DIR), its size and the SHA-256
-- of its plaintext. See src/storage/fileStore.ts.
--
-- ⚠️ `patient_id` on both tables is always resolved by the server from the
-- authenticated user. No endpoint accepts it from a client.
-- ============================================================================

CREATE TYPE "stored_file_kind" AS ENUM ('HealthNoteAudio');
CREATE TYPE "health_note_source" AS ENUM ('Voice', 'Typed');
CREATE TYPE "health_note_status" AS ENUM ('Draft', 'Confirmed');
CREATE TYPE "health_note_visibility" AS ENUM ('Private', 'CareTeam');

ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'HealthNoteCreated';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'HealthNoteUpdated';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'HealthNoteDeleted';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'HealthNoteAudioAccessed';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'TranscriptionRequested';

CREATE TABLE "stored_files" (
    "id"          UUID NOT NULL,
    "patient_id"  UUID NOT NULL,
    "kind"        "stored_file_kind" NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type"   TEXT NOT NULL,
    "bytes"       INTEGER NOT NULL,
    "sha256"      TEXT NOT NULL,
    "encrypted"   BOOLEAN NOT NULL DEFAULT true,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at"  TIMESTAMP(3),
    CONSTRAINT "stored_files_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "stored_files_storage_key_key" ON "stored_files"("storage_key");
CREATE INDEX "stored_files_patient_id_kind_idx" ON "stored_files"("patient_id", "kind");
ALTER TABLE "stored_files" ADD CONSTRAINT "stored_files_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "patient_health_notes" (
    "id"                 UUID NOT NULL,
    "patient_id"         UUID NOT NULL,
    "author_user_id"     UUID NOT NULL,
    "source"             "health_note_source" NOT NULL,
    "status"             "health_note_status" NOT NULL,
    "visibility"         "health_note_visibility" NOT NULL DEFAULT 'Private',
    "body"               TEXT,
    "machine_transcript" TEXT,
    "language"           TEXT NOT NULL,
    "recorded_at"        TIMESTAMP(3) NOT NULL,
    "confirmed_at"       TIMESTAMP(3),
    "edited_at"          TIMESTAMP(3),
    "audio_file_id"      UUID,
    "audio_duration_ms"  INTEGER,
    "stt_model"          TEXT,
    "stt_latency_ms"     INTEGER,
    "deleted_at"         TIMESTAMP(3),
    "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"         TIMESTAMP(3) NOT NULL,
    CONSTRAINT "patient_health_notes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "patient_health_notes_patient_id_status_recorded_at_idx"
    ON "patient_health_notes"("patient_id", "status", "recorded_at");
-- Serves the 24-hour draft purge.
CREATE INDEX "patient_health_notes_status_created_at_idx"
    ON "patient_health_notes"("status", "created_at");
ALTER TABLE "patient_health_notes" ADD CONSTRAINT "patient_health_notes_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_health_notes" ADD CONSTRAINT "patient_health_notes_author_user_id_fkey"
    FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_health_notes" ADD CONSTRAINT "patient_health_notes_audio_file_id_fkey"
    FOREIGN KEY ("audio_file_id") REFERENCES "stored_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
