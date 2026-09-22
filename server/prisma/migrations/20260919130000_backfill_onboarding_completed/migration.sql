-- Backfill onboarding_completed_at for every profile that existed before
-- this feature shipped.
--
-- onboardingCompletedAt is what the client uses to decide "send this user
-- to /onboarding or into their portal". Without this backfill, EVERY
-- existing account — including the polished demo account
-- (demouser.strokeai@gmail.com) and every seeded demo doctor — would have
-- a null value and be retroactively forced through an onboarding flow that
-- is only meant to apply to accounts registering from this point forward.
-- Setting it to the row's own created_at is a defensible "this account
-- already exists and is in use" signal, and is a data backfill only —
-- no column type change, no constraint added.
UPDATE "patient_profiles" SET "onboarding_completed_at" = "created_at" WHERE "onboarding_completed_at" IS NULL;
UPDATE "doctor_profiles"  SET "onboarding_completed_at" = "created_at" WHERE "onboarding_completed_at" IS NULL;
UPDATE "staff_profiles"   SET "onboarding_completed_at" = "created_at" WHERE "onboarding_completed_at" IS NULL;
