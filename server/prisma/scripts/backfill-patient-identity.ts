/**
 * Phase 6 backfill — populates shri_patient_id and phone_number_hash on
 * every existing patient_profiles row.
 *
 * WHY THIS CANNOT BE A SQL MIGRATION (see migration A's own header comment
 * for the full explanation):
 *   - shriPatientId needs the Crockford-Base32 generator in shriId.ts.
 *     Reimplementing its checksum in PL/pgSQL would create two independent
 *     implementations that must agree forever — a guaranteed future bug.
 *   - phoneNumberHash is mathematically impossible to compute in SQL: the
 *     plaintext phone is AES-256-GCM encrypted with a random IV, and the
 *     HMAC key that derives the hash lives in BLIND_INDEX_KEY, an
 *     application environment variable Postgres never sees.
 *
 * SAFETY:
 *   - Idempotent: only touches rows where shri_patient_id IS NULL, so
 *     re-running after a partial failure or a restart is always safe.
 *   - Read-then-write per row inside its own operation; a failure on one row
 *     does not corrupt any other row's data.
 *   - Fails LOUDLY (non-zero exit) on any decryption error. A decryption
 *     failure means an encryption-key mismatch — silently skipping it and
 *     writing a null/wrong hash would risk writing an incorrect blind index
 *     that could produce a false identity match later. This script would
 *     rather stop entirely than write one wrong hash.
 *   - Prints a before/after count so the operator can verify N/N before
 *     Migration B (which enforces NOT NULL + UNIQUE) is applied.
 *
 * Run with: npx tsx prisma/scripts/backfill-patient-identity.ts
 */
import { prisma } from '../../src/lib/prisma';
import { decryptFieldOptional } from '../../src/utils/encryption';
import { generateShriPatientId } from '../../src/utils/shriId';
import { computePhoneNumberHash } from '../../src/services/patientIdentity.service';
import { Prisma } from '@prisma/client';

const MAX_ID_ATTEMPTS = 5;

