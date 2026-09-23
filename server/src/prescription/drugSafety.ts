// ─────────────────────────────────────────────────────────────────────────────
// Deterministic drug safety — the hard stop
//
// ⚠️ THIS FILE IMPORTS NOTHING. No Prisma, no config, no model client, no
// network. That is the point, and it is a requirement rather than a style
// preference.
//
// UI_ATLAS §4.2 and §6210 are explicit: "static interaction tables and dose
// ranges still run" when every AI capability is off, and "safety never depends
// on the model being up". A rule that lives behind a service call can fail
// with that service. A pure function over data the caller already has cannot.
//
// The consequence worth stating plainly: the S-06-07 hard stop is NOT the
// model's opinion. It is a table lookup. It would fire identically if this
// product never had an AI feature at all.
// ─────────────────────────────────────────────────────────────────────────────

/** A rule row, narrowed to what the check actually needs. */
export interface SafetyRule {
  allergenKey: string;
  blocksClass: string;
  rationale: string;
}

export interface DrugForCheck {
  genericName: string;
  /** e.g. "Penicillin". Null means no class anyone can be allergic to. */
  allergenClass: string | null;
}

export interface AllergyHit {
  drugName: string;
  /** The patient's documented allergen that triggered this, e.g. "penicillin". */
  allergenKey: string;
  /** The drug class it blocks, e.g. "Penicillin". */
  blocksClass: string;
  /** Clinician-facing explanation. Shown verbatim in the AIP-09 gate. */
  rationale: string;
}

/**
 * Split a free-text allergy field into comparable keys.
 *
 * `PatientProfile.knownAllergies` is free text a human typed — "Penicillin,
 * Sulfa" or "penicillin; iodinated contrast" or "NKDA". This normalises it
 * enough to match a rule table without pretending to understand it.
 *
 * ⚠️ Phrases meaning "none" are recognised and produce an EMPTY list, not a
 * key called "no known allergies" — otherwise "NKDA" would be an allergen.
 */
export function normaliseAllergens(freeText: string | null | undefined): string[] {
  if (typeof freeText !== 'string') return [];
  const trimmed = freeText.trim();
  if (trimmed === '') return [];
  if (/^(none|nil|nkda|no known|not known|n\/a)\b/i.test(trimmed)) return [];

  return (
    trimmed
      // ⚠️ Strip parenthetical qualifiers BEFORE splitting. Clinicians write
      // "Penicillin (documented — anaphylaxis, 2019)", and the comma inside
      // those brackets would otherwise split one allergen into two useless
      // fragments. Matching still succeeded via substring comparison, but the
      // parsed list is also SHOWN to the clinician, and a garbled allergy
      // list on a safety screen undermines the screen.
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\[[^\]]*\]/g, ' ')
      .split(/[;,\n/]+/)
      .map((part) => part.trim().toLowerCase())
      .filter((part) => part.length > 0)
      // Drop the same "none"-ish tokens if they appear inside a longer list.
      .filter((part) => !/^(none|nil|nkda|no known allergies)$/i.test(part))
  );
}

/**
 * Does this drug collide with anything the patient is documented allergic to?
 *
 * Matching is substring-based in BOTH directions: a documented
 * "penicillin allergy" must match the rule key "penicillin", and a documented
 * "penicillin" must match a rule keyed "penicillin". Free text a clinician
 * typed under time pressure will not match a controlled vocabulary exactly,
 * and ⚠️ under-matching here means a missed hard stop — so the bias is
 * deliberately towards catching more, with the clinician able to override
 * through the G4 gate if the match is wrong.
 *
 * Returns the FIRST hit. One blocking reason is enough to stop a signature;
 * enumerating every reason is a review-screen concern, not a gate concern.
 */
export function checkAllergy(
  documentedAllergens: readonly string[],
  drug: DrugForCheck,
  rules: readonly SafetyRule[],
): AllergyHit | null {
  if (drug.allergenClass === null || drug.allergenClass === '') return null;
  if (documentedAllergens.length === 0) return null;

  const drugClass = drug.allergenClass.toLowerCase();

  // ⚠️ Lowercased HERE rather than trusting the caller. normaliseAllergens
  // already does it, but this function must not depend on having been called
  // through it: a future structured allergy table feeding raw values in would
  // otherwise produce a SILENTLY MISSED hard stop, which is the worst
  // possible failure mode for this check.
  const documented = documentedAllergens.map((a) => a.toLowerCase());

  for (const rule of rules) {
    if (rule.blocksClass.toLowerCase() !== drugClass) continue;

    const ruleKey = rule.allergenKey.toLowerCase();
    const matched = documented.some((entry) => entry.includes(ruleKey) || ruleKey.includes(entry));

    if (matched) {
      return {
        drugName: drug.genericName,
        allergenKey: rule.allergenKey,
        blocksClass: rule.blocksClass,
        rationale: rule.rationale,
      };
    }
  }

  return null;
}

export interface DoseBand {
  cohort: string;
  minDose: number;
  maxDose: number;
  unit: string;
  perKg: boolean;
  maxPerDay: number | null;
}

export type DoseVerdict =
  | { status: 'ok' }
  /** No band on file. ⚠️ Reported honestly — never silently treated as safe. */
  | { status: 'unknown'; message: string }
  | { status: 'below' | 'above'; message: string; min: number; max: number; unit: string };

/**
 * Is this dose inside the published band?
 *
 * ⚠️ A paediatric band is per-kilogram, so it cannot be evaluated without a
 * weight. When the weight is missing this returns `unknown` rather than `ok`
 * — "we could not check" and "we checked and it is fine" are different
 * answers, and collapsing them is how a dosing error ships.
 */
export function checkDose(
  dose: number,
  unit: string,
  band: DoseBand | null,
  weightKg: number | null = null,
): DoseVerdict {
  if (band === null) {
    return { status: 'unknown', message: 'No dose range on file for this drug.' };
  }

  if (band.unit.toLowerCase() !== unit.toLowerCase()) {
    return {
      status: 'unknown',
      message: `Dose is in ${unit} but the published range is in ${band.unit}; cannot compare.`,
    };
  }

  let min = band.minDose;
  let max = band.maxDose;

  if (band.perKg) {
    if (weightKg === null || weightKg <= 0) {
      return {
        status: 'unknown',
        message: 'This drug is dosed per kilogram and no recorded weight is available.',
      };
    }
    min = band.minDose * weightKg;
    max = band.maxDose * weightKg;
  }

  const round = (n: number): number => Math.round(n * 1000) / 1000;

  if (dose < min) {
    return {
      status: 'below',
      message: `Dose ${dose} ${unit} is below the usual range (${round(min)}–${round(max)} ${unit}).`,
      min: round(min),
      max: round(max),
      unit,
    };
  }
  if (dose > max) {
    return {
      status: 'above',
      message: `Dose ${dose} ${unit} is above the usual range (${round(min)}–${round(max)} ${unit}).`,
      min: round(min),
      max: round(max),
      unit,
    };
  }

  return { status: 'ok' };
}

/**
 * May this prescription be signed?
 *
 * ⚠️ An allergy hit BLOCKS. An out-of-range dose WARNS.
 *
 * The asymmetry is deliberate and clinical: prescribing a drug a patient is
 * documented allergic to is categorically wrong and needs a second
 * consultant to proceed (G4). A dose outside the usual band is frequently
 * correct — renal adjustment, loading doses, specialist practice — so
 * blocking it would train clinicians to override reflexively, which destroys
 * the meaning of the block that matters.
 */
export function canSign(hits: readonly AllergyHit[]): boolean {
  return hits.length === 0;
}
