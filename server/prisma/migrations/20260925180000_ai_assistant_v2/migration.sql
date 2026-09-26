-- Assistant v2: new record sources for the assistant's memory chunks, and a
-- message kind for "the provider could not answer". Additive only; enum
-- values are appended, never reordered or removed.
ALTER TYPE "ai_chunk_source" ADD VALUE IF NOT EXISTS 'LabReport';
ALTER TYPE "ai_chunk_source" ADD VALUE IF NOT EXISTS 'VitalSign';
ALTER TYPE "ai_chunk_source" ADD VALUE IF NOT EXISTS 'ImagingStudy';
ALTER TYPE "ai_chunk_source" ADD VALUE IF NOT EXISTS 'Lifestyle';
ALTER TYPE "ai_message_kind" ADD VALUE IF NOT EXISTS 'ProviderUnavailable';
