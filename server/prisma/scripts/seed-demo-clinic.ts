/**
 * seed-demo-clinic.ts
 *
 * Builds the doctor-portal demonstration: one hospital, two consultants and
 * the patient panel, diary, availability, feedback and clinical history that
 * make every panel on /clinic show something real. A dashboard of empty
 * states demonstrates nothing.
 *
 * THE CAST IS NOT INVENTED. Every person, identifier and clinical scenario
 * below comes from UI_ATLAS.md §8 "Sample data kit", which is mandatory for
 * this programme: "Never invent data outside this kit. A new patient name
 * invented for one screen is a defect, not a detail." Doctors are §8.3
 * (SD-S-01, SD-S-02), patients are §8.2 (SD-P-01 … SD-P-10), and the
 * allergy/diagnosis vocabulary is §8.5.
 *
 * Idempotent. Every write is an upsert or guarded on "does this already
 * exist", so a second run changes nothing. It never deletes, and it never
 * touches the existing demo patient or the four original demo doctors.
 *
 * Operator-invoked only — not reachable over HTTP.
 *
 *   npm run db:demo:clinic
 */

import 'dotenv/config';
import {
  PrismaClient,
  RoleName,
  Gender,
  BloodGroup,
  MaritalStatus,
  AppointmentMode,
  AppointmentStatus,
  NotificationType,
  FeedbackCategory,
  EncounterType,
  EncounterStatus,
  LkwCertainty,
  LkwSource,
  RegistrationSource,
  IdentityStatus,
} from '@prisma/client';
import { hash, Algorithm } from '@node-rs/argon2';
import { encryptField, decryptFieldOptional } from '../../src/utils/encryption';
import {
  withGeneratedShriPatientId,
  withGeneratedVisitId,
  computePhoneNumberHash,
} from '../../src/services/patientIdentity.service';

const prisma = new PrismaClient();

const HOSPITAL_NAME = 'Indostates Whitefield, Bengaluru';

// ─────────────────────────────────────────────────────────────────────────────
// Credentials
//
// No hardcoded fallback. These accounts are meant to actually be signed into
// for demonstrations, so the credential comes from the operator's environment
// — the same rule DEMO_PATIENT_PASSWORD already follows in seed.ts. The older
// `DemoOnly!NotForProduction2026` literal in seed.ts was justified at the time
// by "no doctor portal exists to sign in to"; that justification expired the
// moment /clinic shipped, so it is not copied here.
// ─────────────────────────────────────────────────────────────────────────────
function requirePassword(): string {
  const value = process.env.DEMO_CLINIC_PASSWORD;
  if (!value) {
    throw new Error(
      'DEMO_CLINIC_PASSWORD is not set. Set it in your environment before ' +
        'running this script — see server/.env.example. Refusing to fall back ' +
        'to a hardcoded password for an account meant to be logged into.',
    );
  }
  return value;
}

function at(dayOffset: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** Now, rounded down to the half hour — so generated clinic times read as
 *  real appointment slots (14:30) rather than whatever minute the operator
 *  happened to run the script. */
function halfHourAnchor(): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() < 30 ? 0 : 30, 0, 0);
  return d;
}

function shiftMinutes(base: Date, minutes: number): Date {
  return new Date(base.getTime() + minutes * 60_000);
}

// ─────────────────────────────────────────────────────────────────────────────
// The cast — UI_ATLAS §8.3 staff, §8.2 patients
// ─────────────────────────────────────────────────────────────────────────────

const DOCTORS = [
  {
    ref: 'SD-S-01',
    email: 'demo.doctor.iyer@stroke-ai.invalid',
    firstName: 'Ananya',
    lastName: 'Iyer',
    gender: Gender.Female,
    specialty: 'General Medicine',
    qualifications: 'MBBS, MD (General Medicine)',
    yearsExperience: 14,
    registrationNumber: 'KA-MC-58211',
    hprId: 'IN-HPR-2291840',
    phoneNumber: '+91 9845012291',
  },
  {
    ref: 'SD-S-02',
    email: 'demo.doctor.desai@stroke-ai.invalid',
    firstName: 'Rohit',
    lastName: 'Desai',
    gender: Gender.Male,
    specialty: 'Neurology (Stroke)',
    qualifications: 'MBBS, MD (Medicine), DM (Neurology)',
    yearsExperience: 17,
    registrationNumber: 'KA-MC-41180',
    hprId: 'IN-HPR-1180422',
    phoneNumber: '+91 9845011804',
  },
] as const;

type PatientSpec = {
  ref: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  bloodGroup: BloodGroup;
  maritalStatus: MaritalStatus;
  phone: string;
  city: string;
  state: string;
  postalCode: string;
  occupation: string;
  knownAllergies: string;
  currentMedications: string;
  existingDiseases: string;
};

/** §8.2. Ages are as at the atlas's fixed reference moment, 21-Sep-2026.
 *  SD-P-08 (unidentified MLC male) is deliberately absent: an identity-pending
 *  record belongs to the registration flow, not to a consultant's care team. */
