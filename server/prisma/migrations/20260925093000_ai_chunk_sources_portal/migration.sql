-- ============================================================================
-- The patient assistant can now ground answers in the records the portal
-- shows: signed prescriptions, recorded diagnoses, issued instructions, and
-- the patient's own (patient-reported) health notes.
--
-- ⚠️ APPEND-ONLY enum change; existing ai_memory_chunks rows are untouched.
-- ============================================================================

ALTER TYPE "ai_chunk_source" ADD VALUE IF NOT EXISTS 'Prescription';
ALTER TYPE "ai_chunk_source" ADD VALUE IF NOT EXISTS 'Problem';
ALTER TYPE "ai_chunk_source" ADD VALUE IF NOT EXISTS 'Instruction';
ALTER TYPE "ai_chunk_source" ADD VALUE IF NOT EXISTS 'HealthNote';
