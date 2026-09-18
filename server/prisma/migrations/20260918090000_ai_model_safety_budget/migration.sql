-- Phase 8 — connecting the assistant: provenance, safety, budget, data policy.
--
-- Additive only. One new enum, one new table, new nullable columns, new audit
-- actions. No drops, no data changes, no constraint tightening.

-- ── Turn provenance ─────────────────────────────────────────────────────────
-- `is_placeholder` was a two-state flag doing a five-state job. The transcript
-- must never imply the assistant said something clinical that it did not, so
-- how each turn was produced is now explicit. The old column is retained for
-- rows written before this migration.
CREATE TYPE "ai_message_kind" AS ENUM (
  'Model', 'Placeholder', 'SafetyInterlock', 'SafetyBlocked',
  'BudgetDeferred', 'PolicyBlocked'
);

ALTER TABLE "ai_messages"
  ADD COLUMN "kind" "ai_message_kind" NOT NULL DEFAULT 'Model',
  ADD COLUMN "safety_rule_version" TEXT;

-- Existing rows were all placeholders; label them truthfully.
UPDATE "ai_messages" SET "kind" = 'Placeholder' WHERE "is_placeholder" = true;

-- ── Rolling conversation summary ────────────────────────────────────────────
ALTER TABLE "ai_conversations"
  ADD COLUMN "summary" TEXT,
  ADD COLUMN "summary_through_message_id" UUID,
  ADD COLUMN "summary_token_count" INTEGER;

-- ── Synthetic-data gate ─────────────────────────────────────────────────────
-- Defaults to false so every existing and future row is treated as REAL
-- patient data until explicitly marked otherwise. Fails closed by design.
ALTER TABLE "patient_profiles"
  ADD COLUMN "is_synthetic_data" BOOLEAN NOT NULL DEFAULT false;

-- ── Daily usage ledger ──────────────────────────────────────────────────────
-- Persisted, not in-memory: a restart must not reset the day's allowance.
-- The row with a NULL user_id is the shared pool.
CREATE TABLE "ai_usage_daily" (
  "id"                UUID         NOT NULL,
  "user_id"           UUID,
  "day"               DATE         NOT NULL,
  "requests"          INTEGER      NOT NULL DEFAULT 0,
  "prompt_tokens"     INTEGER      NOT NULL DEFAULT 0,
  "completion_tokens" INTEGER      NOT NULL DEFAULT 0,
  "blocked_count"     INTEGER      NOT NULL DEFAULT 0,
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_usage_daily_pkey" PRIMARY KEY ("id")
);

-- NULLS NOT DISTINCT so the single global row (user_id IS NULL) can be
-- upserted on conflict; without it Postgres treats every NULL as unique and
-- the shared pool would fork into a new row on every write.
CREATE UNIQUE INDEX "ai_usage_daily_user_id_day_key"
  ON "ai_usage_daily" ("user_id", "day") NULLS NOT DISTINCT;

-- ── Audit actions ───────────────────────────────────────────────────────────
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'AiMessageSent';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'AiResponseGenerated';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'AiEmergencyInterlockTriggered';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'AiOutputBlocked';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'AiBudgetExceeded';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'AiPolicyBlocked';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'AiProviderError';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'AiConversationDeleted';
