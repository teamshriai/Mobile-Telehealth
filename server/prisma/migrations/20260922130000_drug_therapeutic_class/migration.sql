-- ============================================================================
-- Add drugs.therapeutic_class.
--
-- Additive: one new nullable column, no data rewritten. Safe against a
-- populated database.
--
-- ⚠️ WHY. The S-06-07 hard stop must offer three alternatives when it blocks a
-- drug. Selecting them by "same route, different allergen class" returns
-- clinically absurd suggestions — a statin as an alternative to an antibiotic
-- — because nothing in the schema recorded what a drug is FOR, only what it
-- might cause a reaction to. An alternative list a clinician cannot trust is
-- worse than an empty one, because it invites a mis-click on a safety screen.
-- ============================================================================

ALTER TABLE "drugs" ADD COLUMN "therapeutic_class" TEXT;

CREATE INDEX "drugs_therapeutic_class_idx" ON "drugs"("therapeutic_class");
