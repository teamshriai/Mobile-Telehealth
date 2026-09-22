/**
 * encrypt-cancel-reasons.ts
 *
 * One-off backfill. Appointment.cancelReason was written in plaintext while
 * `reason` and `notes` on the same table were encrypted at rest, even though
 * a cancellation reason ("symptoms worsened, admitted via ED") is exactly as
 * identifying as the booking reason. The scheduling phase added it to
 * appointment.repository's ENCRYPTED_FIELDS; this converts the rows written
 * before that, because decryptField throws on a value that is not ciphertext
 * and every read of an old row would otherwise 500.
 *
 * Idempotent: a value that already parses as ciphertext is skipped, so
 * re-running is safe and double-encryption is impossible.
 *
 *   npm run db:encrypt:cancel-reasons
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { encryptField, decryptField } from '../../src/utils/encryption';

const prisma = new PrismaClient();

/** Ciphertext is "ivB64.authTagB64.ciphertextB64" and is authenticated, so a
 *  successful decrypt is the only reliable test — a plaintext value that
 *  happens to contain two dots would fool a format check. */
function isAlreadyEncrypted(value: string): boolean {
  try {
    decryptField(value);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const rows = await prisma.appointment.findMany({
    where: { cancelReason: { not: null } },
    select: { id: true, cancelReason: true },
  });

  console.log(`Found ${rows.length} appointment(s) with a cancellation reason.`);

  let converted = 0;
  let skipped = 0;

  for (const row of rows) {
    if (row.cancelReason === null) continue;

    if (isAlreadyEncrypted(row.cancelReason)) {
      skipped++;
      continue;
    }

    await prisma.appointment.update({
      where: { id: row.id },
      data: { cancelReason: encryptField(row.cancelReason) },
    });
    converted++;
    // The id only — printing the reason would put the PHI this script exists
    // to protect into a terminal scrollback and a CI log.
    console.log(`  ✓ encrypted cancelReason for appointment ${row.id}`);
  }

  console.log(`\nDone. ${converted} converted, ${skipped} already encrypted.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error('\n❌ encrypt-cancel-reasons failed:', err);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
