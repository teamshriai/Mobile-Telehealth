/**
 * Removes the duplicate visits that daily re-runs of the demo seed created.
 *
 * ⚠️ DRY RUN BY DEFAULT. Prints exactly what it would keep, move and delete;
 * writes only with `--apply`, one transaction per patient. `--include-blank`
 * also removes the blank-reason consultations left on a demo patient by the
 * clinician browser suite (they have a signed note but no chief complaint).
 *
 * ⚠️ SAME REASON IS NOT ENOUGH. A patient can have two real visits with the
 * same reason months apart (SD-P-01's "Six-month thyroid review" in June and
 * in today's clinic). Copies made by re-runs sit a day or so apart, so a group
 * is split wherever two visits are more than CLUSTER_GAP_DAYS apart, and only
 * visits within one cluster are treated as copies of each other.
 *
 * ⚠️ DEMO PATIENTS ONLY — the pitch account and SD-P-01 — and only rows the
 * seed made twice. A visit is a duplicate of another when both have the same
 * type and the same (decrypted) reason for visit. In each group one visit is
 * kept:
 *   1. the one carrying a stroke assessment (the admission the rest hangs on);
 *   2. otherwise the one whose prescriptions carry the most dose-log entries
 *      (so the Medicines history keeps its line);
 *   3. otherwise the newest.
 * Content that exists only on a duplicate — for example a prescription the
 * seed wrote onto a later copy — is MOVED to the kept visit, not deleted.
 * Conditions are never deleted; ones that pointed at a removed visit are
 * re-pointed at the kept one.
 */
import { PrismaClient, type Prisma } from '@prisma/client';
import { decryptFieldOptional } from '../../src/utils/encryption';

const DEMO_PATIENTS = ['demouser.strokeai@gmail.com', 'demo.patient.krishnan@stroke-ai.invalid'];
const APPLY = process.argv.includes('--apply');
const CLUSTER_GAP_DAYS = 10;
const INCLUDE_BLANK = process.argv.includes('--include-blank');

const prisma = new PrismaClient();

const INCLUDE = {
  strokeAssessment: { select: { id: true } },
  clinicalNotes: { select: { id: true, status: true, problemCode: true } },
  prescriptions: {
    select: {
      id: true,
      rxNumber: true,
      items: {
        select: {
          drugId: true,
          drug: { select: { genericName: true } },
          _count: { select: { doseLogs: true, refillRequests: true } },
        },
      },
    },
  },
  instructions: { select: { id: true, title: true } },
  problems: { select: { id: true, code: true } },
} satisfies Prisma.EncounterInclude;

type Enc = Prisma.EncounterGetPayload<{ include: typeof INCLUDE }>;

function plain(v: string | null | undefined): string {
  if (v === null || v === undefined) return '';
  try {
    return (decryptFieldOptional(v) ?? '').trim();
  } catch {
    return v.trim();
  }
}

const doseLogs = (e: Enc): number =>
  e.prescriptions.reduce(
    (n, p) => n + p.items.reduce((m, i) => m + i._count.doseLogs + i._count.refillRequests, 0),
    0,
  );

const drugsOf = (e: Enc): Set<string> =>
  new Set(e.prescriptions.flatMap((p) => p.items.map((i) => i.drugId)));

function pickKeeper(group: Enc[]): Enc {
  const withAssessment = group.filter((e) => e.strokeAssessment !== null);
  if (withAssessment.length > 0) return withAssessment[0];
  return [...group].sort(
    (a, b) => doseLogs(b) - doseLogs(a) || b.createdAt.getTime() - a.createdAt.getTime(),
  )[0];
}

interface Plan {
  keep: Enc;
  remove: Enc[];
  moveRx: Array<{ rxId: string; label: string; to: string }>;
  moveNotes: Array<{ noteId: string; to: string }>;
  moveInstructions: Array<{ id: string; to: string }>;
  repointProblems: Array<{ id: string; code: string; to: string }>;
}

function planGroup(group: Enc[]): Plan {
  const keep = pickKeeper(group);
  const remove = group.filter((e) => e.id !== keep.id);
  const keptDrugs = drugsOf(keep);
  const keptNoteKeys = new Set(keep.clinicalNotes.map((n) => `${n.status}|${n.problemCode ?? ''}`));
  const keptInstr = new Set(keep.instructions.map((i) => plain(i.title)));
  const plan: Plan = {
    keep,
    remove,
    moveRx: [],
    moveNotes: [],
    moveInstructions: [],
    repointProblems: [],
  };
  for (const dup of remove) {
    for (const rx of dup.prescriptions) {
      const drugs = rx.items.map((i) => i.drugId);
      if (
        drugs.some((d) => !keptDrugs.has(d)) ||
        rx.items.some((i) => i._count.doseLogs + i._count.refillRequests > 0)
      ) {
        plan.moveRx.push({
          rxId: rx.id,
          label: `${rx.rxNumber} (${rx.items.map((i) => i.drug.genericName).join(', ')})`,
          to: keep.id,
        });
        drugs.forEach((d) => keptDrugs.add(d));
      }
    }
    for (const n of dup.clinicalNotes) {
      const k = `${n.status}|${n.problemCode ?? ''}`;
      if (!keptNoteKeys.has(k)) {
        plan.moveNotes.push({ noteId: n.id, to: keep.id });
        keptNoteKeys.add(k);
      }
    }
    for (const i of dup.instructions) {
      const t = plain(i.title);
      if (!keptInstr.has(t)) {
        plan.moveInstructions.push({ id: i.id, to: keep.id });
        keptInstr.add(t);
      }
    }
    for (const p of dup.problems)
      plan.repointProblems.push({ id: p.id, code: p.code, to: keep.id });
  }
  return plan;
}

