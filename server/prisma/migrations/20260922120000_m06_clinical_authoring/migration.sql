-- ============================================================================
-- M-06 · Clinical authoring: problems & coding, formulary & deterministic drug
-- safety, prescriptions, patient instructions, templates, note co-signature,
-- and break-glass emergency access.
--
-- Additive throughout: new enum values (appended, never reordered — the enums
-- are declared append-only in schema.prisma), eleven new tables, and seven new
-- nullable columns on clinical_notes. No existing column is altered, renamed
-- or dropped, and no row is rewritten, so this is safe to run against a
-- populated database.
--
-- ⚠️ NOTE ON THE NEW ENUM VALUES. Postgres forbids USING a value added by
-- ALTER TYPE ... ADD VALUE inside the same transaction that added it. This
-- migration therefore only DECLARES 'Resident' on role_name and
-- 'CosignPending' on clinical_note_status; the matching `roles` row is created
-- by the seed (prisma/seed.ts), which runs afterwards in its own transaction.
--
-- ⚠️ WHY drugs.is_atlas_vocabulary EXISTS. UI_ATLAS §8.6 forbids inventing
-- demo data outside its fixed kit, but §8.5's drug list contains no
-- non-beta-lactam antibiotic — so the three alternatives the S-06-07 hard stop
-- is required to offer (§6840) cannot be drawn from it. Rather than silently
-- invent, every drug carries a flag saying whether it came from §8.5, so the
-- additions are visible and can be folded into the spec properly.
-- ============================================================================

-- ── New role ────────────────────────────────────────────────────────────────
-- A Resident authors clinical entries but may not attest them alone. The
-- distinction is enforced by CAPABILITY (they lack `note:sign:own`), never by
-- comparing this name — see config/permissions.ts and UI_ATLAS §3.2.
ALTER TYPE "role_name" ADD VALUE IF NOT EXISTS 'Resident';

-- ── New note status ─────────────────────────────────────────────────────────
ALTER TYPE "clinical_note_status" ADD VALUE IF NOT EXISTS 'CosignPending';

-- ── New audit actions ───────────────────────────────────────────────────────
-- Postgres requires each ADD VALUE in its own statement.
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'NoteCosigned';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'NoteReturnedToAuthor';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'ProblemAdded';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'ProblemResolved';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'PrescriptionCreated';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'PrescriptionSigned';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'InstructionsIssued';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'TemplateSaved';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'TemplatePromoted';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'HardStopTriggered';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'HardStopOverridden';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'BreakGlassRequested';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'BreakGlassGranted';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'BreakGlassReviewed';

-- ── New enums ───────────────────────────────────────────────────────────────
CREATE TYPE "problem_status" AS ENUM ('Active', 'Resolved');
CREATE TYPE "prescription_status" AS ENUM ('Draft', 'Signed', 'Cancelled');
CREATE TYPE "break_glass_reason" AS ENUM ('EmergencyCare', 'CoveringColleague', 'OnCallReview', 'QualityReview', 'Other');
CREATE TYPE "break_glass_outcome" AS ENUM ('Appropriate', 'Inappropriate');
CREATE TYPE "template_scope" AS ENUM ('Personal', 'Facility');

-- ── Co-signature on clinical notes (CMP-NABH-03) ────────────────────────────
-- All nullable with a safe default: every existing signed note keeps its
-- meaning untouched (requires_cosign = false, no co-signer), because those
-- notes were signed by someone who held `note:sign:own`.
ALTER TABLE "clinical_notes" ADD COLUMN "requires_cosign" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "clinical_notes" ADD COLUMN "cosigned_at" TIMESTAMP(3);
ALTER TABLE "clinical_notes" ADD COLUMN "cosigned_by_user_id" UUID;
ALTER TABLE "clinical_notes" ADD COLUMN "cosigner_name" TEXT;
ALTER TABLE "clinical_notes" ADD COLUMN "cosigner_registration_number" TEXT;
ALTER TABLE "clinical_notes" ADD COLUMN "returned_at" TIMESTAMP(3);
ALTER TABLE "clinical_notes" ADD COLUMN "return_reason" TEXT;

-- ── Diagnosis catalogue ─────────────────────────────────────────────────────
-- is_leaf is the point of this table: S-06-05 must block coding a problem to a
-- parent-only ICD-10 category.
CREATE TABLE "diagnosis_codes" (
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "parent_code" TEXT,
    "is_leaf" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "diagnosis_codes_pkey" PRIMARY KEY ("code")
);

