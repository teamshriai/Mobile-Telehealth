-- Hospital Admin role + three-role onboarding.
--
-- Additive only: one new enum value on an existing type, one new enum, five
-- new tables, and new nullable columns on existing tables. No existing
-- column, constraint, or row is altered destructively, and no data is
-- dropped or reset.
--
-- The 3 ALTER TYPE ... ADD VALUE statements only add enum labels; no row
-- anywhere is inserted or updated using them in this migration, so the
-- Postgres restriction on using a new enum value within the same
-- transaction it was added in does not apply here.

ALTER TYPE "role_name" ADD VALUE 'HospitalAdmin';

ALTER TYPE "audit_action" ADD VALUE 'HospitalAdminRegistered';
ALTER TYPE "audit_action" ADD VALUE 'DoctorAvailabilityUpdated';
ALTER TYPE "audit_action" ADD VALUE 'FeedbackSubmitted';

-- CreateEnum
CREATE TYPE "feedback_category" AS ENUM ('DoctorExperience', 'HospitalService', 'AppUsability', 'Other');

-- CreateTable
CREATE TABLE "hospitals" (
    "id"         UUID NOT NULL,
    "name"       TEXT NOT NULL,
    "city"       TEXT,
    "state"      TEXT,
    "is_active"  BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hospitals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "hospitals_is_active_idx" ON "hospitals"("is_active");

-- CreateTable
CREATE TABLE "doctor_availability" (
    "id"                 UUID NOT NULL,
    "doctor_id"          UUID NOT NULL,
    "day_of_week"        INTEGER NOT NULL,
    "start_time"         TEXT NOT NULL,
    "end_time"           TEXT NOT NULL,
    "slot_duration_mins" INTEGER NOT NULL DEFAULT 30,
    "is_active"          BOOLEAN NOT NULL DEFAULT true,
    "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_availability_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "doctor_availability_doctor_id_day_of_week_idx" ON "doctor_availability"("doctor_id", "day_of_week");

-- CreateTable
CREATE TABLE "doctor_leaves" (
    "id"         UUID NOT NULL,
    "doctor_id"  UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date"   DATE NOT NULL,
    "reason"     TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_leaves_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "doctor_leaves_doctor_id_start_date_end_date_idx" ON "doctor_leaves"("doctor_id", "start_date", "end_date");

-- CreateTable
CREATE TABLE "feedback" (
    "id"             UUID NOT NULL,
    "patient_id"     UUID NOT NULL,
    "doctor_id"      UUID,
    "appointment_id" UUID,
    "category"       "feedback_category" NOT NULL,
    "rating"         INTEGER NOT NULL,
    "comment"        TEXT,
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "feedback_doctor_id_idx" ON "feedback"("doctor_id");
CREATE INDEX "feedback_category_created_at_idx" ON "feedback"("category", "created_at");

-- AlterTable: users — consent tracking (fixes the unpersisted Terms/Privacy checkbox)
ALTER TABLE "users" ADD COLUMN "terms_accepted_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "terms_version" TEXT;

-- AlterTable: patient_profiles — onboarding completion gate
ALTER TABLE "patient_profiles" ADD COLUMN "onboarding_completed_at" TIMESTAMP(3);

-- AlterTable: doctor_profiles — hospital linkage, verifier attribution, onboarding gate
ALTER TABLE "doctor_profiles" ADD COLUMN "hospital_id" UUID;
ALTER TABLE "doctor_profiles" ADD COLUMN "verified_by_user_id" UUID;
ALTER TABLE "doctor_profiles" ADD COLUMN "onboarding_completed_at" TIMESTAMP(3);

CREATE INDEX "doctor_profiles_hospital_id_idx" ON "doctor_profiles"("hospital_id");

-- AlterTable: staff_profiles — hospital linkage + verification (previously had none at all)
ALTER TABLE "staff_profiles" ADD COLUMN "hospital_id" UUID;
ALTER TABLE "staff_profiles" ADD COLUMN "is_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "staff_profiles" ADD COLUMN "verified_at" TIMESTAMP(3);
ALTER TABLE "staff_profiles" ADD COLUMN "verified_by_user_id" UUID;
ALTER TABLE "staff_profiles" ADD COLUMN "onboarding_completed_at" TIMESTAMP(3);

CREATE INDEX "staff_profiles_hospital_id_idx" ON "staff_profiles"("hospital_id");

-- AddForeignKey
ALTER TABLE "doctor_profiles" ADD CONSTRAINT "doctor_profiles_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "doctor_availability" ADD CONSTRAINT "doctor_availability_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "doctor_leaves" ADD CONSTRAINT "doctor_leaves_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