const PATIENTS: PatientSpec[] = [
  {
    ref: 'SD-P-01',
    firstName: 'Meera',
    lastName: 'Krishnan',
    dateOfBirth: '1992-04-18',
    gender: Gender.Female,
    bloodGroup: BloodGroup.O_Positive,
    maritalStatus: MaritalStatus.Married,
    phone: '+91 9845100101',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560066',
    occupation: 'Software engineer',
    knownAllergies: 'None known',
    currentMedications: 'Levothyroxine 50mcg once daily',
    existingDiseases: 'Hypothyroidism (E03.9), diagnosed 2021',
  },
  {
    ref: 'SD-P-02',
    firstName: 'Abdul Rahman',
    lastName: 'Sheikh',
    dateOfBirth: '1968-02-09',
    gender: Gender.Male,
    bloodGroup: BloodGroup.B_Positive,
    maritalStatus: MaritalStatus.Married,
    phone: '+91 9845100102',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560037',
    occupation: 'Retired bank manager',
    knownAllergies: 'None known',
    currentMedications: 'Aspirin 75mg once daily; Atorvastatin 40mg at night; Metoprolol 25mg twice daily',
    existingDiseases: 'Triple-vessel coronary artery disease, awaiting elective CABG; Type 2 diabetes (E11.9)',
  },
  {
    ref: 'SD-P-03',
    firstName: 'R.',
    lastName: 'Lakshmanan',
    dateOfBirth: '1964-07-22',
    gender: Gender.Male,
    bloodGroup: BloodGroup.A_Positive,
    maritalStatus: MaritalStatus.Married,
    phone: '+91 9845100103',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560048',
    occupation: 'Retired mill supervisor',
    // §8.5: penicillin on SD-P-03 is the atlas's designated hard-stop demo.
    knownAllergies: 'Penicillin (documented — anaphylaxis, 2019)',
    currentMedications: 'Piperacillin-tazobactam 4.5g IV; Paracetamol 1g IV as required',
    existingDiseases: 'Community-acquired pneumonia (J18.9); Type 2 diabetes (E11.9)',
  },
  {
    ref: 'SD-P-04',
    firstName: 'Sunita',
    lastName: 'Devi',
    dateOfBirth: '1997-01-30',
    gender: Gender.Female,
    bloodGroup: BloodGroup.AB_Positive,
    maritalStatus: MaritalStatus.Married,
    phone: '+91 9845100104',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560043',
    occupation: 'Tailor',
    knownAllergies: 'None known',
    currentMedications: 'Ferrous ascorbate 100mg once daily; Calcium with vitamin D once daily',
    existingDiseases: 'Pregnancy, 32 weeks gestation — routine antenatal care',
  },
  {
    ref: 'SD-P-05',
    firstName: 'Vikram',
    lastName: 'Malhotra',
    dateOfBirth: '1979-11-05',
    gender: Gender.Male,
    bloodGroup: BloodGroup.O_Negative,
    maritalStatus: MaritalStatus.Married,
    phone: '+91 9845100105',
    city: 'Nashik',
    state: 'Maharashtra',
    postalCode: '422011',
    occupation: 'Logistics manager',
    knownAllergies: 'Iodinated contrast (mild rash, 2022)',
    currentMedications: 'Atorvastatin 40mg at night; Clopidogrel 75mg once daily',
    existingDiseases: 'Acute ischaemic stroke (I63.9), large-vessel occlusion — transferred from Nashik spoke; Hypertension',
  },
  {
    ref: 'SD-P-06',
    firstName: 'Kavya',
    lastName: 'Reddy',
    dateOfBirth: '2020-06-14',
    gender: Gender.Female,
    bloodGroup: BloodGroup.A_Positive,
    maritalStatus: MaritalStatus.Single,
    phone: '+91 9845100106',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560066',
    occupation: 'Child — not applicable',
    knownAllergies: 'None known',
    currentMedications: 'Paracetamol syrup as required for fever',
    existingDiseases: 'Febrile illness under day-care observation',
  },
  {
    ref: 'SD-P-07',
    firstName: 'Joseph',
    lastName: 'Mathew',
    dateOfBirth: '1955-03-12',
    gender: Gender.Male,
    bloodGroup: BloodGroup.B_Negative,
    maritalStatus: MaritalStatus.Widowed,
    phone: '+91 9845100107',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560017',
    occupation: 'Retired civil servant',
    knownAllergies: 'Sulfa drugs',
    currentMedications: 'Piperacillin-tazobactam 4.5g IV; Noradrenaline infusion; Enoxaparin 40mg SC',
    existingDiseases: 'Septic shock (R65.21), ventilated in ICU; Chronic kidney disease stage 3',
  },
  {
    ref: 'SD-P-09',
    firstName: 'Fatima',
    lastName: 'Bi',
    dateOfBirth: '1960-09-27',
    gender: Gender.Female,
    bloodGroup: BloodGroup.O_Positive,
    maritalStatus: MaritalStatus.Widowed,
    phone: '+91 9845100109',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560045',
    occupation: 'Homemaker',
    knownAllergies: 'None known',
    currentMedications: 'Erythropoietin weekly; Calcium acetate with meals; Amlodipine 5mg once daily',
    existingDiseases: 'End-stage renal disease — haemodialysis three times weekly; Hypertension',
  },
  {
    ref: 'SD-P-10',
    firstName: 'Arjun',
    lastName: 'Nair',
    dateOfBirth: '2002-08-03',
    gender: Gender.Male,
    bloodGroup: BloodGroup.A_Negative,
    maritalStatus: MaritalStatus.Single,
    phone: '+91 9845100110',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560095',
    occupation: 'Student',
    knownAllergies: 'None known',
    currentMedications: 'Topical adapalene 0.1% at night',
    existingDiseases: 'Acne vulgaris — dermatology follow-up by teleconsult',
  },
];

