-- ============================================================================
-- Mobile + OTP authentication.
--
-- Additive except for one relaxation. Safe against a populated database:
-- no existing row is rewritten, no column is dropped, no data is lost.
--
-- ⚠️ WHY users.password_hash BECOMES NULLABLE. An account provisioned by a
-- hospital admin has no password at all — it authenticates by mobile + OTP.
-- The alternative, writing an unusable sentinel hash, is worse: a sentinel is
-- indistinguishable from a real hash at every call site, so "this account has
-- no password" silently becomes "this account has a password nobody knows",
-- and any code path that forgets to check turns into a guessing target.
-- Making the column honest forces every reader to null-guard, which is the
-- point. Relaxing NOT NULL never fails on existing data.
--
-- ⚠️ WHY users.mobile_hash IS UNIQUE WHILE patient_profiles.phone_number_hash
-- IS NOT. They answer different questions. The patient one indexes every
-- patient record, including the field-registered ones with no login, where a
-- family genuinely shares a handset — its own comment says so. This one
-- indexes accounts that can SIGN IN, where a shared number would mean an OTP
-- cannot resolve to a single identity. Verified against live data before
-- enforcing: zero collisions among login-capable accounts. The unique index
-- is created on a column that is NULL for every existing row, and Postgres
-- permits unlimited NULLs in a unique index, so this cannot fail on deploy.
--
-- ⚠️ otp_challenges stores a HASH of the code and a BLIND INDEX of the mobile,
-- never either plaintext. A short-lived, high-churn table is the last place
-- that should accumulate a directory of everyone's phone number, and a
-- database reader must not be able to complete someone's login.
-- ============================================================================

ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

ALTER TABLE "users" ADD COLUMN "mobile" TEXT;
ALTER TABLE "users" ADD COLUMN "mobile_hash" TEXT;

CREATE UNIQUE INDEX "users_mobile_hash_key" ON "users"("mobile_hash");

-- New audit actions. The enum comment in schema.prisma says values are never
-- removed, only added, so these are append-only.
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'OtpRequested';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'OtpVerified';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'OtpFailed';

CREATE TABLE "otp_challenges" (
    "id"            UUID         NOT NULL,
    "user_id"       UUID,
    "mobile_hash"   TEXT         NOT NULL,
    "code_hash"     TEXT         NOT NULL,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at"    TIMESTAMP(3) NOT NULL,
    "consumed_at"   TIMESTAMP(3),
    "attempt_count" INTEGER      NOT NULL DEFAULT 0,
    "max_attempts"  INTEGER      NOT NULL,
    "ip_address"    TEXT,
    "user_agent"    TEXT,
    CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id")
);

-- Hot path on both request (invalidate the previous live challenge for this
-- number) and verify. Newest-first.
CREATE INDEX "otp_challenges_mobile_hash_created_at_idx"
    ON "otp_challenges"("mobile_hash", "created_at");

-- Lets the expiry sweep avoid a full scan.
CREATE INDEX "otp_challenges_expires_at_idx" ON "otp_challenges"("expires_at");

-- "Show me this account's recent attempts", during an incident.
CREATE INDEX "otp_challenges_user_id_idx" ON "otp_challenges"("user_id");

-- ⚠️ SET NULL, not CASCADE-on-delete-of-user? No: CASCADE is correct here.
-- A deleted user's spent challenges have no independent value, and leaving
-- orphans would keep a mobile blind index alive after the account it belonged
-- to is gone.
ALTER TABLE "otp_challenges"
    ADD CONSTRAINT "otp_challenges_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
