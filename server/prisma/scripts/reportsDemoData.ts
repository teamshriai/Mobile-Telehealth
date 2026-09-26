// ─────────────────────────────────────────────────────────────────────────────
// Demo lab reports and vital signs for the pitch account (Meenakshi).
//
// ⚠️ PURE DATA, CHECKED BY A TEST. `src/reports/__tests__/reportsDemoData.test.ts`
// verifies the arithmetic a doctor would check at a glance: red-cell indices,
// a differential that adds up to 100, Friedewald LDL, eGFR (CKD-EPI 2021),
// BMI, estimated average glucose — and that every flag is the one its printed
// range implies. Flags are written here as a laboratory would issue them; the
// product never derives a flag at runtime.
//
// ⚠️ ANCHORED TO THE RECORD, NOT TO FIXED DATES. `admit` is the IST date of
// her emergency admission (the encounter carrying the stroke assessment),
// `followup` the IST date of her stroke-clinic follow-up. The admission note
// gives BP 176/92 and glucose 6.1 mmol/L (= 110 mg/dL); the follow-up note BP
// 134/82 and pulse 76 — those values are used as written.
//
// Atlas §8.5 lists CBC, CRP, serum creatinine, HbA1c and troponin I. The other
// panels (coagulation, electrolytes, lipids, LFT, TSH, glucose) and vitals as
// a data class are flagged extensions (`isAtlasVocabulary: false`).
// ─────────────────────────────────────────────────────────────────────────────

export type DayAnchor = 'admit' | 'admit+1' | 'followup-1' | 'followup' | 'followup+1';

export interface DemoResult {
  code: string;
  name: string;
  value: string;
  unit?: string;
  low?: number;
  high?: number;
  rangeText?: string;
  flag?: 'Low' | 'High';
  method?: string;
}

export interface DemoLabReport {
  key: string;
  day: DayAnchor;
  collected: string;
  reported: string;
  panelName: string;
  panelCode?: string;
  specimen: string;
  fasting?: boolean;
  orderedBy: string;
  comment?: string;
  isAtlasVocabulary: boolean;
  results: DemoResult[];
}

export const LAB_NAME = 'Department of Laboratory Medicine, IndoStates Health Hospital, Coimbatore';
/** Role only: the atlas cast has no pathologist, and no person is invented. */
export const VALIDATOR_ROLE = 'Consultant Pathologist';

const cbc = (v: {
  hb: string;
  rbc: string;
  hct: string;
  mcv: string;
  mch: string;
  mchc: string;
  rdw: string;
  wbc: string;
  n: string;
  l: string;
  m: string;
  e: string;
  b: string;
  plt: string;
}): DemoResult[] => [
  { code: '718-7', name: 'Haemoglobin', value: v.hb, unit: 'g/dL', low: 12.0, high: 15.0 },
  { code: '789-8', name: 'RBC count', value: v.rbc, unit: '×10⁶/µL', low: 3.8, high: 4.8 },
  { code: '4544-3', name: 'Haematocrit (PCV)', value: v.hct, unit: '%', low: 36, high: 46 },
  { code: '787-2', name: 'MCV', value: v.mcv, unit: 'fL', low: 83, high: 101 },
  { code: '785-6', name: 'MCH', value: v.mch, unit: 'pg', low: 27, high: 32 },
  { code: '786-4', name: 'MCHC', value: v.mchc, unit: 'g/dL', low: 31.5, high: 34.5 },
  { code: '788-0', name: 'RDW-CV', value: v.rdw, unit: '%', low: 11.6, high: 14.0 },
  {
    code: '6690-2',
    name: 'Total leucocyte count',
    value: v.wbc,
    unit: '×10³/µL',
    low: 4.0,
    high: 10.0,
  },
  { code: '770-8', name: 'Neutrophils', value: v.n, unit: '%', low: 40, high: 80 },
  { code: '736-9', name: 'Lymphocytes', value: v.l, unit: '%', low: 20, high: 40 },
  { code: '5905-5', name: 'Monocytes', value: v.m, unit: '%', low: 2, high: 10 },
  { code: '713-8', name: 'Eosinophils', value: v.e, unit: '%', low: 1, high: 6 },
  { code: '706-2', name: 'Basophils', value: v.b, unit: '%', low: 0, high: 2 },
  { code: '777-3', name: 'Platelet count', value: v.plt, unit: '×10³/µL', low: 150, high: 410 },
];