/** Who looks after whom. Both consultants need a full panel, or one of the two
 *  demo dashboards renders empty. */
// `sinceDays` varies per row on purpose. Seeding one constant made every
// patient read "since 24-May-2026" down the whole list, which is the exact
// tell §8.6 warns about — a client notices it and cannot un-notice it.
const CARE_TEAM: Array<{
  patient: string
  doctor: string
  role: string
  primary: boolean
  sinceDays: number
}> = [
  { patient: 'SD-P-05', doctor: 'SD-S-02', role: 'Consultant Neurologist', primary: true, sinceDays: 1 },
  { patient: 'SD-P-03', doctor: 'SD-S-02', role: 'Consultant Neurologist', primary: false, sinceDays: 12 },
  { patient: 'SD-P-07', doctor: 'SD-S-02', role: 'Consultant Neurologist', primary: false, sinceDays: 38 },
  { patient: 'SD-P-01', doctor: 'SD-S-02', role: 'Consultant Neurologist', primary: false, sinceDays: 96 },

  { patient: 'SD-P-01', doctor: 'SD-S-01', role: 'Consultant Physician', primary: true, sinceDays: 214 },
  { patient: 'SD-P-02', doctor: 'SD-S-01', role: 'Consultant Physician', primary: true, sinceDays: 143 },
  { patient: 'SD-P-03', doctor: 'SD-S-01', role: 'Consultant Physician', primary: true, sinceDays: 27 },
  { patient: 'SD-P-04', doctor: 'SD-S-01', role: 'Consultant Physician', primary: true, sinceDays: 61 },
  { patient: 'SD-P-06', doctor: 'SD-S-01', role: 'Consultant Physician', primary: true, sinceDays: 9 },
  { patient: 'SD-P-09', doctor: 'SD-S-01', role: 'Consultant Physician', primary: true, sinceDays: 305 },
  { patient: 'SD-P-10', doctor: 'SD-S-01', role: 'Consultant Physician', primary: true, sinceDays: 48 },
];

