import {
  PrismaClient,
  RoleName,
  Gender,
  BloodGroup,
  MaritalStatus,
  SmokingStatus,
  AlcoholStatus,
  TobaccoStatus,
  PhysicalActivity,
  AppointmentMode,
  AppointmentStatus,
  NotificationType,
} from '@prisma/client';
import { hash, Algorithm } from '@node-rs/argon2';
import { encryptField, hmacBlindIndex } from '../src/utils/encryption';
import { normalizeMobile } from '../src/utils/phone';
import {
  withGeneratedShriPatientId,
  computePhoneNumberHash,
} from '../src/services/patientIdentity.service';

// ─────────────────────────────────────────────────────────────────────────────
// Seed — roles, and optionally a small demo clinician directory.
//
// Run: npm run db:seed        (roles + demo doctors)
//      SEED_DEMO=false npm run db:seed   (roles only)
//
// Idempotent throughout — every write is an upsert, so re-running is safe
// against a database that already has data.
//
// WHAT THIS DELIBERATELY DOES NOT DO
// ----------------------------------
// It does not create appointments, notifications, care-team links, or any
// clinical history for existing patient accounts. A real patient signing in
// must see a genuine empty state, not fabricated visits they never had. The
// Phase 1 audit found exactly that pattern — invented NIHSS scores and
// medication instructions rendered as the patient's own record — and it is
// the thing this project is most careful not to repeat.
//
// The doctors below are FICTIONAL. The names are common South Indian names and
// the hospital is the project's own stated partner context (Coimbatore). They
// exist so that "request an appointment" has someone to request from. They are
// not real clinicians and carry no real registration numbers.
// ─────────────────────────────────────────────────────────────────────────────

const prisma = new PrismaClient();

const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  Admin: 'Platform administrator with full system access.',
  Patient: 'Patient with access to personal health records and appointments.',
  Doctor: 'Licensed physician with access to assigned patient records.',
  HealthcareWorker: 'Clinical support staff assisting with patient care.',
  LabTechnician: 'Laboratory staff managing lab reports and imaging data.',
  HospitalAdmin: "Manages a single hospital's doctors, patients-in-context and operations.",
};

/**
 * Fictional stroke-care team. Specialties mirror a real stroke pathway:
 * acute neurology, rehabilitation, physiotherapy, speech therapy, and
 * coordination — which is what a recovering patient actually deals with.
 */
// ⚠️ Each carries a distinct mobile. OTP login resolves an account by a blind
// index over the mobile, so a demo doctor without one simply cannot sign in —
// the backfill reports them, but reporting a lockout is not the same as not
// causing one. Numbers are from the Atlas §8 Bengaluru range and are unique
// per account, because `User.mobileHash` is UNIQUE and a shared demo number
// would make the seed itself fail.
const DEMO_DOCTORS = [
  {
    email: 'demo.doctor.nair@stroke-ai.invalid',
    phoneNumber: '+91 9845020401',
    firstName: 'Priya',
    lastName: 'Nair',
    gender: Gender.Female,
    specialty: 'Neurology (Stroke)',
    qualifications: 'MBBS, MD (General Medicine), DM (Neurology)',
    yearsExperience: 14,
  },
  {
    email: 'demo.doctor.raja@stroke-ai.invalid',
    phoneNumber: '+91 9845020402',
    firstName: 'Karthik',
    lastName: 'Raja',
    gender: Gender.Male,
    specialty: 'Rehabilitation Medicine',
    qualifications: 'MBBS, MD (Physical Medicine & Rehabilitation)',
    yearsExperience: 11,
  },
  {
    email: 'demo.doctor.selvam@stroke-ai.invalid',
    phoneNumber: '+91 9845020403',
    firstName: 'Anitha',
    lastName: 'Selvam',
    gender: Gender.Female,
    specialty: 'Physiotherapy',
    qualifications: 'BPT, MPT (Neurological Physiotherapy)',
    yearsExperience: 9,
  },
  {
    email: 'demo.doctor.kumar@stroke-ai.invalid',
    phoneNumber: '+91 9845020404',
    firstName: 'Senthil',
    lastName: 'Kumar',
    gender: Gender.Male,
    specialty: 'Speech & Language Therapy',
    qualifications: 'BASLP, MASLP',
    yearsExperience: 7,
  },
];

const DEMO_HOSPITAL = 'IndoStates Health Hospital, Coimbatore';

