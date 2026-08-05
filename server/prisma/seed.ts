import { PrismaClient, RoleName } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Seed — Initial Roles
// Run: npm run db:seed
// Must be executed after every fresh migration.
// Uses upsert so it is safe to run multiple times.
// ─────────────────────────────────────────────────────────────────────────────

const prisma = new PrismaClient();

const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  Admin: 'Platform administrator with full system access.',
  Patient: 'Patient with access to personal health records and appointments.',
  Doctor: 'Licensed physician with access to assigned patient records.',
  HealthcareWorker: 'Clinical support staff assisting with patient care.',
  LabTechnician: 'Laboratory staff managing lab reports and genomic data.',
};

async function main(): Promise<void> {
  console.log('🌱 Seeding roles...');

  for (const name of Object.values(RoleName)) {
    await prisma.role.upsert({
      where: { name },
      update: { description: ROLE_DESCRIPTIONS[name] },
      create: {
        name,
        description: ROLE_DESCRIPTIONS[name],
        isActive: true,
      },
    });
    console.log(`  ✅ Role: ${name}`);
  }

  console.log('✅ Seed complete.');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
