import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { PrismaClient } from '@prisma/client';
import { encryptField, encryptFieldOptional } from '../../../src/utils/encryption';
import { fileStore } from '../../../src/storage/fileStore';
import { buildInstance } from '../../../src/imaging/dicom/build';
import { uidFor } from '../../../src/imaging/dicom/uid';
import { CACHE_DIR } from './fetchCache';
import { contactSheet, greyPng, shrink, toGrey } from './decode';
import {
  ctAngioHead,
  ctBrain,
  ctCervicalSpine,
  mrBrain,
  xrCervicalLateral,
  xrSkullAp,
  type SeriesBuild,
} from './series';
import { ATTRIBUTION, RADIOLOGIST, STUDIES, type DemoStudy, type StudyDay } from './studies';
import { loadAnchors, PITCH_EMAIL } from '../reportsDemoSeed';

// ─────────────────────────────────────────────────────────────────────────────
// npm run db:demo:imaging [--pin] [--offline] [--preview] [--rebuild]
//
// Builds the pitch account's imaging studies from the NLM Visible Human
// sources: downloads (cached, checksum-pinned), converts to DICOM with the
// demo patient's identity, stores each instance encrypted (gzip, then AES-GCM
// via fileStore), and writes the study, report, series and instance rows.
//
//   --preview   contact sheets of every series into .cache/nlm-vhp/preview/,
//               and nothing else — the visual check before seeding.
//   --rebuild   remove this patient's illustrative studies first.
//   --pin       record checksums for sources not yet in the lock file.
//
// ⚠️ SYNTHETIC PATIENT ONLY (loadAnchors refuses anything else).
// ⚠️ Idempotent: study UIDs are deterministic; an existing study is skipped.
// ─────────────────────────────────────────────────────────────────────────────

const args = new Set(process.argv.slice(2));
const opts = { pin: args.has('--pin'), offline: args.has('--offline') };
const IST_OFFSET_MS = 330 * 60_000;
const DAY = 86_400_000;

async function buildSeries(kind: DemoStudy['build']): Promise<SeriesBuild[]> {
  switch (kind) {
    case 'ctBrain0':
      return [await ctBrain(opts, 0, 'Axial 5 mm')];
    case 'ctBrain24':
      return [await ctBrain(opts, 2, 'Axial 5 mm')];
    case 'ctAngio':
      return ctAngioHead(opts);
    case 'ctCspine':
      return ctCervicalSpine(opts);
    case 'xrSkull':
      return [await xrSkullAp(opts)];
    case 'xrCspine':
      return [await xrCervicalLateral(opts)];
    case 'mrBrain':
      return mrBrain(opts);
  }
}

async function preview(): Promise<void> {
  const dir = path.join(CACHE_DIR, 'preview');
  fs.mkdirSync(dir, { recursive: true });
  for (const st of STUDIES) {
    for (const s of await buildSeries(st.build)) {
      const tiles = s.frames.map((f) => {
        const g = toGrey(f.pixels, s.window.center, s.window.width);
        const scale = 160 / Math.max(f.rows, f.columns);
        const w = Math.round(
          f.columns * scale * ((f.pixelSpacing?.[1] ?? 1) / (f.pixelSpacing?.[0] ?? 1) > 1 ? 1 : 1),
        );
        const h = Math.round(
          f.rows * scale * ((f.pixelSpacing?.[0] ?? 1) / (f.pixelSpacing?.[1] ?? 1)),
        );
        return {
          img: shrink(g, f.columns, f.rows, Math.max(1, w), Math.max(1, Math.min(h, 320))),
          w: Math.max(1, w),
          h: Math.max(1, Math.min(h, 320)),
        };
      });
      const tw = Math.max(...tiles.map((t) => t.w));
      const th = Math.max(...tiles.map((t) => t.h));
      const padded = tiles.map((t) => {
        const out = new Uint8Array(tw * th);
        for (let y = 0; y < t.h; y++) out.set(t.img.subarray(y * t.w, (y + 1) * t.w), y * tw);
        return out;
      });
      const sheet = contactSheet(padded, tw, th, Math.min(8, padded.length));
      const file = path.join(dir, `${st.key}-s${s.number}.png`);
      fs.writeFileSync(file, greyPng(sheet.grey, sheet.width, sheet.height));
      console.log(
        `  ${st.key} · series ${s.number} "${s.description}" · ${s.frames.length} image(s) → ${path.relative(process.cwd(), file)}`,
      );
    }
  }
}

const istDay = (at: Date): number => {
  const s = new Date(at.getTime() + IST_OFFSET_MS);
  return Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate());
};
const istAt = (day: number, hhmm: string): Date => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(day + (h * 60 + m) * 60_000 - IST_OFFSET_MS);
};
const dicomDate = (at: Date): string =>
  new Date(at.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10).replace(/-/g, '');
const dicomTime = (at: Date): string =>
  new Date(at.getTime() + IST_OFFSET_MS).toISOString().slice(11, 19).replace(/:/g, '');
const human = (day: number): string =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .format(new Date(day))
    .replace(/ /g, '-');

