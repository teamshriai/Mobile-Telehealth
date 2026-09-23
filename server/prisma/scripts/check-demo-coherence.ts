/**
 * Asserts that the demo clinical record is a connected graph.
 *
 * ⚠️ This is the check that would have caught the original defect: 30 notes,
 * 14 prescriptions, 22 problems and 7 instructions, none of which referenced an
 * encounter. Every count looked healthy; the record was incoherent. Counts are
 * not evidence of coherence, so this asserts the edges instead.
 *
 * Exits non-zero on any orphan so it can gate a demo.
 */
import { PrismaClient } from '@prisma/client';

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const problems: string[] = [];

  try {
    const orphans = {
      notes: await prisma.clinicalNote.count({ where: { encounterId: null } }),
      prescriptions: await prisma.prescription.count({ where: { encounterId: null } }),
      problems: await prisma.problem.count({ where: { onsetEncounterId: null } }),
      instructions: await prisma.patientInstruction.count({ where: { encounterId: null } }),
    };

    console.log('Orphans (records belonging to no visit):');
    for (const [k, v] of Object.entries(orphans)) {
      console.log(`  ${k.padEnd(15)} ${v}`);
      if (v > 0) problems.push(`${v} ${k} reference no encounter`);
    }

    // A note's coded problem should exist on that patient's problem list —
    // otherwise the chart shows a note about something the record denies.
    const notes = await prisma.clinicalNote.findMany({
      where: { problemCode: { not: null } },
      select: { id: true, patientId: true, problemCode: true },
    });
    let codeMismatches = 0;
    for (const n of notes) {
      const has = await prisma.problem.count({
        where: { patientId: n.patientId, code: n.problemCode as string },
      });
      if (has === 0) codeMismatches += 1;
    }
    console.log(`\nNotes whose coded problem is absent from the patient's list: ${codeMismatches}`);
    if (codeMismatches > 0) problems.push(`${codeMismatches} notes code a problem the patient does not have`);

    // A prescription's indication should likewise be a problem that patient has.
    const items = await prisma.prescriptionItem.findMany({
      where: { indicationCode: { not: null } },
      select: { indicationCode: true, prescription: { select: { patientId: true } } },
    });
    let indicationMismatches = 0;
    for (const i of items) {
      const has = await prisma.problem.count({
        where: { patientId: i.prescription.patientId, code: i.indicationCode as string },
      });
      if (has === 0) indicationMismatches += 1;
    }
    console.log(`Prescription items indicating a problem the patient lacks: ${indicationMismatches}`);
    if (indicationMismatches > 0) problems.push(`${indicationMismatches} prescription items indicate an absent problem`);

    /**
     * A visit with nothing attached is a shell.
     *
     * ⚠️ Orphan-counting alone does not catch this. The stroke patient's
     * encounter had zero orphans hanging off it for the simple reason that it
     * had nothing hanging off it at all — and his is the chart the demo opens
     * first. An empty visit passes every edge check and still opens onto a
     * blank screen, so it is checked from the other direction.
     */
    const shells = await prisma.encounter.findMany({
      select: {
        visitId: true,
        _count: {
          select: { clinicalNotes: true, problems: true, prescriptions: true, instructions: true },
        },
      },
    });
    const empty = shells.filter(
      (e) =>
        e._count.clinicalNotes === 0 &&
        e._count.problems === 0 &&
        e._count.prescriptions === 0 &&
        e._count.instructions === 0,
    );
    console.log(`Visits with no clinical content at all: ${empty.length}`);
    if (empty.length > 0) {
      for (const e of empty) console.log(`   · ${e.visitId}`);
      problems.push(`${empty.length} visit(s) open onto nothing`);
    }

    // Nothing may reference a visit in the future.
    const future = await prisma.encounter.count({ where: { startedAt: { gt: new Date() } } });
    console.log(`Encounters starting in the future: ${future}`);
    if (future > 0) problems.push(`${future} encounters start in the future`);

    console.log('');
    if (problems.length === 0) {
      console.log('✅ Coherent — every clinical record belongs to a visit, and every code resolves.');
      return;
    }
    console.log('❌ Incoherent:');
    for (const p of problems) console.log(`   · ${p}`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
