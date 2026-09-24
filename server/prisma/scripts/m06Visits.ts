import {
  PrismaClient,
  ClinicalNoteStatus,
  ProblemStatus,
  PrescriptionStatus,
  EncounterType,
  EncounterStatus,
} from '@prisma/client';
import { encryptField } from '../../src/utils/encryption';
import { withGeneratedVisitId } from '../../src/services/patientIdentity.service';

// ─────────────────────────────────────────────────────────────────────────────
// M-06 demo content, seeded AS VISITS.
//
// ⚠️ THE STRUCTURE IS THE POINT, and it replaces an earlier version that was
// wrong in an instructive way.
//
// That version seeded each table independently: a list of notes, a list of
// problems, a list of prescriptions. Every row was individually plausible and
// the totals looked healthy — 30 notes, 14 prescriptions, 22 problems. But
// NOTHING REFERENCED AN ENCOUNTER. Opening a visit showed a blank note,
// because the note that visit produced was a row with no idea the visit
// existed. The chart listed encounters and notes as two unrelated histories of
// the same person.
//
// A clinical record is a graph, not a set of tables. So the unit of seeding
// here is the VISIT: one encounter, together with the note written at it, the
// problems coded at it, what was prescribed, and what the patient was given on
// the way out. Coherence is then structural — it cannot drift, because there
// is no way to express an orphan.
//
// ⚠️ IDEMPOTENT. Each visit is guarded on (patient, chief complaint), which is
// stable across runs where a timestamp would not be.
//
// ⚠️ §8.6 — every patient and clinician is from the §8.2/§8.3 cast.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The patient-portal demo account's patient, who comes from the BASE seed
 * (`prisma/seed.ts`) rather than the §8 clinician cast — so she has no
 * `SD-P-nn` reference. She is resolved by her account email instead, because
 * her `shriPatientId` is generated at runtime and is not stable across a fresh
 * database.
 *
 * She matters here because the base seed gives her an encounter, and a
 * clinician reaching her through break-glass onto an empty chart is a poor
 * showing for the one path where the record most needs to be there.
 */
const BASE_DEMO_PATIENT = 'email:demouser.strokeai@gmail.com';

const daysAgo = (d: number): Date => new Date(Date.now() - d * 86_400_000);
const hoursAgo = (h: number): Date => new Date(Date.now() - h * 3_600_000);

/** Who authored the content of a visit. Default is the consultant. */
type Author = 'consultant' | 'resident';

interface NoteSpec {
  status: ClinicalNoteStatus;
  author?: Author;
  code: string;
  codeText: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  addendum?: string;
  /** Hours after the visit started that the note was signed. */
  signedAfterH?: number;
}

interface ProblemSpec {
  code: string;
  title: string;
  status: ProblemStatus;
  note: string;
  /** Days before this visit the problem actually began, if earlier. */
  onsetBeforeDays?: number;
  resolvedDaysAgo?: number;
}

interface RxSpec {
  status: PrescriptionStatus;
  items: Array<{
    drug: string;
    dose: number;
    unit: string;
    freq: string;
    days: number;
    indication: string;
    instructions: string;
  }>;
}

interface InstructionSpec {
  title: string;
  language: string;
  body: string;
  /**
   * ⚠️ A6 — the English counterpart printed alongside. Required here for every
   * non-English instruction, even though the column is nullable in the schema:
   * the nullable case exists so a clinician in clinic is never blocked, not so
   * the seeded demo can skip it. A demo that only ever prints one language does
   * not demonstrate the requirement the screen exists to satisfy.
   */
  titleEnglish?: string;
  bodyEnglish?: string;
}

interface VisitSpec {
  patient: string;
  daysAgo: number;
  type: EncounterType;
  status: EncounterStatus;
  chiefComplaint: string;
  location: string;
  notes?: NoteSpec[];
  problems?: ProblemSpec[];
  prescriptions?: RxSpec[];
  instructions?: InstructionSpec[];
}

/**
 * ⚠️ The atlas fixes `SD-P-03`'s timeline as "4 encounters … across 14 months"
 * (S-06-06 sample data), so his visits below are built to that shape. He is
 * also the hard-stop patient, so his penicillin allergy has to be legible in
 * the record long before anyone opens the prescription writer.
 */
