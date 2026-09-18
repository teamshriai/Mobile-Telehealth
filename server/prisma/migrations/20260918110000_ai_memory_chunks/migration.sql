-- AI Insights retrieval — pgvector-backed memory chunks. Phase 8, part 2.
--
-- Requires the `vector` extension. The operator has already run
-- `sudo apt install postgresql-16-pgvector` (0.6.0, from Ubuntu noble's own
-- repository — no extra apt source needed) and the extension has been
-- created in this database. CREATE EXTENSION IF NOT EXISTS below is
-- idempotent so this migration is also safe to run on a database where it
-- was created by hand first, as happened here.
--
-- Additive only: one new enum, one new table. No existing table, column,
-- constraint, or row is touched.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE "ai_chunk_source" AS ENUM (
  'ProfileMedical', 'Appointment', 'Encounter', 'StrokeAssessment', 'CareTeam', 'ChatSummary'
);

CREATE TABLE "ai_memory_chunks" (
    "id"                UUID          NOT NULL,
    "owner_user_id"     UUID          NOT NULL,
    "patient_id"        UUID,
    "source_type"       "ai_chunk_source" NOT NULL,
    "source_id"         UUID          NOT NULL,
    "source_field"      TEXT          NOT NULL DEFAULT '',
    "content"           TEXT          NOT NULL,
    "content_hash"      TEXT          NOT NULL,
    "token_count"       INTEGER       NOT NULL,
    "embedding"         vector(384),
    "embedding_model"   TEXT,
    "source_updated_at" TIMESTAMP(3)  NOT NULL,
    "created_at"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMP(3)  NOT NULL,
    CONSTRAINT "ai_memory_chunks_pkey" PRIMARY KEY ("id")
);

-- One row per (owner, source row, source field) — re-syncing a chunk is an
-- upsert against this, not an insert-then-cleanup.
CREATE UNIQUE INDEX "ai_memory_chunks_owner_source_key"
    ON "ai_memory_chunks" ("owner_user_id", "source_type", "source_id", "source_field");

-- Serves every retrieval query: WHERE owner_user_id = $1 [AND source_type = $2].
CREATE INDEX "ai_memory_chunks_owner_type_idx"
    ON "ai_memory_chunks" ("owner_user_id", "source_type");

-- Deliberately NO ivfflat/hnsw index on `embedding`. At today's per-patient
-- chunk counts (~20), a plain scan filtered by the btree index above and
-- sorted by `embedding <#>` is both faster and, unlike an ANN index, cannot
-- silently under-return a patient-scoped query — pgvector's approximate
-- index applies the WHERE filter AFTER probing, so a scoped query against a
-- small candidate set can return fewer rows than LIMIT, or none. Revisit only
-- if per-owner chunk counts grow into the thousands.

ALTER TABLE "ai_memory_chunks"
    ADD CONSTRAINT "ai_memory_chunks_owner_user_id_fkey"
    FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_memory_chunks"
    ADD CONSTRAINT "ai_memory_chunks_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
