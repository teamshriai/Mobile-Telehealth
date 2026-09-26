/**
 * Removes the refill requests the browser suite made on the demo patients.
 *
 * ⚠️ ONLY THE SUITE'S OWN. A request is removed only when its note starts
 * with the suite's marker ("[e2e]") — the note is encrypted, so each one is
 * decrypted and checked. Anything a person requested while demoing stays.
 * Restricted to the @stroke-ai.invalid demo patients and the demo account
 * used for the pitch, so it can never be pointed at a real patient.
 *
 * Without it the suite could run once: a request stays open until a doctor
 * prescribes, and one open request per medicine is all the database allows.
 *
 * The notifications those requests sent go too — otherwise the demo
 * administrator's bell shows "Refill request waiting" over an empty queue.
 * Notifications are not linked to a request (they carry no ids or names, by
 * design), so a notification is removed only when ALL of these hold: it has
 * one of the refill titles, it went to a demo account, and it was sent while
 * a removed test request was live (from its request to a minute after its
 * last change).
 */
import { PrismaClient } from '@prisma/client';
import { decryptFieldOptional } from '../../src/utils/encryption';

const DEMO_PATIENTS = ['demo.patient.krishnan@stroke-ai.invalid', 'demouser.strokeai@gmail.com'];
const MARKER = '[e2e]';
const REFILL_TITLES = [
  'Refill request waiting',
  'Refill request from a patient',
  'Refill request sent to your doctor',
  'Refill request not approved',
  'Refill prescribed',
];
const MINUTE = 60_000;

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.refillRequest.findMany({
      where: { patient: { user: { email: { in: DEMO_PATIENTS } } } },
      select: { id: true, note: true, requestedAt: true, updatedAt: true },
    });
    const test = rows.filter((r) => decryptFieldOptional(r.note)?.startsWith(MARKER) === true);

    let notes = 0;
    if (test.length > 0) {
      const { count } = await prisma.notification.deleteMany({
        where: {
          title: { in: REFILL_TITLES },
          user: {
            OR: [{ email: { in: DEMO_PATIENTS } }, { email: { endsWith: '@stroke-ai.invalid' } }],
          },
          OR: test.map((r) => ({
            createdAt: {
              gte: new Date(r.requestedAt.getTime() - 5_000),
              lte: new Date(r.updatedAt.getTime() + MINUTE),
            },
          })),
        },
      });
      notes = count;
    }
    const { count } = await prisma.refillRequest.deleteMany({
      where: { id: { in: test.map((r) => r.id) } },
    });
    console.log(
      `Removed ${count} test refill request(s) and ${notes} of their notification(s) from the demo accounts.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error('reset-demo-refills failed:', err);
  process.exitCode = 1;
});
