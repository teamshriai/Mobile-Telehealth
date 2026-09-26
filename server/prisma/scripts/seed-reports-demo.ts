import { PrismaClient } from '@prisma/client';
import { seedReportsDemo } from './reportsDemoSeed';

// Seeds the pitch account's lab reports and vital signs. Safe to re-run.
const prisma = new PrismaClient();

seedReportsDemo(prisma)
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error('❌ seed-reports-demo failed:', err);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
