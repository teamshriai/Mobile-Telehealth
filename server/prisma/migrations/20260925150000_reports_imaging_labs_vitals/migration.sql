-- ============================================================================
-- Patient portal — Reports (imaging studies, lab reports) and vital signs.
--
-- ⚠️ ADDITIVE ONLY. Seven new tables, five new enums, one new stored-file
-- kind, two appended audit actions, one new nullable column on stored_files.
--
-- ⚠️ Narrative text (report findings/impression, lab comments, vital notes)
-- is stored encrypted by the application; numbers, codes and dates are plain.
--
-- ⚠️ Hand-written from a generated diff: the diff also proposes dropping one
-- and renaming two unrelated indexes (pre-existing drift), deliberately left
-- out, as in 20260925120000_patient_medicines.
-- ============================================================================


CREATE TYPE "imaging_modality" AS ENUM ('CT', 'MR', 'XR');
CREATE TYPE "diagnostic_report_status" AS ENUM ('Preliminary', 'Final', 'Amended', 'EnteredInError');
CREATE TYPE "lab_flag" AS ENUM ('Low', 'High', 'CriticalLow', 'CriticalHigh', 'Abnormal');
CREATE TYPE "vital_type" AS ENUM ('BloodPressure', 'HeartRate', 'SpO2', 'Temperature', 'RespiratoryRate', 'BloodGlucose', 'Weight', 'Height', 'Bmi');
CREATE TYPE "vital_source" AS ENUM ('Facility', 'HomeDevice', 'PatientReported');
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'ImagingStudyViewed';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'ImagingImagesAccessed';
ALTER TYPE "stored_file_kind" ADD VALUE IF NOT EXISTS 'DicomInstance';
ALTER TABLE "stored_files" ADD COLUMN     "content_encoding" TEXT;
CREATE TABLE "imaging_studies" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "encounter_id" UUID,
    "accession_number" TEXT NOT NULL,
    "study_instance_uid" TEXT NOT NULL,
    "modality" "imaging_modality" NOT NULL,
    "title" TEXT NOT NULL,
    "body_part" TEXT NOT NULL,
    "performed_at" TIMESTAMP(3) NOT NULL,
    "performing_facility_name" TEXT NOT NULL,
    "ordered_by_name" TEXT,
    "series_count" INTEGER NOT NULL DEFAULT 0,
    "instance_count" INTEGER NOT NULL DEFAULT 0,
    "is_illustrative" BOOLEAN NOT NULL DEFAULT false,
    "image_attribution" TEXT,
    "illustrative_note" TEXT,
    "is_atlas_vocabulary" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imaging_studies_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "imaging_reports" (
    "id" UUID NOT NULL,
    "study_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "report_number" TEXT NOT NULL,
    "status" "diagnostic_report_status" NOT NULL DEFAULT 'Final',
    "clinical_indication" TEXT,
    "technique" TEXT,
    "comparison" TEXT,
    "findings" TEXT NOT NULL,
    "impression" TEXT NOT NULL,
    "reported_by_name" TEXT NOT NULL,
    "reported_by_registration" TEXT,
    "reported_by_role" TEXT,
    "reporting_facility_name" TEXT,
    "reported_at" TIMESTAMP(3) NOT NULL,
    "amended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imaging_reports_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "imaging_series" (
    "id" UUID NOT NULL,
    "study_id" UUID NOT NULL,
    "series_number" INTEGER NOT NULL,
    "series_instance_uid" TEXT NOT NULL,
    "dicom_modality" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "instance_count" INTEGER NOT NULL,
    "key_instance_number" INTEGER,
    "rows" INTEGER NOT NULL,
    "columns" INTEGER NOT NULL,
    "slice_thickness_mm" DOUBLE PRECISION,
    "spacing_mm" DOUBLE PRECISION,
    "default_window_center" DOUBLE PRECISION,
    "default_window_width" DOUBLE PRECISION,
    "total_bytes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imaging_series_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "imaging_instances" (
    "id" UUID NOT NULL,
    "series_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "instance_number" INTEGER NOT NULL,
    "sop_instance_uid" TEXT NOT NULL,
    "file_id" UUID NOT NULL,
    "slice_location" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imaging_instances_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "lab_reports" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "encounter_id" UUID,
    "report_number" TEXT NOT NULL,
    "panel_name" TEXT NOT NULL,
    "panel_code" TEXT,
    "specimen" TEXT NOT NULL,
    "fasting" BOOLEAN,
    "collected_at" TIMESTAMP(3) NOT NULL,
    "received_at" TIMESTAMP(3),
    "reported_at" TIMESTAMP(3) NOT NULL,
    "status" "diagnostic_report_status" NOT NULL DEFAULT 'Final',
    "lab_name" TEXT NOT NULL,
    "validated_by_name" TEXT,
    "validated_by_registration" TEXT,
    "validated_by_role" TEXT,
    "ordered_by_name" TEXT,
    "comment" TEXT,
    "is_atlas_vocabulary" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_reports_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "lab_results" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "analyte_code" TEXT NOT NULL,
    "analyte_name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "value_numeric" DOUBLE PRECISION,
    "unit" TEXT,
    "reference_range_text" TEXT,
    "reference_low" DOUBLE PRECISION,
    "reference_high" DOUBLE PRECISION,
    "flag" "lab_flag",
    "method" TEXT,
    "collected_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lab_results_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "vital_signs" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "encounter_id" UUID,
    "type" "vital_type" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "value2" DOUBLE PRECISION,
    "unit" TEXT NOT NULL,
    "qualifier" TEXT,
    "source" "vital_source" NOT NULL,
    "place_name" TEXT,
    "recorded_by_role" TEXT,
    "device_name" TEXT,
    "is_derived" BOOLEAN NOT NULL DEFAULT false,
    "measured_at" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vital_signs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "imaging_studies_accession_number_key" ON "imaging_studies"("accession_number");
CREATE UNIQUE INDEX "imaging_studies_study_instance_uid_key" ON "imaging_studies"("study_instance_uid");
CREATE INDEX "imaging_studies_patient_id_performed_at_idx" ON "imaging_studies"("patient_id", "performed_at");
CREATE INDEX "imaging_studies_encounter_id_idx" ON "imaging_studies"("encounter_id");
CREATE UNIQUE INDEX "imaging_reports_study_id_key" ON "imaging_reports"("study_id");
CREATE UNIQUE INDEX "imaging_reports_report_number_key" ON "imaging_reports"("report_number");
CREATE INDEX "imaging_reports_patient_id_reported_at_idx" ON "imaging_reports"("patient_id", "reported_at");
CREATE UNIQUE INDEX "imaging_series_series_instance_uid_key" ON "imaging_series"("series_instance_uid");
CREATE UNIQUE INDEX "imaging_series_study_id_series_number_key" ON "imaging_series"("study_id", "series_number");
CREATE UNIQUE INDEX "imaging_instances_sop_instance_uid_key" ON "imaging_instances"("sop_instance_uid");
CREATE UNIQUE INDEX "imaging_instances_file_id_key" ON "imaging_instances"("file_id");
CREATE UNIQUE INDEX "imaging_instances_series_id_instance_number_key" ON "imaging_instances"("series_id", "instance_number");
CREATE UNIQUE INDEX "lab_reports_report_number_key" ON "lab_reports"("report_number");
CREATE INDEX "lab_reports_patient_id_collected_at_idx" ON "lab_reports"("patient_id", "collected_at");
CREATE INDEX "lab_results_patient_id_analyte_code_collected_at_idx" ON "lab_results"("patient_id", "analyte_code", "collected_at");
CREATE INDEX "lab_results_report_id_sort_order_idx" ON "lab_results"("report_id", "sort_order");
CREATE INDEX "vital_signs_patient_id_type_measured_at_idx" ON "vital_signs"("patient_id", "type", "measured_at");
CREATE INDEX "vital_signs_patient_id_measured_at_idx" ON "vital_signs"("patient_id", "measured_at");
CREATE UNIQUE INDEX "vital_signs_patient_id_type_measured_at_source_key" ON "vital_signs"("patient_id", "type", "measured_at", "source");
ALTER TABLE "imaging_studies" ADD CONSTRAINT "imaging_studies_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "imaging_studies" ADD CONSTRAINT "imaging_studies_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "imaging_reports" ADD CONSTRAINT "imaging_reports_study_id_fkey" FOREIGN KEY ("study_id") REFERENCES "imaging_studies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "imaging_reports" ADD CONSTRAINT "imaging_reports_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "imaging_series" ADD CONSTRAINT "imaging_series_study_id_fkey" FOREIGN KEY ("study_id") REFERENCES "imaging_studies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "imaging_instances" ADD CONSTRAINT "imaging_instances_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "imaging_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "imaging_instances" ADD CONSTRAINT "imaging_instances_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "imaging_instances" ADD CONSTRAINT "imaging_instances_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "stored_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lab_reports" ADD CONSTRAINT "lab_reports_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lab_reports" ADD CONSTRAINT "lab_reports_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "lab_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- A blood-pressure reading always has both numbers; nothing else has a second.
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_bp_has_diastolic"
    CHECK (("type" = 'BloodPressure') = ("value2" IS NOT NULL));

-- Sample images from a public source must say where they came from.
ALTER TABLE "imaging_studies" ADD CONSTRAINT "imaging_studies_illustrative_attributed"
    CHECK (NOT "is_illustrative" OR "image_attribution" IS NOT NULL);

-- A lab result always has a value as issued.
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_value_present"
    CHECK ("value" <> '');
