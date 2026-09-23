import {
  PrismaClient,
  TemplateScope,
  RoleName,
  Gender,
} from '@prisma/client';
import { seedM06DemoDepth } from './m06DemoDepth';
import { seedM06Visits } from './m06Visits';

// ─────────────────────────────────────────────────────────────────────────────
// M-06 clinical seed — formulary, safety rules, problems, notes, templates.
//
// Called from seed-demo-clinic.ts so `npm run db:demo:clinic` remains the one
// command. Kept in its own file only because the caller is already ~950 lines.
//
// ⚠️ IDEMPOTENT, like its caller. Every write is an upsert or is guarded on
// "does this already exist" — re-running must converge, never duplicate.
//
// ⚠️ UI_ATLAS §8.6: "Never invent data outside this kit." The cast, the
// drugs, the allergens and the diagnoses below all come from §8.2/§8.3/§8.5,
// with exactly ONE documented exception, flagged in the data itself — see
// ATLAS_EXTENSIONS below.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ⚠️ DOCUMENTED DEVIATION FROM §8.5.
 *
 * S-06-07 requires the hard stop to offer "three alternatives" when it blocks
 * co-amoxiclav for a penicillin-allergic patient. §8.5's drug list contains
 * exactly two antibiotics — co-amoxiclav and piperacillin-tazobactam — and
 * BOTH are beta-lactams, so both are correctly blocked by the same allergy.
 * There is therefore no alternative in the fixed kit to offer.
 *
 * Rather than silently invent, or ship a hard stop that offers nothing, these
 * three standard non-beta-lactam choices for community-acquired pneumonia in
 * a penicillin-allergic adult are added and FLAGGED in the database
 * (`isAtlasVocabulary = false`) so they can be folded into §8.5 properly.
 */
const ATLAS_EXTENSIONS = new Set(['Azithromycin', 'Doxycycline', 'Levofloxacin']);

interface DrugSpec {
  genericName: string;
  form: string;
  strength: string;
  route: string;
  allergenClass: string | null;
  /** What the drug is FOR — drives which alternatives the hard stop offers. */
  therapeuticClass: string;
  isNlem: boolean;
  dose?: { min: number; max: number; unit: string; maxPerDay?: number };
}

/** §8.5's fixed drug vocabulary, plus the three flagged extensions. */
const DRUGS: DrugSpec[] = [
  { genericName: 'Tenecteplase', form: 'Injection', strength: '40mg', route: 'IV', allergenClass: null, therapeuticClass: 'Thrombolytic', isNlem: true,
    dose: { min: 15, max: 50, unit: 'mg' } },
  { genericName: 'Co-amoxiclav', form: 'Injection', strength: '1.2g', route: 'IV', allergenClass: 'Penicillin', therapeuticClass: 'Antibiotic', isNlem: true,
    dose: { min: 1.2, max: 1.2, unit: 'g', maxPerDay: 3.6 } },
  { genericName: 'Piperacillin-tazobactam', form: 'Injection', strength: '4.5g', route: 'IV', allergenClass: 'Penicillin', therapeuticClass: 'Antibiotic', isNlem: true,
    dose: { min: 4.5, max: 4.5, unit: 'g', maxPerDay: 18 } },
  { genericName: 'Enoxaparin', form: 'Injection', strength: '40mg', route: 'SC', allergenClass: null, therapeuticClass: 'Anticoagulant', isNlem: true,
    dose: { min: 20, max: 40, unit: 'mg', maxPerDay: 80 } },
  { genericName: 'Atorvastatin', form: 'Tablet', strength: '40mg', route: 'Oral', allergenClass: null, therapeuticClass: 'Statin', isNlem: true,
    dose: { min: 10, max: 80, unit: 'mg', maxPerDay: 80 } },
  { genericName: 'Clopidogrel', form: 'Tablet', strength: '75mg', route: 'Oral', allergenClass: null, therapeuticClass: 'Antiplatelet', isNlem: true,
    dose: { min: 75, max: 300, unit: 'mg', maxPerDay: 300 } },
  { genericName: 'Metformin', form: 'Tablet', strength: '500mg', route: 'Oral', allergenClass: null, therapeuticClass: 'Antidiabetic', isNlem: true,
    dose: { min: 500, max: 1000, unit: 'mg', maxPerDay: 2000 } },
  { genericName: 'Paracetamol', form: 'Injection', strength: '1g', route: 'IV', allergenClass: null, therapeuticClass: 'Analgesic', isNlem: true,
    dose: { min: 500, max: 1000, unit: 'mg', maxPerDay: 4000 } },

  // ── Flagged extensions — see ATLAS_EXTENSIONS above ──────────────────────
  { genericName: 'Azithromycin', form: 'Tablet', strength: '500mg', route: 'Oral', allergenClass: 'Macrolide', therapeuticClass: 'Antibiotic', isNlem: true,
    dose: { min: 250, max: 500, unit: 'mg', maxPerDay: 500 } },
  { genericName: 'Doxycycline', form: 'Capsule', strength: '100mg', route: 'Oral', allergenClass: 'Tetracycline', therapeuticClass: 'Antibiotic', isNlem: true,
    dose: { min: 100, max: 200, unit: 'mg', maxPerDay: 200 } },
  { genericName: 'Levofloxacin', form: 'Tablet', strength: '500mg', route: 'Oral', allergenClass: 'Fluoroquinolone', therapeuticClass: 'Antibiotic', isNlem: true,
    dose: { min: 250, max: 750, unit: 'mg', maxPerDay: 750 } },
];

