/**
 * Expires every break-glass grant held by the demo clinicians.
 *
 * ⚠️ Grants are deliberately long-lived (12 hours) and deliberately NOT
 * revocable from the product — a clinician cannot un-break glass, and an
 * expired grant's audit row is kept forever. That makes the emergency-access
 * demo a one-shot: once Dr Desai has broken glass on a patient, opening that
 * record again is an ordinary authorized read and the gate never appears.
 *
 * This script exists so the demo and the browser suite can be run twice. It
 * expires grants; it does NOT delete them, and it does not touch the audit
 * log, because "this access happened" is not a fact a reset is allowed to
 * change. Restricted to the two @stroke-ai.invalid demo accounts so it can
 * never be pointed at a real clinician.
 */
import { PrismaClient } from '@prisma/client';

const DEMO_EMAILS = [
  'demo.doctor.iyer@stroke-ai.invalid',
  'demo.doctor.desai@stroke-ai.invalid',
  'demo.resident.rao@stroke-ai.invalid',
];

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      where: { email: { in: DEMO_EMAILS } },
      select: { id: true, email: true },
    });

    if (users.length === 0) {
      console.log('No demo clinicians found — nothing to reset.');
      return;
    }

    const { count } = await prisma.breakGlassGrant.updateMany({
      where: { actorUserId: { in: users.map((u) => u.id) }, expiresAt: { gt: new Date() } },
      // Expired one second ago rather than deleted: the grant row, its reason
      // and its reviewer decision all stay readable in the review queue.
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    console.log(`✓ expired ${count} active break-glass grant(s) for ${users.length} demo account(s)`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
