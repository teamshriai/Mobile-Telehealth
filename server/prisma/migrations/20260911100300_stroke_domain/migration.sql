-- Phase 6 — Migration D: stroke domain module.
--
-- Entirely new tables/enums. Zero impact on any existing table. This is the
-- pattern a future OncologyAssessment/CardiologyAssessment migration would
-- follow exactly: new enums, one new table keyed by encounter_id @unique,
-- no change to encounters or patient_profiles.

-- CreateEnum
CREATE TYPE "lkw_certainty" AS ENUM ('Exact', 'Approximate', 'WakeUp', 'Unknown');

-- CreateEnum
CREATE TYPE "lkw_source" AS ENUM ('Patient', 'Family', 'Bystander', 'EmergencyServices', 'ClinicalRecord');

-- CreateTable
CREATE TABLE "stroke_assessments" (
    "id" UUID NOT NULL,
    "encounter_id" UUID NOT NULL,
    "lkw_at" TIMESTAMP(3),
    "lkw_certainty" "lkw_certainty" NOT NULL DEFAULT 'Unknown',
    "lkw_source" "lkw_source",
    "lkw_note" TEXT,
    "facial_weakness" BOOLEAN NOT NULL DEFAULT false,
    "arm_weakness" BOOLEAN NOT NULL DEFAULT false,
    "leg_weakness" BOOLEAN NOT NULL DEFAULT false,
    "speech_difficulty" BOOLEAN NOT NULL DEFAULT false,
    "sudden_confusion" BOOLEAN NOT NULL DEFAULT false,
    "vision_problem" BOOLEAN NOT NULL DEFAULT false,
    "severe_headache" BOOLEAN NOT NULL DEFAULT false,
    "balance_problem" BOOLEAN NOT NULL DEFAULT false,
    "loss_of_consciousness" BOOLEAN NOT NULL DEFAULT false,
    "other_symptom_note" TEXT,
    "urgent_flag" BOOLEAN NOT NULL DEFAULT false,
    "on_anticoagulants" BOOLEAN,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stroke_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stroke_lkw_revisions" (
    "id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "previous_lkw_at" TIMESTAMP(3),
    "previous_certainty" "lkw_certainty",
    "new_lkw_at" TIMESTAMP(3),
    "new_certainty" "lkw_certainty" NOT NULL,
    "new_source" "lkw_source",
    "reason" TEXT NOT NULL,
    "changed_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stroke_lkw_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stroke_assessments_encounter_id_key" ON "stroke_assessments"("encounter_id");
CREATE INDEX "stroke_assessments_lkw_at_idx" ON "stroke_assessments"("lkw_at");
CREATE INDEX "stroke_assessments_urgent_flag_idx" ON "stroke_assessments"("urgent_flag");
CREATE INDEX "stroke_lkw_revisions_assessment_id_created_at_idx" ON "stroke_lkw_revisions"("assessment_id", "created_at");

-- AddForeignKey
ALTER TABLE "stroke_assessments" ADD CONSTRAINT "stroke_assessments_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stroke_lkw_revisions" ADD CONSTRAINT "stroke_lkw_revisions_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "stroke_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
