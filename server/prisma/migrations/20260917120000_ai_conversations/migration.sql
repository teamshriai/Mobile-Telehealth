-- AI Insights conversation history — Phase 7.
--
-- Additive only: two new tables and one new enum. No existing table, column,
-- constraint or row is touched.

CREATE TYPE "ai_message_role" AS ENUM ('User', 'Assistant');

CREATE TABLE "ai_conversations" (
    "id"         UUID         NOT NULL,
    "user_id"    UUID         NOT NULL,
    "title"      TEXT         NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_messages" (
    "id"              UUID            NOT NULL,
    "conversation_id" UUID            NOT NULL,
    "role"            "ai_message_role" NOT NULL,
    "content"         TEXT            NOT NULL,
    "is_placeholder"  BOOLEAN         NOT NULL DEFAULT false,
    "created_at"      TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- Serves the only list query: a user's conversations, most recent first.
CREATE INDEX "ai_conversations_user_id_deleted_at_updated_at_idx"
    ON "ai_conversations" ("user_id", "deleted_at", "updated_at");

CREATE INDEX "ai_messages_conversation_id_created_at_idx"
    ON "ai_messages" ("conversation_id", "created_at");

-- Cascade on both: a deleted account takes its transcripts with it, and a
-- hard-deleted conversation takes its messages. Conversations are soft-deleted
-- in normal use, so this only fires on genuine account removal.
ALTER TABLE "ai_conversations"
    ADD CONSTRAINT "ai_conversations_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_messages"
    ADD CONSTRAINT "ai_messages_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
