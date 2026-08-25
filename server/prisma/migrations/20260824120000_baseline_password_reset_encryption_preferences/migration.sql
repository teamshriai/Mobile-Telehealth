-- Baseline migration: captures everything applied to this database via
-- `prisma db push` between the last real migration (20260731043009) and now
-- (password reset tokens, PatientProfile encryption support, preferences,
-- and the AccountDeleted audit action) as a proper, replayable migration.
-- Marked as already-applied on this database via `prisma migrate resolve`;
-- a fresh database (e.g. production) gets here correctly via
-- `prisma migrate deploy` replaying every migration in order.

-- AlterEnum
ALTER TYPE "audit_action" ADD VALUE 'AccountDeleted';

-- DropIndex
DROP INDEX "patient_profiles_abha_id_key";

-- AlterTable
ALTER TABLE "patient_profiles" DROP COLUMN "aadhaar_number",
ADD COLUMN     "aadhaar_last4" TEXT,
ADD COLUMN     "abha_id_hash" TEXT,
ADD COLUMN     "preferences" JSONB;

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "patient_profiles_abha_id_hash_key" ON "patient_profiles"("abha_id_hash");

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

