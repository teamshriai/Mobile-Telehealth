import { ds, pixelBytes, tag, writeDicom, type Element } from './writer';

// ─────────────────────────────────────────────────────────────────────────────
// One image as a DICOM file, from an explicit spec — the only way the demo
// pipeline makes an instance. The spec holds exactly what the portal knows
// (the demo patient, the study it belongs to) plus the pixels; the source
// file's own identity never enters it.
// ─────────────────────────────────────────────────────────────────────────────

export const SOP_CLASS = {
  CT: '1.2.840.10008.5.1.4.1.1.2',
  MR: '1.2.840.10008.5.1.4.1.1.4',
  DX: '1.2.840.10008.5.1.4.1.1.1.1',
} as const;

export interface InstanceSpec {
  modality: 'CT' | 'MR' | 'DX';
  patient: { name: string; id: string; birthDate: string; sex: 'F' | 'M' | 'O'; age: string };
  study: {
    uid: string;
    date: string;
    time: string;
    accession: string;
    description: string;
    institution: string;
    referringPhysician: string;
    studyId: string;
  };
  series: {
    uid: string;
    number: number;
    description: string;
    date: string;
    time: string;
    bodyPart: string;
    imageType: string[];
    derivation: string;
  };
  instance: { uid: string; number: number; contentDate: string; contentTime: string };
  geometry: {
    rows: number;
    columns: number;
    pixelSpacing?: [number, number];
    imagerPixelSpacing?: [number, number];
    sliceThickness?: number;
    spacingBetweenSlices?: number;
    position?: [number, number, number];
    orientation?: [number, number, number, number, number, number];
    sliceLocation?: number;
    patientOrientation?: [string, string];
  };
  pixels: { data: Int16Array | Uint16Array; bitsStored: number };
  display: {
    center: number;
    width: number;
    explanation?: string;
    intercept: number;
    slope: number;
    rescaleType?: string;
  };
  comments: string;
}

const t = tag;

