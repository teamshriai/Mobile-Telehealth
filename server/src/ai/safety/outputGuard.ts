import { detectEmergency, type EmergencyCategory } from './emergency.guard';
import { conceptsIn, isRecorded } from './conditionEvidence';
import { medicineNamesIn } from './drugLexicon';
import {
  corpusFromText,
  normaliseTag,
  SOURCE_TAG,
  type GuardCorpus,
  type LabFlagWord,
} from './guardCorpus';

// ─────────────────────────────────────────────────────────────────────────────
// Post-generation output guard — v2.
//
// A system prompt guarantees nothing — it is a soft prior on an open-weights
// 20B model, defeated by ordinary sampling variance and by prompt injection
// arriving through the patient's own record text placed in context. These
// checks are deterministic and run on the model's OUTPUT before it is shown
// or stored. Rejection is reject-and-replace, never edit-in-place: editing a
// model's clinical-sounding text risks producing a different but equally
// wrong clinical-sounding text.
//
// v2 keeps every v1 rule and removes the false positives that made the
// assistant refuse correct answers:
//  - a reply restating the record ("at your visit on 25 Jun 2026 you had face
//    drooping") no longer trips the emergency re-check — only a present-tense,
//    unconditional restatement does, and that now shows the fixed 108
//    interlock rather than "can't answer";
//  - "you had a stroke" is allowed when the care team recorded one;
//  - "do not stop clopidogrel without asking your doctor" and restating the
//    exact prescribed dose "as prescribed" are allowed;
//  - "cholesterol" and "alcohol" are no longer medicine names; "1,000 steps"
//    is no longer an emergency number.
// and adds checks the richer record needs: dates, source tags, the lab's own
// flag, judgement of a result, and non-English replies.
//
// Words inside quotation marks that appear verbatim in the record are the
// record's words, not the model's claims, and are set aside before the
// diagnosis, reassurance and interpretation checks — so a radiologist's
// "no acute abnormality" can be quoted. They are NOT set aside for dosing,
// emergency or fabrication checks.
// ─────────────────────────────────────────────────────────────────────────────

export const OUTPUT_GUARD_VERSION = 'output-2026-09-25';

export type OutputCheckFailure =
  | 'empty_reply'
  | 'truncated_reply'
  | 'non_english_reply'
  | 'diagnosis_assertion'
  | 'false_reassurance'
  | 'result_interpretation'
  | 'lab_flag_mismatch'
  | 'dosing_instruction'
  | 'wrong_emergency_number'
  | 'emergency_missed_by_input_guard'
  | 'fabricated_number'
  | 'fabricated_date'
  | 'fabricated_source'
  | 'fabricated_medication';

export type OutputCheckResult =
  { ok: true } | { ok: false; failure: OutputCheckFailure; emergencyCategory?: EmergencyCategory };

const fail = (failure: OutputCheckFailure): OutputCheckResult => ({ ok: false, failure });

// ── Normalisation ────────────────────────────────────────────────────────────

