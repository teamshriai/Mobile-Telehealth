/**
 * enrich-demo-account.ts
 *
 * Fills the demo patient's record so every screen in the portal has something
 * real to show. The account is what the product gets demonstrated with, and a
 * dashboard of empty states demonstrates nothing.
 *
 * Idempotent. Every write is an upsert or is guarded on "does this already
 * exist", so running it twice changes nothing the second time. It only ever
 * touches the single account named by DEMO_PATIENT_EMAIL, and it never
 * deletes.
 *
 * Operator-invoked only — this is not reachable over HTTP.
 *
 *   npx tsx prisma/scripts/enrich-demo-account.ts
 */

import 'dotenv/config';
import { PrismaClient, AppointmentStatus, AppointmentMode, NotificationType,
  EncounterType, EncounterStatus, LkwCertainty, LkwSource, AiMessageRole } from '@prisma/client';
import { encryptField, decryptField, hmacBlindIndex } from '../../src/utils/encryption';
import { generateShriPatientId } from '../../src/utils/shriId';
import { normalizeMobile } from '../../src/utils/phone';

const prisma = new PrismaClient();
const DEMO_EMAIL = 'demouser.strokeai@gmail.com';

/** Days from now, at a fixed local-ish hour, so the demo reads sensibly. */
function at(dayOffset: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main(): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    select: { id: true },
  });
  if (user === null) {
    throw new Error(
      `No user ${DEMO_EMAIL}. Run the seed first (npm run db:seed) — this ` +
        'script enriches the demo account, it does not create it.',
    );
  }

  const profile = await prisma.patientProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, shriPatientId: true },
  });
  if (profile === null) throw new Error('Demo user has no patient profile.');

  // ── 1. Profile: fill every remaining optional field ───────────────────────
  // Encrypted columns must go through encryptField — writing plaintext here
  // would produce rows the API cannot decrypt.
  const altMobile = normalizeMobile('+91 98845 12232');
  if (altMobile === null) throw new Error('Alternate mobile failed normalisation.');

  await prisma.patientProfile.update({
    where: { id: profile.id },
    data: {
      // Marks this record as fabricated demonstration data. The AI assistant
      // refuses to send anything NOT flagged here to an external provider
      // while AI_DATA_POLICY=synthetic-only (the default).
      isSyntheticData: true,
      middleName: 'Lakshmi',
      passportNumber: encryptField('Z4182769'),
      aadhaarLast4: encryptField('4417'),
      alternatePhone: encryptField(altMobile),
      addressLine2: encryptField('Near Gandhipuram Bus Stand'),
      village: encryptField('Peelamedu'),
      // A SHRI-AI Patient ID should never be missing on a demo record — it is
      // the identifier staff read out loud.
      shriPatientId: profile.shriPatientId ?? generateShriPatientId(),
      phoneNumberHash: hmacBlindIndex(normalizeMobile('+91 98845 12230') ?? ''),
    },
  });
  console.log('✓ profile fields filled');

  // ── 2. Care team: add the two clinicians the record implies but lacks ─────
  const doctors = await prisma.doctorProfile.findMany({
    where: { isVerified: true, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, specialty: true },
  });
  const byName = (last: string): string | undefined =>
    doctors.find((d) => d.lastName === last)?.id;

  const careAdds = [
    { doctorId: byName('Raja'), careRole: 'Rehabilitation Physician' },
    { doctorId: byName('Kumar'), careRole: 'Speech & Language Therapist' },
  ];
  for (const add of careAdds) {
    if (add.doctorId === undefined) continue;
    const exists = await prisma.careTeamMember.findFirst({
      where: { patientId: profile.id, doctorId: add.doctorId, activeTo: null },
      select: { id: true },
    });
    if (exists !== null) continue;
    await prisma.careTeamMember.create({
      data: {
        patientId: profile.id,
        doctorId: add.doctorId,
        careRole: add.careRole,
        isPrimary: false,
      },
    });
  }
  console.log('✓ care team filled');

  // ── 3. Appointments: a real history, not just one past visit ──────────────
  const apptPlan = [
    { day: -84, hour: 10, min: 0,  doctor: 'Nair',   mode: AppointmentMode.InPerson, status: AppointmentStatus.Completed, reason: 'Admission review after stroke — right-sided weakness' },
    { day: -56, hour: 11, min: 30, doctor: 'Raja',   mode: AppointmentMode.InPerson, status: AppointmentStatus.Completed, reason: 'Rehabilitation plan and mobility assessment' },
    { day: -35, hour: 9,  min: 30, doctor: 'Kumar',  mode: AppointmentMode.Video,    status: AppointmentStatus.Completed, reason: 'Speech therapy review — word finding' },
    { day: -14, hour: 15, min: 0,  doctor: 'Nair',   mode: AppointmentMode.InPerson, status: AppointmentStatus.Completed, reason: 'Medication review and blood pressure check' },
    { day: -7,  hour: 16, min: 0,  doctor: 'Selvam', mode: AppointmentMode.Video,    status: AppointmentStatus.Cancelled, reason: 'Physiotherapy session — rescheduled by clinic' },
    { day: 12,  hour: 10, min: 30, doctor: 'Raja',   mode: AppointmentMode.InPerson, status: AppointmentStatus.Confirmed, reason: 'Six-month rehabilitation progress review' },
    { day: 26,  hour: 9,  min: 0,  doctor: 'Nair',   mode: AppointmentMode.InPerson, status: AppointmentStatus.Requested, reason: 'Routine neurology follow-up' },
  ];

  // Existence is checked on the decrypted reason, NOT on scheduledAt.
  // `at()` is relative to today, so a timestamp guard silently stops matching
  // the moment the script is run on a different day — which is exactly how an
  // earlier version of this produced a duplicate of every appointment on its
  // second run. The reason text is the stable identity of a planned row.
  const existingReasons = new Set<string>();
  for (const row of await prisma.appointment.findMany({
    where: { patientId: profile.id },
    select: { reason: true },
  })) {
    if (row.reason === null) continue;
    try {
      existingReasons.add(decryptField(row.reason));
    } catch {
      // An unreadable row cannot be matched against; skipping it risks a
      // duplicate, which is far better than skipping the whole run.
    }
  }

  for (const a of apptPlan) {
    const doctorId = byName(a.doctor);
    if (doctorId === undefined) continue;
    if (existingReasons.has(a.reason)) continue;
    const when = at(a.day, a.hour, a.min);
    await prisma.appointment.create({
      data: {
        patientId: profile.id,
        doctorId,
        scheduledAt: when,
        durationMins: 30,
        mode: a.mode,
        status: a.status,
        reason: encryptField(a.reason),
        ...(a.status === AppointmentStatus.Cancelled
          ? { cancelReason: encryptField('Clinic rescheduled — new slot offered') }
          : {}),
      },
    });
  }
  console.log('✓ appointment history filled');

  // ── 4. Notifications: enough for the activity feed to look lived-in ───────
  const notifPlan = [
    { type: NotificationType.Report,     title: 'MRI report available',        body: 'Your brain MRI report from 12 August has been added to My Health.', day: -33 },
    { type: NotificationType.Medication, title: 'Medicine added',              body: 'Atorvastatin 40mg at night was added to your medicines list.',      day: -30 },
    { type: NotificationType.CareTeam,   title: 'Speech therapist assigned',   body: 'Dr. Senthil Kumar has joined your care team.',                      day: -28 },
    { type: NotificationType.Appointment,title: 'Appointment completed',       body: 'Your medication review on 3 September has been marked completed.',  day: -13 },
    { type: NotificationType.General,    title: 'Blood pressure log updated',  body: 'Three new readings were recorded in your health history.',          day: -5 },
    { type: NotificationType.Appointment,title: 'Upcoming: rehabilitation review', body: 'Dr. Karthik Raja will see you for a progress review.',          day: -1 },
  ];

  for (const n of notifPlan) {
    const exists = await prisma.notification.findFirst({
      where: { userId: user.id, title: n.title },
      select: { id: true },
    });
    if (exists !== null) continue;
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: n.type,
        title: n.title,
        body: n.body,
        createdAt: at(n.day, 9),
        // Leave the two most recent unread so the bell has a real badge.
        readAt: n.day < -5 ? at(n.day, 12) : null,
      },
    });
  }
  console.log('✓ notifications filled');

  // ── 5. Encounter + stroke assessment ─────────────────────────────────────
  // Phase 6 shipped this whole domain and the demo account had zero rows, so
  // none of it was visible. This is the original admission.
  const existingEncounter = await prisma.encounter.findFirst({
    where: { patientId: profile.id },
    select: { id: true },
  });

  if (existingEncounter === null) {
    const encounter = await prisma.encounter.create({
      data: {
        patientId: profile.id,
        visitId: generateShriPatientId().replace('SHRI-', 'ENC-'),
        type: EncounterType.Emergency,
        status: EncounterStatus.Completed,
        startedAt: at(-84, 7, 40),
        endedAt: at(-84, 14, 10),
        locationName: encryptField('IndoStates Health Hospital — Emergency'),
        chiefComplaint: encryptField('Sudden right-sided weakness and slurred speech'),
      },
    });

    await prisma.strokeAssessment.create({
      data: {
        encounterId: encounter.id,
        lkwAt: at(-84, 6, 15),
        lkwCertainty: LkwCertainty.Approximate,
        lkwSource: LkwSource.Family,
        lkwNote: encryptField('Family last saw her well at about 6:15am before breakfast.'),
        facialWeakness: true,
        armWeakness: true,
        speechDifficulty: true,
        balanceProblem: true,
        urgentFlag: true,
        onAnticoagulants: false,
        otherSymptomNote: encryptField('Right arm drift on examination; speech slurred but comprehension intact.'),
      },
    });
    console.log('✓ encounter + stroke assessment created');
  } else {
    console.log('· encounter already present — left alone');
  }

  // ── 6. AI Insights conversations ─────────────────────────────────────────
  // Spread across several days on purpose: the history sidebar groups by
  // Today / Yesterday / Previous 7 days, and that grouping is invisible if
  // every conversation was created in the same minute.
  const PLACEHOLDER_REPLY =
    'The assistant is not connected yet, so I cannot answer this. Your question ' +
    'has been saved. Once it is switched on it will answer from your own ' +
    'records — your reports, medicines and care-team notes — and never from ' +
    'guesswork. For anything urgent, contact your care team or call 108.';

  const chatPlan = [
    { day: -9, hour: 18, q: 'What is Clopidogrel for, and when should I take it?' },
    { day: -6, hour: 11, q: 'What do my recorded blood pressure readings mean?' },
    { day: -3, hour: 20, q: 'Is it safe to start walking longer distances yet?' },
    { day: -1, hour: 9,  q: 'What should I ask at my next physiotherapy appointment?' },
  ];

  for (const chat of chatPlan) {
    const title = chat.q.length <= 60 ? chat.q : `${chat.q.slice(0, 57)}…`;
    const titleCipher = encryptField(title);

    // Titles are encrypted with a random IV, so the same text does not produce
    // the same ciphertext — existence has to be checked by decrypting rather
    // than by matching the stored value.
    const mine = await prisma.aiConversation.findMany({
      where: { userId: user.id, deletedAt: null },
      select: { id: true, title: true },
    });
    const already = mine.some((c) => {
      try {
        return decryptField(c.title) === title;
      } catch {
        return false;
      }
    });
    if (already) continue;

    const when = at(chat.day, chat.hour);
    const conversation = await prisma.aiConversation.create({
      data: { userId: user.id, title: titleCipher, createdAt: when, updatedAt: when },
      select: { id: true },
    });
    await prisma.aiMessage.createMany({
      data: [
        {
          conversationId: conversation.id,
          role: AiMessageRole.User,
          content: encryptField(chat.q),
          createdAt: when,
        },
        {
          conversationId: conversation.id,
          role: AiMessageRole.Assistant,
          content: encryptField(PLACEHOLDER_REPLY),
          isPlaceholder: true,
          createdAt: new Date(when.getTime() + 1200),
        },
      ],
    });
  }
  console.log('✓ AI conversations filled');

  // ── Summary ──────────────────────────────────────────────────────────────
  const [appts, care, notifs, encs] = await Promise.all([
    prisma.appointment.count({ where: { patientId: profile.id } }),
    prisma.careTeamMember.count({ where: { patientId: profile.id, activeTo: null } }),
    prisma.notification.count({ where: { userId: user.id } }),
    prisma.encounter.count({ where: { patientId: profile.id } }),
  ]);
  const chats = await prisma.aiConversation.count({
    where: { userId: user.id, deletedAt: null },
  });
  console.log(
    `\nDemo account now has: ${appts} appointments · ${care} care-team members · ` +
      `${notifs} notifications · ${encs} encounters · ${chats} AI chats`,
  );
}

main()
  .catch((err: unknown) => {
    console.error('Demo enrichment failed:', err);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