async function main(): Promise<void> {
  const password = requirePassword();

  const passwordHash = await hash(password, {
    algorithm: Algorithm.Argon2id,
    memoryCost: Number(process.env.ARGON2_MEMORY_COST ?? 65536),
    timeCost: Number(process.env.ARGON2_TIME_COST ?? 3),
    parallelism: Number(process.env.ARGON2_PARALLELISM ?? 4),
  });

  const doctorRole = await prisma.role.findUnique({ where: { name: RoleName.Doctor } });
  if (doctorRole === null) {
    throw new Error('Doctor role missing. Run `npm run db:seed` first.');
  }

  // ── 1. Hospital ───────────────────────────────────────────────────────────
  // Hospital.name is not unique, so find-then-create rather than upsert — an
  // upsert would need a unique key this table does not have.
  let hospital = await prisma.hospital.findFirst({ where: { name: HOSPITAL_NAME } });
  if (hospital === null) {
    hospital = await prisma.hospital.create({
      data: { name: HOSPITAL_NAME, city: 'Bengaluru', state: 'Karnataka', isActive: true },
    });
  }
  console.log(`✓ hospital: ${hospital.name}`);

  // ── 2. Doctors ────────────────────────────────────────────────────────────
  const doctorIdByRef = new Map<string, string>();
  const doctorUserIdByRef = new Map<string, string>();

  for (const spec of DOCTORS) {
    // update: { passwordHash } — NOT `update: {}`. seed.ts uses the latter,
    // which means rotating the env var and re-running silently does nothing.
    // These are accounts people actually sign into, so a re-run must make the
    // configured password true.
    const user = await prisma.user.upsert({
      where: { email: spec.email },
      update: { passwordHash, isActive: true, isVerified: true },
      create: {
        email: spec.email,
        passwordHash,
        roleId: doctorRole.id,
        isVerified: true,
        isActive: true,
      },
    });

    const profileData = {
      firstName: spec.firstName,
      lastName: spec.lastName,
      gender: spec.gender,
      specialty: spec.specialty,
      qualifications: spec.qualifications,
      yearsExperience: spec.yearsExperience,
      registrationNumber: spec.registrationNumber,
      hprId: spec.hprId,
      phoneNumber: spec.phoneNumber,
      hospitalId: hospital.id,
      // hospitalName is the free-text fallback for doctors with no Hospital
      // row. This one has a real row, so leave it null — the response shaper
      // prefers the relation and a stale string here would only ever disagree.
      hospitalName: null,
      isVerified: true,
      verifiedAt: new Date(),
      // Without this the portal is unreachable: RequireAuth sends any doctor
      // with a null onboardingCompletedAt to /onboarding, forever.
      onboardingCompletedAt: new Date(),
    };

    const profile = await prisma.doctorProfile.upsert({
      where: { userId: user.id },
      update: profileData,
      create: { userId: user.id, ...profileData },
    });

    doctorIdByRef.set(spec.ref, profile.id);
    doctorUserIdByRef.set(spec.ref, user.id);
    console.log(`✓ doctor ${spec.ref}: Dr ${spec.firstName} ${spec.lastName} (${spec.email})`);
  }

  // ── 3. Patients ───────────────────────────────────────────────────────────
  const patientIdByRef = new Map<string, string>();

  for (const spec of PATIENTS) {
    const existing = await prisma.patientProfile.findFirst({
      where: { firstName: spec.firstName, lastName: spec.lastName, userId: null },
      select: { id: true },
    });

    if (existing !== null) {
      patientIdByRef.set(spec.ref, existing.id);
      continue;
    }

    const created = await withGeneratedShriPatientId((shriPatientId) =>
      prisma.patientProfile.create({
        data: {
          shriPatientId,
          // No login account: these are clinician-registered records, which is
          // why userId stays null (it is nullable and uniquely indexed, and
          // Postgres permits many NULLs in a unique index).
          userId: null,
          firstName: spec.firstName,
          lastName: spec.lastName,
          dateOfBirth: new Date(spec.dateOfBirth),
          gender: spec.gender,
          bloodGroup: spec.bloodGroup,
          maritalStatus: spec.maritalStatus,
          registrationSource: RegistrationSource.StaffRegistered,
          identityStatus: IdentityStatus.Verified,
          // Flags the record as fabricated. The AI assistant refuses to send
          // anything not flagged here to an external provider while
          // AI_DATA_POLICY=synthetic-only.
          isSyntheticData: true,

          phoneNumber: encryptField(spec.phone),
          phoneNumberHash: computePhoneNumberHash(spec.phone),
          city: encryptField(spec.city),
          state: encryptField(spec.state),
          country: 'India',
          postalCode: encryptField(spec.postalCode),
          occupation: spec.occupation,

          knownAllergies: encryptField(spec.knownAllergies),
          currentMedications: encryptField(spec.currentMedications),
          existingDiseases: encryptField(spec.existingDiseases),

          onboardingCompletedAt: new Date(),
        },
        select: { id: true },
      }),
    );

    patientIdByRef.set(spec.ref, created.id);
  }
  console.log(`✓ patients: ${patientIdByRef.size} on record`);

  // ── 4. Care team ──────────────────────────────────────────────────────────
  for (const link of CARE_TEAM) {
    const patientId = patientIdByRef.get(link.patient);
    const doctorId = doctorIdByRef.get(link.doctor);
    if (patientId === undefined || doctorId === undefined) continue;

    // The composite unique is (patientId, doctorId, careRole), so upsert is
    // safe and re-running cannot duplicate.
    await prisma.careTeamMember.upsert({
      where: {
        patientId_doctorId_careRole: { patientId, doctorId, careRole: link.role },
      },
      // Not `update: {}` — the script's job is to make the configured demo
      // state true, so a changed sinceDays must actually land on a re-run.
      update: { isPrimary: link.primary, activeFrom: at(-link.sinceDays, 9), activeTo: null },
      create: {
        patientId,
        doctorId,
        careRole: link.role,
        isPrimary: link.primary,
        activeFrom: at(-link.sinceDays, 9),
        activeTo: null,
      },
    });
  }
  console.log(`✓ care team: ${CARE_TEAM.length} assignments`);

  await seedTodaysClinic(patientIdByRef, doctorIdByRef);
  await seedHistory(patientIdByRef, doctorIdByRef);
  await seedAvailability(doctorIdByRef);
  await seedClinicalRecords(patientIdByRef, doctorUserIdByRef);
  await seedFeedback(patientIdByRef, doctorIdByRef);
  await seedNotifications(doctorUserIdByRef);
}

