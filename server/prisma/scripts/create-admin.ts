/**
 * Bootstrap an administrator account.
 *
 * ⚠️ WHY THIS EXISTS — A DEADLOCK, NOT A CONVENIENCE.
 *
 * `POST /hospital-admin/staff` is gated on `HospitalDoctorManage`, which only
 * `HospitalAdmin` holds. `POST /admin/hospital-admins` is gated on
 * `UserManageAny`, which only `Admin` holds. And once public registration was
 * locked to Patient, **nothing** could create either role — no endpoint, no
 * seed, no script. A fresh database could never produce a working clinician.
 *
 * Something has to be able to mint the first administrator from outside the
 * permission system, and the honest place for that is a deliberate CLI run by
 * whoever controls the database — not a public endpoint, and not a seeded
 * account with a known password. That is also the convention this codebase
 * already states for the `Admin` role: "seed/ops-created only, never
 * self-service".
 *
 * ⚠️ NO PASSWORD IS SET. The account signs in with mobile or email + OTP.
 *
 * Usage:
 *   npm run db:create-admin -- --email a@b.com --mobile 9876543210 \
 *       --first Asha --last Menon [--role Admin|HospitalAdmin] [--hospital "<name>"]
 */
import { PrismaClient, RoleName } from '@prisma/client';
import { normalizeMobile } from '../../src/utils/phone';
import { encryptField, hmacBlindIndex } from '../../src/utils/encryption';
import { sendPasswordSetupInvite } from '../../src/auth/passwordToken';

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main(): Promise<void> {
  const email = arg('email')?.trim().toLowerCase();
  const rawMobile = arg('mobile');
  const firstName = arg('first');
  const lastName = arg('last');
  const roleArg = (arg('role') ?? 'Admin') as RoleName;
  const hospitalName = arg('hospital');

  if (!email || !rawMobile || !firstName || !lastName) {
    console.error(
      'Usage: npm run db:create-admin -- --email <e> --mobile <10 digits> '
        + '--first <name> --last <name> [--role Admin|HospitalAdmin] [--hospital "<name>"]',
    );
    process.exit(1);
  }

  // ⚠️ Deliberately narrow. This script exists to break a bootstrap deadlock,
  // not to become a general user factory — every other role has a proper,
  // permission-gated endpoint and should be created through it so the act is
  // attributable to a named administrator in the audit trail.
  if (roleArg !== RoleName.Admin && roleArg !== RoleName.HospitalAdmin) {
    console.error(`--role must be Admin or HospitalAdmin (got "${String(roleArg)}").`);
    process.exit(1);
  }

  const mobile = normalizeMobile(rawMobile);
  if (mobile === null) {
    console.error(`"${rawMobile}" is not a valid Indian mobile number.`);
    process.exit(1);
  }
  const mobileHash = hmacBlindIndex(mobile);

  // Checked separately so the operator gets a sentence naming which collided.
  if (await prisma.user.findUnique({ where: { email } })) {
    console.error(`An account already exists with ${email}.`);
    process.exit(1);
  }
  if (await prisma.user.findFirst({ where: { mobileHash } })) {
    console.error('An account already uses that mobile number.');
    process.exit(1);
  }

  const role = await prisma.role.findUnique({ where: { name: roleArg }, select: { id: true } });
  if (role === null) {
    console.error(`Role ${roleArg} is not seeded. Run "npm run db:seed" first.`);
    process.exit(1);
  }

  let hospitalId: string | null = null;
  if (hospitalName !== undefined) {
    const h = await prisma.hospital.findFirst({
      where: { name: hospitalName },
      select: { id: true },
    });
    if (h === null) {
      console.error(`No hospital named "${hospitalName}".`);
      process.exit(1);
    }
    hospitalId = h.id;
  }

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        email,
        passwordHash: null,
        mobile: encryptField(mobile),
        mobileHash,
        roleId: role.id,
        isVerified: true,
        isActive: true,
      },
      select: { id: true },
    });
    await tx.staffProfile.create({
      data: {
        userId: u.id,
        firstName,
        lastName,
        phoneNumber: mobile,
        hospitalId,
        // ⚠️ A hospital admin cannot provision anybody until their staff
        // profile carries a hospitalId — `requireHospitalScope` refuses
        // otherwise. Passing --hospital here saves a bootstrap step; without
        // it they must run the hospital create/join flow on first login.
        isVerified: true,
        verifiedAt: new Date(),
        onboardingCompletedAt: hospitalId === null ? null : new Date(),
      },
    });
    return u;
  });

  // ⚠️ Staff sign in with email + password, and the CLI never takes a
  // password on the command line (it would land in shell history). The
  // person sets their own through this link instead.
  const invite = await sendPasswordSetupInvite(user.id, email);

  console.log(`\n✅ ${roleArg} created.`);
  console.log(`   ${firstName} ${lastName} · ${email}`);
  console.log(
    invite.sent
      ? `   A set-password link has been emailed to ${email}.`
      : '   Email not delivered — the set-password link is in server/.otp-outbox.json (dev only).\n'
        + '   Or use "Forgot password" on the sign-in page.',
  );
  if (roleArg === RoleName.HospitalAdmin && hospitalId === null) {
    console.log('   ⚠️  No hospital linked — they must create or join one before adding staff.');
  }
  console.log(`   id: ${user.id}\n`);
  await prisma.$disconnect();
}

void main();
