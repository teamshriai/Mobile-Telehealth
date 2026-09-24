-- ============================================================================
-- Add patient_instructions.title_english / body_english.
--
-- Additive: two new nullable columns, no data rewritten. Safe against a
-- populated database — existing rows simply have no English counterpart yet.
--
-- ⚠️ WHY. UI_ATLAS A6 makes patient-facing documents bilingual, and S-06-08's
-- drawing note states the consequence directly: "Draw both languages on one
-- printed artefact. A discharge instruction the patient cannot read is not an
-- instruction." The screen already printed, but it printed ONE language, so
-- the sheet a patient carries home was only ever legible to one of the two
-- people who need to read it — the patient or the next clinician.
--
-- ⚠️ Nullable rather than NOT NULL DEFAULT ''. An empty string would make
-- "no English counterpart was recorded" indistinguishable from "the English
-- counterpart is blank", and the printed sheet has to be able to say which.
-- A clinician is never blocked from issuing because a translation is missing.
--
-- `body_english` is ENCRYPTED at rest by the application layer, exactly as
-- `body` and `clinician_wording` are — see server/src/utils/encryption.ts.
-- `title_english` is not, matching `title`.
-- ============================================================================

ALTER TABLE "patient_instructions" ADD COLUMN "title_english" TEXT;
ALTER TABLE "patient_instructions" ADD COLUMN "body_english" TEXT;
