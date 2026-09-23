import { PrismaClient, TemplateScope } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// M-06 standalone reference data — ICD-10 extensions and the template library.
//
// ⚠️ PROBLEMS, NOTES, PRESCRIPTIONS AND INSTRUCTIONS USED TO LIVE HERE, as four
// independent arrays, and the reason they no longer do is worth keeping.
//
// Seeding them table-by-table produced 30 notes and 14 prescriptions that
// referenced no encounter at all. Every row was individually plausible and the
// totals looked healthy, but the whole was incoherent: opening a visit showed a
// blank note, because the note that visit produced had no idea the visit
// existed. A clinical record is a graph, not a set of tables.
//
// They now live in m06Visits.ts, seeded as VISITS — one encounter together with
// everything it produced — so an orphan is not expressible.
//
// What remains here is the data that genuinely is standalone: the diagnosis
// catalogue, which belongs to no patient, and the template library, which
// belongs to the clinician rather than to any visit.
// ─────────────────────────────────────────────────────────────────────────────

const daysAgo = (d: number): Date => new Date(Date.now() - d * 86_400_000);

/**
 * ⚠️ DOCUMENTED DEVIATION FROM §8.5, mirroring m06ClinicalSeed's drug
 * extensions.
 *
 * §8.5 fixes five diagnoses, which cover three patients. The remaining six in
 * the §8.2 cast have clinical stories the atlas states in prose — SD-P-02's
 * triple-vessel disease, SD-P-04's pregnancy, SD-P-09's ESRD — but gives no
 * code for. These are genuine ICD-10 codes for stories the atlas already
 * tells, not new clinical narrative, and are recorded so they can be folded
 * into §8.5 properly.
 */
const DIAGNOSIS_EXTENSIONS: Array<{
  code: string;
  title: string;
  parentCode: string | null;
  isLeaf: boolean;
}> = [
  { code: 'I25', title: 'Chronic ischaemic heart disease', parentCode: null, isLeaf: false },
  { code: 'I25.1', title: 'Atherosclerotic heart disease of native coronary artery', parentCode: 'I25', isLeaf: true },
  { code: 'I10', title: 'Essential (primary) hypertension', parentCode: null, isLeaf: true },
  { code: 'N18', title: 'Chronic kidney disease', parentCode: null, isLeaf: false },
  { code: 'N18.3', title: 'Chronic kidney disease, stage 3 (moderate)', parentCode: 'N18', isLeaf: true },
  { code: 'N18.5', title: 'Chronic kidney disease, stage 5', parentCode: 'N18', isLeaf: true },
  { code: 'Z34', title: 'Supervision of normal pregnancy', parentCode: null, isLeaf: false },
  { code: 'Z34.8', title: 'Supervision of other normal pregnancy', parentCode: 'Z34', isLeaf: true },
  { code: 'L70', title: 'Acne', parentCode: null, isLeaf: false },
  { code: 'L70.0', title: 'Acne vulgaris', parentCode: 'L70', isLeaf: true },
  { code: 'R50', title: 'Fever of other and unknown origin', parentCode: null, isLeaf: false },
  { code: 'R50.9', title: 'Fever, unspecified', parentCode: 'R50', isLeaf: true },
  { code: 'I48', title: 'Atrial fibrillation and flutter', parentCode: null, isLeaf: false },
  { code: 'I48.0', title: 'Paroxysmal atrial fibrillation', parentCode: 'I48', isLeaf: true },
  { code: 'J44', title: 'Other chronic obstructive pulmonary disease', parentCode: null, isLeaf: false },
  { code: 'J44.9', title: 'Chronic obstructive pulmonary disease, unspecified', parentCode: 'J44', isLeaf: true },
  { code: 'D50', title: 'Iron deficiency anaemia', parentCode: null, isLeaf: false },
  { code: 'D50.9', title: 'Iron deficiency anaemia, unspecified', parentCode: 'D50', isLeaf: true },
];

/* ── Templates ──────────────────────────────────────────────────────────── */