const CONTRACTIONS: Array<[RegExp, string]> = [
  [/\byou're\b/g, 'you are'],
  [/\byou've\b/g, 'you have'],
  [/\byou'll\b/g, 'you will'],
  [/\byou'd\b/g, 'you would'],
  [/\bit's\b/g, 'it is'],
  [/\bthat's\b/g, 'that is'],
  [/\bthere's\b/g, 'there is'],
  [/\bi'm\b/g, 'i am'],
  [/\bdon't\b/g, 'do not'],
  [/\bdoesn't\b/g, 'does not'],
  [/\bdidn't\b/g, 'did not'],
  [/\bisn't\b/g, 'is not'],
  [/\baren't\b/g, 'are not'],
  [/\bwasn't\b/g, 'was not'],
  [/\bweren't\b/g, 'were not'],
  [/\bshouldn't\b/g, 'should not'],
  [/\bcan't\b/g, 'cannot'],
  [/\bwon't\b/g, 'will not'],
];

/** Lowercase, straight quotes, contractions expanded, space collapsed. */
export function normalise(text: string): string {
  let t = text
    .normalize('NFKC')
    .replace(/[‘’ʼ′]/g, "'")
    .replace(/[“”″]/g, '"')
    // Non-breaking and typographic hyphens/dashes: "right‑sided" is "right-sided".
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[*_`#]+/g, '')
    .toLowerCase();
  for (const [re, to] of CONTRACTIONS) t = t.replace(re, to);
  return t.replace(/[ \t]+/g, ' ').trim();
}

/** Sentences and list items. */
function sentencesOf(normalised: string): string[] {
  return normalised
    .split(/(?<=[.!?])\s+|\n+|;\s+/)
    .map((s) => s.replace(/^\s*(?:[-•]|\d+[.)])\s*/, '').trim())
    .filter((s) => s.length > 0);
}

/** Quoted spans that appear verbatim in the record, replaced by a marker. */
function withoutRecordQuotes(text: string, corpusNorm: string): string {
  return text.replace(/"([^"]{6,})"/g, (whole, inner: string) =>
    corpusNorm.includes(inner.replace(/\s+/g, ' ').trim()) ? ' "…" ' : whole,
  );
}

// ── Language ─────────────────────────────────────────────────────────────────

function isMostlyNonLatin(text: string): boolean {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length < 20) return false;
  const latin = letters.filter((c) => /[a-zà-ÿ]/i.test(c)).length;
  return (letters.length - latin) / letters.length > 0.15;
}

// ── Emergency numbers ────────────────────────────────────────────────────────

/** Only 108/112 (India), 102 (ambulance) and 14416 (Tele-MANAS) are correct.
 *  A US-trained model reaches for 911 by default. "000" is caught only as a
 *  number to call — "1,000 steps" is not an emergency number. */
function hasWrongEmergencyNumber(t: string): boolean {
  if (/\b911\b|\b999\b|\b(call|dial|ring|phone) 000\b/.test(t)) return true;
  for (const m of t.matchAll(
    /\bemergency (services|number|line|helpline)\b[^.]{0,25}?\b(\d{3,5})\b/g,
  )) {
    if (!['108', '112', '102', '14416'].includes(m[2])) return true;
  }
  return false;
}

// ── Emergency restated in the reply ──────────────────────────────────────────

/** A reply sentence that mentions an emergency sign conditionally, as
 *  education, as record history, or while already sending the patient to
 *  108 is not the model restating an emergency happening now. "It sounds
 *  like …" is never an exemption. */
const REPLY_EMERGENCY_EXEMPT: RegExp[] = [
  /\b(if|when|whenever|should|in case|unless)\b/,
  /\bcall 108\b|\b108\b/,
  /\b(signs?|symptoms?|warning signs?|such as|for example|e\.g\.|include|includes|including|be ?fast)\b/,
  /\b(was|were|had|recorded|reported|noted|documented|at the time|at your|admitted|admission)\b/,
  /\[[^\]]+\]/,
];

/**
 * A list item or clause copied from the record ("Reason: Sudden right-sided
 * weakness and slurred speech", from a visit line) is the record's history,
 * not an emergency the model is describing now.
 */
function echoesRecord(sentence: string, corpusNorm: string): boolean {
  const body = sentence
    .replace(/^[^:]{1,40}:\s*/, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/[.;,\s]+$/, '')
    .trim();
  return body.length >= 12 && corpusNorm.includes(body);
}

function restatedEmergency(sentences: string[], corpusNorm: string): EmergencyCategory | null {
  for (const s of sentences) {
    const hit = detectEmergency(s);
    if (hit === null) continue;
    if (/\bsounds? like\b|\blooks? like\b/.test(s)) return hit.category;
    if (REPLY_EMERGENCY_EXEMPT.some((p) => p.test(s))) continue;
    if (echoesRecord(s, corpusNorm)) continue;
    return hit.category;
  }
  return null;
}

// ── Diagnosis ────────────────────────────────────────────────────────────────

/**
 * The noun phrase a claim is about: cut at the first preposition or clause
 * word, with the names of services removed — "an appointment at the Stroke
 * Clinic" is about an appointment, and "the stroke unit" asserts nothing.
 */
function claimPhrase(text: string): string {
  return text
    .split(
      /\b(?:at|on|in|with|for|to|from|by|and|or|which|that|who|when|since|after|before|because|prescribed|given|used)\b/,
    )[0]
    .replace(
      /\bstroke[- ](clinic|unit|team|service|centre|center|ward|nurse|specialist|care|programme|program|rehab\w*|recovery|follow[- ]?up|physician|neurologist|doctor|ai)\b/g,
      ' ',
    );
}

function diagnosisAssertion(sentence: string, corpus: GuardCorpus): boolean {
  if (/\bmy diagnosis is\b|\bi (diagnose|can confirm)\b/.test(sentence)) return true;

  const speculative = [
    /\byou are (having|experiencing|suffering from|showing (signs|symptoms) of)\b(.{0,50})/,
    /\b(this|that|it) (is|means|could be|might be|may be|suggests|indicates|points to)\b(.{0,50})/,
    /\b(this|that|it) (sounds|looks|seems) like\b(.{0,50})/,
    /\byou (may|might|could|probably|likely|possibly) (have|had|be having|have had)\b(.{0,50})/,
  ];
  for (const re of speculative) {
    const m = sentence.match(re);
    if (m !== null && conceptsIn(claimPhrase(m[m.length - 1])).length > 0) return true;
  }

  // "you have / had X" is allowed only for what the care team recorded, and
  // an acute event only in the past.
  for (const m of sentence.matchAll(
    /\byou (have had|had|have been diagnosed with|were diagnosed with|suffered|have|suffer from)\b([^.,;:!?]{0,50})/g,
  )) {
    for (const concept of conceptsIn(claimPhrase(m[2]))) {
      if (!isRecorded(concept, corpus.conditions)) return true;
      if (concept.acute && (m[1] === 'have' || m[1] === 'suffer from')) return true;
    }
  }
  for (const m of sentence.matchAll(/\byour ((?:[a-z'-]+ ?){1,3})/g)) {
    for (const concept of conceptsIn(claimPhrase(m[1]))) {
      if (!isRecorded(concept, corpus.conditions)) return true;
    }
  }
  return false;
}

// ── Reassurance and interpretation ───────────────────────────────────────────

const REASSURANCE: RegExp[] = [
  /\byou are (fine|okay|ok|normal|alright|all right|healthy|doing (fine|well|great|good))\b/,
  /\bnothing (to worry about|serious|to be concerned about)\b/,
  /\bno (need|reason|cause) (to|for) (worry|concern|alarm|be concerned)\b/,
  /\bdo not worry\b|\bnot something to worry\b/,
  /\b(this|that|it) is (completely |perfectly |totally |quite )?normal\b/,
  /\bprobably (just|nothing)\b/,
  /\bit is (just|only) \w+, nothing serious\b/,
  /\byou do not need to see (a doctor|your (doctor|care team))\b/,
  /\b(results?|readings?|levels?|values?|numbers?|scans?|reports?|tests?|x-?rays?|images?)\b[^.]{0,30}\b(is|are|was|were|look|looks|looked|came back|seem|seems)\s+(normal|fine|good|great|ok|okay|healthy|reassuring|clear|all clear)\b/,
  /\b(safe|fine|okay|ok) to (take|use|have)\b[^.]{0,30}\b(together|with)\b/,
  /\b(it is|they are|this is|that is) (perfectly |completely |totally )?safe\b/,
  /\bgood news\b|\bnothing abnormal\b|\ball (is|looks) (well|good|fine)\b/,
];

const RESULT_SUBJECT =
  /\b(ldl|hdl|vldl|cholesterol|triglycerides?|lipids?|hba1c|a1c|sugar|glucose|creatinine|egfr|urea|sodium|potassium|ha?emoglobin|platelets?|inr|tsh|thyroid|liver|kidney|alt|ast|bilirubin|crp|troponin|results?|readings?|levels?|values?|blood pressure|bp|pulse|heart rate|oxygen|spo2|weight|bmi)\b/;
const JUDGEMENT =
  /\b(too high|too low|very high|very low|dangerously|dangerous|good|bad|healthy|unhealthy|excellent|great|improved|improving|improvement|better|worse|worsened|worsening|deteriorat\w*|concerning|worrying|alarming|under control|well controlled|poorly controlled|normal|abnormal|fine|okay|ideal|optimal|satisfactory|on target|at target|within normal|out of range|elevated|raised)\b/;
/** Phrases that carry a judgement word without judging a result. */
const BENIGN_JUDGEMENT =
  /\b(better|best|good|a good idea|helpful|important|fine|okay|ok|useful|worth) to (ask|check|talk|speak|discuss|bring|note|write|keep|call|contact|see|mention|share|go over)\b|\bgood (question|idea|time|habit|practice)\b|\bfeel(ing|s)? (better|worse)\b/g;

/** The lab's own range wording ("lab range Optimal < 100") is the lab's,
 *  not a judgement by the model. */
const LAB_RANGE_TEXT = /\b(lab |reference |normal )?range\b[^;)\]]*/g;

function resultInterpretation(sentence: string): boolean {
  if (/^in general\b/.test(sentence) && !/\byou(r)?\b/.test(sentence)) return false;
  const s = sentence.replace(LAB_RANGE_TEXT, ' ').replace(BENIGN_JUDGEMENT, ' ');
  const src = RESULT_SUBJECT.source;
  const jud = JUDGEMENT.source;
  return (
    new RegExp(`${src}[^.]{0,40}?${jud}`).test(s) || new RegExp(`${jud}[^.]{0,15}?${src}`).test(s)
  );
}

// ── The lab's own flag ───────────────────────────────────────────────────────

const FLAG_WORD = /\b(critically (high|low)|critical|high|low|abnormal)\b/g;

function flagOf(word: string): LabFlagWord[] {
  if (word.startsWith('critical'))
    return [
      'critical',
      ...(word.endsWith('high') ? ['high' as const] : word.endsWith('low') ? ['low' as const] : []),
    ];
  return [word as LabFlagWord];
}

/**
 * Every flag word must match the flag the lab printed for the test it is
 * nearest to (the closest analyte named before it; else the first after).
 */
function labFlagMismatch(sentence: string, corpus: GuardCorpus): boolean {
  if (corpus.labs.length === 0) return false;
  const s = sentence
    .replace(
      /\b(high|low) blood pressure\b|\bhigh[- ]intensity\b|\blow[- ](salt|fat|sugar|dose)\b/g,
      ' ',
    )
    .replace(
      /\b(not|never|no|without)\b[^.,;]{0,20}?\b(critically (high|low)|critical|high|low|abnormal)\b/g,
      ' ',
    );

  // Analyte mentions, longest name first so "ldl cholesterol" beats "ldl".
  const mentions: Array<{ at: number; end: number; entry: number }> = [];
  const names = corpus.labs
    .flatMap((l, entry) => l.names.map((name) => ({ name, entry })))
    .sort((a, b) => b.name.length - a.name.length);
  const taken: Array<[number, number]> = [];
  for (const { name, entry } of names) {
    const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}\\b`, 'g');
    for (const m of s.matchAll(re)) {
      const at = m.index ?? 0;
      const end = at + m[0].length;
      if (taken.some(([a, b]) => at < b && end > a)) continue;
      taken.push([at, end]);
      mentions.push({ at, end, entry });
    }
  }
  if (mentions.length === 0) return false;

  for (const m of s.matchAll(FLAG_WORD)) {
    const at = m.index ?? 0;
    const before = mentions.filter((x) => x.end <= at).sort((a, b) => b.end - a.end)[0];
    const after = mentions.filter((x) => x.at >= at).sort((a, b) => a.at - b.at)[0];
    const nearest = before ?? after;
    if (nearest === undefined) continue;
    const flags = corpus.labs[nearest.entry].flags;
    if (!flagOf(m[0]).every((f) => flags.has(f))) return true;
  }
  return false;
}

// ── Dosing ───────────────────────────────────────────────────────────────────

const DOSE_UNIT = '(mg|ml|mcg|g|iu|tablets?|pills?|units?|capsules?)';
const CHANGE_VERB = '(stop|start|increase|reduce|double|skip|halve|cut)';

const V1_DOSING: RegExp[] = [
  new RegExp(
    `\\b(should|must|need to|have to|try to|i recommend|i suggest|i advise|please)\\b[^.?!]{0,30}\\b(take|stop|start|increase|reduce|double|skip|halve)\\b[^.?!]{0,40}\\b\\d+\\s?${DOSE_UNIT}\\b`,
  ),
  new RegExp(`\\b${CHANGE_VERB}\\b[^.?!]{0,40}\\b\\d+\\s?${DOSE_UNIT}\\b`),
  new RegExp(`\\b\\d+\\s?${DOSE_UNIT}\\b[^.?!]{0,40}\\b${CHANGE_VERB}\\b`),
  /\byou should (take|stop|start) \d+/,
];

/** "Do not stop … without asking your doctor" advises AGAINST a change. */
const NEGATED_CHANGE =
  /\b(do not|never|avoid|should not|must not|without)\b[^.;,]{0,30}?\b(stop|stopping|skip|skipping|double|doubling|halve|halving|increase|increasing|reduce|reducing|change|changing|adjust|adjusting|switch|switching|miss|missing|take (an )?extra|take two|take more|take less)\w*/g;

const MED_OBJECT =
  /\b(dose|doses|dosage|tablets?|pills?|capsules?|medicines?|medications?|drugs?|injections?|insulin|it|them|this|that|taking|mg|mcg|ml|units?)\b/;

const IMPERATIVE_CHANGE =
  /(?:^|\b(?:you should|you can|you could|you may|you might want to|try to|try|i suggest|i recommend|i advise|it is (?:fine|okay|ok|safe) to|feel free to|go ahead and|please|just)\s+)(stop|skip|double|halve|increase|reduce|cut down on|cut back on|switch|swap|replace|take (?:an )?extra|take (?:more|less|another|two)|take (?:it|them) (?:later|earlier|at night|in the morning)|miss)\b(.{0,40})/;

function dosingInstruction(sentence: string, corpus: GuardCorpus): boolean {
  const s = sentence.replace(NEGATED_CHANGE, ' ');

  const imp = s.match(IMPERATIVE_CHANGE);
  if (imp !== null && (MED_OBJECT.test(imp[2]) || medicineNamesIn(imp[2]).length > 0)) return true;

  if (!V1_DOSING.some((p) => p.test(s))) return false;
  // Restating the exact prescribed dose ("take clopidogrel 75 mg once a day,
  // as prescribed") is not advice — unless a change verb is also present.
  if (new RegExp(`\\b${CHANGE_VERB}\\b`).test(s)) return true;
  const doses = [...s.matchAll(new RegExp(`\\b(\\d+(?:\\.\\d+)?)\\s?${DOSE_UNIT}\\b`, 'g'))];
  const prescribed = (n: string, u: string): boolean =>
    corpus.prescribed.some(
      (p) =>
        Number(p.dose) === Number(n) &&
        p.unit.toLowerCase().replace(/s$/, '') === u.replace(/s$/, ''),
    );
  return !(doses.length > 0 && doses.every((d) => prescribed(d[1], d[2])));
}

// ── Fabrication ──────────────────────────────────────────────────────────────

const canonNumber = (n: string): string => {
  const x = Number(n.replace(/,/g, ''));
  return Number.isFinite(x) ? String(x) : n;
};

function numbersIn(text: string): Set<string> {
  return new Set([...text.matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) => canonNumber(m[0])));
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_RE = '(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?';

/** Dates as "YYYY-M-D" (year known) or "M-D", in any common written form. */
function datesIn(text: string): {
  full: Set<string>;
  dayMonth: Set<string>;
  spans: Array<[number, number]>;
} {
  const full = new Set<string>();
  const dayMonth = new Set<string>();
  const spans: Array<[number, number]> = [];
  const add = (d: number, m: number, y: string | undefined, at: number, len: number): void => {
    if (d < 1 || d > 31 || m < 1 || m > 12) return;
    dayMonth.add(`${m}-${d}`);
    if (y !== undefined) full.add(`${y}-${m}-${d}`);
    spans.push([at, at + len]);
  };
  const t = text.toLowerCase();
  for (const m of t.matchAll(
    new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?[\\s-]${MONTH_RE}(?:[\\s,-]+(\\d{4}))?\\b`, 'g'),
  )) {
    add(Number(m[1]), MONTHS.indexOf(m[2].slice(0, 3)) + 1, m[3], m.index ?? 0, m[0].length);
  }
  for (const m of t.matchAll(
    new RegExp(`\\b${MONTH_RE}\\s(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s(\\d{4}))?\\b`, 'g'),
  )) {
    add(Number(m[2]), MONTHS.indexOf(m[1].slice(0, 3)) + 1, m[3], m.index ?? 0, m[0].length);
  }
  for (const m of t.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g)) {
    add(Number(m[1]), Number(m[2]), m[3], m.index ?? 0, m[0].length);
  }
  return { full, dayMonth, spans };
}

function fabricatedDate(reply: string, corpusText: string): boolean {
  const r = datesIn(reply);
  const c = datesIn(corpusText);
  for (const key of r.full) if (!c.full.has(key)) return true;
  for (const key of r.dayMonth) if (!c.dayMonth.has(key)) return true;
  return false;
}

const UNIT_NUMBER =
  /\b(\d+(?:\.\d+)?)\s?(mg\/dl|mmol\/l|g\/dl|ng\/l|ng\/ml|u\/l|iu\/l|µiu\/ml|miu\/l|uiu\/ml|mg\/l|fl|pg|mmhg|bpm|mcg|mg|ml|g|iu|kg|cm|%|°c|°f|\/min|beats per minute|breaths per minute|units?|tablets?|pills?|capsules?)(?![a-z])/g;
const ANALYTE_NUMBER =
  /\b(ldl|hdl|vldl|hba1c|a1c|cholesterol|triglycerides?|glucose|sugar|creatinine|egfr|urea|sodium|potassium|ha?emoglobin|platelets?|inr|tsh|crp|troponin|alt|ast|bilirubin|pulse|heart rate|spo2|oxygen|temperature|weight|height|bmi|blood pressure|bp)\b(?:\s+(?:was|is|of|at|reading|level|value|result|measured|came to|count|:|=|-|—))*\s*(\d+(?:\.\d+)?)/g;
const PHONE =
  /(?<![\d.])(?:\+?91[\s-]?)?\d{5}[\s-]?\d{5}(?!\d)|\b1[\s-]?800[\s-]?\d{3}[\s-]?\d{4}\b/g;
const ALWAYS_ALLOWED_PHONES = new Set(['18008914416']); // Tele-MANAS

function fabricatedNumber(reply: string, corpusText: string): boolean {
  // Dates are judged by the date check; strip them so "10/09/2026" is not
  // read as a blood pressure.
  const spans = datesIn(reply).spans.sort((a, b) => b[0] - a[0]);
  let r = reply.toLowerCase();
  for (const [a, b] of spans) r = r.slice(0, a) + ' '.repeat(b - a) + r.slice(b);

  const known = numbersIn(corpusText);
  const has = (n: string): boolean => known.has(canonNumber(n));

  for (const m of r.matchAll(PHONE)) {
    const digits = m[0].replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
    if (ALWAYS_ALLOWED_PHONES.has(digits)) continue;
    if (!corpusText.replace(/\D/g, '').includes(digits)) return true;
  }
  for (const m of r.matchAll(/\b(\d{2,3})\s?\/\s?(\d{2,3})\b/g)) {
    if (!has(m[1]) || !has(m[2])) return true;
  }
  for (const m of r.matchAll(UNIT_NUMBER)) if (!has(m[1])) return true;
  for (const m of r.matchAll(ANALYTE_NUMBER)) if (!has(m[2])) return true;
  return false;
}

function fabricatedSource(reply: string, corpus: GuardCorpus): boolean {
  for (const m of reply.matchAll(SOURCE_TAG)) {
    if (!corpus.sourceTags.has(normaliseTag(m[1]))) return true;
  }
  return false;
}

function fabricatedMedication(reply: string, corpus: GuardCorpus): boolean {
  const known = `${corpus.text}\n${corpus.question}`.toLowerCase().replace(/\s+/g, ' ');
  return medicineNamesIn(reply).some((name) => !known.includes(name));
}

// ── Entry point ──────────────────────────────────────────────────────────────

export interface CheckOptions {
  /** The provider's finish reason; "length" means the reply was cut off. */
  finishReason?: string;
}

/**
 * Runs every deterministic check. `corpus` is what this turn's reply must be
 * grounded in; a plain string is accepted for callers with no structured
 * record (it becomes a text-only corpus).
 */
export function checkOutput(
  reply: string,
  corpusOrText: GuardCorpus | string,
  options: CheckOptions = {},
): OutputCheckResult {
  const corpus = typeof corpusOrText === 'string' ? corpusFromText(corpusOrText) : corpusOrText;
  if (reply.trim() === '') return fail('empty_reply');
  if (options.finishReason === 'length') return fail('truncated_reply');
  if (isMostlyNonLatin(reply)) return fail('non_english_reply');

  const norm = normalise(reply);
  const corpusNorm = normalise(`${corpus.text}\n${corpus.question}`);
  const sentences = sentencesOf(norm);

  if (hasWrongEmergencyNumber(norm)) return fail('wrong_emergency_number');

  // Re-run the emergency guard over the MODEL'S OWN OUTPUT: a present-tense,
  // unconditional restatement of an emergency the input screen did not catch
  // escalates to the fixed interlock rather than standing as a soft reply.
  const emergency = restatedEmergency(sentences, corpusNorm);
  if (emergency !== null) {
    return { ok: false, failure: 'emergency_missed_by_input_guard', emergencyCategory: emergency };
  }

  // Quotes are resolved on the whole reply: a quoted impression often runs
  // across sentences.
  for (const sentence of sentencesOf(withoutRecordQuotes(norm, corpusNorm))) {
    // A decimal point is not a sentence end: "5.7 % is too high" is one phrase.
    const s = sentence.replace(/(\d)\.(\d)/g, '$1·$2');
    if (diagnosisAssertion(s, corpus)) return fail('diagnosis_assertion');
    if (REASSURANCE.some((p) => p.test(s))) return fail('false_reassurance');
    if (resultInterpretation(s)) return fail('result_interpretation');
    if (labFlagMismatch(s, corpus)) return fail('lab_flag_mismatch');
  }
  for (const s of sentences) {
    if (dosingInstruction(s, corpus)) return fail('dosing_instruction');
  }

  const groundText = `${corpus.text}\n${corpus.question}`;
  if (fabricatedSource(reply, corpus)) return fail('fabricated_source');
  if (fabricatedDate(reply, groundText)) return fail('fabricated_date');
  if (fabricatedNumber(reply, groundText)) return fail('fabricated_number');
  if (fabricatedMedication(reply, corpus)) return fail('fabricated_medication');

  return { ok: true };
}

/** Fixed, versioned replacement shown when a check rejects the model's turn.
 *  Never model-composed, same discipline as the emergency interlock. */
export const OUTPUT_BLOCKED_REPLY =
  "I can't answer that one safely — the reply didn't meet this assistant's " +
  'safety checks. Please ask your care team, or try rephrasing your question.';