/**
 * ⚠️ The hard stop, as data.
 *
 * Note that 'penicillin' blocks the class 'Penicillin', which BOTH
 * co-amoxiclav and piperacillin-tazobactam belong to. That is deliberate and
 * clinically correct — beta-lactam cross-reactivity — and it is why the demo
 * needs a non-beta-lactam alternative to offer.
 */
const ALLERGY_RULES = [
  {
    allergenKey: 'penicillin',
    blocksClass: 'Penicillin',
    rationale:
      'Documented penicillin allergy. Beta-lactam antibiotics share the core structure and carry a risk of cross-reactivity, including anaphylaxis.',
  },
  {
    allergenKey: 'sulfa',
    blocksClass: 'Sulfonamide',
    rationale: 'Documented sulfonamide allergy.',
  },
  {
    allergenKey: 'iodinated contrast',
    blocksClass: 'IodinatedContrast',
    rationale: 'Documented reaction to iodinated contrast media.',
  },
];

/**
 * §8.5's five fixed diagnoses, each with the PARENT category above it.
 *
 * ⚠️ The parents exist precisely so the leaf rule has something to refuse:
 * S-06-05 must block coding a problem to "J18" and accept only "J18.9".
 */
const DIAGNOSIS_CODES = [
  { code: 'J18', title: 'Pneumonia, organism unspecified', parentCode: null, isLeaf: false },
  { code: 'J18.9', title: 'Pneumonia, unspecified organism', parentCode: 'J18', isLeaf: true },
  { code: 'I63', title: 'Cerebral infarction', parentCode: null, isLeaf: false },
  { code: 'I63.9', title: 'Cerebral infarction, unspecified', parentCode: 'I63', isLeaf: true },
  { code: 'R65', title: 'Symptoms and signs specifically associated with systemic inflammation', parentCode: null, isLeaf: false },
  { code: 'R65.21', title: 'Severe sepsis with septic shock', parentCode: 'R65', isLeaf: true },
  { code: 'E11', title: 'Type 2 diabetes mellitus', parentCode: null, isLeaf: false },
  { code: 'E11.9', title: 'Type 2 diabetes mellitus without complications', parentCode: 'E11', isLeaf: true },
  { code: 'E03', title: 'Other hypothyroidism', parentCode: null, isLeaf: false },
  { code: 'E03.9', title: 'Hypothyroidism, unspecified', parentCode: 'E03', isLeaf: true },
];

/**
 * Create the Resident used by the co-sign demo.
 *
 * ⚠️ The `roles` row for Resident is created HERE rather than in the
 * migration. Postgres refuses to USE a value added by ALTER TYPE ... ADD
 * VALUE inside the same transaction that added it, so the migration can only
 * declare 'Resident' on the enum — something afterwards has to insert the row.
 *
 * A Resident has a full DoctorProfile: they are a clinician, they appear on
 * care teams, and the ONLY thing that differs is which capabilities their
 * role carries. Nothing about this user is special-cased anywhere.
 */