const TEMPLATES: Array<{
  key: string;
  name: string;
  category: string;
  scope: TemplateScope;
  reviewDueDays: number | null;
  body: string;
}> = [
  { key: 'TPL.OP-GENERAL', name: 'General outpatient consultation', category: 'Consultation', scope: TemplateScope.Personal, reviewDueDays: 300,
    body: 'Presenting complaint:\n\nHistory of presenting complaint:\n\nRelevant past history:\n\nMedication and allergies reviewed:\n\nExamination:\n\nImpression:\n\nPlan and follow-up:' },
  { key: 'TPL.DIABETES-REVIEW', name: 'Diabetes follow-up', category: 'Consultation', scope: TemplateScope.Personal, reviewDueDays: 180,
    body: 'Glycaemic control: HbA1c ___ (previous ___)\nHypoglycaemia in the last three months: ___\nFoot check: ___\nRetinal screening: ___\nRenal function and urine ACR: ___\nBlood pressure: ___\nMedication review and adherence: ___\nPlan:' },
  { key: 'TPL.HTN-REVIEW', name: 'Hypertension review', category: 'Consultation', scope: TemplateScope.Personal, reviewDueDays: 180,
    body: 'Home readings: ___\nClinic blood pressure: ___\nAdherence and side effects: ___\nCardiovascular risk factors: ___\nRenal function and electrolytes: ___\nPlan:' },
  { key: 'TPL.RESP-CONSULT', name: 'Respiratory consultation', category: 'Consultation', scope: TemplateScope.Personal, reviewDueDays: null,
    body: 'Breathlessness (MRC grade): ___\nCough and sputum: ___\nWheeze: ___\nExacerbations in the last year: ___\nSmoking status: ___\nExamination:\nOxygen saturation: ___\nImpression and plan:' },
  { key: 'TPL.FEVER-EVAL', name: 'Fever evaluation', category: 'Consultation', scope: TemplateScope.Personal, reviewDueDays: null,
    body: 'Duration and pattern: ___\nAssociated symptoms: ___\nTravel and contact history: ___\nExamination for a focus:\nRed flags considered: ___\nInvestigations:\nSafety-netting given:' },
  { key: 'TPL.ANTENATAL-REVIEW', name: 'Antenatal review', category: 'Consultation', scope: TemplateScope.Personal, reviewDueDays: 240,
    body: 'Gestation: ___\nFetal movements: ___\nBlood pressure and urinalysis: ___\nSymphysis-fundal height: ___\nFetal heart: ___\nHaemoglobin: ___\nPlan and next review:' },
  { key: 'OS.SEPSIS-ADULT', name: 'Adult sepsis — initial management', category: 'Order set', scope: TemplateScope.Facility, reviewDueDays: 120,
    body: 'Blood cultures before antibiotics\nSerum lactate\nFull blood count, renal and liver function, CRP\nUrine output monitoring\nOxygen to target saturations\nIntravenous fluids as per weight\nAntibiotic per local policy — CHECK ALLERGY STATUS\nReview at one hour' },
  { key: 'OS.STROKE-THROMBOLYSIS', name: 'Stroke — thrombolysis workup', category: 'Order set', scope: TemplateScope.Facility, reviewDueDays: 90,
    body: 'Confirm last known well time\nNIHSS scoring\nUrgent non-contrast CT head\nCapillary glucose\nFull blood count, coagulation screen\nBlood pressure per protocol\nWeight for dosing\nExclusion criteria checklist' },
  { key: 'TPL.TELECONSULT', name: 'Teleconsultation note', category: 'Consultation', scope: TemplateScope.Personal, reviewDueDays: null,
    body: 'Mode of consultation and patient identity verified: ___\nConsent for teleconsultation: ___\nPresenting complaint:\nHistory:\nVisual assessment (limitations noted):\nImpression:\nPlan, including when to attend in person:' },
  { key: 'TPL.PREOP-ASSESS', name: 'Pre-operative assessment', category: 'Procedure', scope: TemplateScope.Personal, reviewDueDays: 365,
    body: 'Proposed procedure: ___\nExercise tolerance: ___\nCardiorespiratory history: ___\nAirway assessment: ___\nMedication to withhold: ___\nAnaesthetic review: ___\nFitness for surgery:' },
];

/* ── Seeder ─────────────────────────────────────────────────────────────── */

export async function seedM06DemoDepth(
  prisma: PrismaClient,
  doctorUserIdByRef: Map<string, string>,
): Promise<void> {
  const iyer = doctorUserIdByRef.get('SD-S-01');
  if (iyer === undefined) {
    console.log('… reference data skipped: SD-S-01 not found');
    return;
  }

  for (const code of DIAGNOSIS_EXTENSIONS) {
    await prisma.diagnosisCode.upsert({
      where: { code: code.code },
      update: { title: code.title, parentCode: code.parentCode, isLeaf: code.isLeaf },
      create: code,
    });
  }

  let templatesAdded = 0;
  for (const spec of TEMPLATES) {
    const exists = await prisma.clinicalTemplate.findFirst({ where: { key: spec.key } });
    if (exists !== null) continue;

    await prisma.clinicalTemplate.create({
      data: {
        key: spec.key,
        name: spec.name,
        scope: spec.scope,
        category: spec.category,
        body: spec.body,
        ownerUserId: iyer,
        ownerName: 'Dr. Ananya Iyer',
        effectiveFrom: daysAgo(120),
        reviewDueAt: spec.reviewDueDays === null ? null : daysAgo(120 - spec.reviewDueDays),
        promotedAt: spec.scope === TemplateScope.Facility ? daysAgo(100) : null,
        isActive: true,
      },
    });
    templatesAdded += 1;
  }

  console.log(
    `✓ reference data: ${DIAGNOSIS_EXTENSIONS.length} ICD-10 extensions, +${templatesAdded} templates`,
  );
}
