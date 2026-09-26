// ─────────────────────────────────────────────────────────────────────────────
// Condition evidence — may the reply say "you had a stroke"?
//
// Only when the care team recorded it. The patient's own conditions list is
// the evidence: a condition the reply names is matched to a CONCEPT (by the
// words a reply would use), and the concept to the recorded diagnoses (by
// ICD-10 code prefix or title words). Anything the reply calls "you have …"
// that is not a condition at all ("you have an appointment", "you have three
// medicines") matches no concept and is not a diagnosis claim.
//
// Acute events (a stroke, a heart attack, a seizure) may only be spoken of in
// the past: "you had a stroke in June" can be true; "you are having a stroke"
// or "you have a stroke" never is a thing this assistant may say.
// ─────────────────────────────────────────────────────────────────────────────

export interface ConditionConcept {
  id: string;
  /** How a reply would name it. */
  words: RegExp;
  /** ICD-10 prefixes that record it. */
  codes: string[];
  /** Words in a recorded diagnosis title that record it. */
  titles: RegExp;
  /** An event, not a state: only past forms may be asserted. */
  acute: boolean;
}

export const CONDITION_CONCEPTS: ConditionConcept[] = [
  {
    id: 'stroke',
    words:
      /\b(stroke|cerebral infarct\w*|brain attack|ischa?emic stroke|cerebrovascular accident|cva)\b/,
    codes: ['I63', 'I64', 'I61', 'I60', 'I69'],
    titles: /\b(stroke|cerebral infarction|intracerebral ha?emorrhage|subarachnoid)\b/,
    acute: true,
  },
  {
    id: 'tia',
    words: /\b(tia|mini[- ]stroke|transient ischa?emic attack)\b/,
    codes: ['G45'],
    titles: /\btransient (cerebral )?ischa?emic\b/,
    acute: true,
  },
  {
    id: 'heart_attack',
    words: /\b(heart attack|myocardial infarction|mi)\b/,
    codes: ['I21', 'I22', 'I25.2'],
    titles: /\bmyocardial infarction\b/,
    acute: true,
  },
  {
    id: 'seizure',
    words: /\b(seizures?|epilepsy|fits?)\b/,
    codes: ['G40', 'G41', 'R56'],
    titles: /\b(epilep\w*|seizure|convulsion)\b/,
    acute: true,
  },
  {
    id: 'infection',
    words: /\b(infection|pneumonia|uti|urinary tract infection|sepsis)\b/,
    codes: ['J18', 'J15', 'N39.0', 'A41'],
    titles: /\b(infection|pneumonia|sepsis)\b/,
    acute: true,
  },
  {
    id: 'bleed',
    words: /\b(bleed|ha?emorrhage|brain bleed)\b/,
    codes: ['I61', 'I60', 'I62'],
    titles: /\bha?emorrhage\b/,
    acute: true,
  },
  {
    id: 'hypertension',
    words: /\b(hypertension|high blood pressure)\b/,
    codes: ['I10', 'I11', 'I12', 'I13', 'I15'],
    titles: /\bhypertensi\w*\b/,
    acute: false,
  },
  {
    id: 'diabetes',
    words: /\b(diabetes|diabetic|type [12] diabetes)\b/,
    codes: ['E10', 'E11', 'E13', 'E14'],
    titles: /\bdiabet\w*\b/,
    acute: false,
  },
  {
    id: 'prediabetes',
    words: /\b(pre-?diabetes|prediabetic|borderline diabetes)\b/,
    codes: ['R73'],
    titles: /\b(pre-?diabetes|impaired (fasting )?glucose|hyperglyca?emia)\b/,
    acute: false,
  },
  {
    id: 'cholesterol',
    words: /\b(high cholesterol|hyperlipida?emia|dyslipida?emia|hypercholesterola?emia)\b/,
    codes: ['E78'],
    titles: /\b(hyperlipida?emia|dyslipida?emia|hypercholesterola?emia|lipid)\b/,
    acute: false,
  },
  {
    id: 'af',
    words: /\b(atrial fibrillation|af|afib|irregular heartbeat)\b/,
    codes: ['I48'],
    titles: /\batrial fibrillation\b/,
    acute: false,
  },
  {
    id: 'thyroid',
    words: /\b(hypothyroidism|hyperthyroidism|thyroid (disease|problem|disorder))\b/,
    codes: ['E03', 'E05', 'E06'],
    titles: /\b(hypothyroid\w*|hyperthyroid\w*|thyroid)\b/,
    acute: false,
  },
  {
    id: 'depression',
    words: /\b(depression|depressive|anxiety disorder)\b/,
    codes: ['F32', 'F33', 'F41'],
    titles: /\b(depressi\w*|anxiety)\b/,
    acute: false,
  },
  {
    id: 'kidney',
    words: /\b(kidney disease|ckd|renal failure|kidney failure)\b/,
    codes: ['N18', 'N17', 'N19'],
    titles: /\b(kidney|renal)\b/,
    acute: false,
  },
  {
    id: 'aphasia',
    words: /\b(aphasia|dysphasia)\b/,
    codes: ['R47.0', 'I69.320'],
    titles: /\b(aphasia|dysphasia)\b/,
    acute: false,
  },
  {
    id: 'hemiparesis',
    words: /\b(hemiparesis|hemiplegia|paralysis)\b/,
    codes: ['G81', 'I69.35', 'I69.15'],
    titles: /\b(hemipare\w*|hemipleg\w*)\b/,
    acute: false,
  },
];

export interface RecordedCondition {
  code: string;
  title: string;
}

/** The concepts a phrase names (lowercase input). */
export function conceptsIn(phrase: string): ConditionConcept[] {
  return CONDITION_CONCEPTS.filter((c) => c.words.test(phrase));
}

/** Whether the care team recorded this concept for the patient. */
export function isRecorded(concept: ConditionConcept, conditions: RecordedCondition[]): boolean {
  return conditions.some(
    (r) =>
      concept.codes.some((prefix) => r.code.toUpperCase().startsWith(prefix)) ||
      concept.titles.test(r.title.toLowerCase()),
  );
}