async function seedResident(
  prisma: PrismaClient,
  hospitalId: string,
  passwordHash: string,
  patientIdByRef: Map<string, string>,
  doctorUserIdByRef: Map<string, string>,
): Promise<void> {
  const role = await prisma.role.upsert({
    where: { name: RoleName.Resident },
    update: { isActive: true },
    create: {
      name: RoleName.Resident,
      description:
        'Authors clinical entries; entries require a consultant counter-signature (CMP-NABH-03).',
      isActive: true,
    },
  });

  const email = 'demo.resident.rao@stroke-ai.invalid';
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, isActive: true, isVerified: true, roleId: role.id },
    create: { email, passwordHash, roleId: role.id, isVerified: true, isActive: true },
  });

  const profileData = {
    firstName: 'Kavitha',
    lastName: 'Rao',
    gender: Gender.Female,
    specialty: 'General Medicine',
    qualifications: 'MBBS',
    yearsExperience: 2,
    registrationNumber: 'KA-MC-77310',
    hprId: 'IN-HPR-4410277',
    phoneNumber: '+91 9845077310',
    hospitalId,
    hospitalName: null,
    isVerified: true,
    verifiedAt: new Date(),
    onboardingCompletedAt: new Date(),
  };

  const profile = await prisma.doctorProfile.upsert({
    where: { userId: user.id },
    update: profileData,
    create: { userId: user.id, ...profileData },
  });

  doctorUserIdByRef.set('SD-RESIDENT', user.id);

  // On SD-P-03's care team, so they have a genuine relationship to author on
  // — a note from a clinician with no relationship would be blocked, and
  // rightly so.
  const p03 = patientIdByRef.get('SD-P-03');
  if (p03 !== undefined) {
    await prisma.careTeamMember.upsert({
      where: {
        patientId_doctorId_careRole: {
          patientId: p03,
          doctorId: profile.id,
          careRole: 'Resident',
        },
      },
      update: { isPrimary: false, activeTo: null },
      create: {
        patientId: p03,
        doctorId: profile.id,
        careRole: 'Resident',
        isPrimary: false,
        activeFrom: new Date(Date.now() - 10 * 86_400_000),
        activeTo: null,
      },
    });
  }

  console.log(`✓ resident: Dr Kavitha Rao (${email}) — holds note:write, NOT note:sign`);
}

export async function seedM06Clinical(
  prisma: PrismaClient,
  patientIdByRef: Map<string, string>,
  doctorUserIdByRef: Map<string, string>,
  hospitalId: string,
  passwordHash: string,
): Promise<void> {
  await seedResident(prisma, hospitalId, passwordHash, patientIdByRef, doctorUserIdByRef);

  // ── Diagnosis catalogue ───────────────────────────────────────────────────
  for (const code of DIAGNOSIS_CODES) {
    await prisma.diagnosisCode.upsert({
      where: { code: code.code },
      update: { title: code.title, parentCode: code.parentCode, isLeaf: code.isLeaf },
      create: code,
    });
  }
  console.log(`✓ diagnosis codes: ${DIAGNOSIS_CODES.length}`);

  // ── Formulary, dose ranges, allergy rules ────────────────────────────────
  const drugIdByName = new Map<string, string>();
  for (const spec of DRUGS) {
    const drug = await prisma.drug.upsert({
      where: {
        genericName_strength_form: {
          genericName: spec.genericName,
          strength: spec.strength,
          form: spec.form,
        },
      },
      update: {
        route: spec.route,
        allergenClass: spec.allergenClass,
        therapeuticClass: spec.therapeuticClass,
        isNlem: spec.isNlem,
        isAtlasVocabulary: !ATLAS_EXTENSIONS.has(spec.genericName),
      },
      create: {
        genericName: spec.genericName,
        form: spec.form,
        strength: spec.strength,
        route: spec.route,
        allergenClass: spec.allergenClass,
        therapeuticClass: spec.therapeuticClass,
        isNlem: spec.isNlem,
        isAtlasVocabulary: !ATLAS_EXTENSIONS.has(spec.genericName),
      },
    });
    drugIdByName.set(spec.genericName, drug.id);

    if (spec.dose !== undefined) {
      await prisma.doseRange.upsert({
        where: { drugId_cohort: { drugId: drug.id, cohort: 'Adult' } },
        update: {
          minDose: spec.dose.min,
          maxDose: spec.dose.max,
          unit: spec.dose.unit,
          maxPerDay: spec.dose.maxPerDay ?? null,
        },
        create: {
          drugId: drug.id,
          cohort: 'Adult',
          minDose: spec.dose.min,
          maxDose: spec.dose.max,
          unit: spec.dose.unit,
          perKg: false,
          maxPerDay: spec.dose.maxPerDay ?? null,
        },
      });
    }
  }
  console.log(`✓ formulary: ${DRUGS.length} drugs (${ATLAS_EXTENSIONS.size} flagged as §8 extensions)`);

  for (const rule of ALLERGY_RULES) {
    await prisma.allergyRule.upsert({
      where: {
        allergenKey_blocksClass: {
          allergenKey: rule.allergenKey,
          blocksClass: rule.blocksClass,
        },
      },
      update: { rationale: rule.rationale, isActive: true },
      create: rule,
    });
  }
  console.log(`✓ allergy rules: ${ALLERGY_RULES.length} (penicillin → Penicillin class is the hard-stop demo)`);

  // ── Templates ─────────────────────────────────────────────────────────────
  await seedTemplates(prisma, doctorUserIdByRef);

  // ── Reference data ────────────────────────────────────────────────────────
  await seedM06DemoDepth(prisma, doctorUserIdByRef);

  /**
   * ── Clinical content, seeded as VISITS ─────────────────────────────────
   *
   * Everything above is vocabulary: drugs, allergy rules, the diagnosis
   * catalogue, templates. None of it belongs to a patient.
   *
   * ⚠️ Everything that DOES belong to a patient is seeded below as a visit —
   * one encounter together with the note written at it, the problems coded
   * at it, what was prescribed and what the patient was given. An earlier
   * version seeded those four things as independent lists and produced a
   * database where nothing referenced an encounter; see m06Visits.ts.
   */
  await seedM06Visits(prisma, patientIdByRef, doctorUserIdByRef);
}