async function generateUniqueShriPatientId(): Promise<string> {
  for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt++) {
    const candidate = generateShriPatientId();
    // Raw SQL: shri_patient_id has no DB-level uniqueness constraint yet
    // (that is exactly what Migration B adds), so a plain existence check
    // against the raw column is what we have available at this point in the
    // sequence. A plain check (not generate-then-insert) is correct here
    // specifically because this script runs single-threaded and offline,
    // with no concurrent registration traffic — the TOCTOU race the
    // repository layer guards against in production cannot occur here.
    const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM patient_profiles WHERE shri_patient_id = $1 LIMIT 1`,
      candidate,
    );
    if (existing.length === 0) return candidate;
  }
  throw new Error(
    `Could not generate a unique SHRI-AI Patient ID after ${MAX_ID_ATTEMPTS} attempts. ` +
      'This should be statistically near-impossible — stopping rather than retrying forever.',
  );
}

async function main(): Promise<void> {
  console.log('─'.repeat(70));
  console.log('Phase 6 backfill: patient_profiles.shri_patient_id / phone_number_hash');
  console.log('─'.repeat(70));

  // Raw SQL for the "pending" query: the generated Prisma client types
  // shriPatientId as a non-nullable String (matching the target schema after
  // Migration B), so `where: { shriPatientId: null }` fails client-side
  // validation even though the LIVE column is still nullable at this point
  // in the migration sequence (Migration A ran, Migration B has not). This
  // is expected — the schema.prisma file describes the end state we are
  // migrating *to*, not the current transitional state.
  const pendingRows = await prisma.$queryRawUnsafe<
    Array<{ id: string; phone_number: string | null }>
  >(`SELECT id, phone_number FROM patient_profiles WHERE shri_patient_id IS NULL`);
  const pending = pendingRows.map((r) => ({ id: r.id, phoneNumber: r.phone_number }));

  const totalRows = await prisma.patientProfile.count();
  console.log(`Total patient_profiles rows: ${totalRows}`);
  console.log(`Rows needing backfill:       ${pending.length}`);

  if (pending.length === 0) {
    console.log('Nothing to do — every row already has a shriPatientId.');
    await verifyComplete(totalRows);
    return;
  }

  let idsAssigned = 0;
  let phonesHashed = 0;
  let decryptFailures = 0;

  for (const row of pending) {
    let phoneNumberHash: string | null = null;

    if (row.phoneNumber !== null) {
      try {
        const plaintext = decryptFieldOptional(row.phoneNumber);
        phoneNumberHash = computePhoneNumberHash(plaintext ?? null);
        if (phoneNumberHash !== null) phonesHashed++;
      } catch (err) {
        decryptFailures++;
        console.error(
          `  ❌ DECRYPTION FAILURE for patient_profiles.id=${row.id}: ` +
            `${err instanceof Error ? err.message : String(err)}`,
        );
        console.error(
          '     This means ENCRYPTION_KEY does not match the key used to encrypt this row.',
        );
        console.error('     Stopping immediately — refusing to write a wrong or absent hash.');
        process.exitCode = 1;
        await prisma.$disconnect();
        return;
      }
    }

    const shriPatientId = await generateUniqueShriPatientId();

    try {
      // Raw SQL for the same reason as the SELECT above: the generated
      // client's types assume Migration B (NOT NULL + UNIQUE) has already
      // run, but at this point in the sequence it has not yet — using the
      // typed client API here would fight its own generated types.
      await prisma.$executeRawUnsafe(
        `UPDATE patient_profiles SET shri_patient_id = $1, phone_number_hash = $2 WHERE id = $3::uuid`,
        shriPatientId,
        phoneNumberHash,
        row.id,
      );
      idsAssigned++;
      console.log(`  ✓ ${row.id} → ${shriPatientId}${phoneNumberHash ? ' (phone hashed)' : ''}`);
    } catch (err) {
      // A P2002 here would mean generateUniqueShriPatientId's own
      // just-checked availability was invalidated between check and write —
      // only possible if something else wrote to this table concurrently,
      // which should not happen during an offline backfill. Surface it
      // rather than silently retrying, since that would indicate the
      // "offline, single-writer" assumption this script relies on is false.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        console.error(
          `  ❌ Unexpected collision writing shriPatientId for ${row.id}. ` +
            'Another process may be writing to patient_profiles concurrently — ' +
            'this script assumes exclusive offline access. Stopping.',
        );
        process.exitCode = 1;
        await prisma.$disconnect();
        return;
      }
      throw err;
    }
  }

  console.log('─'.repeat(70));
  console.log(`Assigned ${idsAssigned} SHRI-AI Patient IDs.`);
  console.log(`Hashed ${phonesHashed} phone numbers (of ${pending.length} rows processed).`);
  console.log(`Decryption failures: ${decryptFailures}`);

  await verifyComplete(totalRows);
}

/** Re-queries the table and refuses to report success unless every row is done. */
async function verifyComplete(expectedTotal: number): Promise<void> {
  const stillNullRows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*)::bigint as count FROM patient_profiles WHERE shri_patient_id IS NULL`,
  );
  const stillNull = Number(stillNullRows[0]?.count ?? 0);
  const total = await prisma.patientProfile.count();

  console.log('─'.repeat(70));
  console.log(`Verification: ${total - stillNull}/${total} rows have a shriPatientId.`);

  if (stillNull > 0) {
    console.error(`❌ ${stillNull} row(s) still missing a shriPatientId. Migration B will FAIL.`);
    process.exitCode = 1;
    return;
  }
  if (total !== expectedTotal) {
    console.error(
      `❌ Row count changed during backfill (${expectedTotal} → ${total}) — ` +
        'unexpected concurrent write. Investigate before proceeding to Migration B.',
    );
    process.exitCode = 1;
    return;
  }

  console.log('✅ Backfill complete and verified. Safe to apply Migration B.');
}

main()
  .catch((err) => {
    console.error('Backfill script crashed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
