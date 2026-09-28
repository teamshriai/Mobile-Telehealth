/**
 * Portraits for the demo cast — `npm run db:demo:avatars`.
 *
 * ⚠️ NOBODY IN THESE PHOTOS EXISTS. They are synthetic headshots from the
 * Photo ID Dataset (CC BY 4.0) — see client/public/avatars/CREDITS.md — chosen
 * so no real person's face is attached to a fictional doctor or patient (the
 * Phase-1 audit's concern about stock photos of real people).
 *
 * ⚠️ DEMO ACCOUNTS ONLY. A portrait is set only on the named @stroke-ai.invalid
 * doctors and on the two demo patients, and a patient is touched only when
 * their profile carries `isSyntheticData`. Anything else is left alone.
 *
 * Stores a KEY ("doctors/priya-nair.webp"), never a URL; the server turns it
 * into one through src/utils/avatarUrl.ts, which rejects anything else.
 * Idempotent: re-running sets the same keys.
 */
import { PrismaClient } from '@prisma/client';
import { avatarUrl } from '../../src/utils/avatarUrl';

export const DOCTOR_AVATARS: ReadonlyArray<{ email: string; key: string }> = [
  { email: 'demo.doctor.nair@stroke-ai.invalid', key: 'doctors/priya-nair.webp' },
  { email: 'demo.doctor.raja@stroke-ai.invalid', key: 'doctors/karthik-raja.webp' },
  { email: 'demo.doctor.selvam@stroke-ai.invalid', key: 'doctors/anitha-selvam.webp' },
  { email: 'demo.doctor.kumar@stroke-ai.invalid', key: 'doctors/senthil-kumar.webp' },
  { email: 'demo.doctor.iyer@stroke-ai.invalid', key: 'doctors/ananya-iyer.webp' },
  { email: 'demo.doctor.desai@stroke-ai.invalid', key: 'doctors/rohit-desai.webp' },
  { email: 'demo.resident.rao@stroke-ai.invalid', key: 'doctors/kavitha-rao.webp' },
];

export const PATIENT_AVATARS: ReadonlyArray<{ email: string; key: string }> = [
  { email: 'demouser.strokeai@gmail.com', key: 'patients/meenakshi-subramaniam.webp' },
  { email: 'demo.patient.krishnan@stroke-ai.invalid', key: 'patients/meera-krishnan.webp' },
];

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    for (const { key } of [...DOCTOR_AVATARS, ...PATIENT_AVATARS]) {
      if (avatarUrl(key) === null) throw new Error(`Not a valid portrait key: ${key}`);
    }

    for (const { email, key } of DOCTOR_AVATARS) {
      if (!email.endsWith('@stroke-ai.invalid')) throw new Error(`Refusing a non-demo doctor: ${email}`);
      const { count } = await prisma.doctorProfile.updateMany({
        where: { user: { email } },
        data: { profilePhoto: key },
      });
      console.log(count === 1 ? `✓ ${email} → ${key}` : `– ${email}: no profile (skipped)`);
    }

    for (const { email, key } of PATIENT_AVATARS) {
      const { count } = await prisma.patientProfile.updateMany({
        where: { user: { email }, isSyntheticData: true },
        data: { profilePhoto: key },
      });
      console.log(count === 1 ? `✓ ${email} → ${key}` : `– ${email}: no synthetic profile (skipped)`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run only as a script, so the lists above can be imported by tests.
if (process.argv[1]?.endsWith('demo-avatars.ts')) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