async function seedTemplates(
  prisma: PrismaClient,
  doctorUserIdByRef: Map<string, string>,
): Promise<void> {
  const iyer = doctorUserIdByRef.get('SD-S-01');
  if (iyer === undefined) return;

  const templates = [
    {
      key: 'OS.CAP-ADULT',
      name: 'Community-acquired pneumonia — adult',
      category: 'Plan',
      scope: TemplateScope.Facility,
      body:
        'Admit for intravenous antibiotics per local policy. Oxygen to maintain saturations above 94 percent. Blood cultures before the first dose. Repeat CRP and chest X-ray at 48 hours. Physiotherapy referral. Review antibiotic at 48 hours against culture results.',
      // §8's example: promoted facility-wide, review due in 12 months.
      reviewDueAt: new Date(Date.now() + 365 * 86_400_000),
      promoted: true,
    },
    {
      key: 'TPL.THYROID-REVIEW',
      name: 'Hypothyroidism six-month review',
      category: 'Plan',
      scope: TemplateScope.Personal,
      body:
        'Continue current replacement dose. Repeat thyroid function in six months. Reinforce timing — take on an empty stomach, 30 minutes before food. Advise to report palpitations, tremor or unexplained weight change.',
      reviewDueAt: null,
      promoted: false,
    },
    {
      key: 'TPL.NORMAL-EXAM',
      name: 'Normal cardiorespiratory examination',
      category: 'Objective',
      scope: TemplateScope.Personal,
      body:
        'Alert and oriented. Heart sounds one and two present, no murmur. Chest clear with equal air entry throughout. Abdomen soft and non-tender. No peripheral oedema.',
      reviewDueAt: null,
      promoted: false,
    },
    {
      key: 'TPL.DISCHARGE-ADVICE',
      name: 'General discharge advice',
      category: 'Instructions',
      scope: TemplateScope.Personal,
      body:
        'Finish the full course of your medicine even if you feel better. Drink plenty of fluids and rest. Come back straight away if your breathing gets worse, your fever returns, or you feel confused.',
      reviewDueAt: null,
      promoted: false,
    },
  ];

  for (const t of templates) {
    await prisma.clinicalTemplate.upsert({
      where: { key: t.key },
      update: { name: t.name, body: t.body, category: t.category },
      create: {
        key: t.key,
        name: t.name,
        category: t.category,
        scope: t.scope,
        body: t.body,
        ownerUserId: iyer,
        ownerName: 'Dr. Ananya Iyer',
        reviewDueAt: t.reviewDueAt,
        promotedAt: t.promoted ? new Date(Date.now() - 30 * 86_400_000) : null,
        promotedByUserId: t.promoted ? iyer : null,
      },
    });
  }
  console.log(`✓ templates: ${templates.length} (incl. OS.CAP-ADULT promoted facility-wide)`);
}