const renal = (v: {
  urea: string;
  cr: string;
  egfr: string;
  na: string;
  k: string;
  cl: string;
  hco3: string;
}): DemoResult[] => [
  { code: '3091-6', name: 'Urea', value: v.urea, unit: 'mg/dL', low: 17, high: 43 },
  {
    code: '2160-0',
    name: 'Creatinine',
    value: v.cr,
    unit: 'mg/dL',
    low: 0.51,
    high: 0.95,
    method: 'Enzymatic',
  },
  {
    code: '98979-8',
    name: 'eGFR (CKD-EPI 2021)',
    value: v.egfr,
    unit: 'mL/min/1.73 m²',
    low: 90,
    rangeText: '≥ 90',
  },
  {
    code: '2951-2',
    name: 'Sodium',
    value: v.na,
    unit: 'mmol/L',
    low: 136,
    high: 145,
    method: 'ISE',
  },
  {
    code: '2823-3',
    name: 'Potassium',
    value: v.k,
    unit: 'mmol/L',
    low: 3.5,
    high: 5.1,
    method: 'ISE',
  },
  {
    code: '2075-0',
    name: 'Chloride',
    value: v.cl,
    unit: 'mmol/L',
    low: 98,
    high: 107,
    method: 'ISE',
  },
  { code: '1963-8', name: 'Bicarbonate', value: v.hco3, unit: 'mmol/L', low: 22, high: 29 },
];

const lipids = (
  v: {
    tc: string;
    tg: string;
    hdl: string;
    ldl: string;
    vldl: string;
    nonHdl: string;
    ratio: string;
  },
  flags: Partial<Record<'tc' | 'tg' | 'hdl' | 'ldl' | 'vldl' | 'nonHdl' | 'ratio', 'Low' | 'High'>>,
): DemoResult[] => [
  {
    code: '2093-3',
    name: 'Total cholesterol',
    value: v.tc,
    unit: 'mg/dL',
    high: 200,
    rangeText: 'Desirable < 200',
    flag: flags.tc,
  },
  {
    code: '2571-8',
    name: 'Triglycerides',
    value: v.tg,
    unit: 'mg/dL',
    high: 150,
    rangeText: 'Normal < 150',
    flag: flags.tg,
  },
  {
    code: '2085-9',
    name: 'HDL cholesterol',
    value: v.hdl,
    unit: 'mg/dL',
    low: 50,
    rangeText: '> 50',
    flag: flags.hdl,
  },
  {
    code: '13457-7',
    name: 'LDL cholesterol (calculated)',
    value: v.ldl,
    unit: 'mg/dL',
    high: 100,
    rangeText: 'Optimal < 100',
    method: 'Friedewald',
    flag: flags.ldl,
  },
  {
    code: '13458-5',
    name: 'VLDL cholesterol (calculated)',
    value: v.vldl,
    unit: 'mg/dL',
    high: 30,
    rangeText: '< 30',
    flag: flags.vldl,
  },
  {
    code: '43396-1',
    name: 'Non-HDL cholesterol',
    value: v.nonHdl,
    unit: 'mg/dL',
    high: 130,
    rangeText: '< 130',
    flag: flags.nonHdl,
  },
  {
    code: '9830-1',
    name: 'Total cholesterol / HDL ratio',
    value: v.ratio,
    high: 5.0,
    rangeText: '< 5.0',
    flag: flags.ratio,
  },
];

const glycaemic = (
  v: { fpg: string; a1c: string; eag: string },
  flags: { fpg?: 'High'; a1c?: 'High' },
): DemoResult[] => [
  {
    code: '1558-6',
    name: 'Fasting plasma glucose',
    value: v.fpg,
    unit: 'mg/dL',
    low: 70,
    high: 100,
    flag: flags.fpg,
  },
  {
    code: '4548-4',
    name: 'HbA1c',
    value: v.a1c,
    unit: '%',
    high: 5.7,
    rangeText: 'Non-diabetic < 5.7 · Prediabetes 5.7–6.4 · Diabetes ≥ 6.5',
    method: 'HPLC (NGSP certified)',
    flag: flags.a1c,
  },
  { code: '27353-2', name: 'Estimated average glucose', value: v.eag, unit: 'mg/dL' },
];

