/*
  Warnings:

  - A unique constraint covering the columns `[abha_id]` on the table `patient_profiles` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "blood_group" AS ENUM ('A_Positive', 'A_Negative', 'B_Positive', 'B_Negative', 'AB_Positive', 'AB_Negative', 'O_Positive', 'O_Negative', 'Unknown');

-- CreateEnum
CREATE TYPE "marital_status" AS ENUM ('Single', 'Married', 'Divorced', 'Widowed', 'Separated', 'PreferNotToDisclose');

-- CreateEnum
CREATE TYPE "smoking_status" AS ENUM ('Never', 'Former', 'Current', 'Occasional');

-- CreateEnum
CREATE TYPE "alcohol_status" AS ENUM ('Never', 'Occasional', 'Moderate', 'Heavy');

-- CreateEnum
CREATE TYPE "tobacco_status" AS ENUM ('Never', 'Former', 'Current');

-- CreateEnum
CREATE TYPE "physical_activity" AS ENUM ('Sedentary', 'Light', 'Moderate', 'Active', 'VeryActive');

-- AlterEnum
ALTER TYPE "audit_action" ADD VALUE 'ProfilePhotoUpdated';

-- AlterTable
ALTER TABLE "patient_profiles" ADD COLUMN     "aadhaar_number" TEXT,
ADD COLUMN     "abha_id" TEXT,
ADD COLUMN     "alcohol_status" "alcohol_status",
ADD COLUMN     "alternate_phone" TEXT,
ADD COLUMN     "blood_group" "blood_group",
ADD COLUMN     "current_medications" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "existing_diseases" TEXT,
ADD COLUMN     "family_history" TEXT,
ADD COLUMN     "known_allergies" TEXT,
ADD COLUMN     "marital_status" "marital_status",
ADD COLUMN     "middle_name" TEXT,
ADD COLUMN     "occupation" TEXT,
ADD COLUMN     "passport_number" TEXT,
ADD COLUMN     "physical_activity" "physical_activity",
ADD COLUMN     "previous_surgeries" TEXT,
ADD COLUMN     "profile_photo" TEXT,
ADD COLUMN     "smoking_status" "smoking_status",
ADD COLUMN     "tobacco_status" "tobacco_status",
ADD COLUMN     "village" TEXT;

-- CreateTable
CREATE TABLE "profile_photos" (
    "id" UUID NOT NULL,
    "patient_profile_id" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profile_photos_patient_profile_id_key" ON "profile_photos"("patient_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_profiles_abha_id_key" ON "patient_profiles"("abha_id");

-- AddForeignKey
ALTER TABLE "profile_photos" ADD CONSTRAINT "profile_photos_patient_profile_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
