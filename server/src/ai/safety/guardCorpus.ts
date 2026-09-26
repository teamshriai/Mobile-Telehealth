import type { RecordedCondition } from './conditionEvidence';

// ─────────────────────────────────────────────────────────────────────────────
// What the output guard checks a reply against.
//
// Two kinds of evidence, deliberately kept apart:
//
//  - `text` is EXACTLY what the model was given this turn: the record lines
//    selected for the question, today's date line, the kept conversation
//    turns and the question itself. A number, date or medicine name in the
//    reply must appear here — a record line the model never saw cannot have
//    been its source.
//  - the structured facts (conditions, prescribed doses, lab flags, source
//    tags) come from the WHOLE record. They are true of the patient whether or
//    not this turn's selection included them, so a reply may lean on them.
// ─────────────────────────────────────────────────────────────────────────────

export type LabFlagWord = 'high' | 'low' | 'critical' | 'abnormal' | 'none';

export interface LabAnalyteFlags {
  /** Lowercase names a reply might use: "ldl cholesterol", "ldl". */
  names: string[];
  /** Every flag the lab has printed beside this test, 'none' for unflagged. */
  flags: Set<LabFlagWord>;
}

export interface GuardCorpus {
  text: string;
  question: string;
  conditions: RecordedCondition[];
  prescribed: Array<{ name: string; dose: string; unit: string }>;
  labs: LabAnalyteFlags[];
  /** Source tags that exist in the record, e.g. "[Lab report 10 Sep 2026]". */
  sourceTags: Set<string>;
}

/** "[Lab report 10 Sep 2026]" → "lab report 10 sep 2026". */
export function normaliseTag(tag: string): string {
  return tag
    .replace(/^\[|\]$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export const SOURCE_TAG = /\[([^[\]\n]{2,60})\]/g;

export function tagsIn(text: string): Set<string> {
  return new Set([...text.matchAll(SOURCE_TAG)].map((m) => normaliseTag(m[1])));
}

/**
 * A corpus from plain text alone — for callers that have no structured record
 * (the medicine summary). Every check still runs; the ones that need
 * structured evidence simply find none, which fails safe.
 */
export function corpusFromText(text: string): GuardCorpus {
  return {
    text,
    question: '',
    conditions: [],
    prescribed: [],
    labs: [],
    sourceTags: tagsIn(text),
  };
}

const LAB_ALIASES: Array<[RegExp, string[]]> = [
  [/\bhba1c\b/i, ['hba1c', 'a1c', 'glycated haemoglobin', 'glycated hemoglobin']],
  [/\bha?emoglobin\b/i, ['haemoglobin', 'hemoglobin']],
  [/\bldl\b/i, ['ldl']],
  [/\bnon-hdl\b/i, ['non-hdl']],
  [/\bvldl\b/i, ['vldl']],
  [/(?<!non-)\bhdl\b/i, ['hdl']],
  [/\balt\b|\bsgpt\b/i, ['alt', 'sgpt']],
  [/\bast\b|\bsgot\b/i, ['ast', 'sgot']],
  [
    /\bfasting\b.*\bglucose\b|\bglucose\b.*\bfasting\b/i,
    ['fasting glucose', 'fasting sugar', 'fasting blood sugar'],
  ],
  [
    /\brandom\b.*\bglucose\b|\bglucose\b.*\brandom\b/i,
    ['random glucose', 'random sugar', 'random blood sugar'],
  ],
  [/\btsh\b/i, ['tsh', 'thyroid stimulating hormone']],
  [/\bcrp\b|c-reactive/i, ['crp']],
  [/\begfr\b/i, ['egfr']],
  [/\btriglycerides?\b/i, ['triglycerides', 'triglyceride']],
  [/\btotal cholesterol\b/i, ['total cholesterol']],
  [/\bplatelet/i, ['platelets', 'platelet count']],
];

/** The lowercase names a reply might use for one analyte. */
export function analyteNames(analyteName: string): string[] {
  const base = analyteName
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const names = new Set([base]);
  // A ratio is named only in full: "HDL" alone means the HDL test, never the
  // total-cholesterol-to-HDL ratio.
  if (/\bratio\b/i.test(analyteName)) return [...names];
  for (const [re, aliases] of LAB_ALIASES)
    if (re.test(analyteName)) aliases.forEach((a) => names.add(a));
  return [...names];
}