const lft = (v: {
  tb: string;
  db: string;
  ib: string;
  ast: string;
  alt: string;
  alp: string;
  ggt: string;
  tp: string;
  alb: string;
  glob: string;
  ag: string;
}): DemoResult[] => [
  { code: '1975-2', name: 'Bilirubin, total', value: v.tb, unit: 'mg/dL', low: 0.3, high: 1.2 },
  { code: '1968-7', name: 'Bilirubin, direct', value: v.db, unit: 'mg/dL', low: 0.0, high: 0.3 },
  { code: '1971-1', name: 'Bilirubin, indirect', value: v.ib, unit: 'mg/dL', low: 0.1, high: 1.0 },
  { code: '1920-8', name: 'AST (SGOT)', value: v.ast, unit: 'U/L', high: 32 },
  { code: '1742-6', name: 'ALT (SGPT)', value: v.alt, unit: 'U/L', high: 33 },
  { code: '6768-6', name: 'Alkaline phosphatase', value: v.alp, unit: 'U/L', low: 35, high: 104 },
  { code: '2324-2', name: 'GGT', value: v.ggt, unit: 'U/L', low: 6, high: 42 },
  { code: '2885-2', name: 'Total protein', value: v.tp, unit: 'g/dL', low: 6.4, high: 8.3 },
  { code: '1751-7', name: 'Albumin', value: v.alb, unit: 'g/dL', low: 3.5, high: 5.2 },
  { code: '10834-0', name: 'Globulin', value: v.glob, unit: 'g/dL', low: 2.0, high: 3.5 },
  { code: '1759-0', name: 'Albumin / globulin ratio', value: v.ag, low: 1.1, high: 2.2 },
];