async function seedRoles(): Promise<Map<RoleName, string>> {
  console.log('🌱 Seeding roles...');
  const ids = new Map<RoleName, string>();

  for (const name of Object.values(RoleName)) {
    const role = await prisma.role.upsert({
      where: { name },
      update: { description: ROLE_DESCRIPTIONS[name] },
      create: { name, description: ROLE_DESCRIPTIONS[name], isActive: true },
    });
    ids.set(name, role.id);
    console.log(`  ✅ Role: ${name}`);
  }

  return ids;
}

async function seedDemoDoctors(doctorRoleId: string): Promise<void> {
  console.log('\n🩺 Seeding demo clinicians (fictional)...');

  // A single shared password for demo accounts. These are directory entries so
  // that booking has someone to book with; nobody is expected to sign in as
  // them until the doctor portal exists. Hashed with the same Argon2id
  // parameters as a real account — never stored or compared in plaintext.
  const passwordHash = await hash('DemoOnly!NotForProduction2026', {
    algorithm: Algorithm.Argon2id,
    memoryCost: Number(process.env.ARGON2_MEMORY_COST ?? 65536),
    timeCost: Number(process.env.ARGON2_TIME_COST ?? 3),
    parallelism: Number(process.env.ARGON2_PARALLELISM ?? 4),
  });

  for (const doc of DEMO_DOCTORS) {
    // ⚠️ THE MOBILE IDENTITY IS WRITTEN HERE, not left to a backfill script.
    // OTP login resolves an account by `mobileHash`; a seeded doctor without
    // one simply cannot sign in, so a fresh `db:seed` would produce a demo
    // cast that the new login screen rejects. `update` fills it in for rows
    // seeded before the column existed.
    const normalized = normalizeMobile(doc.phoneNumber);
    const mobileFields = normalized === null
      ? {}
      : { mobile: encryptField(normalized), mobileHash: hmacBlindIndex(normalized) };

    const user = await prisma.user.upsert({
      where: { email: doc.email },
      update: mobileFields,
      create: {
        email: doc.email,
        passwordHash,
        roleId: doctorRoleId,
        isVerified: true,
        isActive: true,
        ...mobileFields,
      },
    });

    await prisma.doctorProfile.upsert({
      where: { userId: user.id },
      update: {
        specialty: doc.specialty,
        qualifications: doc.qualifications,
        hospitalName: DEMO_HOSPITAL,
        yearsExperience: doc.yearsExperience,
        phoneNumber: doc.phoneNumber,
      },
      create: {
        userId: user.id,
        firstName: doc.firstName,
        lastName: doc.lastName,
        gender: doc.gender,
        phoneNumber: doc.phoneNumber,
        specialty: doc.specialty,
        qualifications: doc.qualifications,
        hospitalName: DEMO_HOSPITAL,
        yearsExperience: doc.yearsExperience,
        // Verified so they appear in the bookable directory. In production
        // this flag is set by an administrator after checking credentials.
        isVerified: true,
        verifiedAt: new Date(),
      },
    });

    console.log(`  ✅ Dr. ${doc.firstName} ${doc.lastName} — ${doc.specialty}`);
  }
}

/**
 * DEMO PATIENT — for MD/stakeholder presentations.
 *
 * Deliberately isolated from real patient data:
 *  - a distinct, obviously-synthetic email (never a real person's address)
 *  - created/updated only by this seed script, never touched by real traffic
 *  - the seven pre-existing real patient accounts are never read or modified
 *    anywhere in this file
 *
 * Data is realistic South Indian context but modest in volume — one upcoming
 * and one completed appointment, one care-team assignment, three
 * notifications — "populated enough to demonstrate", not "every field ever
 * touched". No invented diagnosis, no fabricated lab values, no clinical
 * claim presented as real. NIHSS/mRS-style scoring is intentionally absent —
 * this account exists to show identity, health-history and workflow, not a
 * clinical assessment the product does not perform.
 *
 * IMPORTANT: no profile photo is set. The schema has a `profilePhoto` column,
 * but no upload endpoint exists and no frontend component reads it — writing
 * a filename here would point at an asset nothing serves. Adding photo
 * upload is out of scope for this pass (see the Phase 3 report); the demo
 * account renders the same initials avatar as any other patient.
 *
 * Similarly: there is no height/weight/BMI field anywhere in the schema.
 * Phase 4 QA asked to verify BMI consistency, but that data does not exist in
 * this product — inventing new columns to satisfy a QA checklist would be
 * exactly the kind of unapproved feature addition Phase 4 rules out. Noted
 * as a limitation in the Phase 3 report rather than silently added here.
 */