const VISITS: VisitSpec[] = [
  // ══ SD-P-03 R. Lakshmanan — 4 encounters over 14 months ═════════════════
  {
    patient: 'SD-P-03',
    daysAgo: 420,
    type: EncounterType.ClinicVisit,
    status: EncounterStatus.Completed,
    chiefComplaint: 'New diagnosis of type 2 diabetes — first review',
    location: 'Indostates Whitefield — OPD Block C',
    problems: [
      { code: 'E11.9', title: 'Type 2 diabetes mellitus without complications', status: ProblemStatus.Active,
        note: 'Diagnosed on routine screening. HbA1c 8.2% at diagnosis.' },
      { code: 'I10', title: 'Essential (primary) hypertension', status: ProblemStatus.Active,
        onsetBeforeDays: 680, note: 'Long-standing, previously managed elsewhere.' },
    ],
    notes: [{
      status: ClinicalNoteStatus.Signed,
      code: 'E11.9',
      codeText: 'Type 2 diabetes mellitus without complications',
      subjective:
        'Referred after a raised fasting glucose on a routine health check. No polyuria or polydipsia. Father and elder brother both have diabetes. Works as a bank clerk, largely sedentary.',
      objective:
        'Weight 78 kilograms, body mass index 27.4. Blood pressure 146 over 88. Fasting glucose 8.9, HbA1c 8.2 percent. Feet — pulses present, sensation intact to monofilament. Fundi not examined today.',
      assessment:
        'Newly diagnosed type 2 diabetes mellitus, with co-existing hypertension not at target.',
      plan:
        'Start metformin, titrating over four weeks. Dietitian referral made. Home blood pressure monitoring for two weeks. Retinal screening booked. Repeat HbA1c in three months.',
    }],
    prescriptions: [{
      status: PrescriptionStatus.Signed,
      items: [{ drug: 'Metformin', dose: 500, unit: 'mg', freq: 'BD', days: 28, indication: 'E11.9',
        instructions: 'Take with food, morning and evening. Start with one tablet daily for the first week.' }],
    }],
  },
  {
    patient: 'SD-P-03',
    daysAgo: 180,
    type: EncounterType.FollowUp,
    status: EncounterStatus.Completed,
    chiefComplaint: 'Diabetes review — six months',
    location: 'Indostates Whitefield — OPD Block C',
    notes: [{
      status: ClinicalNoteStatus.Signed,
      code: 'E11.9',
      codeText: 'Type 2 diabetes mellitus without complications',
      subjective:
        'Six-month review. Reports good adherence to metformin with no gastrointestinal upset. Has lost four kilograms following dietitian advice. Walking thirty minutes most days.',
      objective:
        'Weight 74 kilograms. Blood pressure 132 over 80. HbA1c 7.1 percent, down from 8.2. Renal function normal. Feet unchanged.',
      assessment:
        'Type 2 diabetes, improved glycaemic control on metformin with lifestyle change. Blood pressure now acceptable.',
      plan:
        'Continue current dose. Congratulated on the weight loss. Annual retinal screening reminder given. Review in six months or sooner if unwell.',
    }],
  },
  {
    patient: 'SD-P-03',
    daysAgo: 4,
    type: EncounterType.Emergency,
    status: EncounterStatus.Completed,
    chiefComplaint: 'Fever, productive cough and breathlessness for four days',
    location: 'Indostates Whitefield — Emergency Department',
    problems: [
      { code: 'J18.9', title: 'Pneumonia, unspecified organism', status: ProblemStatus.Active,
        note: 'Right basal consolidation on chest X-ray. CRP 180 on admission.' },
      { code: 'R50.9', title: 'Fever, unspecified', status: ProblemStatus.Resolved,
        note: 'Settled with antibiotic therapy. Afebrile from day 3.', resolvedDaysAgo: 1 },
    ],
    notes: [{
      status: ClinicalNoteStatus.Signed,
      code: 'J18.9',
      codeText: 'Pneumonia, unspecified organism',
      signedAfterH: 2,
      subjective:
        'Four days of productive cough with rusty sputum, fever and increasing breathlessness. No chest pain. Reports his usual exercise tolerance has fallen from 200 metres to about 20.',
      objective:
        'Alert, oriented. Temperature 38.4, respiratory rate 26, oxygen saturation 91 percent on air. Bronchial breathing and coarse crackles at the right base. Chest X-ray shows right lower zone consolidation. CRP 180, white cells 17.2.',
      assessment:
        'Community-acquired pneumonia, right lower lobe. CURB-65 score 2. Background of type 2 diabetes. ⚠️ Documented penicillin allergy — anaphylaxis in 2019 — so a beta-lactam is not appropriate.',
      plan:
        'Admit. Oxygen to maintain saturations above 94 percent. Non-beta-lactam antibiotic given the documented penicillin allergy. Blood cultures before the first dose. Repeat CRP in 48 hours. Diabetic team review.',
      addendum:
        'Blood cultures returned negative at 48 hours. Continuing current antibiotic. CRP falling — 96 today from 180 on admission. Oxygen requirement reduced and he is now on 1 litre via nasal cannulae.',
    }],
    prescriptions: [{
      status: PrescriptionStatus.Signed,
      items: [
        { drug: 'Azithromycin', dose: 500, unit: 'mg', freq: 'OD', days: 5, indication: 'J18.9',
          instructions: 'Take one tablet each morning, at the same time each day. Finish the full course.' },
        { drug: 'Paracetamol', dose: 1000, unit: 'mg', freq: 'QDS', days: 5, indication: 'J18.9',
          instructions: 'For fever or discomfort. Do not exceed four doses in 24 hours.' },
      ],
    }],
    instructions: [{
      title: 'Going home after your chest infection',
      language: 'ta',
      body:
        'உங்கள் நுரையீரல் தொற்றுக்கான மருந்தை முழுமையாக எடுத்துக்கொள்ளுங்கள் — நன்றாக உணர்ந்தாலும் நிறுத்த வேண்டாம்.\n\nநிறைய தண்ணீர் குடியுங்கள் மற்றும் ஓய்வு எடுங்கள்.\n\nஉடனடியாக மருத்துவமனைக்கு வரவும்: மூச்சுத் திணறல் அதிகரித்தால், காய்ச்சல் மீண்டும் வந்தால், அல்லது இரத்தம் கக்கினால்.\n\n⚠️ உங்களுக்கு பெனிசிலின் ஒவ்வாமை உள்ளது. எந்த மருத்துவரிடமும் இதை தெரிவிக்கவும்.',
      titleEnglish: 'Going home after your chest infection',
      bodyEnglish:
        'Finish the whole course of medicine for your lung infection — do not stop early even if '
        + 'you feel better.\n\nDrink plenty of water and rest.\n\nCome to hospital straight away if: '
        + 'your breathing gets worse, the fever comes back, or you cough up blood.\n\n'
        + '⚠️ You are allergic to penicillin. Tell every doctor who treats you.',
    }],
  },
  {
    // The live admission. Carries the draft and both resident co-sign notes.
    patient: 'SD-P-03',
    daysAgo: 0,
    type: EncounterType.ClinicVisit,
    status: EncounterStatus.InProgress,
    chiefComplaint: 'Ward round — day 4 of treatment for community-acquired pneumonia',
    location: 'Indostates Whitefield — Ward 4B',
    notes: [
      {
        status: ClinicalNoteStatus.Draft,
        code: 'J18.9',
        codeText: 'Pneumonia, unspecified organism',
        subjective:
          'Reviewed on the ward round. Says his breathing is easier today and he managed to walk to the bathroom unaided.',
        objective:
          'Temperature 37.1, respiratory rate 20, saturations 95 percent on air. Air entry improved at the right base.',
        assessment: '',
        plan: '',
      },
      {
        // ⚠️ OVERDUE against a 24-hour window — the atlas requires the queue
        // to be able to show one (CMP-NABH-03).
        status: ClinicalNoteStatus.CosignPending,
        author: 'resident',
        code: 'E11.9',
        codeText: 'Type 2 diabetes mellitus without complications',
        signedAfterH: -41,
        subjective:
          'Asked to review capillary glucose readings, which have been running between 12 and 16 since admission. He reports no symptoms of hypoglycaemia and has been eating poorly.',
        objective:
          'Capillary glucose 14.2 this morning. Ketones negative. Observations otherwise stable. Taking oral intake but less than usual.',
        assessment:
          'Hyperglycaemia in the context of acute infection, on a background of type 2 diabetes usually controlled on metformin alone. No evidence of ketosis.',
        plan:
          'Four-hourly capillary glucose. Continue metformin while renal function allows. Correctional insulin as per the sliding scale if readings exceed 16. Diabetes team to review. Reassess once the infection settles.',
      },
      {
        status: ClinicalNoteStatus.CosignPending,
        author: 'resident',
        code: 'J18.9',
        codeText: 'Pneumonia, unspecified organism',
        signedAfterH: -5,
        subjective:
          'Asked to review overnight confusion. Family report he was briefly disoriented at around 02:00 but settled without intervention.',
        objective:
          'GCS 15 now. No focal neurological deficit. Power 5 out of 5 throughout. Speech fluent. No neck stiffness.',
        assessment:
          'Transient confusion, most likely delirium secondary to sepsis rather than a primary neurological event. No features to suggest stroke.',
        plan:
          'No imaging indicated at this stage. Treat the underlying infection. Delirium precautions — orientation aids, family presence, medication review. Escalate if any focal signs develop.',
      },
    ],
  },

  // ══ SD-P-01 Meera Krishnan — routine thyroid follow-up ══════════════════
  {
    patient: 'SD-P-01',
    daysAgo: 730,
    type: EncounterType.ClinicVisit,
    status: EncounterStatus.Completed,
    chiefComplaint: 'Tiredness and weight gain — query thyroid',
    location: 'Indostates Whitefield — OPD Block C',
    problems: [
      { code: 'E03.9', title: 'Hypothyroidism, unspecified', status: ProblemStatus.Active,
        note: 'TSH 11.4 with low free T4 at diagnosis. Replacement started.' },
      { code: 'D50.9', title: 'Iron deficiency anaemia, unspecified', status: ProblemStatus.Resolved,
        note: 'Haemoglobin 10.2 at diagnosis. Responded to oral replacement.', resolvedDaysAgo: 400 },
    ],
    notes: [{
      status: ClinicalNoteStatus.Signed,
      code: 'E03.9',
      codeText: 'Hypothyroidism, unspecified',
      subjective:
        'Six months of tiredness, weight gain of about five kilograms, and feeling the cold more than usual. Periods heavier than previously. No neck swelling noticed.',
      objective:
        'Pulse 58 regular. No goitre palpable. Reflexes slow to relax. TSH 11.4, free T4 below range. Haemoglobin 10.2 with low ferritin.',
      assessment:
        'Primary hypothyroidism, with co-existing iron deficiency anaemia likely related to menorrhagia.',
      plan:
        'Start levothyroxine. Oral iron with vitamin C. Explained the importance of taking replacement on an empty stomach, separated from iron. Repeat thyroid function and haemoglobin in eight weeks.',
    }],
  },
  {
    patient: 'SD-P-01',
    daysAgo: 90,
    type: EncounterType.FollowUp,
    status: EncounterStatus.Completed,
    chiefComplaint: 'Six-month thyroid review',
    location: 'Indostates Whitefield — OPD Block C',
    notes: [{
      status: ClinicalNoteStatus.Signed,
      code: 'E03.9',
      codeText: 'Hypothyroidism, unspecified',
      subjective:
        'Six-month review of hypothyroidism. Reports good energy levels and stable weight. Taking replacement every morning on an empty stomach as advised.',
      objective:
        'Well. Pulse 72 regular, blood pressure 118 over 74. No goitre. TSH 2.1, free T4 within range.',
      assessment: 'Hypothyroidism, biochemically euthyroid on current replacement.',
      plan: 'Continue current dose. Repeat thyroid function in six months. Reinforced timing advice.',
    }],
    instructions: [{
      title: 'How to take your thyroid medicine',
      language: 'kn',
      body:
        'ನಿಮ್ಮ ಥೈರಾಯ್ಡ್ ಮಾತ್ರೆಯನ್ನು ಪ್ರತಿದಿನ ಬೆಳಿಗ್ಗೆ ಖಾಲಿ ಹೊಟ್ಟೆಯಲ್ಲಿ ತೆಗೆದುಕೊಳ್ಳಿ.\n\nಮಾತ್ರೆ ತೆಗೆದುಕೊಂಡ ನಂತರ ಕನಿಷ್ಠ 30 ನಿಮಿಷ ಏನನ್ನೂ ತಿನ್ನಬೇಡಿ ಅಥವಾ ಕುಡಿಯಬೇಡಿ — ನೀರು ಹೊರತುಪಡಿಸಿ.\n\nಕಬ್ಬಿಣದ ಮಾತ್ರೆ ಅಥವಾ ಕ್ಯಾಲ್ಸಿಯಂ ಜೊತೆಗೆ ತೆಗೆದುಕೊಳ್ಳಬೇಡಿ. ಕನಿಷ್ಠ ನಾಲ್ಕು ಗಂಟೆಗಳ ಅಂತರವಿರಲಿ.\n\nಪ್ರತಿ ಆರು ತಿಂಗಳಿಗೊಮ್ಮೆ ರಕ್ತ ಪರೀಕ್ಷೆ ಮಾಡಿಸಿಕೊಳ್ಳಿ.',
      // ⚠️ UI_ATLAS S-06-08 names this exact pair as the screen's sample data:
      // "SD-P-01 — thyroid medication timing, in Kannada and English".
      titleEnglish: 'How to take your thyroid medicine',
      bodyEnglish:
        'Take your thyroid tablet every morning on an empty stomach.\n\nAfter taking the tablet, '
        + 'do not eat or drink anything for at least 30 minutes — water is fine.\n\nDo not take it '
        + 'with iron tablets or calcium. Leave a gap of at least four hours.\n\nHave a blood test '
        + 'every six months.',
    }],
  },
  {
    patient: 'SD-P-01',
    daysAgo: 0,
    type: EncounterType.FollowUp,
    status: EncounterStatus.InProgress,
    chiefComplaint: 'Six-month thyroid review',
    location: 'Indostates Whitefield — OPD Block C',
    notes: [{
      status: ClinicalNoteStatus.Draft,
      code: 'E03.9',
      codeText: 'Hypothyroidism, unspecified',
      subjective:
        'Attends for six-month review. Reports she has been well, with no tiredness, weight change or cold intolerance. Taking her replacement first thing on an empty stomach as advised.',
      objective:
        'Well. Pulse 74 regular, blood pressure 120 over 76. No goitre. No tremor.',
      assessment: '',
      plan: '',
    }],
  },

  // ══ SD-P-02 Abdul Rahman Sheikh — pre-operative ═════════════════════════
  {
    patient: 'SD-P-02',
    daysAgo: 400,
    type: EncounterType.ClinicVisit,
    status: EncounterStatus.Completed,
    chiefComplaint: 'Exertional chest tightness',
    location: 'Indostates Whitefield — OPD Block C',
    problems: [
      { code: 'I25.1', title: 'Atherosclerotic heart disease of native coronary artery', status: ProblemStatus.Active,
        note: 'Triple-vessel disease on angiography. Listed for elective CABG.' },
      { code: 'E11.9', title: 'Type 2 diabetes mellitus without complications', status: ProblemStatus.Active,
        onsetBeforeDays: 1200, note: 'On metformin. HbA1c 7.4% at pre-operative assessment.' },
      { code: 'I10', title: 'Essential (primary) hypertension', status: ProblemStatus.Active,
        onsetBeforeDays: 1100, note: 'Controlled on a single agent.' },
    ],
    notes: [{
      status: ClinicalNoteStatus.Signed,
      code: 'I25.1',
      codeText: 'Atherosclerotic heart disease of native coronary artery',
      subjective:
        'Three months of chest tightness on climbing stairs, relieved by rest within a few minutes. No rest pain, no nocturnal symptoms. Ex-smoker, stopped eleven years ago.',
      objective:
        'Pulse 72 regular, blood pressure 148 over 86. Heart sounds normal. Chest clear. ECG shows sinus rhythm with lateral T-wave flattening. Angiography demonstrates triple-vessel disease.',
      assessment: 'Stable angina on the basis of triple-vessel coronary disease. Suitable for surgical revascularisation.',
      plan: 'Refer for elective coronary artery bypass grafting. Optimise risk factors meanwhile — statin, antiplatelet, blood pressure and glycaemic control. Counselled on what to expect.',
    }],
  },
  {
    patient: 'SD-P-02',
    daysAgo: 1,
    type: EncounterType.ClinicVisit,
    status: EncounterStatus.Completed,
    chiefComplaint: 'Pre-operative review before elective CABG',
    location: 'Indostates Whitefield — OPD Block C',
    notes: [{
      status: ClinicalNoteStatus.Signed,
      code: 'I25.1',
      codeText: 'Atherosclerotic heart disease of native coronary artery',
      subjective:
        'Pre-operative review ahead of elective bypass surgery. Reports stable exertional chest tightness at about 300 metres, unchanged for three months. No rest pain, no orthopnoea.',
      objective:
        'Comfortable at rest. Pulse 68 regular, blood pressure 132 over 78. Heart sounds normal, no murmur. Chest clear. No peripheral oedema. ECG shows sinus rhythm with no acute change.',
      assessment: 'Stable angina on a background of triple-vessel disease. Fit for elective surgery from a medical standpoint. Diabetes adequately controlled.',
      plan: 'Continue current antianginal and antiplatelet therapy. Withhold metformin on the morning of surgery. Anaesthetic review booked. Counselled on what to expect and the recovery timeline.',
    }],
    prescriptions: [{
      status: PrescriptionStatus.Signed,
      items: [
        { drug: 'Atorvastatin', dose: 40, unit: 'mg', freq: 'OD', days: 28, indication: 'I25.1',
          instructions: 'Take one tablet at night.' },
        { drug: 'Clopidogrel', dose: 75, unit: 'mg', freq: 'OD', days: 28, indication: 'I25.1',
          instructions: 'Take one tablet each morning with food.' },
      ],
    }],
    instructions: [{
      title: 'Before your heart operation',
      language: 'en',
      body:
        'Keep taking your heart tablets exactly as usual until the day of your operation.\n\nDo NOT take your diabetes tablet (metformin) on the morning of surgery.\n\nNothing to eat for six hours before, and nothing to drink for two hours before. The hospital will confirm the exact times.\n\nCome back sooner if you get chest pain at rest, or chest pain that does not settle with your usual spray.',
    }],
  },

  // ══ SD-P-04 Sunita Devi — antenatal ═════════════════════════════════════
  {
    patient: 'SD-P-04',
    daysAgo: 2,
    type: EncounterType.FollowUp,
    status: EncounterStatus.Completed,
    chiefComplaint: 'Antenatal review at 32 weeks',
    location: 'Indostates Whitefield — OPD Block C',
    problems: [
      { code: 'Z34.8', title: 'Supervision of other normal pregnancy', status: ProblemStatus.Active,
        onsetBeforeDays: 222, note: '32 weeks by dating scan. Uncomplicated to date.' },
      { code: 'D50.9', title: 'Iron deficiency anaemia, unspecified', status: ProblemStatus.Active,
        onsetBeforeDays: 58, note: 'Haemoglobin 9.8. On oral iron with dietary advice.' },
    ],
    notes: [{
      status: ClinicalNoteStatus.Signed,
      code: 'Z34.8',
      codeText: 'Supervision of other normal pregnancy',
      subjective:
        'Routine antenatal review at 32 weeks. Good fetal movements. No bleeding, no leaking, no headache or visual disturbance.',
      objective:
        'Blood pressure 112 over 70. Urinalysis negative for protein. Symphysis-fundal height 32 centimetres, consistent with dates. Fetal heart heard, rate 142. Haemoglobin 9.8.',
      assessment: 'Uncomplicated pregnancy at 32 weeks. Mild iron-deficiency anaemia.',
      plan: 'Continue oral iron with vitamin C and dietary advice. Repeat haemoglobin in four weeks. Routine review in two weeks. Discussed the warning signs that warrant immediate attention.',
    }],
    instructions: [{
      title: 'Your pregnancy — what to watch for',
      language: 'hi',
      body:
        'अपनी आयरन की गोली रोज़ लें, खाने के साथ नहीं। संतरे का रस या नींबू पानी के साथ लेने से यह बेहतर काम करती है।\n\nबच्चे की हलचल पर ध्यान दें। हर दिन जैसी सामान्य हलचल होती है, वैसी ही होनी चाहिए।\n\nतुरंत अस्पताल आएं यदि: बच्चे की हलचल कम हो जाए, खून आए, पानी जाए, तेज़ सिरदर्द हो, या धुंधला दिखाई दे।',
      titleEnglish: 'Your pregnancy — what to watch for',
      bodyEnglish:
        'Take your iron tablet every day, not with food. It works better with orange juice or '
        + 'lemon water.\n\nPay attention to the baby’s movements. They should feel the same each '
        + 'day as they usually do.\n\nCome to hospital straight away if: the baby moves less, you '
        + 'bleed, your waters break, you get a bad headache, or your vision becomes blurred.',
    }],
  },

  // ══ SD-P-05 Vikram Malhotra — acute stroke ══════════════════════════════
  {
    patient: 'SD-P-05',
    daysAgo: 1,
    type: EncounterType.Emergency,
    status: EncounterStatus.InProgress,
    chiefComplaint: 'Acute right-sided weakness and speech disturbance — last known well 09:40',
    location: 'Indostates Whitefield — Emergency Department',
    problems: [
      { code: 'I63.9', title: 'Cerebral infarction, unspecified', status: ProblemStatus.Active,
        note: 'Left MCA territory, large-vessel occlusion. Transferred for thrombectomy.' },
      { code: 'I48.0', title: 'Paroxysmal atrial fibrillation', status: ProblemStatus.Active,
        onsetBeforeDays: 299, note: 'Likely embolic source. Anticoagulation to be reviewed after imaging.' },
      { code: 'I10', title: 'Essential (primary) hypertension', status: ProblemStatus.Active,
        onsetBeforeDays: 1999, note: 'Poorly controlled historically.' },
    ],
    notes: [{
      status: ClinicalNoteStatus.Signed,
      code: 'I63.9',
      codeText: 'Cerebral infarction, unspecified',
      subjective:
        'Medical review requested after transfer for thrombectomy. Last known well 09:40. Collateral history from his wife, who witnessed the onset.',
      objective:
        'Right-sided weakness with power 2 out of 5 in the arm and 3 out of 5 in the leg. Expressive dysphasia. Blood pressure 168 over 94, irregular pulse. Glucose 7.2.',
      assessment:
        'Left middle cerebral artery territory infarct with large-vessel occlusion, likely embolic given the documented paroxysmal atrial fibrillation.',
      plan:
        'Neurology and interventional teams leading. Blood pressure parameters as per the stroke protocol. Nil by mouth pending a swallow assessment. Anticoagulation decision deferred until post-procedure imaging. Wife updated.',
    }],
    prescriptions: [{
      status: PrescriptionStatus.Signed,
      items: [
        { drug: 'Atorvastatin', dose: 80, unit: 'mg', freq: 'OD', days: 28, indication: 'I63.9',
          instructions: 'Take one tablet at night, starting today.' },
        { drug: 'Enoxaparin', dose: 40, unit: 'mg', freq: 'OD', days: 7, indication: 'I63.9',
          instructions: 'Prophylactic dose while mobility is reduced.' },
      ],
    }],
  },

  // ══ SD-P-06 Kavya Reddy — paediatric fever ══════════════════════════════
  {
    patient: 'SD-P-06',
    daysAgo: 0,
    type: EncounterType.ClinicVisit,
    status: EncounterStatus.Completed,
    chiefComplaint: 'Fever for two days — day-care observation',
    location: 'Indostates Whitefield — Paediatric Day Care',
    problems: [
      { code: 'R50.9', title: 'Fever, unspecified', status: ProblemStatus.Active,
        note: 'Day-care observation. No focus identified on examination.' },
    ],
    notes: [{
      status: ClinicalNoteStatus.Signed,
      code: 'R50.9',
      codeText: 'Fever, unspecified',
      signedAfterH: 3,
      subjective:
        'Brought by her mother with two days of fever up to 39 degrees, settling with paracetamol. Eating less than usual but drinking well. No vomiting, no rash, no ear pain.',
      objective:
        'Alert and playful between temperature spikes. Temperature 38.2. Throat mildly injected, no exudate. Chest clear. Abdomen soft. No rash. Capillary refill under two seconds.',
      assessment:
        'Febrile illness, most likely viral. No focus of bacterial infection identified and no red flags on examination.',
      plan:
        'Day-care observation. Regular paracetamol and encourage fluids. Safety-netting given to the mother in writing. Review if fever persists beyond 48 hours or if any warning sign appears.',
    }],
    prescriptions: [{
      status: PrescriptionStatus.Signed,
      items: [{ drug: 'Paracetamol', dose: 500, unit: 'mg', freq: 'QDS', days: 3, indication: 'R50.9',
        instructions: 'For fever. Weight-appropriate dose. Do not exceed four doses in 24 hours.' }],
    }],
    instructions: [{
      title: 'Looking after your child with a fever',
      language: 'en',
      body:
        'Give the paracetamol as written on the prescription, and not more often than every six hours.\n\nOffer small drinks often. Do not worry if she eats less for a day or two.\n\nBring her back if: the fever lasts more than 48 hours, she becomes drowsy or hard to wake, she develops a rash that does not fade when pressed, she is breathing fast, or she is not passing urine.',
    }],
  },

  // ══ SD-P-07 Joseph Mathew — septic shock, ICU ═══════════════════════════
  {
    patient: 'SD-P-07',
    daysAgo: 2,
    type: EncounterType.Emergency,
    status: EncounterStatus.InProgress,
    chiefComplaint: 'Septic shock — presumed respiratory source',
    location: 'Indostates Whitefield — ICU-1',
    problems: [
      { code: 'R65.21', title: 'Severe sepsis with septic shock', status: ProblemStatus.Active,
        note: 'Source presumed respiratory. On vasopressor support.' },
      { code: 'N18.3', title: 'Chronic kidney disease, stage 3 (moderate)', status: ProblemStatus.Active,
        onsetBeforeDays: 798, note: 'Baseline creatinine 148. Nephrology aware.' },
      { code: 'J44.9', title: 'Chronic obstructive pulmonary disease, unspecified', status: ProblemStatus.Active,
        onsetBeforeDays: 1798, note: 'Ex-smoker. Two exacerbations in the past year.' },
    ],
    notes: [{
      status: ClinicalNoteStatus.Signed,
      code: 'N18.3',
      codeText: 'Chronic kidney disease, stage 3 (moderate)',
      subjective:
        'Joint review with intensive care. Sedated and ventilated, so history from the notes and family.',
      objective:
        'On noradrenaline at a reducing rate. Creatinine 214 against a baseline of 148. Urine output 0.4 millilitres per kilogram per hour over the last six hours. Lactate 2.1, falling.',
      assessment:
        'Acute kidney injury on chronic kidney disease stage 3, in the context of septic shock. Renal function trending in the right direction as the shock resolves.',
      plan:
        'Avoid nephrotoxic agents. Doses of renally cleared drugs reviewed with pharmacy. Daily renal function. Nephrology informed. Family updated at the bedside.',
    }],
    prescriptions: [{
      status: PrescriptionStatus.Signed,
      items: [{ drug: 'Paracetamol', dose: 1000, unit: 'mg', freq: 'TDS', days: 3, indication: 'R65.21',
        instructions: 'Reduced frequency given renal impairment.' }],
    }],
  },

  // ══ SD-P-09 Fatima Bi — ESRD ════════════════════════════════════════════
  {
    patient: 'SD-P-09',
    daysAgo: 3,
    type: EncounterType.ClinicVisit,
    status: EncounterStatus.Completed,
    chiefComplaint: 'Breathlessness and ankle swelling after a missed dialysis session',
    location: 'Indostates Whitefield — Renal Unit',
    problems: [
      { code: 'N18.5', title: 'Chronic kidney disease, stage 5', status: ProblemStatus.Active,
        onsetBeforeDays: 897, note: 'Haemodialysis three times weekly via left arm fistula.' },
      { code: 'I10', title: 'Essential (primary) hypertension', status: ProblemStatus.Active,
        onsetBeforeDays: 2197, note: 'Volume-dependent. Managed through dialysis prescription.' },
      { code: 'D50.9', title: 'Iron deficiency anaemia, unspecified', status: ProblemStatus.Active,
        onsetBeforeDays: 497, note: 'Anaemia of chronic kidney disease. On iron and an erythropoiesis-stimulating agent.' },
    ],
    notes: [{
      status: ClinicalNoteStatus.Signed,
      code: 'N18.5',
      codeText: 'Chronic kidney disease, stage 5',
      subjective:
        'Reviewed after a missed dialysis session. Reports feeling short of breath on the stairs and mild ankle swelling since. Appetite poor.',
      objective:
        'Blood pressure 158 over 92. Weight 2.4 kilograms above target. Mild bibasal crackles. Fistula patent with a good thrill. Potassium 5.6, haemoglobin 9.4.',
      assessment:
        'Fluid overload following a missed session, with mild hyperkalaemia. No features of urgency requiring immediate dialysis outside the usual schedule.',
      plan:
        'Discussed the importance of not missing sessions. Fluid and potassium restriction reinforced in writing. Continue iron and the erythropoiesis-stimulating agent. Nephrology to review the dialysis prescription at the next session.',
    }],
    prescriptions: [{
      status: PrescriptionStatus.Signed,
      items: [{ drug: 'Atorvastatin', dose: 20, unit: 'mg', freq: 'OD', days: 28, indication: 'N18.5',
        instructions: 'Take one tablet at night.' }],
    }],
    instructions: [{
      title: 'Your dialysis and fluid limits',
      language: 'en',
      body:
        'Please do not miss a dialysis session. The breathlessness and swelling you had came from the fluid that built up after the one you missed.\n\nKeep to your daily fluid limit as we discussed.\n\nAvoid high-potassium foods: bananas, oranges, tomatoes, potatoes and coconut water.\n\nCome in urgently if you get breathless lying flat, chest pain, or a very fast or irregular heartbeat.',
    }],
  },

  // ══ SD-P-10 Arjun Nair — teledermatology ════════════════════════════════
  {
    patient: 'SD-P-10',
    daysAgo: 5,
    type: EncounterType.Telehealth,
    status: EncounterStatus.Completed,
    chiefComplaint: 'Teledermatology — acne not responding to over-the-counter treatment',
    location: 'Teleconsultation — video',
    problems: [
      { code: 'L70.0', title: 'Acne vulgaris', status: ProblemStatus.Active,
        onsetBeforeDays: 175, note: 'Moderate inflammatory acne over face and upper back.' },
    ],
    notes: [{
      status: ClinicalNoteStatus.Signed,
      code: 'L70.0',
      codeText: 'Acne vulgaris',
      subjective:
        'Teleconsultation. Six months of spots over the face and upper back, worse in the last two months. Has tried over-the-counter washes without benefit. Finds it affects his confidence at work.',
      objective:
        'Video assessment. Moderate inflammatory papules and pustules over both cheeks and the upper back, with some post-inflammatory pigmentation. No nodules, no scarring.',
      assessment:
        'Moderate inflammatory acne vulgaris. No features requiring systemic retinoid therapy at this stage.',
      plan:
        'Topical therapy started with written instructions on application and expected timeline. Advised that improvement takes six to eight weeks. Review in eight weeks, sooner if it worsens.',
    }],
    instructions: [{
      title: 'Using your acne treatment',
      language: 'en',
      body:
        'Apply a pea-sized amount to the whole affected area at night, not just to individual spots.\n\nStart every other night for the first two weeks to let your skin settle, then move to nightly.\n\nUse a moisturiser and a sunscreen during the day — the treatment makes skin more sensitive to sun.\n\nIt takes six to eight weeks to see the benefit. Do not stop early. Contact us if your skin becomes very sore or peels badly.',
    }],
  },

  // ══ Visits the BASE seed creates ════════════════════════════════════════
  //
  // ⚠️ seed-demo-clinic.ts creates three encounters of its own, before this
  // file runs. Their (patient, type, day) is matched here so the adoption path
  // fills them — otherwise they stay as shells that open onto nothing, which
  // is exactly what `db:demo:check` now refuses to pass.

  {
    patient: 'SD-P-03',
    daysAgo: 2,
    type: EncounterType.ClinicVisit,
    status: EncounterStatus.InProgress,
    chiefComplaint: 'Increasing breathlessness and new confusion',
    location: 'Indostates Whitefield — Ward 4B',
    notes: [{
      status: ClinicalNoteStatus.Signed,
      code: 'J18.9',
      codeText: 'Pneumonia, unspecified organism',
      subjective:
        'Called to review after nursing staff reported he had become more breathless during the evening and was intermittently confused about where he was.',
      objective:
        'Respiratory rate 28, saturations 89 percent on 2 litres, increased to 94 percent on 4 litres. Temperature 38.1. Abbreviated mental test 7 out of 10, down from 10 on admission. Chest unchanged, coarse crackles at the right base.',
      assessment:
        'Deterioration on day 2 of treatment for community-acquired pneumonia, with new hypoxia and delirium. Most likely progression of the infection rather than a second pathology.',
      plan:
        'Increase oxygen and wean as tolerated. Repeat chest X-ray and inflammatory markers. Blood cultures resent. Delirium precautions. Discussed escalation with the medical registrar — ward-level care remains appropriate for now. Family informed.',
    }],
  },
  {
    patient: 'SD-P-07',
    daysAgo: 4,
    type: EncounterType.ClinicVisit,
    status: EncounterStatus.Completed,
    chiefComplaint: 'ICU review — sedation hold and neurological assessment',
    location: 'Indostates Whitefield — ICU-1',
    notes: [{
      status: ClinicalNoteStatus.Signed,
      code: 'R65.21',
      codeText: 'Severe sepsis with septic shock',
      subjective:
        'Attended for the daily sedation hold. No history available directly; wife present at the bedside throughout.',
      objective:
        'Sedation held for twenty minutes. Opens eyes to voice, follows simple commands with the left hand, moves all four limbs. No asymmetry. Pupils equal and reactive. Tolerated the hold without desaturation; sedation restarted at a reduced rate.',
      assessment:
        'Neurologically intact on sedation hold, with no focal deficit to suggest a central cause for the encephalopathy. Consistent with septic encephalopathy.',
      plan:
        'Continue daily sedation holds. No neuroimaging indicated. Wean sedation as haemodynamics allow. Wife updated at the bedside and her questions answered.',
    }],
  },
  {
    patient: BASE_DEMO_PATIENT,
    daysAgo: 89,
    type: EncounterType.Emergency,
    status: EncounterStatus.Completed,
    chiefComplaint: 'Sudden right-sided weakness and slurred speech',
    location: 'Indostates Whitefield — Emergency Department',
    problems: [
      { code: 'I63.9', title: 'Cerebral infarction, unspecified', status: ProblemStatus.Active,
        note: 'Left MCA territory infarct. Thrombolysed within window.' },
    ],
    notes: [{
      status: ClinicalNoteStatus.Signed,
      code: 'I63.9',
      codeText: 'Cerebral infarction, unspecified',
      subjective:
        'Brought in by ambulance after her husband found her unable to speak clearly with a drooping face. Last known well 45 minutes before arrival.',
      objective:
        'NIHSS 9. Right facial droop, right arm drift, expressive dysphasia. Blood pressure 176 over 92. Glucose 6.1. CT head shows no haemorrhage and an early ischaemic change in the left MCA territory.',
      assessment:
        'Acute ischaemic stroke, left middle cerebral artery territory, within the thrombolysis window. ⚠️ Documented penicillin allergy noted — no relevance to the acute pathway but flagged for any subsequent antibiotic decision.',
      plan:
        'Thrombolysis given after checking the exclusion criteria. Stroke unit admission. Half-hourly neurological observations for four hours. Repeat imaging at 24 hours. Swallow screen before anything by mouth.',
    }],
  },
];