export function buildInstance(spec: InstanceSpec): Uint8Array {
  const g = spec.geometry;
  const signed = spec.pixels.data instanceof Int16Array;
  if (spec.pixels.data.length !== g.rows * g.columns)
    throw new Error('Pixel count does not match rows × columns');
  const els: Element[] = [
    { tag: t(0x0008, 0x0005), vr: 'CS', value: 'ISO_IR 192' },
    { tag: t(0x0008, 0x0008), vr: 'CS', value: spec.series.imageType },
    { tag: t(0x0008, 0x0016), vr: 'UI', value: SOP_CLASS[spec.modality] },
    { tag: t(0x0008, 0x0018), vr: 'UI', value: spec.instance.uid },
    { tag: t(0x0008, 0x0020), vr: 'DA', value: spec.study.date },
    { tag: t(0x0008, 0x0021), vr: 'DA', value: spec.series.date },
    { tag: t(0x0008, 0x0023), vr: 'DA', value: spec.instance.contentDate },
    { tag: t(0x0008, 0x0030), vr: 'TM', value: spec.study.time },
    { tag: t(0x0008, 0x0031), vr: 'TM', value: spec.series.time },
    { tag: t(0x0008, 0x0033), vr: 'TM', value: spec.instance.contentTime },
    { tag: t(0x0008, 0x0050), vr: 'SH', value: spec.study.accession },
    { tag: t(0x0008, 0x0060), vr: 'CS', value: spec.modality },
    // Deliberately empty: these images must not claim a scanner.
    { tag: t(0x0008, 0x0070), vr: 'LO', value: '' },
    { tag: t(0x0008, 0x0080), vr: 'LO', value: spec.study.institution },
    { tag: t(0x0008, 0x0090), vr: 'PN', value: spec.study.referringPhysician },
    { tag: t(0x0008, 0x1030), vr: 'LO', value: spec.study.description },
    { tag: t(0x0008, 0x103e), vr: 'LO', value: spec.series.description },
    { tag: t(0x0008, 0x2111), vr: 'ST', value: spec.series.derivation },
    { tag: t(0x0010, 0x0010), vr: 'PN', value: spec.patient.name },
    { tag: t(0x0010, 0x0020), vr: 'LO', value: spec.patient.id },
    { tag: t(0x0010, 0x0030), vr: 'DA', value: spec.patient.birthDate },
    { tag: t(0x0010, 0x0040), vr: 'CS', value: spec.patient.sex },
    { tag: t(0x0010, 0x1010), vr: 'AS', value: spec.patient.age },
    { tag: t(0x0018, 0x0015), vr: 'CS', value: spec.series.bodyPart },
    { tag: t(0x0020, 0x000d), vr: 'UI', value: spec.study.uid },
    { tag: t(0x0020, 0x000e), vr: 'UI', value: spec.series.uid },
    { tag: t(0x0020, 0x0010), vr: 'SH', value: spec.study.studyId },
    { tag: t(0x0020, 0x0011), vr: 'IS', value: String(spec.series.number) },
    { tag: t(0x0020, 0x0013), vr: 'IS', value: String(spec.instance.number) },
    { tag: t(0x0020, 0x4000), vr: 'LT', value: spec.comments },
    { tag: t(0x0028, 0x0002), vr: 'US', value: 1 },
    { tag: t(0x0028, 0x0004), vr: 'CS', value: 'MONOCHROME2' },
    { tag: t(0x0028, 0x0010), vr: 'US', value: g.rows },
    { tag: t(0x0028, 0x0011), vr: 'US', value: g.columns },
    { tag: t(0x0028, 0x0100), vr: 'US', value: 16 },
    { tag: t(0x0028, 0x0101), vr: 'US', value: spec.pixels.bitsStored },
    { tag: t(0x0028, 0x0102), vr: 'US', value: spec.pixels.bitsStored - 1 },
    { tag: t(0x0028, 0x0103), vr: 'US', value: signed ? 1 : 0 },
    { tag: t(0x0028, 0x0301), vr: 'CS', value: 'NO' },
    { tag: t(0x0028, 0x1050), vr: 'DS', value: ds(spec.display.center) },
    { tag: t(0x0028, 0x1051), vr: 'DS', value: ds(spec.display.width) },
    { tag: t(0x0028, 0x1052), vr: 'DS', value: ds(spec.display.intercept) },
    { tag: t(0x0028, 0x1053), vr: 'DS', value: ds(spec.display.slope) },
    { tag: t(0x7fe0, 0x0010), vr: 'OW', value: pixelBytes(spec.pixels.data) },
  ];
  if (spec.display.explanation)
    els.push({ tag: t(0x0028, 0x1055), vr: 'LO', value: spec.display.explanation });
  if (spec.display.rescaleType)
    els.push({ tag: t(0x0028, 0x1054), vr: 'LO', value: spec.display.rescaleType });
  if (g.pixelSpacing) els.push({ tag: t(0x0028, 0x0030), vr: 'DS', value: g.pixelSpacing.map(ds) });
  if (g.imagerPixelSpacing)
    els.push({ tag: t(0x0018, 0x1164), vr: 'DS', value: g.imagerPixelSpacing.map(ds) });
  if (g.sliceThickness !== undefined)
    els.push({ tag: t(0x0018, 0x0050), vr: 'DS', value: ds(g.sliceThickness) });
  if (g.spacingBetweenSlices !== undefined)
    els.push({ tag: t(0x0018, 0x0088), vr: 'DS', value: ds(g.spacingBetweenSlices) });
  if (g.position) els.push({ tag: t(0x0020, 0x0032), vr: 'DS', value: g.position.map(ds) });
  if (g.orientation) els.push({ tag: t(0x0020, 0x0037), vr: 'DS', value: g.orientation.map(ds) });
  if (g.sliceLocation !== undefined)
    els.push({ tag: t(0x0020, 0x1041), vr: 'DS', value: ds(g.sliceLocation) });
  if (g.patientOrientation)
    els.push({ tag: t(0x0020, 0x0020), vr: 'CS', value: g.patientOrientation });
  return writeDicom({
    sopClassUid: SOP_CLASS[spec.modality],
    sopInstanceUid: spec.instance.uid,
    elements: els,
  });
}