const day = (d: Date): string => d.toISOString().slice(0, 10);

async function main(): Promise<void> {
  console.log(
    APPLY ? '=== APPLY ===' : '=== DRY RUN (nothing is written; add --apply to write) ===',
  );
  for (const email of DEMO_PATIENTS) {
    const patient = await prisma.patientProfile.findFirst({
      where: { user: { email } },
      select: { id: true, firstName: true, lastName: true, isSyntheticData: true },
    });
    if (patient === null) continue;
    if (!patient.isSyntheticData) {
      console.log(`skip ${email}: not marked synthetic`);
      continue;
    }
    const encounters = await prisma.encounter.findMany({
      where: { patientId: patient.id },
      include: INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
    const groups = new Map<string, Enc[]>();
    const blank: Enc[] = [];
    for (const e of encounters) {
      const reason = plain(e.chiefComplaint);
      if (reason === '') {
        blank.push(e);
        continue;
      }
      const k = `${e.type}|${reason}`;
      groups.set(k, [...(groups.get(k) ?? []), e]);
    }
    // Split each same-reason group into clusters of visits close in time.
    const clusters: Array<[string, Enc[]]> = [];
    for (const [k, g] of groups) {
      const sorted = [...g].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
      let current: Enc[] = [];
      for (const e of sorted) {
        const prev = current[current.length - 1];
        if (
          prev !== undefined &&
          e.startedAt.getTime() - prev.startedAt.getTime() > CLUSTER_GAP_DAYS * 86_400_000
        ) {
          clusters.push([k, current]);
          current = [];
        }
        current.push(e);
      }
      if (current.length > 0) clusters.push([k, current]);
    }
    const plans = clusters
      .filter(([, g]) => g.length > 1)
      .map(([k, g]) => ({ k, plan: planGroup(g) }));

    console.log(`\n── ${patient.firstName} ${patient.lastName} · ${encounters.length} visits`);
    for (const { k, plan } of plans) {
      const [type, reason] = k.split('|');
      console.log(`  ${type} · "${reason.slice(0, 60)}" — ${plan.remove.length + 1} copies`);
      console.log(
        `    keep   ${plan.keep.visitId} ${day(plan.keep.startedAt)}${plan.keep.strokeAssessment ? ' (stroke assessment)' : ''} · notes ${plan.keep.clinicalNotes.length} · rx ${plan.keep.prescriptions.length} · dose/refill rows ${doseLogs(plan.keep)}`,
      );
      for (const r of plan.remove) {
        console.log(
          `    remove ${r.visitId} ${day(r.startedAt)} · notes ${r.clinicalNotes.length} · rx ${r.prescriptions.length} · instructions ${r.instructions.length}`,
        );
      }
      for (const m of plan.moveRx) console.log(`    move prescription ${m.label} → kept visit`);
      if (plan.moveNotes.length > 0)
        console.log(`    move ${plan.moveNotes.length} note(s) not already on the kept visit`);
      if (plan.moveInstructions.length > 0)
        console.log(
          `    move ${plan.moveInstructions.length} instruction(s) not already on the kept visit`,
        );
      if (plan.repointProblems.length > 0)
        console.log(
          `    re-point conditions ${plan.repointProblems.map((p) => p.code).join(', ')} → kept visit`,
        );
    }
    if (plans.length === 0) console.log('  no duplicate visits');
    if (blank.length > 0) {
      console.log(
        `  blank-reason visits (clinician e2e runs): ${blank.length}${INCLUDE_BLANK ? ' — will be removed' : ' — kept (add --include-blank to remove)'}`,
      );
    }

    if (!APPLY) continue;
    const removeIds = [
      ...plans.flatMap((p) => p.plan.remove.map((r) => r.id)),
      ...(INCLUDE_BLANK ? blank.map((b) => b.id) : []),
    ];
    if (removeIds.length === 0) continue;
    await prisma.$transaction(
      async (tx) => {
        for (const { plan } of plans) {
          for (const m of plan.moveRx)
            await tx.prescription.update({ where: { id: m.rxId }, data: { encounterId: m.to } });
          for (const m of plan.moveNotes)
            await tx.clinicalNote.update({ where: { id: m.noteId }, data: { encounterId: m.to } });
          for (const m of plan.moveInstructions)
            await tx.patientInstruction.update({
              where: { id: m.id },
              data: { encounterId: m.to },
            });
          for (const m of plan.repointProblems)
            await tx.problem.update({ where: { id: m.id }, data: { onsetEncounterId: m.to } });
        }
        // Whatever is still attached to a removed visit is a copy: delete it.
        // Addenda, prescription items, dose logs and refill requests cascade.
        const notes = await tx.clinicalNote.deleteMany({
          where: { encounterId: { in: removeIds } },
        });
        const rx = await tx.prescription.deleteMany({ where: { encounterId: { in: removeIds } } });
        const ins = await tx.patientInstruction.deleteMany({
          where: { encounterId: { in: removeIds } },
        });
        await tx.problem.updateMany({
          where: { onsetEncounterId: { in: removeIds } },
          data: { onsetEncounterId: null },
        });
        const enc = await tx.encounter.deleteMany({
          where: { id: { in: removeIds }, patientId: patient.id },
        });
        console.log(
          `  applied: removed ${enc.count} visit(s), ${notes.count} note(s), ${rx.count} prescription(s), ${ins.count} instruction(s)`,
        );
      },
      { timeout: 60_000 },
    );
  }
}

main()
  .catch((err: unknown) => {
    console.error('dedupe-demo-visits failed:', err);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