async function seed(prisma: PrismaClient): Promise<void> {
  const anchors = await loadAnchors(prisma);
  const patient = await prisma.patientProfile.findUniqueOrThrow({
    where: { id: anchors.patientId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      shriPatientId: true,
      dateOfBirth: true,
      gender: true,
    },
  });

  // The MRI date comes from the notification that announced it ("from 12 August").
  const mriNote = await prisma.notification.findFirst({
    where: { user: { email: PITCH_EMAIL }, title: { contains: 'MRI report' } },
    select: { createdAt: true },
  });
  const days: Record<StudyDay, number> = {
    admit: anchors.admission.day,
    'admit+1': anchors.admission.day + DAY,
    mri: mriNote !== null ? istDay(mriNote.createdAt) - 3 * DAY : anchors.admission.day + 48 * DAY,
  };
  const fill = (s: string): string =>
    s.replace(/\{admit\+1\}/g, human(days['admit+1'])).replace(/\{admit\}/g, human(days.admit));

  if (args.has('--rebuild')) {
    const old = await prisma.imagingStudy.findMany({
      where: { patientId: patient.id, isIllustrative: true },
      select: {
        id: true,
        series: {
          select: { instances: { select: { file: { select: { id: true, storageKey: true } } } } },
        },
      },
    });
    const files = old.flatMap((s) => s.series.flatMap((x) => x.instances.map((i) => i.file)));
    await prisma.$transaction([
      prisma.imagingStudy.deleteMany({ where: { id: { in: old.map((s) => s.id) } } }),
      prisma.storedFile.deleteMany({ where: { id: { in: files.map((f) => f.id) } } }),
    ]);
    for (const f of files) await fileStore.remove(f.storageKey);
    console.log(`  removed ${old.length} illustrative stud(ies) and ${files.length} file(s)`);
  }

  const lastRad = await prisma.imagingReport.findFirst({
    where: { reportNumber: { startsWith: 'RAD/26-27/' } },
    orderBy: { reportNumber: 'desc' },
    select: { reportNumber: true },
  });
  let radSeq = lastRad === null ? 4110 : Number(lastRad.reportNumber.split('/').pop() ?? '4110');
  let accSeq = 18340;

  const age = (at: Date): string => {
    if (patient.dateOfBirth === null) return '';
    const years = Math.floor((at.getTime() - patient.dateOfBirth.getTime()) / (365.25 * DAY));
    return `${String(years).padStart(3, '0')}Y`;
  };
  const sex = patient.gender === 'Female' ? 'F' : patient.gender === 'Male' ? 'M' : 'O';

  for (const st of STUDIES) {
    accSeq += 1;
    const studyUid = uidFor(`study/${st.key}`);
    const exists = await prisma.imagingStudy.findUnique({
      where: { studyInstanceUid: studyUid },
      select: { id: true },
    });
    if (exists !== null) {
      console.log(`  ${st.key}: already present`);
      continue;
    }
    const performedAt = istAt(days[st.day], st.performed);
    const reportedAt = istAt(days[st.day], st.reported);
    const accession = `26-27/0${accSeq}`;
    const series = await buildSeries(st.build);

    // 1) Files first (encrypted, outside the transaction), remembering keys to undo.
    const written: string[] = [];
    const seriesRows: Array<{
      build: SeriesBuild;
      uid: string;
      totalBytes: number;
      instances: Array<{
        uid: string;
        number: number;
        sliceLocation: number | null;
        file: { storageKey: string; sha256: string; bytes: number };
      }>;
    }> = [];
    try {
      for (const s of series) {
        const seriesUid = uidFor(`series/${st.key}/${s.number}`);
        const instances: (typeof seriesRows)[number]['instances'] = [];
        let totalBytes = 0;
        for (const [i, f] of s.frames.entries()) {
          const uid = uidFor(`instance/${st.key}/${s.number}/${i + 1}`);
          const dicom = buildInstance({
            modality: s.modality,
            patient: {
              name: `${patient.lastName.toUpperCase()}^${patient.firstName.toUpperCase()}`,
              id: patient.shriPatientId,
              birthDate: patient.dateOfBirth === null ? '' : dicomDate(patient.dateOfBirth),
              sex,
              age: age(performedAt),
            },
            study: {
              uid: studyUid,
              date: dicomDate(performedAt),
              time: dicomTime(performedAt),
              accession,
              description: st.title,
              institution: st.facility.split(' — ')[0],
              referringPhysician: st.orderedBy,
              studyId: String(accSeq),
            },
            series: {
              uid: seriesUid,
              number: s.number,
              description: s.description,
              date: dicomDate(performedAt),
              time: dicomTime(performedAt),
              bodyPart: s.bodyPart,
              imageType: s.imageType,
              derivation: s.derivation,
            },
            instance: {
              uid,
              number: i + 1,
              contentDate: dicomDate(performedAt),
              contentTime: dicomTime(performedAt),
            },
            geometry: {
              rows: f.rows,
              columns: f.columns,
              pixelSpacing: s.modality === 'DX' ? undefined : f.pixelSpacing,
              imagerPixelSpacing: s.modality === 'DX' ? f.pixelSpacing : undefined,
              sliceThickness: s.sliceThickness,
              spacingBetweenSlices: s.spacingBetweenSlices,
              position: f.position,
              orientation: f.orientation,
              sliceLocation: f.sliceLocation,
              patientOrientation: s.patientOrientation,
            },
            pixels: { data: f.pixels, bitsStored: f.bitsStored },
            display: {
              center: s.window.center,
              width: s.window.width,
              explanation: s.window.explanation,
              intercept: 0,
              slope: 1,
              rescaleType: s.rescaleType,
            },
            comments:
              'Courtesy of the U.S. National Library of Medicine, Visible Human Project. Illustrative image — not of this patient.',
          });
          const gz = zlib.gzipSync(Buffer.from(dicom), { level: 6 });
          const file = await fileStore.put(gz);
          written.push(file.storageKey);
          totalBytes += file.bytes;
          instances.push({ uid, number: i + 1, sliceLocation: f.sliceLocation ?? null, file });
        }
        seriesRows.push({ build: s, uid: seriesUid, totalBytes, instances });
      }

      // 2) All rows in one transaction.
      await prisma.$transaction(
        async (tx) => {
          radSeq += 1;
          const study = await tx.imagingStudy.create({
            data: {
              patientId: patient.id,
              encounterId: st.day === 'mri' ? null : anchors.admission.id,
              accessionNumber: accession,
              studyInstanceUid: studyUid,
              modality: st.modality,
              title: st.title,
              bodyPart: st.bodyPart,
              performedAt,
              performingFacilityName: st.facility,
              orderedByName: st.orderedBy,
              seriesCount: series.length,
              instanceCount: seriesRows.reduce((n, s) => n + s.instances.length, 0),
              isIllustrative: true,
              imageAttribution: ATTRIBUTION,
              illustrativeNote: st.illustrativeNote,
              isAtlasVocabulary: st.isAtlasVocabulary,
              report: {
                create: {
                  patientId: patient.id,
                  reportNumber: `RAD/26-27/${String(radSeq).padStart(6, '0')}`,
                  status: 'Final',
                  clinicalIndication: encryptFieldOptional(fill(st.report.clinicalIndication)),
                  technique: encryptFieldOptional(fill(st.report.technique)),
                  comparison: encryptFieldOptional(fill(st.report.comparison)),
                  findings: encryptField(fill(st.report.findings)),
                  impression: encryptField(fill(st.report.impression)),
                  reportedByName: RADIOLOGIST.name,
                  reportedByRegistration: RADIOLOGIST.registration,
                  reportedByRole: RADIOLOGIST.role,
                  reportingFacilityName: RADIOLOGIST.facility,
                  reportedAt,
                },
              },
            },
            select: { id: true },
          });
          for (const s of seriesRows) {
            const f0 = s.build.frames[0];
            const key = s.build.frames.length > 1 ? Math.floor(s.build.frames.length / 2) + 1 : 1;
            const row = await tx.imagingSeries.create({
              data: {
                studyId: study.id,
                seriesNumber: s.build.number,
                seriesInstanceUid: s.uid,
                dicomModality: s.build.modality,
                description: s.build.description,
                instanceCount: s.instances.length,
                keyInstanceNumber: key,
                rows: f0.rows,
                columns: f0.columns,
                sliceThicknessMm: s.build.sliceThickness ?? null,
                spacingMm: s.build.spacingBetweenSlices ?? null,
                defaultWindowCenter: s.build.window.center,
                defaultWindowWidth: s.build.window.width,
                totalBytes: s.totalBytes,
              },
              select: { id: true },
            });
            for (const inst of s.instances) {
              const file = await tx.storedFile.create({
                data: {
                  patientId: patient.id,
                  kind: 'DicomInstance',
                  storageKey: inst.file.storageKey,
                  mimeType: 'application/dicom',
                  bytes: inst.file.bytes,
                  sha256: inst.file.sha256,
                  contentEncoding: 'gzip',
                },
                select: { id: true },
              });
              await tx.imagingInstance.create({
                data: {
                  seriesId: row.id,
                  patientId: patient.id,
                  instanceNumber: inst.number,
                  sopInstanceUid: inst.uid,
                  fileId: file.id,
                  sliceLocation: inst.sliceLocation,
                },
              });
            }
          }
        },
        { timeout: 120_000 },
      );
      const count = seriesRows.reduce((n, s) => n + s.instances.length, 0);
      const mb = seriesRows.reduce((n, s) => n + s.totalBytes, 0) / 1e6;
      console.log(
        `  ${st.key}: ${series.length} series, ${count} image(s), ${mb.toFixed(1)} MB stored`,
      );
    } catch (err) {
      for (const k of written) await fileStore.remove(k);
      throw err;
    }
  }
}

async function main(): Promise<void> {
  if (args.has('--preview')) {
    await preview();
    return;
  }
  const prisma = new PrismaClient();
  try {
    await seed(prisma);
    console.log('✓ imaging demo ready');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error('❌ imaging demo failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