// ─────────────────────────────────────────────────────────────────────────────
// Today's clinic
//
// Slots are placed RELATIVE TO NOW, rounded to the half hour, so the dashboard
// always shows a mix of "seen" and "still to come" no matter what time of day
// the demo runs. Fixed clock times would leave the whole list in the past for
// an evening demo, and "8 of 8 seen, nothing remaining" is a much weaker
// screen than "4 seen, 4 to come".
// ─────────────────────────────────────────────────────────────────────────────
async function seedTodaysClinic(
  patientIdByRef: Map<string, string>,
  doctorIdByRef: Map<string, string>,
): Promise<void> {
  const anchor = halfHourAnchor();

  const plan = [
    { doctor: 'SD-S-01', patient: 'SD-P-01', mins: -180, mode: AppointmentMode.InPerson, status: AppointmentStatus.Completed, reason: 'Thyroid function review and dose adjustment' },
    { doctor: 'SD-S-01', patient: 'SD-P-04', mins: -150, mode: AppointmentMode.InPerson, status: AppointmentStatus.Completed, reason: 'Antenatal review at 32 weeks' },
    { doctor: 'SD-S-01', patient: 'SD-P-06', mins: -120, mode: AppointmentMode.InPerson, status: AppointmentStatus.Completed, reason: 'Paediatric febrile illness — day-care review' },
    { doctor: 'SD-S-01', patient: 'SD-P-09', mins: -90, mode: AppointmentMode.InPerson, status: AppointmentStatus.NoShow, reason: 'Pre-dialysis assessment' },
    { doctor: 'SD-S-01', patient: 'SD-P-02', mins: 30, mode: AppointmentMode.InPerson, status: AppointmentStatus.Confirmed, reason: 'Pre-operative review before elective CABG' },
    { doctor: 'SD-S-01', patient: 'SD-P-10', mins: 90, mode: AppointmentMode.Video, status: AppointmentStatus.Confirmed, reason: 'Dermatology teleconsult follow-up' },
    { doctor: 'SD-S-01', patient: 'SD-P-03', mins: 150, mode: AppointmentMode.InPerson, status: AppointmentStatus.Requested, reason: 'Review of antibiotic response and oxygen requirement' },

    { doctor: 'SD-S-02', patient: 'SD-P-05', mins: -210, mode: AppointmentMode.InPerson, status: AppointmentStatus.Completed, reason: 'Post-thrombectomy neurological review' },
    { doctor: 'SD-S-02', patient: 'SD-P-03', mins: -60, mode: AppointmentMode.InPerson, status: AppointmentStatus.Completed, reason: 'Neurology opinion — confusion on background of sepsis' },
    { doctor: 'SD-S-02', patient: 'SD-P-07', mins: 60, mode: AppointmentMode.InPerson, status: AppointmentStatus.Confirmed, reason: 'ICU neurological assessment — sedation hold' },
    { doctor: 'SD-S-02', patient: 'SD-P-01', mins: 120, mode: AppointmentMode.Phone, status: AppointmentStatus.Confirmed, reason: 'Telephone review of headache history' },
  ];

  let created = 0;
  for (const row of plan) {
    const patientId = patientIdByRef.get(row.patient);
    const doctorId = doctorIdByRef.get(row.doctor);
    if (patientId === undefined || doctorId === undefined) continue;

    // Existence is checked on the DECRYPTED reason, never on scheduledAt and
    // never on the ciphertext. AES-GCM uses a random IV per value, so the same
    // plaintext never matches by ciphertext; and these timestamps move every
    // run, so a time-based guard would duplicate the whole clinic daily.
    if (await appointmentExists(doctorId, row.reason)) continue;

    await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        scheduledAt: shiftMinutes(anchor, row.mins),
        durationMins: 30,
        mode: row.mode,
        status: row.status,
        reason: encryptField(row.reason),
        notes:
          row.status === AppointmentStatus.Completed
            ? encryptField('Reviewed in clinic. Plan discussed with the patient and documented.')
            : null,
        locationName: 'Indostates Whitefield — OPD Block C',
      },
    });
    created++;
  }
  console.log(`✓ today's clinic: ${created} new appointment(s)`);
}

async function appointmentExists(doctorId: string, reason: string): Promise<boolean> {
  const rows = await prisma.appointment.findMany({
    where: { doctorId },
    select: { reason: true },
  });
  return rows.some((r) => decryptFieldOptional(r.reason) === reason);
}