export const LAB_REPORTS: DemoLabReport[] = [
  // ── Admission, Emergency Department: collected on arrival, before thrombolysis ──
  {
    key: 'admit-coag',
    day: 'admit',
    collected: '07:48',
    reported: '08:04',
    panelName: 'Coagulation profile (PT/INR, aPTT)',
    specimen: 'Citrated plasma',
    orderedBy: 'Emergency Department (code stroke)',
    isAtlasVocabulary: false,
    results: [
      {
        code: '5902-2',
        name: 'Prothrombin time (PT)',
        value: '12.6',
        unit: 's',
        low: 11.0,
        high: 13.5,
        rangeText: '11.0–13.5 (control 12.2)',
      },
      { code: '6301-6', name: 'INR', value: '1.03', low: 0.8, high: 1.2 },
      {
        code: '3173-2',
        name: 'aPTT',
        value: '29.4',
        unit: 's',
        low: 25,
        high: 35,
        rangeText: '25–35 (control 28.5)',
      },
    ],
  },
  {
    key: 'admit-cbc',
    day: 'admit',
    collected: '07:48',
    reported: '08:12',
    panelName: 'Complete blood count (CBC)',
    panelCode: '58410-2',
    specimen: 'EDTA whole blood',
    orderedBy: 'Emergency Department (code stroke)',
    isAtlasVocabulary: true,
    results: cbc({
      hb: '12.4',
      rbc: '4.36',
      hct: '37.6',
      mcv: '86.2',
      mch: '28.4',
      mchc: '33.0',
      rdw: '13.8',
      wbc: '9.8',
      n: '71',
      l: '21',
      m: '5',
      e: '2',
      b: '1',
      plt: '262',
    }),
  },
  {
    key: 'admit-biochem',
    day: 'admit',
    collected: '07:48',
    reported: '08:20',
    panelName: 'Renal function, electrolytes and glucose',
    specimen: 'Serum / fluoride plasma',
    orderedBy: 'Emergency Department (code stroke)',
    isAtlasVocabulary: false,
    results: [
      ...renal({ urea: '24', cr: '0.72', egfr: '98', na: '139', k: '3.9', cl: '103', hco3: '23' }),
      {
        code: '2345-7',
        name: 'Plasma glucose, random',
        value: '110',
        unit: 'mg/dL',
        low: 70,
        high: 140,
        rangeText: '70–140 (random)',
      },
    ],
  },
  {
    key: 'admit-trop',
    day: 'admit',
    collected: '07:48',
    reported: '09:05',
    panelName: 'Troponin I, high-sensitivity',
    specimen: 'Serum',
    orderedBy: 'Emergency Department (code stroke)',
    isAtlasVocabulary: true,
    results: [
      {
        code: '89579-7',
        name: 'hs-Troponin I',
        value: '4.2',
        unit: 'ng/L',
        high: 15.6,
        rangeText: '< 15.6 (female 99th percentile)',
      },
    ],
  },
  {
    key: 'admit-crp',
    day: 'admit',
    collected: '07:48',
    reported: '09:30',
    panelName: 'C-reactive protein (CRP)',
    specimen: 'Serum',
    orderedBy: 'Emergency Department (code stroke)',
    isAtlasVocabulary: true,
    results: [{ code: '1988-5', name: 'CRP', value: '3.8', unit: 'mg/L', high: 5.0 }],
  },

  // ── Stroke Unit, next morning, fasting ─────────────────────────────────────
  {
    key: 'admit1-lipid',
    day: 'admit+1',
    collected: '06:05',
    reported: '10:40',
    panelName: 'Lipid profile',
    panelCode: '57698-3',
    specimen: 'Serum',
    fasting: true,
    orderedBy: 'Stroke Unit',
    isAtlasVocabulary: false,
    results: lipids(
      { tc: '232', tg: '168', hdl: '44', ldl: '154', vldl: '34', nonHdl: '188', ratio: '5.3' },
      {
        tc: 'High',
        tg: 'High',
        hdl: 'Low',
        ldl: 'High',
        vldl: 'High',
        nonHdl: 'High',
        ratio: 'High',
      },
    ),
  },
  {
    key: 'admit1-glyc',
    day: 'admit+1',
    collected: '06:05',
    reported: '11:15',
    panelName: 'HbA1c and fasting glucose',
    specimen: 'EDTA whole blood / fluoride plasma',
    fasting: true,
    orderedBy: 'Stroke Unit',
    comment: 'HbA1c in the prediabetes range by ADA criteria (5.7–6.4 %). Correlate clinically.',
    isAtlasVocabulary: true,
    results: glycaemic({ fpg: '104', a1c: '5.8', eag: '120' }, { fpg: 'High', a1c: 'High' }),
  },
  {
    key: 'admit1-lft',
    day: 'admit+1',
    collected: '06:05',
    reported: '10:55',
    panelName: 'Liver function test (LFT)',
    specimen: 'Serum',
    fasting: true,
    orderedBy: 'Stroke Unit',
    isAtlasVocabulary: false,
    results: lft({
      tb: '0.6',
      db: '0.2',
      ib: '0.4',
      ast: '21',
      alt: '17',
      alp: '88',
      ggt: '19',
      tp: '7.1',
      alb: '4.2',
      glob: '2.9',
      ag: '1.45',
    }),
  },
  {
    key: 'admit1-tsh',
    day: 'admit+1',
    collected: '06:05',
    reported: '12:30',
    panelName: 'Thyroid-stimulating hormone (TSH)',
    specimen: 'Serum',
    orderedBy: 'Stroke Unit',
    isAtlasVocabulary: false,
    results: [
      {
        code: '3016-3',
        name: 'TSH',
        value: '2.36',
        unit: 'µIU/mL',
        low: 0.27,
        high: 4.2,
        method: 'CLIA',
      },
    ],
  },

  // ── Day before the stroke-clinic follow-up, fasting (on atorvastatin 40 mg) ──
  {
    key: 'fu-cbc',
    day: 'followup-1',
    collected: '07:40',
    reported: '09:10',
    panelName: 'Complete blood count (CBC)',
    panelCode: '58410-2',
    specimen: 'EDTA whole blood',
    orderedBy: 'Dr. Rohit Desai',
    isAtlasVocabulary: true,
    results: cbc({
      hb: '12.7',
      rbc: '4.44',
      hct: '38.4',
      mcv: '86.5',
      mch: '28.6',
      mchc: '33.1',
      rdw: '13.4',
      wbc: '7.2',
      n: '60',
      l: '30',
      m: '6',
      e: '3',
      b: '1',
      plt: '248',
    }),
  },
  {
    key: 'fu-renal',
    day: 'followup-1',
    collected: '07:40',
    reported: '10:05',
    panelName: 'Renal function and electrolytes',
    specimen: 'Serum',
    orderedBy: 'Dr. Rohit Desai',
    isAtlasVocabulary: false,
    results: renal({
      urea: '28',
      cr: '0.76',
      egfr: '92',
      na: '140',
      k: '4.4',
      cl: '104',
      hco3: '25',
    }),
  },
  {
    key: 'fu-lipid',
    day: 'followup-1',
    collected: '07:40',
    reported: '11:20',
    panelName: 'Lipid profile',
    panelCode: '57698-3',
    specimen: 'Serum',
    fasting: true,
    orderedBy: 'Dr. Rohit Desai',
    isAtlasVocabulary: false,
    results: lipids(
      { tc: '148', tg: '124', hdl: '47', ldl: '76', vldl: '25', nonHdl: '101', ratio: '3.1' },
      { hdl: 'Low' },
    ),
  },
  {
    key: 'fu-glyc',
    day: 'followup-1',
    collected: '07:40',
    reported: '12:05',
    panelName: 'HbA1c and fasting glucose',
    specimen: 'EDTA whole blood / fluoride plasma',
    fasting: true,
    orderedBy: 'Dr. Rohit Desai',
    comment: 'HbA1c in the prediabetes range by ADA criteria (5.7–6.4 %). Correlate clinically.',
    isAtlasVocabulary: true,
    results: glycaemic({ fpg: '98', a1c: '5.7', eag: '117' }, { a1c: 'High' }),
  },
  {
    key: 'fu-lft',
    day: 'followup-1',
    collected: '07:40',
    reported: '11:40',
    panelName: 'Liver function test (LFT)',
    specimen: 'Serum',
    fasting: true,
    orderedBy: 'Dr. Rohit Desai',
    isAtlasVocabulary: false,
    results: lft({
      tb: '0.5',
      db: '0.2',
      ib: '0.3',
      ast: '26',
      alt: '29',
      alp: '84',
      ggt: '22',
      tp: '7.2',
      alb: '4.3',
      glob: '2.9',
      ag: '1.48',
    }),
  },
  {
    key: 'fu-crp',
    day: 'followup-1',
    collected: '07:40',
    reported: '10:30',
    panelName: 'C-reactive protein (CRP)',
    specimen: 'Serum',
    orderedBy: 'Dr. Rohit Desai',
    isAtlasVocabulary: true,
    results: [{ code: '1988-5', name: 'CRP', value: '1.9', unit: 'mg/L', high: 5.0 }],
  },
];

