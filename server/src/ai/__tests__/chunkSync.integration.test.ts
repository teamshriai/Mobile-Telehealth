import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../lib/prisma';
import { encryptField } from '../../utils/encryption';
import { buildPatientContext } from '../context/patientContext';
import { syncPatientChunks, listSyncedChunks } from '../memory/chunkSync';
import { AiChunkSource } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Integration tests against the real database and the real embedder.
//
// Unlike the rest of this suite, these are not pure-function tests — chunk
// sync's entire job is keeping a Postgres table in step with other Postgres
// tables, so a mock would test nothing real. They run against the demo
// account (isSyntheticData: true), which is exactly the fixture this
// codebase already treats as safe to read and write in verification.
//
// Every mutation this file makes is undone in a `finally` block so a test
// run never leaves the demo account's seed data altered, and the delete-path
// test creates and destroys its own row rather than touching any existing
// seeded appointment.
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_EMAIL = 'demouser.strokeai@gmail.com';

async function getDemoUserId(): Promise<string> {
  const user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL }, select: { id: true } });
  if (user === null) {
    throw new Error(
      `Fixture missing: ${DEMO_EMAIL}. Run npm run db:seed && npm run db:demo:enrich first.`,
    );
  }
  return user.id;
}

describe('chunk sync — stale retrieval after a clinical-data update', () => {
  it('reflects an edited medication list on the very next sync, not the one after', async () => {
    const userId = await getDemoUserId();
    const profile = await prisma.patientProfile.findFirstOrThrow({
      where: { userId, deletedAt: null },
      select: { id: true, currentMedications: true },
    });
    const originalMedications = profile.currentMedications;

    try {
      // 1. Sync the record as it stands today, so we have a known baseline.
      const before = await buildPatientContext(userId);
      assert.notEqual(before, null);
      await syncPatientChunks(userId, before!);
      const chunksBefore = await listSyncedChunks(userId, profile.id);
      const medsChunkBefore = chunksBefore.find((c) =>
        c.text.startsWith('Medicines you listed yourself'),
      );
      assert.ok(medsChunkBefore, 'expected a medicines chunk to exist before the edit');
      assert.ok(
        !medsChunkBefore.text.includes('Rivaroxaban'),
        'fixture assumption: Rivaroxaban not prescribed yet',
      );

      // 2. Make a real edit, the same way the profile update endpoint would
      //    (through encryptField — this column is encrypted at rest).
      const updatedText =
        'Clopidogrel 75mg once daily; Rivaroxaban 20mg once daily (added for test)';
      await prisma.patientProfile.update({
        where: { id: profile.id },
        data: { currentMedications: encryptField(updatedText) },
      });

      // 3. Re-sync ONCE and assert the new drug is visible immediately — this
      //    is the exact property a stale cache would violate.
      const after = await buildPatientContext(userId);
      await syncPatientChunks(userId, after!);
      const chunksAfter = await listSyncedChunks(userId, profile.id);
      const medsChunkAfter = chunksAfter.find((c) =>
        c.text.startsWith('Medicines you listed yourself'),
      );
      assert.ok(medsChunkAfter, 'expected a medicines chunk to exist after the edit');
      assert.ok(
        medsChunkAfter.text.includes('Rivaroxaban'),
        'the newly-added medication must be retrievable on the very next turn',
      );

      // 4. And there must be exactly ONE medicines chunk — an update, not an
      //    accumulation of stale duplicates.
      const medsChunks = chunksAfter.filter(
        (c) =>
          c.sourceType === AiChunkSource.ProfileMedical &&
          c.text.startsWith('Medicines you listed yourself'),
      );
      assert.equal(medsChunks.length, 1, 'editing a field must update its chunk, not duplicate it');
    } finally {
      // Restore the demo account exactly as it was.
      await prisma.patientProfile.update({
        where: { id: profile.id },
        data: { currentMedications: originalMedications },
      });
      const restored = await buildPatientContext(userId);
      await syncPatientChunks(userId, restored!);
    }
  });
});

describe('chunk sync — stale retrieval after a clinical-data delete', () => {
  it('stops surfacing a deleted appointment on the very next sync', async () => {
    const userId = await getDemoUserId();
    const profile = await prisma.patientProfile.findFirstOrThrow({
      where: { userId, deletedAt: null },
      select: { id: true },
    });
    const doctor = await prisma.doctorProfile.findFirstOrThrow({ select: { id: true } });

    // Create a throwaway appointment so this test never touches real seed
    // data — it deletes only what it created.
    const testAppointment = await prisma.appointment.create({
      data: {
        patientId: profile.id,
        doctorId: doctor.id,
        scheduledAt: new Date(Date.now() + 7 * 86_400_000),
        durationMins: 30,
        mode: 'InPerson',
        status: 'Requested',
        reason: encryptField('TEMPORARY TEST APPOINTMENT — chunk sync delete test'),
      },
    });

    try {
      // 1. Sync while the appointment exists — its chunk must appear.
      const withAppointment = await buildPatientContext(userId);
      await syncPatientChunks(userId, withAppointment!);
      const chunksWithAppt = await listSyncedChunks(userId, profile.id);
      assert.ok(
        chunksWithAppt.some((c) => c.text.includes('TEMPORARY TEST APPOINTMENT')),
        'the test appointment should have produced a retrievable chunk',
      );

      // 2. Delete it, the way a real cancellation-and-removal would.
      await prisma.appointment.delete({ where: { id: testAppointment.id } });

      // 3. Re-sync ONCE and assert the chunk is gone — not merely stale, but
      //    actually removed, so it can never again be retrieved or cited.
      const withoutAppointment = await buildPatientContext(userId);
      await syncPatientChunks(userId, withoutAppointment!);
      const chunksAfterDelete = await listSyncedChunks(userId, profile.id);
      assert.ok(
        !chunksAfterDelete.some((c) => c.text.includes('TEMPORARY TEST APPOINTMENT')),
        'a deleted source row must not still be retrievable — the tombstone pass must remove its chunk',
      );

      // 4. And the row itself must be gone from ai_memory_chunks, not just
      //    absent from listSyncedChunks's filtering.
      const orphan = await prisma.aiMemoryChunk.findFirst({
        where: {
          ownerUserId: userId,
          sourceType: AiChunkSource.Appointment,
          sourceId: testAppointment.id,
        },
      });
      assert.equal(
        orphan,
        null,
        'the chunk row for a deleted appointment must be deleted, not merely hidden',
      );
    } finally {
      // Best-effort cleanup in case an assertion above threw before the
      // delete happened.
      await prisma.appointment.deleteMany({ where: { id: testAppointment.id } }).catch(() => {});
    }
  });
});
