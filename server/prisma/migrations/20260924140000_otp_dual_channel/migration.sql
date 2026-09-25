-- ============================================================================
-- OTP challenges become dual-channel: SMS or email.
--
-- ⚠️ WHY A RENAME RATHER THAN A SECOND COLUMN. `mobile_hash` becomes
-- `identifier_hash` and gains a `channel` discriminator. Adding an
-- `email_hash` beside it would mean every read carries a "which column is
-- populated" branch, and nothing would stop a row setting both. One column
-- plus a channel makes the invalid state unrepresentable.
--
-- ⚠️ EXISTING ROWS ARE BACKFILLED TO 'Sms', which is correct by construction:
-- SMS was the only channel that existed when they were written. They are also
-- short-lived by design (TTL 300s), so in practice the table is near-empty.
--
-- ⚠️ NO email_hash ON users, and that is deliberate. `users.email` is already
-- plaintext and UNIQUE, so the email lookup is a direct query. Adding a
-- redundant hash — or encrypting the column — would break login, forgot
-- password and the G4 second-consultant override for no security gain. Only
-- otp_challenges needs a uniform identifier, because that table's own rule is
-- "never accumulate a plaintext directory of contact details".
-- ============================================================================

CREATE TYPE "otp_channel" AS ENUM ('Sms', 'Email');

-- Add with a default so the NOT NULL is satisfiable on existing rows, then
-- drop the default: a challenge must always state its channel explicitly.
ALTER TABLE "otp_challenges"
    ADD COLUMN "channel" "otp_channel" NOT NULL DEFAULT 'Sms';
ALTER TABLE "otp_challenges" ALTER COLUMN "channel" DROP DEFAULT;

ALTER TABLE "otp_challenges" RENAME COLUMN "mobile_hash" TO "identifier_hash";

DROP INDEX IF EXISTS "otp_challenges_mobile_hash_created_at_idx";
CREATE INDEX "otp_challenges_channel_identifier_hash_created_at_idx"
    ON "otp_challenges"("channel", "identifier_hash", "created_at");
