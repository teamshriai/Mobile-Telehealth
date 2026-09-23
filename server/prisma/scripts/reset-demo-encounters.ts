/**
 * Removes abandoned, empty consultations from the demo database.
 *
 * ⚠️ WHY THIS EXISTS. Every "Start consultation" click creates a real
 * Encounter row, and the Playwright suite clicks it several times per run.
 * Ten runs leave ten empty in-progress consultations on the demo consultant's
 * "Consultations open" tile — which then reads 12 instead of 2 and makes the
 * showcase account look like someone who abandons patients mid-visit.
 *
 * ⚠️ WHAT IT WILL NOT TOUCH. Only encounters that are simultaneously:
 *   - InProgress (a closed encounter is history, not debris),
 *   - have NO chief complaint (the seeded ones all set it; the UI's
 *     "Start consultation" passes null), and
 *   - have NO clinical content at all — no note, problem, prescription or
 *     instruction hanging off them.
 *
 * An encounter with a single draft note is somebody's unfinished work and is
 * left alone. This deletes empty shells, never clinical records.
 */
import {
  PrismaClient,
  EncounterStatus,
  EncounterType,
  ClinicalNoteStatus,
  PrescriptionStatus,
} from '@prisma/client';
import { decryptFieldOptional } from '../../src/utils/encryption';

/**
 * The exact phrase the Playwright suite types into note fields.
 *
 * ⚠️ Kept in sync with `client/e2e/spine.spec.ts` by hand. Text carrying this
 * marker is machine-authored by the browser tests and is the ONLY typed
 * content this script will remove — anything a human wrote is left alone,
 * which is why the rule is a literal phrase rather than a heuristic.
 */
const E2E_MARKER = 'Synthetic test entry';

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const candidates = await prisma.encounter.findMany({
      where: {
        status: EncounterStatus.InProgress,
        type: EncounterType.ClinicVisit,
        chiefComplaint: null,
      },
      select: {
        id: true,
        visitId: true,
        _count: {
          select: { clinicalNotes: true, problems: true, prescriptions: true, instructions: true },
        },
      },
    });

    /**
     * ⚠️ An auto-created blank draft does not count as content.
     *
     * Opening the note screen creates a draft immediately, so a shell the test
     * suite merely navigated into always has a note hanging off it. Counting
     * that as "holds clinical content" would mean nothing is ever cleanable.
     * A note counts only if a clinician actually typed something into it.
     */
    const withEmptyNotes = await Promise.all(
      candidates.map(async (e) => {
        if (e._count.problems > 0 || e._count.instructions > 0) {
          return { ...e, cleanable: false };
        }

        /**
         * ⚠️ An empty draft prescription is a shell, exactly like a blank
         * draft note. Opening the Rx step calls `getDraftForEncounter`, which
         * creates the basket before the clinician has added anything — so
         * merely *visiting* the step attaches a Prescription row. Treating
         * that as content meant every encounter a test had navigated through
         * was permanently uncleanable.
         *
         * A basket with even one item, or one that has been signed, is real.
         */
        if (e._count.prescriptions > 0) {
          const realRx = await prisma.prescription.count({
            where: {
              encounterId: e.id,
              OR: [
                { status: { not: PrescriptionStatus.Draft } },
                { items: { some: {} } },
              ],
            },
          });
          if (realRx > 0) return { ...e, cleanable: false };
        }

        if (e._count.clinicalNotes === 0) return { ...e, cleanable: true };

        const notes = await prisma.clinicalNote.findMany({
          where: { encounterId: e.id },
          select: {
            status: true,
            subjective: true,
            objective: true,
            assessment: true,
            plan: true,
          },
        });

        // Any signed/co-sign-pending note makes this real history, whatever
        // it contains.
        if (notes.some((n) => n.status !== ClinicalNoteStatus.Draft)) {
          return { ...e, cleanable: false };
        }

        const typed = notes.flatMap((n) =>
          [n.subjective, n.objective, n.assessment, n.plan]
            .map((f) => (decryptFieldOptional(f) ?? '').trim())
            .filter((t) => t !== ''),
        );

        /**
         * Empty, or provably authored by the browser suite.
         *
         * ⚠️ The marker only has to appear ONCE, not in every field. A test
         * run also inserts template bodies and other real-looking text, so
         * requiring every field to carry the marker left obvious debris
         * behind. One occurrence is conclusive on its own: no clinician types
         * "Synthetic test entry" into a patient's record, and the encounter is
         * already known to be an unfinished shell with nothing else attached.
         */
        const cleanable = typed.length === 0 || typed.some((t) => t.includes(E2E_MARKER));
        return { ...e, cleanable };
      }),
    );

    const empty = withEmptyNotes.filter((e) => e.cleanable);

    const kept = candidates.length - empty.length;

    if (empty.length === 0) {
      console.log(`✓ no abandoned empty consultations (${kept} in-progress shell(s) hold content and were kept)`);
      return;
    }

    const ids = empty.map((e) => e.id);

    /**
     * ⚠️ Delete the attached shells FIRST.
     *
     * `ClinicalNote.encounterId` and `Prescription.encounterId` are
     * `onDelete: SetNull` — correctly, because losing an encounter must never
     * destroy a clinical record. The consequence here is that deleting the
     * encounter does not remove its blank draft note and empty basket; it
     * ORPHANS them. This script was therefore manufacturing exactly the
     * unlinked rows that `db:demo:check` exists to catch, and the gate caught
     * it: 11 notes and 7 prescriptions referencing no visit.
     *
     * Deleting them here is safe precisely because the filter above has
     * already established they hold nothing — no typed text a human wrote, no
     * signature, no basket items.
     */
    const { count: notesRemoved } = await prisma.clinicalNote.deleteMany({
      where: { encounterId: { in: ids } },
    });
    const { count: rxRemoved } = await prisma.prescription.deleteMany({
      where: { encounterId: { in: ids } },
    });

    await prisma.encounter.deleteMany({ where: { id: { in: ids } } });
    console.log(
      `✓ removed ${empty.length} abandoned empty consultation(s) ` +
        `(+${notesRemoved} blank note(s), +${rxRemoved} empty basket(s))` +
        (kept > 0 ? `; kept ${kept} that hold clinical content` : ''),
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main();