export interface DemoVital {
  day: DayAnchor;
  time: string;
  type:
    | 'BloodPressure'
    | 'HeartRate'
    | 'SpO2'
    | 'Temperature'
    | 'RespiratoryRate'
    | 'BloodGlucose'
    | 'Weight'
    | 'Height'
    | 'Bmi';
  value: number;
  value2?: number;
  unit: string;
  qualifier?: string;
  source: 'Facility' | 'HomeDevice';
  placeName?: string;
  recordedByRole?: string;
  deviceName?: string;
  isDerived?: boolean;
}

const ED = 'IndoStates Health Hospital, Coimbatore — Emergency';
const SU = 'IndoStates Health Hospital, Coimbatore — Stroke Unit';
const CLINIC = 'Indostates Whitefield — Stroke Clinic';
const HOME = 'Home blood pressure monitor';

export const VITALS: DemoVital[] = [
  // Arrival in the Emergency Department (BP and glucose as in the admission note).
  {
    day: 'admit',
    time: '07:44',
    type: 'BloodPressure',
    value: 176,
    value2: 92,
    unit: 'mmHg',
    qualifier: 'Supine, left arm',
    source: 'Facility',
    placeName: ED,
    recordedByRole: 'Triage nurse',
  },
  {
    day: 'admit',
    time: '07:44',
    type: 'HeartRate',
    value: 88,
    unit: '/min',
    qualifier: 'Regular',
    source: 'Facility',
    placeName: ED,
    recordedByRole: 'Triage nurse',
  },
  {
    day: 'admit',
    time: '07:44',
    type: 'SpO2',
    value: 97,
    unit: '%',
    qualifier: 'Room air',
    source: 'Facility',
    placeName: ED,
    recordedByRole: 'Triage nurse',
  },
  {
    day: 'admit',
    time: '07:44',
    type: 'Temperature',
    value: 36.8,
    unit: '°C',
    qualifier: 'Tympanic',
    source: 'Facility',
    placeName: ED,
    recordedByRole: 'Triage nurse',
  },
  {
    day: 'admit',
    time: '07:44',
    type: 'RespiratoryRate',
    value: 18,
    unit: '/min',
    source: 'Facility',
    placeName: ED,
    recordedByRole: 'Triage nurse',
  },
  {
    day: 'admit',
    time: '07:46',
    type: 'BloodGlucose',
    value: 108,
    unit: 'mg/dL',
    qualifier: 'Capillary, random',
    source: 'Facility',
    placeName: ED,
    recordedByRole: 'Triage nurse',
  },
  {
    day: 'admit',
    time: '07:50',
    type: 'Weight',
    value: 64.0,
    unit: 'kg',
    qualifier: 'Measured on the stroke trolley scale',
    source: 'Facility',
    placeName: ED,
    recordedByRole: 'Stroke nurse',
  },
  {
    day: 'admit',
    time: '07:50',
    type: 'Height',
    value: 156,
    unit: 'cm',
    qualifier: 'As stated by the family',
    source: 'Facility',
    placeName: ED,
    recordedByRole: 'Stroke nurse',
  },
  {
    day: 'admit',
    time: '07:50',
    type: 'Bmi',
    value: 26.3,
    unit: 'kg/m²',
    source: 'Facility',
    placeName: ED,
    isDerived: true,
  },
  // Stroke Unit, next morning.
  {
    day: 'admit+1',
    time: '08:00',
    type: 'BloodPressure',
    value: 148,
    value2: 84,
    unit: 'mmHg',
    qualifier: 'Supine, left arm',
    source: 'Facility',
    placeName: SU,
    recordedByRole: 'Stroke nurse',
  },
  {
    day: 'admit+1',
    time: '08:00',
    type: 'HeartRate',
    value: 78,
    unit: '/min',
    qualifier: 'Regular',
    source: 'Facility',
    placeName: SU,
    recordedByRole: 'Stroke nurse',
  },
  {
    day: 'admit+1',
    time: '08:00',
    type: 'SpO2',
    value: 98,
    unit: '%',
    qualifier: 'Room air',
    source: 'Facility',
    placeName: SU,
    recordedByRole: 'Stroke nurse',
  },
  {
    day: 'admit+1',
    time: '08:00',
    type: 'Temperature',
    value: 37.0,
    unit: '°C',
    qualifier: 'Tympanic',
    source: 'Facility',
    placeName: SU,
    recordedByRole: 'Stroke nurse',
  },
  {
    day: 'admit+1',
    time: '08:00',
    type: 'RespiratoryRate',
    value: 16,
    unit: '/min',
    source: 'Facility',
    placeName: SU,
    recordedByRole: 'Stroke nurse',
  },
  // Home readings around the follow-up (the "BP log updated" notification).
  {
    day: 'followup-1',
    time: '07:05',
    type: 'BloodPressure',
    value: 132,
    value2: 80,
    unit: 'mmHg',
    qualifier: 'Sitting, left arm',
    source: 'HomeDevice',
    deviceName: HOME,
  },
  {
    day: 'followup-1',
    time: '07:05',
    type: 'HeartRate',
    value: 74,
    unit: '/min',
    source: 'HomeDevice',
    deviceName: HOME,
  },
  {
    day: 'followup',
    time: '06:55',
    type: 'BloodPressure',
    value: 136,
    value2: 84,
    unit: 'mmHg',
    qualifier: 'Sitting, left arm',
    source: 'HomeDevice',
    deviceName: HOME,
  },
  {
    day: 'followup',
    time: '06:55',
    type: 'HeartRate',
    value: 78,
    unit: '/min',
    source: 'HomeDevice',
    deviceName: HOME,
  },
  {
    day: 'followup+1',
    time: '07:10',
    type: 'BloodPressure',
    value: 128,
    value2: 78,
    unit: 'mmHg',
    qualifier: 'Sitting, left arm',
    source: 'HomeDevice',
    deviceName: HOME,
  },
  {
    day: 'followup+1',
    time: '07:10',
    type: 'HeartRate',
    value: 72,
    unit: '/min',
    source: 'HomeDevice',
    deviceName: HOME,
  },
  // Stroke clinic follow-up (BP and pulse as in the follow-up note).
  {
    day: 'followup',
    time: '10:40',
    type: 'BloodPressure',
    value: 134,
    value2: 82,
    unit: 'mmHg',
    qualifier: 'Sitting, left arm',
    source: 'Facility',
    placeName: CLINIC,
    recordedByRole: 'Clinic nurse',
  },
  {
    day: 'followup',
    time: '10:40',
    type: 'HeartRate',
    value: 76,
    unit: '/min',
    qualifier: 'Regular',
    source: 'Facility',
    placeName: CLINIC,
    recordedByRole: 'Clinic nurse',
  },
  {
    day: 'followup',
    time: '10:40',
    type: 'SpO2',
    value: 98,
    unit: '%',
    qualifier: 'Room air',
    source: 'Facility',
    placeName: CLINIC,
    recordedByRole: 'Clinic nurse',
  },
  {
    day: 'followup',
    time: '10:40',
    type: 'Temperature',
    value: 36.6,
    unit: '°C',
    qualifier: 'Tympanic',
    source: 'Facility',
    placeName: CLINIC,
    recordedByRole: 'Clinic nurse',
  },
  {
    day: 'followup',
    time: '10:40',
    type: 'RespiratoryRate',
    value: 16,
    unit: '/min',
    source: 'Facility',
    placeName: CLINIC,
    recordedByRole: 'Clinic nurse',
  },
  {
    day: 'followup',
    time: '10:42',
    type: 'BloodGlucose',
    value: 118,
    unit: 'mg/dL',
    qualifier: 'Capillary, random',
    source: 'Facility',
    placeName: CLINIC,
    recordedByRole: 'Clinic nurse',
  },
  {
    day: 'followup',
    time: '10:45',
    type: 'Weight',
    value: 62.5,
    unit: 'kg',
    qualifier: 'Standing scale',
    source: 'Facility',
    placeName: CLINIC,
    recordedByRole: 'Clinic nurse',
  },
  {
    day: 'followup',
    time: '10:45',
    type: 'Height',
    value: 156,
    unit: 'cm',
    qualifier: 'Measured',
    source: 'Facility',
    placeName: CLINIC,
    recordedByRole: 'Clinic nurse',
  },
  {
    day: 'followup',
    time: '10:45',
    type: 'Bmi',
    value: 25.7,
    unit: 'kg/m²',
    source: 'Facility',
    placeName: CLINIC,
    isDerived: true,
  },
];

// ── Helpers the seed and the test share ─────────────────────────────────────

/** CKD-EPI 2021 creatinine equation (race-free), mL/min/1.73 m². */
export function egfrCkdEpi2021(creatinineMgDl: number, age: number, female: boolean): number {
  const k = female ? 0.7 : 0.9;
  const a = female ? -0.241 : -0.302;
  const r = creatinineMgDl / k;
  return 142 * Math.min(r, 1) ** a * Math.max(r, 1) ** -1.2 * 0.9938 ** age * (female ? 1.012 : 1);
}

/** The flag a printed range implies (for the consistency test only). */
export function impliedFlag(r: DemoResult): 'Low' | 'High' | undefined {
  const v = Number(r.value);
  if (!Number.isFinite(v)) return undefined;
  if (r.high !== undefined && (r.low === undefined ? v >= r.high : v > r.high)) return 'High';
  if (r.low !== undefined && v < r.low) return 'Low';
  return undefined;
}
