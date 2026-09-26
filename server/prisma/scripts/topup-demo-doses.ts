import { PrismaClient } from '@prisma/client';
import { seedMedicineAdherence } from './medicineAdherenceSeed';

// Fills the demo patients' dose history up to yesterday, without touching the
// rest of the demo clinic. Safe to run any day: see medicineAdherenceSeed.ts.

const prisma = new PrismaClient();

seedMedicineAdherence(prisma)
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error('❌ topup-demo-doses failed:', err);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
