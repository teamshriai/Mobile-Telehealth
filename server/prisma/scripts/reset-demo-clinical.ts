/**
 * Clears the demo clinical content so `db:demo:clinic` can rebuild it coherently.
 *
 * ⚠️ WHY THIS EXISTS. The clinical content used to be seeded table-by-table —
 * a list of notes, a list of problems, a list of prescriptions — none of which
 * referenced an encounter. Those rows are now seeded as visits instead, but the
 * old orphans are already in the database and the seed's idempotency guards
 * (which match on patient + code) will see them and skip creating the linked
 * versions. The result would be a database that looks seeded and is still
 * incoherent.
 *
 * ⚠️ WHAT IT DELETES. Only rows with **no encounter link at all** — which is
 * precisely the old-format data, because everything the visit seeder writes is
 * linked by construction. A row that belongs to a visit is never touched, so
 * running this after the rebuild is a no-op.
 *
 * ⚠️ WHAT IT WILL NOT DO. It does not touch patients, appointments, care teams,
 * users, the drug formulary, allergy rules, the diagnosis catalogue or
 * templates. It is scoped to per-patient clinical content only.
 *
 * This is a demo-database tool. It is not wired into any application path.
 */
import { PrismaClient } from '@prisma/client';

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    // Addenda first — they hang off notes and would block the delete.
    const orphanNotes = await prisma.clinicalNote.findMany({
      where: { encounterId: null },
      select: { id: true },
    });
    const noteIds = orphanNotes.map((n) => n.id);

    const addenda = noteIds.length === 0
      ? { count: 0 }
      : await prisma.clinicalNoteAddendum.deleteMany({ where: { noteId: { in: noteIds } } });

    const notes = await prisma.clinicalNote.deleteMany({ where: { encounterId: null } });

    // Items cascade from the prescription, so the parent delete is enough.
    const rx = await prisma.prescription.deleteMany({ where: { encounterId: null } });
    const problems = await prisma.problem.deleteMany({ where: { onsetEncounterId: null } });
    const instructions = await prisma.patientInstruction.deleteMany({ where: { encounterId: null } });

    const total = notes.count + rx.count + problems.count + instructions.count;
    if (total === 0) {
      console.log('✓ no unlinked clinical content — every record already belongs to a visit');
      return;
    }

    console.log(
      `✓ cleared unlinked clinical content: ${notes.count} note(s) (+${addenda.count} addenda), ` +
        `${rx.count} prescription(s), ${problems.count} problem(s), ${instructions.count} instruction(s).\n` +
        '  Re-run `npm run db:demo:clinic` to rebuild them as visits.',
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main();
