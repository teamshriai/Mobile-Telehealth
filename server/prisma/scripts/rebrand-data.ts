/**
 * One-off, idempotent data fix for the SHRI HEALTH rename.
 *
 * Notification titles and bodies are stored as plain text (they carry no PHI
 * by design), so product names written by earlier seeds or releases stay in
 * people's inboxes after the code is renamed. This rewrites only the product
 * name — "Stroke AI" — and never touches hospital or facility names
 * ("IndoStates Health Hospital …"), which belong to the hospital, not to us.
 *
 * Safe to re-run: a second run finds nothing to change.
 */
import { PrismaClient } from '@prisma/client';

const OLD = 'Stroke AI';
const NEW = 'SHRI HEALTH';

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.notification.findMany({
      where: { OR: [{ title: { contains: OLD } }, { body: { contains: OLD } }] },
      select: { id: true, title: true, body: true },
    });
    for (const r of rows) {
      await prisma.notification.update({
        where: { id: r.id },
        data: { title: r.title.split(OLD).join(NEW), body: r.body.split(OLD).join(NEW) },
      });
    }
    console.log(`Rebranded ${rows.length} notification(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error('rebrand-data failed:', err);
  process.exitCode = 1;
});
