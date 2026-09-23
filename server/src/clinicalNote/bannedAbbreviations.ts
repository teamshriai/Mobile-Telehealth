// ─────────────────────────────────────────────────────────────────────────────
// Banned abbreviation check — CMP-NABH-05
//
// ⚠️ Imports nothing, exactly like drugSafety.ts, and for the same reason.
// UI_ATLAS lists this as AI-114 with gate G1, but the underlying rule is a
// FIXED LIST published by NABH and by ISMP — it is a lookup, not a judgement,
// and it must keep working with every model off.
//
// Why these specific strings are dangerous is recorded against each one,
// because a warning a clinician does not understand is a warning they learn
// to dismiss.
// ─────────────────────────────────────────────────────────────────────────────

export interface BannedAbbreviation {
  /** The token as written. Matched case-insensitively, on word boundaries. */
  term: string;
  /** What it gets confused with — shown to the clinician. */
  risk: string;
  /** What to write instead. */
  useInstead: string;
}

/**
 * The ISMP / NABH "do not use" list, trimmed to the entries that actually
 * occur in narrative clinical text. Dose-expression rules that need numeric
 * context (a trailing zero, a missing leading zero) are handled separately
 * below, because they cannot be expressed as a word match.
 */
export const BANNED_ABBREVIATIONS: readonly BannedAbbreviation[] = [
  { term: 'U', risk: 'read as a zero or a four — "4U" becomes "40"', useInstead: 'unit' },
  { term: 'IU', risk: 'read as IV or as the number 10', useInstead: 'international unit' },
  { term: 'QD', risk: 'read as QID (four times daily)', useInstead: 'daily' },
  { term: 'QOD', risk: 'read as QD or QID', useInstead: 'every other day' },
  { term: 'OD', risk: 'read as "right eye" rather than once daily', useInstead: 'once daily' },
  { term: 'MS', risk: 'means morphine sulfate OR magnesium sulfate', useInstead: 'the full drug name' },
  { term: 'MSO4', risk: 'confused with magnesium sulfate', useInstead: 'morphine sulfate' },
  { term: 'MgSO4', risk: 'confused with morphine sulfate', useInstead: 'magnesium sulfate' },
  { term: 'cc', risk: 'read as "00" (zero zero)', useInstead: 'mL' },
  { term: 'HS', risk: 'means bedtime OR half-strength', useInstead: 'at bedtime' },
  { term: 'SC', risk: 'read as SL (sublingual)', useInstead: 'subcutaneous' },
  { term: 'SQ', risk: 'read as "5 every"', useInstead: 'subcutaneous' },
  { term: 'TIW', risk: 'read as three times a day or twice weekly', useInstead: '3 times a week' },
  { term: 'AD', risk: 'means right ear — confused with AS/AU', useInstead: 'right ear' },
  { term: 'AS', risk: 'means left ear — confused with AD/AU', useInstead: 'left ear' },
  { term: 'AU', risk: 'means both ears — confused with AD/AS', useInstead: 'both ears' },
  { term: 'D/C', risk: 'means discharge OR discontinue', useInstead: 'discharge or discontinue' },
];

export interface AbbreviationFinding {
  term: string;
  risk: string;
  useInstead: string;
  /** Character offset of the first occurrence, so the UI can point at it. */
  index: number;
}

/**
 * Find banned abbreviations in a block of clinical narrative.
 *
 * ⚠️ Word-boundary matched, so "USUAL" does not trip the "U" rule and
 * "discuss" does not trip "SC". Getting this wrong in the noisy direction is
 * how a safety check becomes something clinicians reflexively ignore.
 *
 * ⚠️ Case-SENSITIVE for the short all-caps tokens (U, OD, MS, AS, AD, AU, SC,
 * SQ, HS, IU, QD, QOD, TIW) and case-insensitive for the rest. Lower-case
 * "as" and "us" are ordinary English words; upper-case "AS" in a clinical
 * note is an ear. A case-insensitive match on those would flag every second
 * sentence.
 */
const CASE_SENSITIVE = new Set([
  'U', 'IU', 'QD', 'QOD', 'OD', 'MS', 'HS', 'SC', 'SQ', 'TIW', 'AD', 'AS', 'AU',
]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

export function findBannedAbbreviations(text: string | null | undefined): AbbreviationFinding[] {
  if (typeof text !== 'string' || text.trim() === '') return [];

  const findings: AbbreviationFinding[] = [];

  for (const entry of BANNED_ABBREVIATIONS) {
    const caseSensitive = CASE_SENSITIVE.has(entry.term);
    const flags = caseSensitive ? 'g' : 'gi';
    // \b does not work against a term containing '/', so bound on
    // non-word-ish characters explicitly for those.
    // ⚠️ The leading boundary is `(?:(?<=\d)|\b)`, not a bare `\b`.
    //
    // "4U" is THE case this rule exists for — it is how 4 units becomes 40 —
    // but there is no word boundary between a digit and a letter, so a plain
    // \b silently misses it. The digit lookbehind is what catches "4U",
    // "500cc" and "10U" while still leaving "usual" alone (the short
    // all-caps terms are case-sensitive, see CASE_SENSITIVE above).
    const pattern = entry.term.includes('/')
      ? new RegExp(`(^|\\s)${escapeRegExp(entry.term)}(?=\\s|$|[.,;:])`, flags)
      : new RegExp(`(?:(?<=\\d)|\\b)${escapeRegExp(entry.term)}\\b`, flags);

    const match = pattern.exec(text);
    if (match !== null) {
      findings.push({
        term: entry.term,
        risk: entry.risk,
        useInstead: entry.useInstead,
        index: match.index,
      });
    }
  }

  return findings.sort((a, b) => a.index - b.index);
}

/**
 * Dose-expression hazards that need numeric context rather than a word match:
 * a trailing zero ("1.0 mg" reads as 10 mg if the point is missed) and a
 * missing leading zero (".5 mg" reads as 5 mg). Both are NABH/ISMP rules and
 * both have caused real tenfold overdoses.
 */
export function findDoseExpressionHazards(text: string | null | undefined): AbbreviationFinding[] {
  if (typeof text !== 'string' || text.trim() === '') return [];
  const findings: AbbreviationFinding[] = [];

  const trailingZero = /\b\d+\.0+(?=\s*(mg|ml|mcg|g|unit))/i.exec(text);
  if (trailingZero !== null) {
    findings.push({
      term: trailingZero[0],
      risk: 'a trailing zero reads as a tenfold overdose if the decimal point is missed',
      useInstead: 'the whole number without the decimal',
      index: trailingZero.index,
    });
  }

  const missingLeadingZero = /(^|\s)\.\d+(?=\s*(mg|ml|mcg|g|unit))/i.exec(text);
  if (missingLeadingZero !== null) {
    findings.push({
      term: missingLeadingZero[0].trim(),
      risk: 'a missing leading zero reads as a tenfold overdose if the point is missed',
      useInstead: 'a leading zero, e.g. 0.5',
      index: missingLeadingZero.index,
    });
  }

  return findings;
}

/** Everything CMP-NABH-05 flags in one pass, ordered by position. */
export function checkDocumentationQuality(text: string | null | undefined): AbbreviationFinding[] {
  return [...findBannedAbbreviations(text), ...findDoseExpressionHazards(text)].sort(
    (a, b) => a.index - b.index,
  );
}