/* ── Seeder ─────────────────────────────────────────────────────────────── */

export async function seedM06Visits(
  prisma: PrismaClient,
  patientIdByRef: Map<string, string>,
  doctorUserIdByRef: Map<string, string>,
): Promise<void> {
  const consultant = doctorUserIdByRef.get('SD-S-01');
  const resident = doctorUserIdByRef.get('SD-RESIDENT');
  if (consultant === undefined) {
    console.log('… visits skipped: SD-S-01 not found');
    return;
  }

  const drugs = await prisma.drug.findMany({ select: { id: true, genericName: true, route: true } });
  const drugByName = new Map(drugs.map((d) => [d.genericName, d]));

  let rxSeq = await prisma.prescription.count();
  const made = { visits: 0, notes: 0, problems: 0, rx: 0, instructions: 0, instructionsBackfilled: 0 };

  for (const visit of VISITS) {
    const patientId = visit.patient.startsWith('email:')
      ? (
          await prisma.patientProfile.findFirst({
            where: { user: { email: visit.patient.slice('email:'.length) } },
            select: { id: true },
          })
        )?.id
      : patientIdByRef.get(visit.patient);
    if (patientId === undefined) continue;

    /**
     * Idempotency key: (patient, type, same day).
     *
     * ⚠️ Not the chief complaint, which would read more naturally — it is
     * encrypted with a random IV per value, so the same plaintext never
     * matches by ciphertext and an equality filter silently never fires.
     * The day window is stable across runs because `daysAgo` is relative.
     *
     * ⚠️ AN EXISTING VISIT IS ADOPTED, NOT SKIPPED. The base seed already
     * creates a few encounters of its own (the stroke presentation, the ICU
     * review). An earlier version of this loop saw those and `continue`d,
     * which meant their content was never written — so the stroke patient,
     * who carries the urgent flag on My Day and is the first thing anyone
     * clicks, opened onto an encounter with no note, no problems and no
     * prescription. Attaching to what is already there is both correct and
     * what makes a re-run converge.
     */
    const startedAt = daysAgo(visit.daysAgo);
    const existing = await prisma.encounter.findFirst({
      where: {
        patientId,
        type: visit.type,
        startedAt: { gte: daysAgo(visit.daysAgo + 0.5), lt: daysAgo(visit.daysAgo - 0.5) },
      },
      select: { id: true },
    });

    const encounter =
      existing ??
      (await withGeneratedVisitId((visitId) =>
        prisma.encounter.create({
          data: {
            visitId,
            patientId,
            type: visit.type,
            status: visit.status,
            startedAt,
            endedAt:
              visit.status === EncounterStatus.Completed
                ? new Date(startedAt.getTime() + 45 * 60_000)
                : null,
            locationName: encryptField(visit.location),
            chiefComplaint: encryptField(visit.chiefComplaint),
            createdByUserId: consultant,
          },
        }),
      ));
    if (existing === null) made.visits += 1;

    // ── Problems coded at this visit ──────────────────────────────────────
    for (const spec of visit.problems ?? []) {
      const exists = await prisma.problem.findFirst({ where: { patientId, code: spec.code } });
      if (exists !== null) continue;

      await prisma.problem.create({
        data: {
          patientId,
          onsetEncounterId: encounter.id,
          code: spec.code,
          codeTitle: spec.title,
          status: spec.status,
          onsetDate: daysAgo(visit.daysAgo + (spec.onsetBeforeDays ?? 0)),
          resolvedAt: spec.resolvedDaysAgo === undefined ? null : daysAgo(spec.resolvedDaysAgo),
          note: encryptField(spec.note),
          recordedByUserId: consultant,
        },
      });
      made.problems += 1;
    }

    // ── Notes written at this visit ───────────────────────────────────────
    for (const spec of visit.notes ?? []) {
      const authorId = spec.author === 'resident' && resident !== undefined ? resident : consultant;
      const isResident = spec.author === 'resident';
      const signed = spec.status !== ClinicalNoteStatus.Draft;
      const signedAt =
        spec.signedAfterH === undefined
          ? new Date(startedAt.getTime() + 60 * 60_000)
          : spec.signedAfterH < 0
            ? hoursAgo(-spec.signedAfterH)
            : new Date(startedAt.getTime() + spec.signedAfterH * 3_600_000);

      // Per-item guard: adopting an existing encounter means this loop can be
      // re-entered, so each item needs its own idempotency key.
      const noteExists = await prisma.clinicalNote.findFirst({
        where: { encounterId: encounter.id, problemCode: spec.code, status: spec.status },
        select: { id: true },
      });
      if (noteExists !== null) continue;

      const note = await prisma.clinicalNote.create({
        data: {
          patientId,
          encounterId: encounter.id,
          authorUserId: authorId,
          subjective: encryptField(spec.subjective),
          objective: encryptField(spec.objective),
          assessment: spec.assessment === '' ? null : encryptField(spec.assessment),
          plan: spec.plan === '' ? null : encryptField(spec.plan),
          problemCode: spec.code,
          problemText: spec.codeText,
          status: spec.status,
          requiresCosign: spec.status === ClinicalNoteStatus.CosignPending,
          signedAt: signed ? signedAt : null,
          signedByUserId: signed ? authorId : null,
          signerName: signed ? (isResident ? 'Dr. Kavitha Rao' : 'Dr. Ananya Iyer') : null,
          signerRegistrationNumber: signed ? (isResident ? 'KA-MC-77310' : 'KA-MC-58211') : null,
          createdAt: startedAt,
        },
      });
      made.notes += 1;

      if (spec.addendum !== undefined) {
        await prisma.clinicalNoteAddendum.create({
          data: {
            noteId: note.id,
            body: encryptField(spec.addendum),
            authorUserId: authorId,
            authorName: isResident ? 'Dr. Kavitha Rao' : 'Dr. Ananya Iyer',
            authorRegistrationNumber: isResident ? 'KA-MC-77310' : 'KA-MC-58211',
            createdAt: new Date(signedAt.getTime() + 48 * 3_600_000),
          },
        });
      }
    }

    // ── Prescriptions written at this visit ───────────────────────────────
    for (const spec of visit.prescriptions ?? []) {
      const items = spec.items.flatMap((item) => {
        const drug = drugByName.get(item.drug);
        if (drug === undefined) return [];
        return [{
          drugId: drug.id,
          dose: item.dose,
          doseUnit: item.unit,
          route: drug.route,
          frequency: item.freq,
          durationDays: item.days,
          indicationCode: item.indication,
          substitutionAllowed: true,
          instructions: encryptField(item.instructions),
        }];
      });
      if (items.length === 0) continue;

      const firstItem = items[0];
      if (firstItem !== undefined) {
        const rxExists = await prisma.prescription.findFirst({
          where: { encounterId: encounter.id, items: { some: { drugId: firstItem.drugId } } },
          select: { id: true },
        });
        if (rxExists !== null) continue;
      }

      rxSeq += 1;
      const isSigned = spec.status === PrescriptionStatus.Signed;
      await prisma.prescription.create({
        data: {
          patientId,
          encounterId: encounter.id,
          rxNumber: `RX/26-27/${String(rxSeq).padStart(6, '0')}`,
          status: spec.status,
          authorUserId: consultant,
          signedAt: isSigned ? new Date(startedAt.getTime() + 30 * 60_000) : null,
          signedByUserId: isSigned ? consultant : null,
          signerName: isSigned ? 'Dr. Ananya Iyer' : null,
          signerRegistrationNumber: isSigned ? 'KA-MC-58211' : null,
          signerHprId: isSigned ? 'IN-HPR-2291840' : null,
          createdAt: startedAt,
          items: { create: items },
        },
      });
      made.rx += 1;
    }

    // ── Instructions issued at this visit ─────────────────────────────────
    for (const spec of visit.instructions ?? []) {
      const instrExists = await prisma.patientInstruction.findFirst({
        where: { encounterId: encounter.id, title: spec.title },
        select: { id: true, bodyEnglish: true },
      });
      if (instrExists !== null) {
        // ⚠️ BACKFILL, not skip. The English counterpart columns were added
        // after these rows were first seeded, so a plain existence check would
        // leave every demo database permanently one-language — the seed would
        // report success while the screen it feeds could not demonstrate the
        // bilingual requirement it exists for.
        //
        // Only ever fills a gap: a row that already has an English body is left
        // exactly as it is, so this cannot overwrite an instruction someone
        // issued through the UI.
        if (instrExists.bodyEnglish === null && spec.bodyEnglish !== undefined) {
          await prisma.patientInstruction.update({
            where: { id: instrExists.id },
            data: {
              titleEnglish: spec.titleEnglish ?? null,
              bodyEnglish: encryptField(spec.bodyEnglish),
            },
          });
          made.instructionsBackfilled += 1;
        }
        continue;
      }

      await prisma.patientInstruction.create({
        data: {
          patientId,
          encounterId: encounter.id,
          title: spec.title,
          body: encryptField(spec.body),
          language: spec.language,
          titleEnglish: spec.titleEnglish ?? null,
          bodyEnglish: spec.bodyEnglish === undefined ? null : encryptField(spec.bodyEnglish),
          issuedAt: new Date(startedAt.getTime() + 40 * 60_000),
          issuedByUserId: consultant,
          issuedByName: 'Dr. Ananya Iyer',
        },
      });
      made.instructions += 1;
    }
  }

  console.log(
    `✓ visits: +${made.visits} encounters, each carrying its own content — ` +
      `+${made.notes} notes, +${made.problems} problems, +${made.rx} prescriptions, ` +
      `+${made.instructions} instructions` +
      (made.instructionsBackfilled > 0
        ? ` (+${made.instructionsBackfilled} given their English counterpart)`
        : ''),
  );
}