CREATE INDEX "diagnosis_codes_title_idx" ON "diagnosis_codes"("title");
CREATE INDEX "diagnosis_codes_parent_code_idx" ON "diagnosis_codes"("parent_code");

-- ── Problem list ────────────────────────────────────────────────────────────
CREATE TABLE "problems" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "onset_encounter_id" UUID,
    "code" TEXT NOT NULL,
    "code_title" TEXT NOT NULL,
    "status" "problem_status" NOT NULL DEFAULT 'Active',
    "onset_date" DATE,
    "resolved_at" TIMESTAMP(3),
    "note" TEXT,
    "recorded_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "problems_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "problems_patient_id_status_idx" ON "problems"("patient_id", "status");
CREATE INDEX "problems_code_idx" ON "problems"("code");

ALTER TABLE "problems" ADD CONSTRAINT "problems_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "problems" ADD CONSTRAINT "problems_code_fkey"
    FOREIGN KEY ("code") REFERENCES "diagnosis_codes"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "problems" ADD CONSTRAINT "problems_onset_encounter_id_fkey"
    FOREIGN KEY ("onset_encounter_id") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ⚠️ Dedupe guard (S-06-05: "dedupes against the active list"). Partial, on
-- status = 'Active', so the SAME code may legitimately recur after being
-- resolved — a patient can have pneumonia twice. A plain unique index would
-- make the second episode unrecordable. Prisma cannot express this.
CREATE UNIQUE INDEX "problems_patient_active_code_unique"
    ON "problems"("patient_id", "code")
    WHERE "status" = 'Active';

