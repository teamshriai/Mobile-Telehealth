/**
 * Phase 6 test fixtures — a HealthcareWorker and a Doctor account used to
 * verify the patient registration / encounter / stroke-assessment workflow
 * end-to-end during development.
 *
 * DELIBERATELY SEPARATE from prisma/seed.ts and the demo-patient flow it
 * owns: these are engineering test fixtures for exercising RBAC boundaries
 * (HealthcareWorker cannot write a stroke assessment; a Doctor can only
 * write one on a patient they have a genuine relationship with), not
 * product-demonstration data. Conflating the two would make it unclear
 * which accounts are "the product's demo" vs "an engineer's test rig".
 *
 * Not run automatically by `npm run db:seed` — invoke explicitly:
 *   npx tsx prisma/scripts/seed-phase6-test-accounts.ts
 *
 * Password: same convention as the demo patient in seed.ts — no hardcoded
 * fallback, sourced from the environment, seed throws if unset. Both
 * accounts share TEST_ACCOUNT_PASSWORD (unlike the demo patient's own
 * dedicated var) because neither is meant to be logged into for anything
 * beyond exercising this one workflow.
 *
 * These accounts hold NO real patient data and are safe to leave in a
 * development database; do not run this against a production database.
 */
import { hash, Algorithm } from '@node-rs/argon2';
import { RoleName } from '@prisma/client';
import { prisma } from '../../src/lib/prisma';

const TEST_HW_EMAIL = 'test.hw.phase6@stroke-ai.invalid';
const TEST_DOCTOR_EMAIL = 'test.doctor.phase6@stroke-ai.invalid';

async function main(): Promise<void> {
  const password = process.env.TEST_ACCOUNT_PASSWORD;
  if (!password) {
    throw new Error(
      'TEST_ACCOUNT_PASSWORD is not set. Set it in your environment before running this ' +
        'script — see server/.env.example. Refusing to fall back to a hardcoded password.',
    );
  }

  const passwordHash = await hash(password, {
    algorithm: Algorithm.Argon2id,
    memoryCost: Number(process.env.ARGON2_MEMORY_COST ?? 65536),
    timeCost: Number(process.env.ARGON2_TIME_COST ?? 3),
    parallelism: Number(process.env.ARGON2_PARALLELISM ?? 4),
  });

  const hwRole = await prisma.role.findUnique({ where: { name: RoleName.HealthcareWorker } });
  if (!hwRole) throw new Error('HealthcareWorker role not found — run the main seed first.');

  const hwUser = await prisma.user.upsert({
    where: { email: TEST_HW_EMAIL },
    update: { passwordHash },
    create: {
      email: TEST_HW_EMAIL,
      passwordHash,
      roleId: hwRole.id,
      isVerified: true,
      isActive: true,
      passwordChangedAt: new Date(),
      staffProfile: {
        create: { firstName: 'Test', lastName: 'FieldWorker', jobTitle: 'Field Registration Officer' },
      },
    },
  });
  console.log(`✓ HealthcareWorker test fixture: ${hwUser.email} (${hwUser.id})`);

  const doctorRole = await prisma.role.findUnique({ where: { name: RoleName.Doctor } });
  if (!doctorRole) throw new Error('Doctor role not found — run the main seed first.');

  const docUser = await prisma.user.upsert({
    where: { email: TEST_DOCTOR_EMAIL },
    update: { passwordHash },
    create: {
      email: TEST_DOCTOR_EMAIL,
      passwordHash,
      roleId: doctorRole.id,
      isVerified: true,
      isActive: true,
      passwordChangedAt: new Date(),
      doctorProfile: {
        create: { firstName: 'Test', lastName: 'Clinician', specialty: 'Internal Medicine', isVerified: true },
      },
    },
  });
  console.log(`✓ Doctor test fixture: ${docUser.email} (${docUser.id})`);

  console.log('\nBoth fixtures are idempotent — re-running this script updates rather than duplicates.');
}

main()
  .catch((err) => {
    console.error('❌ Phase 6 test fixture seeding failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
