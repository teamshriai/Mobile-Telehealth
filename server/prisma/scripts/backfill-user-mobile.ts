/**
 * Backfill `User.mobile` / `User.mobileHash` from the profile phone numbers.
 *
 * ⚠️ WHY THIS EXISTS. OTP login resolves an account by a blind index on the
 * mobile. Until this runs, every user has `mobileHash = NULL` and nobody can
 * log in by OTP at all. Modelled on `backfill-patient-identity.ts`, which does
 * the same decrypt → normalize → hash dance for `PatientProfile`.
 *
 * ⚠️ IT NEVER MERGES TWO USERS. If two accounts normalize to the same number,
 * both are REPORTED and NEITHER is written. A collision here is a data
 * question for a human — one of them is a duplicate account, or a family
 * shares a handset and one of them needs a different login identity. Guessing
 * would either lock somebody out or, far worse, let one person's OTP open
 * somebody else's chart.
 *
 * ⚠️ IT IS IDEMPOTENT. A user who already has a `mobileHash` is left alone, so
 * re-running after fixing one collision does not disturb everyone else.
 *
 * Usage:  npx tsx prisma/scripts/backfill-user-mobile.ts [--apply]
 * Without --apply it is a dry run and writes nothing.
 */
import { PrismaClient } from '@prisma/client';
import { normalizeMobile } from '../../src/utils/phone';
import { encryptField, hmacBlindIndex, decryptFieldOptional } from '../../src/utils/encryption';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

interface Candidate {
  userId: string;
  email: string;
  role: string;
  source: 'doctorProfile' | 'staffProfile' | 'patientProfile';
  normalized: string;
}

async function main(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      email: true,
      mobileHash: true,
      role: { select: { name: true } },
      doctorProfile: { select: { phoneNumber: true } },
      staffProfile: { select: { phoneNumber: true } },
      patientProfile: { select: { phoneNumber: true } },
    },
  });

  const candidates: Candidate[] = [];
  const noMobile: Array<{ email: string; role: string }> = [];
  let alreadyDone = 0;

  for (const u of users) {
    if (u.mobileHash !== null) {
      alreadyDone++;
      continue;
    }

    // ⚠️ Doctor/staff phones are stored PLAINTEXT; patient phones are
    // ENCRYPTED. Reading them the same way would silently hash ciphertext for
    // patients and produce an index that can never match a typed number.
    let raw: string | null = null;
    let source: Candidate['source'] | null = null;

    if (u.doctorProfile?.phoneNumber != null) {
      raw = u.doctorProfile.phoneNumber;
      source = 'doctorProfile';
    } else if (u.staffProfile?.phoneNumber != null) {
      raw = u.staffProfile.phoneNumber;
      source = 'staffProfile';
    } else if (u.patientProfile?.phoneNumber != null) {
      raw = decryptFieldOptional(u.patientProfile.phoneNumber) ?? null;
      source = 'patientProfile';
    }

    const normalized = raw === null ? null : normalizeMobile(raw);
    if (normalized === null || source === null) {
      noMobile.push({ email: u.email, role: u.role.name });
      continue;
    }
    candidates.push({ userId: u.id, email: u.email, role: u.role.name, source, normalized });
  }

  // ── Collisions ────────────────────────────────────────────────────────────
  const byNumber = new Map<string, Candidate[]>();
  for (const c of candidates) {
    byNumber.set(c.normalized, [...(byNumber.get(c.normalized) ?? []), c]);
  }
  const collisions = [...byNumber.entries()].filter(([, list]) => list.length > 1);

  // Also collide against numbers already assigned to somebody else.
  const writable: Candidate[] = [];
  for (const [number, list] of byNumber) {
    if (list.length > 1) continue;
    const hash = hmacBlindIndex(number);
    const taken = await prisma.user.findFirst({
      where: { mobileHash: hash, id: { not: list[0]!.userId } },
      select: { email: true },
    });
    if (taken !== null) {
      collisions.push([number, [...list, { ...list[0]!, email: `${taken.email} (already holds it)` }]]);
      continue;
    }
    writable.push(list[0]!);
  }

  console.log(`\n${APPLY ? 'APPLYING' : 'DRY RUN — pass --apply to write'}\n`);
  console.log(`users examined     : ${users.length}`);
  console.log(`already backfilled : ${alreadyDone}`);
  console.log(`will be written    : ${writable.length}`);
  console.log(`collisions (SKIPPED, nothing merged): ${collisions.length}`);
  for (const [number, list] of collisions) {
    console.log(`  ⚠️  ${number} claimed by ${list.length}: ${list.map((c) => c.email).join(', ')}`);
  }

  // ⚠️ The honest part. These accounts CANNOT log in by OTP until somebody
  // registers a mobile for them. Printed loudly rather than left to be
  // discovered by a locked-out clinician on a ward.
  console.log(`\nno usable mobile — these accounts cannot use OTP login: ${noMobile.length}`);
  for (const u of noMobile) console.log(`  ✗ ${u.role.padEnd(14)} ${u.email}`);

  if (!APPLY) {
    console.log('\nNothing written.\n');
    await prisma.$disconnect();
    return;
  }

  let written = 0;
  for (const c of writable) {
    await prisma.user.update({
      where: { id: c.userId },
      data: { mobile: encryptField(c.normalized), mobileHash: hmacBlindIndex(c.normalized) },
    });
    written++;
    console.log(`  ✓ ${c.email} ← ${c.source}`);
  }
  console.log(`\n✅ ${written} user(s) given a mobile identity.\n`);
  await prisma.$disconnect();
}

void main();