const DEMO_PATIENT_EMAIL = 'demouser.strokeai@gmail.com';

async function seedDemoPatient(patientRoleId: string, doctorRoleId: string): Promise<void> {
  console.log('\n🧑‍⚕️ Seeding demo patient (fictional)...');

  // No hardcoded fallback for the demo PATIENT's password (unlike the demo
  // doctors below, which are directory entries nobody signs in as). This
  // account is meant to actually be logged into for demonstrations, so its
  // credential must come from the operator's own environment, never from a
  // literal committed to source. Missing it fails the seed loudly rather
  // than silently reusing a value anyone reading this file could look up.
  const demoPassword = process.env.DEMO_PATIENT_PASSWORD;
  if (!demoPassword) {
    throw new Error(
      'DEMO_PATIENT_PASSWORD is not set. Set it in your environment before ' +
        'running the seed — see server/.env.example. Refusing to fall back ' +
        'to a hardcoded password for an account meant to be logged into.',
    );
  }

  const passwordHash = await hash(demoPassword, {
    algorithm: Algorithm.Argon2id,
    memoryCost: Number(process.env.ARGON2_MEMORY_COST ?? 65536),
    timeCost: Number(process.env.ARGON2_TIME_COST ?? 3),
    parallelism: Number(process.env.ARGON2_PARALLELISM ?? 4),
  });

  const user = await prisma.user.upsert({
    where: { email: DEMO_PATIENT_EMAIL },
    update: {},
    create: {
      email: DEMO_PATIENT_EMAIL,
      passwordHash,
      roleId: patientRoleId,
      isVerified: true,
      isActive: true,
    },
  });

  // Encrypted fields are written through the same encryptField() the
  // production API uses — never plaintext, even in a seed script.
  //
  // shriPatientId is generated through the same collision-retry helper the
  // registration write paths use. It was previously omitted here, which made
  // this seed unrunnable against a fresh database: the column is NOT NULL and
  // UNIQUE with no default (20260911100100_patient_identity_constraints), so
  // the create branch failed outright. phoneNumberHash is written alongside
  // for the same reason the backfill script writes it — a profile with an
  // encrypted phone but no blind index is invisible to search-by-mobile.
  const profile = await withGeneratedShriPatientId((shriPatientId) =>
    prisma.patientProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      shriPatientId,
      phoneNumberHash: computePhoneNumberHash('+91 9884512230'),
      firstName: 'Meenakshi',
      lastName: 'Subramaniam',
      dateOfBirth: new Date('1969-11-03'),
      gender: Gender.Female,
      bloodGroup: BloodGroup.B_Positive,
      maritalStatus: MaritalStatus.Married,

      phoneNumber: encryptField('+91 9884512230'),
      addressLine1: encryptField('14, Kamaraj Nagar 2nd Street'),
      city: encryptField('Coimbatore'),
      district: encryptField('Coimbatore'),
      state: encryptField('Tamil Nadu'),
      country: 'India',
      postalCode: encryptField('641009'),

      emergencyContactName: encryptField('Ganesan Subramaniam'),
      emergencyContactPhone: encryptField('+91 9884512231'),
      emergencyContactRelation: encryptField('Spouse'),

      // ABHA is optional in real registrations; included here to show the
      // field genuinely round-trips end to end, hashed the same way a real
      // one would be (blind index for the uniqueness lookup, never the
      // ciphertext itself).
      abhaId: encryptField('91-7734-8821-4409'),
      abhaIdHash: hmacBlindIndex('91-7734-8821-4409'),

      smokingStatus: SmokingStatus.Never,
      alcoholStatus: AlcoholStatus.Never,
      tobaccoStatus: TobaccoStatus.Never,
      physicalActivity: PhysicalActivity.Light,
      occupation: 'Retired schoolteacher',

      // Health history — realistic post-stroke secondary-prevention profile,
      // in the same free-text-summary shape a patient would type themselves.
      knownAllergies: encryptField('Penicillin (rash)'),
      currentMedications: encryptField('Clopidogrel 75mg once daily; Atorvastatin 40mg at night; Amlodipine 5mg once daily'),
      existingDiseases: encryptField('Hypertension (since 2015); Ischemic stroke, left MCA territory (March 2026), currently in recovery'),
      familyHistory: encryptField('Father had a heart attack at age 62. Elder sister has type 2 diabetes.'),
      previousSurgeries: encryptField('Cholecystectomy (gallbladder removal), 2011'),
    },
    }),
  );

  console.log(`  ✅ Patient: Meenakshi Subramaniam (${DEMO_PATIENT_EMAIL})`);

  // ── Care team ────────────────────────────────────────────────────────────
  const neurologist = await prisma.doctorProfile.findFirst({
    where: { specialty: 'Neurology (Stroke)' },
  });
  const physio = await prisma.doctorProfile.findFirst({
    where: { specialty: 'Physiotherapy' },
  });

  if (neurologist) {
    await prisma.careTeamMember.upsert({
      where: {
        patientId_doctorId_careRole: {
          patientId: profile.id,
          doctorId: neurologist.id,
          careRole: 'Primary Neurologist',
        },
      },
      update: {},
      create: {
        patientId: profile.id,
        doctorId: neurologist.id,
        careRole: 'Primary Neurologist',
        isPrimary: true,
      },
    });
    console.log('  ✅ Care team: primary neurologist assigned');
  }

  if (physio) {
    await prisma.careTeamMember.upsert({
      where: {
        patientId_doctorId_careRole: {
          patientId: profile.id,
          doctorId: physio.id,
          careRole: 'Physiotherapist',
        },
      },
      update: {},
      create: {
        patientId: profile.id,
        doctorId: physio.id,
        careRole: 'Physiotherapist',
        isPrimary: false,
      },
    });
    console.log('  ✅ Care team: physiotherapist assigned');
  }

  // ── Appointments — one completed (past), one upcoming ───────────────────
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const inTenDays = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
  inTenDays.setHours(11, 0, 0, 0);

  const existingAppointments = await prisma.appointment.count({
    where: { patientId: profile.id },
  });

  if (existingAppointments === 0) {
    if (neurologist) {
      await prisma.appointment.create({
        data: {
          patientId: profile.id,
          doctorId: neurologist.id,
          scheduledAt: twoWeeksAgo,
          mode: AppointmentMode.InPerson,
          status: AppointmentStatus.Completed,
          reason: encryptField('Follow-up review after hospital discharge'),
          locationName: DEMO_HOSPITAL,
        },
      });
    }
    if (physio) {
      await prisma.appointment.create({
        data: {
          patientId: profile.id,
          doctorId: physio.id,
          scheduledAt: inTenDays,
          mode: AppointmentMode.Video,
          status: AppointmentStatus.Confirmed,
          reason: encryptField('Physiotherapy progress check — left arm mobility'),
        },
      });
    }
    console.log('  ✅ Appointments: one completed, one upcoming');
  } else {
    console.log('  ℹ️  Appointments already exist for demo patient — left untouched');
  }

  // ── Notifications — a small, believable set ─────────────────────────────
  const existingNotifications = await prisma.notification.count({
    where: { userId: user.id },
  });

  if (existingNotifications === 0) {
    await prisma.notification.createMany({
      data: [
        {
          userId: user.id,
          type: NotificationType.Appointment,
          title: 'Appointment confirmed',
          body: `Your physiotherapy video consultation is confirmed for ${inTenDays.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}.`,
          actionUrl: '/app/appointments',
          readAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        },
        {
          userId: user.id,
          type: NotificationType.CareTeam,
          title: 'Care team updated',
          body: 'Dr. Anitha Selvam (Physiotherapy) has been added to your care team.',
          actionUrl: '/app/my-doctors',
          readAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        },
        {
          userId: user.id,
          type: NotificationType.General,
          title: 'Welcome to Stroke AI',
          body: 'Your account is set up. You can review your health information any time under My Health.',
          actionUrl: '/app',
          readAt: null,
        },
      ],
    });
    console.log('  ✅ Notifications: 3 seeded (1 unread)');
  } else {
    console.log('  ℹ️  Notifications already exist for demo patient — left untouched');
  }
}

async function main(): Promise<void> {
  const roleIds = await seedRoles();

  // Opt out with SEED_DEMO=false for a production database that should carry
  // no demo rows at all.
  if (process.env.SEED_DEMO === 'false') {
    console.log('\nℹ️  SEED_DEMO=false — skipping demo clinicians and demo patient.');
  } else {
    const doctorRoleId = roleIds.get(RoleName.Doctor);
    const patientRoleId = roleIds.get(RoleName.Patient);
    if (doctorRoleId === undefined || patientRoleId === undefined) {
      throw new Error('Doctor/Patient role missing after seeding — cannot create demo accounts.');
    }
    await seedDemoDoctors(doctorRoleId);
    await seedDemoPatient(patientRoleId, doctorRoleId);
  }

  console.log('\n✅ Seed complete.');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