-- ── Formulary and the deterministic safety tables ───────────────────────────
-- ⚠️ These three tables ARE the hard stop. They are consulted server-side
-- before a prescription may be signed, and they do not depend on any model
-- being reachable (UI_ATLAS §4.2: "static interaction tables — never fully
-- off"; §6210: safety never depends on the model being up).
CREATE TABLE "drugs" (
    "id" UUID NOT NULL,
    "generic_name" TEXT NOT NULL,
    "form" TEXT NOT NULL,
    "strength" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "allergen_class" TEXT,
    "is_nlem" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_atlas_vocabulary" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "drugs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "drugs_generic_name_strength_form_key" ON "drugs"("generic_name", "strength", "form");
CREATE INDEX "drugs_generic_name_idx" ON "drugs"("generic_name");

CREATE TABLE "allergy_rules" (
    "id" UUID NOT NULL,
    "allergen_key" TEXT NOT NULL,
    "blocks_class" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "allergy_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "allergy_rules_allergen_key_blocks_class_key" ON "allergy_rules"("allergen_key", "blocks_class");

CREATE TABLE "dose_ranges" (
    "id" UUID NOT NULL,
    "drug_id" UUID NOT NULL,
    "cohort" TEXT NOT NULL,
    "min_dose" DECIMAL(10,3) NOT NULL,
    "max_dose" DECIMAL(10,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "per_kg" BOOLEAN NOT NULL DEFAULT false,
    "max_per_day" DECIMAL(10,3),

    CONSTRAINT "dose_ranges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dose_ranges_drug_id_cohort_key" ON "dose_ranges"("drug_id", "cohort");

ALTER TABLE "dose_ranges" ADD CONSTRAINT "dose_ranges_drug_id_fkey"
    FOREIGN KEY ("drug_id") REFERENCES "drugs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Prescriptions ───────────────────────────────────────────────────────────
CREATE TABLE "prescriptions" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "encounter_id" UUID,
    "rx_number" TEXT NOT NULL,
    "status" "prescription_status" NOT NULL DEFAULT 'Draft',
    "author_user_id" UUID NOT NULL,
    "signed_at" TIMESTAMP(3),
    "signed_by_user_id" UUID,
    "signer_name" TEXT,
    "signer_registration_number" TEXT,
    "signer_hpr_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "prescriptions_rx_number_key" ON "prescriptions"("rx_number");
CREATE INDEX "prescriptions_patient_id_created_at_idx" ON "prescriptions"("patient_id", "created_at");
CREATE INDEX "prescriptions_encounter_id_idx" ON "prescriptions"("encounter_id");

ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_encounter_id_fkey"
    FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "prescription_items" (
    "id" UUID NOT NULL,
    "prescription_id" UUID NOT NULL,
    "drug_id" UUID NOT NULL,
    "dose" DECIMAL(10,3) NOT NULL,
    "dose_unit" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "indication_code" TEXT,
    "substitution_allowed" BOOLEAN NOT NULL DEFAULT true,
    "instructions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "prescription_items_prescription_id_idx" ON "prescription_items"("prescription_id");

ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescription_id_fkey"
    FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_drug_id_fkey"
    FOREIGN KEY ("drug_id") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ⚠️ G4 overrides of a deterministic hard stop.
-- UI_ATLAS §4.9 names AI.SAF.HARD_STOP_OVERRIDDEN as the ONE audit event that
-- must ALERT rather than merely record, reviewed within 24 hours. Both
-- identities are stored because a G4 gate is not satisfied by one person
-- signing twice. The blocked drug, allergen and rule text are COPIED rather
-- than joined so the record still reads correctly after the formulary changes.
CREATE TABLE "prescription_overrides" (
    "id" UUID NOT NULL,
    "prescription_id" UUID NOT NULL,
    "drug_name" TEXT NOT NULL,
    "allergen_key" TEXT NOT NULL,
    "rule_text" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "overridden_by_user_id" UUID NOT NULL,
    "overridden_by_name" TEXT NOT NULL,
    "second_consultant_user_id" UUID NOT NULL,
    "second_consultant_name" TEXT NOT NULL,
    "second_consultant_registration_number" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prescription_overrides_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "prescription_overrides_reviewed_at_created_at_idx" ON "prescription_overrides"("reviewed_at", "created_at");
CREATE INDEX "prescription_overrides_prescription_id_idx" ON "prescription_overrides"("prescription_id");

ALTER TABLE "prescription_overrides" ADD CONSTRAINT "prescription_overrides_prescription_id_fkey"
    FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Patient instructions ────────────────────────────────────────────────────
CREATE TABLE "patient_instructions" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "encounter_id" UUID,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "clinician_wording" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issued_by_user_id" UUID NOT NULL,
    "issued_by_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_instructions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "patient_instructions_patient_id_issued_at_idx" ON "patient_instructions"("patient_id", "issued_at");
CREATE INDEX "patient_instructions_encounter_id_idx" ON "patient_instructions"("encounter_id");

ALTER TABLE "patient_instructions" ADD CONSTRAINT "patient_instructions_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_instructions" ADD CONSTRAINT "patient_instructions_encounter_id_fkey"
    FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Templates and order sets ────────────────────────────────────────────────
CREATE TABLE "clinical_templates" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" "template_scope" NOT NULL DEFAULT 'Personal',
    "category" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "owner_name" TEXT NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "review_due_at" TIMESTAMP(3),
    "promotion_requested_at" TIMESTAMP(3),
    "promoted_at" TIMESTAMP(3),
    "promoted_by_user_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "clinical_templates_key_key" ON "clinical_templates"("key");
CREATE INDEX "clinical_templates_scope_category_idx" ON "clinical_templates"("scope", "category");
CREATE INDEX "clinical_templates_owner_user_id_idx" ON "clinical_templates"("owner_user_id");

-- ── Break-glass grants ──────────────────────────────────────────────────────
-- ⚠️ UI_ATLAS §3.2 / DD-014. A clinician who holds the capability but has no
-- care relationship is NOT refused — they are offered break-glass: state a
-- reason, proceed, and the access is logged and reviewed within 24 hours.
-- "An authorization model that can block resuscitation is the wrong model."
--
-- expires_at is load-bearing: without it a break-glass grant quietly becomes a
-- permanent care relationship, which is exactly the failure this model exists
-- to avoid.
CREATE TABLE "break_glass_grants" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "actor_name" TEXT NOT NULL,
    "reason_category" "break_glass_reason" NOT NULL,
    "reason" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_user_id" UUID,
    "outcome" "break_glass_outcome",
    "review_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "break_glass_grants_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "break_glass_grants_actor_user_id_expires_at_idx" ON "break_glass_grants"("actor_user_id", "expires_at");
CREATE INDEX "break_glass_grants_patient_id_granted_at_idx" ON "break_glass_grants"("patient_id", "granted_at");
CREATE INDEX "break_glass_grants_reviewed_at_granted_at_idx" ON "break_glass_grants"("reviewed_at", "granted_at");

ALTER TABLE "break_glass_grants" ADD CONSTRAINT "break_glass_grants_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
