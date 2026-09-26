import type { SectionKey } from '../context/recordRender';

// ─────────────────────────────────────────────────────────────────────────────
// Which parts of the record a question is about.
//
// Deliberately plain keyword routing: it is predictable, testable, costs
// nothing, and fails soft — a question it cannot place still gets the core
// sections, the similarity-ranked lines, and whatever else fits. A few
// common Hindi/Hinglish words are included because patients type them.
// ─────────────────────────────────────────────────────────────────────────────

const ROUTES: Array<[SectionKey[], RegExp]> = [
  [
    ['labs'],
    /\b(labs?|blood tests?|blood work|tests?|results?|cholesterol|ldl|hdl|lipids?|triglycerides?|hba1c|a1c|sugar|glucose|diabet\w*|kidneys?|creatinine|egfr|urea|sodium|potassium|electrolytes?|liver|lft|alt|ast|sgpt|sgot|bilirubin|thyroid|tsh|ha?emoglobin|hb|cbc|blood count|platelets?|wbc|rbc|inr|pt|aptt|clotting|crp|troponin|jaanch|janch)\b/,
  ],
  [
    ['vitals'],
    /\b(bp|blood pressure|pressure|pulse|heart ?rate|oxygen|spo2|saturation|temperature|fever|weight|height|bmi|breathing rate|vitals?|readings?|monitor)\b/,
  ],
  [
    ['scans'],
    /\b(scans?|ct|cta|mri|x-?rays?|radiolog\w*|imaging|angiogram|images?|brain|neck|spine|skull|impression|radiologist)\b/,
  ],
  [
    ['medicines', 'pastMedicines', 'listedMedicines'],
    /\b(medicines?|medications?|meds|tablets?|pills?|doses?|drugs?|capsules?|injections?|prescri\w*|refills?|missed|skipped|taken|took|adherence|dawai|dawa|goli|side effects?)\b/,
  ],
  [
    ['upcoming', 'pastAppointments'],
    /\b(appointments?|booking|booked|follow[- ]?ups?|next visit|consult\w*|video call|sessions?|clinic|reschedul\w*|when (do|will) i see)\b/,
  ],
  [
    ['visits'],
    /\b(visits?|admission|admitted|hospital stay|discharg\w*|what happened|doctor said|assessment|plan|emergency|casualty|thrombolysis)\b/,
  ],
  [
    ['doctors'],
    /\b(doctors?|dr|neurologist|physician|specialist|care team|consultant|therapist|who is my|who treats)\b/,
  ],
  [
    ['instructions'],
    /\b(instructions?|advice|advised|told to|diet|exercise|care plan|what should i do|precautions?)\b/,
  ],
  [
    ['conditions'],
    /\b(conditions?|diagnos\w*|diseases?|problems?|history|what do i have|illness)\b/,
  ],
  [['healthNotes'], /\b(notes?|journal|diary|i wrote|voice notes?|logged)\b/],
  [['lifestyle'], /\b(smok\w*|alcohol|drink\w*|tobacco|activity|walking|exercise)\b/],
  [['allergies'], /\b(allerg\w*)\b/],
];

/** "Tell me everything" questions: a little of every section. */
const BROAD =
  /\b(summar\w*|overview|everything|all my|my health|how am i doing|my record|my reports|my file)\b/;

/** "Report" alone is ambiguous: lab reports and scan reports. */
const REPORT = /\breports?\b/;

export interface Route {
  sections: Set<SectionKey>;
  broad: boolean;
}

export function routeQuestion(question: string, medicineNames: string[] = []): Route {
  const q = question.toLowerCase();
  const sections = new Set<SectionKey>();
  for (const [keys, re] of ROUTES) if (re.test(q)) keys.forEach((k) => sections.add(k));
  if (REPORT.test(q)) {
    sections.add('labs');
    sections.add('scans');
  }
  if (medicineNames.some((m) => q.includes(m.toLowerCase()))) {
    sections.add('medicines');
    sections.add('pastMedicines');
  }
  return { sections, broad: BROAD.test(q) };
}

const STOP = new Set(
  'what when where which have does will with from that this about your mine show tell give please could would should there their were been being much many last next time than they them into over also just like okay thanks thank hello'.split(
    ' ',
  ),
);

/** Words from the question worth matching against record lines. Short
 *  medical abbreviations (LDL, TSH, CT) count; filler words do not. */
export function questionTerms(question: string): string[] {
  const words = question.toLowerCase().match(/[a-z0-9][a-z0-9-]*/g) ?? [];
  return [
    ...new Set(
      words.filter(
        (w) =>
          (w.length >= 4 && !STOP.has(w)) ||
          /^(ldl|hdl|tsh|crp|alt|ast|inr|bp|ct|mri|cta|hb|a1c|egfr|lft|cbc)$/.test(w),
      ),
    ),
  ];
}