// ─────────────────────────────────────────────────────────────────────────────
// Eight months of completed history — this is what puts real bars on the
// consultations trend chart. Volumes vary per month because a flat line across
// nine identical months looks generated, which it would be.
// ─────────────────────────────────────────────────────────────────────────────
async function seedHistory(
  patientIdByRef: Map<string, string>,
  doctorIdByRef: Map<string, string>,
): Promise<void> {
  const VOLUMES: Record<string, number[]> = {
    // index 0 = eight months ago … index 7 = last month
    'SD-S-01': [9, 12, 8, 14, 11, 16, 13, 17],
    'SD-S-02': [6, 8, 5, 9, 7, 11, 9, 12],
  };
  const PANEL: Record<string, string[]> = {
    'SD-S-01': ['SD-P-01', 'SD-P-02', 'SD-P-03', 'SD-P-04', 'SD-P-06', 'SD-P-09', 'SD-P-10'],
    'SD-S-02': ['SD-P-05', 'SD-P-03', 'SD-P-07', 'SD-P-01'],
  };

  let created = 0;
  for (const [doctorRef, volumes] of Object.entries(VOLUMES)) {
    const doctorId = doctorIdByRef.get(doctorRef);
    if (doctorId === undefined) continue;
    const panel = PANEL[doctorRef] ?? [];

    for (let i = 0; i < volumes.length; i++) {
      const monthsAgo = volumes.length - i; // 8 … 1
      const target = volumes[i] ?? 0;

      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - monthsAgo, 1);
      monthStart.setHours(0, 0, 0, 0);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      // Guard per doctor-month: if this month already has rows, it was seeded.
      const existing = await prisma.appointment.count({
        where: { doctorId, scheduledAt: { gte: monthStart, lt: monthEnd } },
      });
      if (existing >= target) continue;

      for (let n = existing; n < target; n++) {
        const patientRef = panel[n % panel.length];
        const patientId = patientRef ? patientIdByRef.get(patientRef) : undefined;
        if (patientId === undefined) continue;

        const day = 2 + ((n * 3) % 25);
        const hour = 9 + (n % 8);
        const when = new Date(monthStart);
        when.setDate(day);
        when.setHours(hour, n % 2 === 0 ? 0 : 30, 0, 0);

        await prisma.appointment.create({
          data: {
            patientId,
            doctorId,
            scheduledAt: when,
            durationMins: 30,
            mode: n % 4 === 0 ? AppointmentMode.Video : AppointmentMode.InPerson,
            status: n % 9 === 0 ? AppointmentStatus.Cancelled : AppointmentStatus.Completed,
            reason: encryptField('Outpatient review'),
            notes: encryptField('Routine review. No change to management.'),
            locationName: 'Indostates Whitefield — OPD Block C',
          },
        });
        created++;
      }
    }
  }
  console.log(`✓ history: ${created} past appointment(s) for the trend chart`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Availability. Neither doctor_availability nor doctor_leaves has a unique
// constraint, so a naive re-run duplicates every row — hence the explicit
// guards below rather than an upsert.
// ─────────────────────────────────────────────────────────────────────────────
async function seedAvailability(doctorIdByRef: Map<string, string>): Promise<void> {
  const SLOTS: Record<string, Array<{ day: number; start: string; end: string; active: boolean }>> =
    {
      'SD-S-01': [
        { day: 1, start: '09:00', end: '13:00', active: true },
        { day: 1, start: '14:00', end: '17:00', active: true },
        { day: 2, start: '09:00', end: '13:00', active: true },
        { day: 3, start: '09:00', end: '13:00', active: true },
        { day: 3, start: '14:00', end: '17:00', active: true },
        { day: 4, start: '09:00', end: '13:00', active: true },
        { day: 5, start: '09:00', end: '13:00', active: true },
        // Left inactive on purpose: the weekly toggles need both states on
        // screen, or the control reads as decorative.
        { day: 6, start: '09:00', end: '12:00', active: false },
      ],
      'SD-S-02': [
        { day: 1, start: '10:00', end: '13:00', active: true },
        { day: 2, start: '15:00', end: '18:00', active: true },
        { day: 3, start: '10:00', end: '13:00', active: true },
        { day: 4, start: '15:00', end: '18:00', active: true },
        { day: 5, start: '10:00', end: '13:00', active: true },
        { day: 6, start: '10:00', end: '12:00', active: false },
      ],
    };

  for (const [ref, slots] of Object.entries(SLOTS)) {
    const doctorId = doctorIdByRef.get(ref);
    if (doctorId === undefined) continue;

    for (const slot of slots) {
      const exists = await prisma.doctorAvailability.findFirst({
        where: { doctorId, dayOfWeek: slot.day, startTime: slot.start },
        select: { id: true },
      });
      if (exists !== null) continue;

      await prisma.doctorAvailability.create({
        data: {
          doctorId,
          dayOfWeek: slot.day,
          startTime: slot.start,
          endTime: slot.end,
          slotDurationMins: 30,
          isActive: slot.active,
        },
      });
    }

    const leaveReason = ref === 'SD-S-01' ? 'Annual leave' : 'Stroke conference, Hyderabad';
    const leaveExists = await prisma.doctorLeave.findFirst({
      where: { doctorId, reason: leaveReason },
      select: { id: true },
    });
    if (leaveExists === null) {
      await prisma.doctorLeave.create({
        data: {
          doctorId,
          startDate: at(ref === 'SD-S-01' ? 34 : 20, 0),
          endDate: at(ref === 'SD-S-01' ? 41 : 22, 0),
          reason: leaveReason,
        },
      });
    }
  }
  console.log('✓ availability and leave');
}

// ─────────────────────────────────────────────────────────────────────────────
// Clinical records. These are what legitimately drive the "needs attention"
// panel — the ranking reads urgentFlag, the symptom booleans and open
// encounters, so without real rows here that panel would have nothing honest
// to show and the alternative would be inventing a risk score.
// ─────────────────────────────────────────────────────────────────────────────
async function seedClinicalRecords(
  patientIdByRef: Map<string, string>,
  doctorUserIdByRef: Map<string, string>,
): Promise<void> {
  const strokeDoctorUserId = doctorUserIdByRef.get('SD-S-02') ?? null;

  const plan = [
    {
      patient: 'SD-P-05', // the atlas's stroke protagonist
      type: EncounterType.Emergency,
      status: EncounterStatus.InProgress,
      chiefComplaint: 'Sudden right-sided weakness and slurred speech, witnessed onset',
      startedAt: at(0, 6, 40),
      assessment: {
        urgentFlag: true,
        lkwAt: at(0, 5, 55),
        lkwCertainty: LkwCertainty.Exact,
        lkwSource: LkwSource.Family,
        facialWeakness: true,
        armWeakness: true,
        legWeakness: true,
        speechDifficulty: true,
        suddenConfusion: false,
        visionProblem: true,
        severeHeadache: false,
        balanceProblem: true,
        lossOfConsciousness: false,
        onAnticoagulants: false,
        note: 'Transferred from Nashik spoke as drip-and-ship. Large-vessel occlusion confirmed on CT angiogram.',
      },
    },
    {
      patient: 'SD-P-03',
      type: EncounterType.ClinicVisit,
      status: EncounterStatus.InProgress,
      chiefComplaint: 'Increasing breathlessness and new confusion on background of pneumonia',
      startedAt: at(-1, 11, 15),
      assessment: {
        urgentFlag: false,
        lkwAt: null,
        lkwCertainty: LkwCertainty.Unknown,
        lkwSource: null,
        facialWeakness: false,
        armWeakness: false,
        legWeakness: false,
        speechDifficulty: false,
        suddenConfusion: true,
        visionProblem: false,
        severeHeadache: false,
        balanceProblem: true,
        lossOfConsciousness: false,
        onAnticoagulants: false,
        note: 'Confusion more likely septic than vascular. Stroke ruled out clinically; imaging not indicated at present.',
      },
    },
    {
      patient: 'SD-P-07',
      type: EncounterType.ClinicVisit,
      status: EncounterStatus.Completed,
      chiefComplaint: 'ICU review — sedation hold and neurological assessment',
      startedAt: at(-3, 8, 30),
      assessment: null,
    },
  ] as const;

  for (const item of plan) {
    const patientId = patientIdByRef.get(item.patient);
    if (patientId === undefined) continue;

    const existing = await prisma.encounter.findFirst({
      where: { patientId, type: item.type },
      select: { id: true },
    });
    if (existing !== null) continue;

    const encounter = await withGeneratedVisitId((visitId) =>
      prisma.encounter.create({
        data: {
          visitId,
          patientId,
          type: item.type,
          status: item.status,
          startedAt: item.startedAt,
          endedAt: item.status === EncounterStatus.Completed ? at(-3, 9, 15) : null,
          locationName: encryptField('Indostates Whitefield — Emergency Department'),
          chiefComplaint: encryptField(item.chiefComplaint),
          createdByUserId: strokeDoctorUserId,
        },
        select: { id: true },
      }),
    );

    if (item.assessment !== null) {
      const a = item.assessment;
      await prisma.strokeAssessment.create({
        data: {
          encounterId: encounter.id,
          urgentFlag: a.urgentFlag,
          lkwAt: a.lkwAt,
          lkwCertainty: a.lkwCertainty,
          lkwSource: a.lkwSource,
          lkwNote: encryptField(a.note),
          facialWeakness: a.facialWeakness,
          armWeakness: a.armWeakness,
          legWeakness: a.legWeakness,
          speechDifficulty: a.speechDifficulty,
          suddenConfusion: a.suddenConfusion,
          visionProblem: a.visionProblem,
          severeHeadache: a.severeHeadache,
          balanceProblem: a.balanceProblem,
          lossOfConsciousness: a.lossOfConsciousness,
          onAnticoagulants: a.onAnticoagulants,
          createdByUserId: strokeDoctorUserId,
        },
      });
    }
  }
  console.log('✓ encounters and stroke assessments');
}

// ─────────────────────────────────────────────────────────────────────────────
// Feedback is patient-authored, so every row needs a real patient behind it.
// ─────────────────────────────────────────────────────────────────────────────
async function seedFeedback(
  patientIdByRef: Map<string, string>,
  doctorIdByRef: Map<string, string>,
): Promise<void> {
  const plan = [
    { patient: 'SD-P-01', doctor: 'SD-S-01', rating: 5, category: FeedbackCategory.DoctorExperience, comment: 'Dr Iyer explained my thyroid results in plain language and did not rush me.' },
    { patient: 'SD-P-02', doctor: 'SD-S-01', rating: 5, category: FeedbackCategory.DoctorExperience, comment: 'Very thorough before my surgery. All my questions were answered.' },
    { patient: 'SD-P-04', doctor: 'SD-S-01', rating: 4, category: FeedbackCategory.HospitalService, comment: 'Good care overall. The wait at the OPD counter was longer than I expected.' },
    { patient: 'SD-P-10', doctor: 'SD-S-01', rating: 5, category: FeedbackCategory.AppUsability, comment: 'The video consultation worked well on my phone and saved me a trip.' },
    { patient: 'SD-P-05', doctor: 'SD-S-02', rating: 5, category: FeedbackCategory.DoctorExperience, comment: 'Dr Desai was there when I arrived from Nashik. My family were kept informed throughout.' },
    { patient: 'SD-P-03', doctor: 'SD-S-02', rating: 4, category: FeedbackCategory.DoctorExperience, comment: 'Careful and patient. Took time to check my allergy history before prescribing.' },
  ];

  let created = 0;
  for (const row of plan) {
    const patientId = patientIdByRef.get(row.patient);
    const doctorId = doctorIdByRef.get(row.doctor);
    if (patientId === undefined || doctorId === undefined) continue;

    // Same decrypt-to-compare rule as appointments — comment is encrypted.
    const rows = await prisma.feedback.findMany({
      where: { patientId, doctorId },
      select: { comment: true },
    });
    if (rows.some((r) => decryptFieldOptional(r.comment) === row.comment)) continue;

    await prisma.feedback.create({
      data: {
        patientId,
        doctorId,
        category: row.category,
        rating: row.rating,
        comment: encryptField(row.comment),
      },
    });
    created++;
  }
  console.log(`✓ feedback: ${created} new review(s)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Notifications hang off User, not off a profile, so a doctor's feed works
// through the existing GET /api/v1/notifications with no new endpoint.
// ─────────────────────────────────────────────────────────────────────────────
async function seedNotifications(doctorUserIdByRef: Map<string, string>): Promise<void> {
  const plan: Record<
    string,
    Array<{ type: NotificationType; title: string; body: string; url: string; readDaysAgo: number | null; agoHours: number }>
  > = {
    'SD-S-01': [
      { type: NotificationType.Appointment, title: 'Clinic list published for today', body: '7 patients booked into OPD Block C.', url: '/clinic', readDaysAgo: null, agoHours: 3 },
      { type: NotificationType.CareTeam, title: 'You were added to a care team', body: 'Arjun Nair — Consultant Physician.', url: '/clinic/patients', readDaysAgo: 1, agoHours: 26 },
      { type: NotificationType.Appointment, title: 'Appointment marked as did-not-attend', body: 'Fatima Bi did not attend the pre-dialysis assessment.', url: '/clinic', readDaysAgo: null, agoHours: 1 },
      { type: NotificationType.General, title: 'Credentials verified', body: 'Your registration details were verified by the hospital administrator.', url: '/clinic/profile', readDaysAgo: 4, agoHours: 96 },
      { type: NotificationType.Report, title: 'Patient feedback received', body: 'Two new reviews this week, both 5 stars.', url: '/clinic', readDaysAgo: 2, agoHours: 50 },
    ],
    'SD-S-02': [
      { type: NotificationType.CareTeam, title: 'Incoming transfer from Nashik spoke', body: 'Vikram Malhotra — suspected large-vessel occlusion, drip-and-ship.', url: '/clinic/patients', readDaysAgo: null, agoHours: 2 },
      { type: NotificationType.Appointment, title: 'ICU review requested', body: 'Joseph Mathew — neurological assessment at sedation hold.', url: '/clinic', readDaysAgo: null, agoHours: 4 },
      { type: NotificationType.General, title: 'Leave approved', body: 'Stroke conference, Hyderabad — three days.', url: '/clinic/availability', readDaysAgo: 3, agoHours: 72 },
      { type: NotificationType.Report, title: 'Assessment recorded', body: 'Stroke assessment saved for Vikram Malhotra and flagged urgent.', url: '/clinic/patients', readDaysAgo: null, agoHours: 2 },
    ],
  };

  let created = 0;
  for (const [ref, items] of Object.entries(plan)) {
    const userId = doctorUserIdByRef.get(ref);
    if (userId === undefined) continue;

    for (const item of items) {
      // title is plaintext on this table, so it is a usable existence key.
      const exists = await prisma.notification.findFirst({
        where: { userId, title: item.title },
        select: { id: true },
      });
      if (exists !== null) continue;

      const createdAt = new Date(Date.now() - item.agoHours * 3_600_000);
      await prisma.notification.create({
        data: {
          userId,
          type: item.type,
          title: item.title,
          body: item.body,
          actionUrl: item.url,
          createdAt,
          readAt: item.readDaysAgo === null ? null : at(-item.readDaysAgo, 12),
        },
      });
      created++;
    }
  }
  console.log(`✓ notifications: ${created} new`);
}

main()
  .then(async () => {
    console.log('\n✅ Demo clinic ready.');
    for (const d of DOCTORS) {
      console.log(`   ${d.email}  ·  Dr ${d.firstName} ${d.lastName}  ·  ${d.specialty}`);
    }
    console.log('   Password: the value of DEMO_CLINIC_PASSWORD in your environment.\n');
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error('\n❌ seed-demo-clinic failed:', err);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
