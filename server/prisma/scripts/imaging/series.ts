import { decompress, ensureCached } from './fetchCache';
import {
  averageSlices,
  maxProjection,
  readGenesis,
  readRawXray,
  resample,
  type Slice,
} from './decode';
import { parseDicom, pixels, nums } from '../../../src/imaging/dicom/reader';

// ─────────────────────────────────────────────────────────────────────────────
// Builds each demo series' pixels and geometry from the NLM sources.
//
// VF  = Visible Human female normal CT (fresh, no contrast; 1 mm contiguous).
//       Slices 1001–1209 are a 250 mm field of view (0.488 mm pixels); later
//       ones are wider and are cropped back to the same 250 mm so a series
//       has one geometry.
// HV  = the Harvard head (Additional-Head-Images): CT with resin-filled
//       vessels — it reads like a CT angiogram — and MRI of the same head.
// XR  = Visible Human male AP skull radiograph (headerless, 1248 × 1536).
//
// ⚠️ Nothing here adds or paints a finding. Series are averaged (thicker
// slabs), projected (MIP), reformatted (sagittal) or reconstructed (a lateral
// radiograph from CT) — standard derivations, each named in the DICOM
// DerivationDescription and in the series description.
// ─────────────────────────────────────────────────────────────────────────────

export interface Frame {
  pixels: Int16Array | Uint16Array;
  rows: number;
  columns: number;
  bitsStored: number;
  pixelSpacing?: [number, number];
  position?: [number, number, number];
  orientation?: [number, number, number, number, number, number];
  sliceLocation?: number;
}

export interface SeriesBuild {
  number: number;
  description: string;
  modality: 'CT' | 'MR' | 'DX';
  bodyPart: string;
  imageType: string[];
  derivation: string;
  sliceThickness?: number;
  spacingBetweenSlices?: number;
  window: { center: number; width: number; explanation: string };
  rescaleType?: string;
  patientOrientation?: [string, string];
  frames: Frame[];
}

type Opts = { pin: boolean; offline: boolean };

const vfPath = (n: number): string => `Female-Images/radiological/normalCT/c_vf${n}.fre.Z`;
const hvCtPath = (n: number): string =>
  `Additional-Head-Images/MR_CT_DICOM/CAT/J.${String(n).padStart(3, '0')}.gz`;
const hvMrPath = (seq: 'T1' | 'T2_512', n: number): string =>
  `Additional-Head-Images/MR_CT_DICOM/MRI/${seq}/I.${String(n).padStart(3, '0')}.gz`;
const range = (a: number, b: number, step = 1): number[] =>
  Array.from({ length: Math.floor((b - a) / step) + 1 }, (_, i) => a + i * step);

const AXIAL: [number, number, number, number, number, number] = [1, 0, 0, 0, 1, 0];
const SAGITTAL: [number, number, number, number, number, number] = [0, 1, 0, 0, 0, -1];
const FOV = 250; // mm
const GRID = 512;
const SPACING = FOV / GRID; // 0.48828 mm

function toHu16(hu: Float32Array): Int16Array {
  const out = new Int16Array(hu.length);
  for (let i = 0; i < hu.length; i++) out[i] = Math.max(-1024, Math.min(3071, Math.round(hu[i])));
  return out;
}

/** One VF slice on the common 250 mm / 512 px grid. */
function onGrid(s: Slice): Float32Array {
  if (Math.abs(s.pixelSpacing - SPACING) < 0.002) return s.hu;
  const px = FOV / s.pixelSpacing;
  const off = (s.width - px) / 2;
  return resample(s.hu, s.width, s.height, GRID, GRID, { x: off, y: off, w: px, h: px });
}

async function loadVf(
  from: number,
  to: number,
  opts: Opts,
): Promise<Array<{ n: number; loc: number; hu: Float32Array }>> {
  const nums_ = range(from, to);
  const local = await ensureCached(nums_.map(vfPath), opts);
  return local.map((f, i) => {
    const s = readGenesis(decompress(f));
    return { n: nums_[i], loc: s.loc, hu: onGrid(s) };
  });
}

/** Non-contrast CT brain: 5 mm averaged slabs from 1 mm slices. */
export async function ctBrain(
  opts: Opts,
  offsetMm: number,
  seriesDescription: string,
): Promise<SeriesBuild> {
  const slices = await loadVf(1003 + offsetMm, 1142 + offsetMm, opts);
  const frames: Frame[] = [];
  for (let i = 0; i + 5 <= slices.length; i += 5) {
    const group = slices.slice(i, i + 5);
    const z = group.reduce((n, s) => n + s.loc, 0) / group.length;
    frames.push({
      pixels: toHu16(averageSlices(group.map((s) => s.hu))),
      rows: GRID,
      columns: GRID,
      bitsStored: 16,
      pixelSpacing: [SPACING, SPACING],
      position: [-FOV / 2, -FOV / 2, z],
      orientation: AXIAL,
      sliceLocation: z,
    });
  }
  // Skull base first, vertex last.
  frames.sort((a, b) => (a.sliceLocation ?? 0) - (b.sliceLocation ?? 0));
  return {
    number: 1,
    description: seriesDescription,
    modality: 'CT',
    bodyPart: 'HEAD',
    imageType: ['DERIVED', 'SECONDARY', 'AXIAL'],
    derivation:
      'Illustrative image. 5 mm averaged slabs from 1 mm source slices (NLM Visible Human, female normal CT).',
    sliceThickness: 5,
    spacingBetweenSlices: 5,
    rescaleType: 'HU',
    window: { center: 40, width: 80, explanation: 'BRAIN' },
    frames,
  };
}

/** C-spine CT: axial 2 mm through C1–C7, plus a sagittal reformat. */
/**
 * The column of the spinal midline in each axial slice: the left–right
 * centroid of bone (> 250 HU) in the central half of the field, smoothed over
 * ±7 slices so one noisy slice cannot kink the reformat.
 */
function spineMidline(slices: Array<{ hu: Float32Array }>): number[] {
  const lo = Math.round(GRID * 0.25);
  const hi = Math.round(GRID * 0.75);
  const raw = slices.map((s) => {
    let sum = 0;
    let n = 0;
    for (let y = lo; y < hi; y++)
      for (let x = lo; x < hi; x++)
        if (s.hu[y * GRID + x] > 250) {
          sum += x;
          n++;
        }
    return n > 0 ? sum / n : GRID / 2;
  });
  return raw.map((_, z) => {
    const win = raw.slice(Math.max(0, z - 7), z + 8);
    return Math.round(win.reduce((a, b) => a + b, 0) / win.length);
  });
}

export async function ctCervicalSpine(opts: Opts): Promise<SeriesBuild[]> {
  const slices = await loadVf(1133, 1244, opts); // 112 × 1 mm
  const axial: Frame[] = [];
  for (let i = 0; i < slices.length; i += 2) {
    const s = slices[i];
    axial.push({
      pixels: toHu16(s.hu),
      rows: GRID,
      columns: GRID,
      bitsStored: 16,
      pixelSpacing: [SPACING, SPACING],
      position: [-FOV / 2, -FOV / 2, s.loc],
      orientation: AXIAL,
      sliceLocation: s.loc,
    });
  }
  // Sagittal: rows = z (1 mm, top down), columns = anterior→posterior (0.488 mm).
  // The body lies a little off-centre and tilted in the scanner, so each row
  // follows the spine's own midline (the bone centroid of that slice,
  // smoothed along z) rather than one fixed column.
  const zCount = slices.length;
  const sag: Frame[] = [];
  const midline = spineMidline(slices);
  for (let k = -12; k <= 12; k += 2) {
    const img = new Int16Array(zCount * GRID);
    for (let z = 0; z < zCount; z++) {
      const src = slices[z].hu;
      const x = Math.max(0, Math.min(GRID - 1, midline[z] + Math.round(k / SPACING)));
      for (let y = 0; y < GRID; y++)
        img[z * GRID + y] = Math.max(-1024, Math.min(3071, Math.round(src[y * GRID + x])));
    }
    sag.push({
      pixels: img,
      rows: zCount,
      columns: GRID,
      bitsStored: 16,
      pixelSpacing: [1, SPACING],
      position: [k, -FOV / 2, slices[0].loc],
      orientation: SAGITTAL,
      sliceLocation: k,
    });
  }
  return [
    {
      number: 1,
      description: 'Axial 2 mm (bone)',
      modality: 'CT',
      bodyPart: 'CSPINE',
      imageType: ['DERIVED', 'SECONDARY', 'AXIAL'],
      derivation:
        'Illustrative image. Every second 1 mm source slice (NLM Visible Human, female normal CT), 250 mm field of view.',
      sliceThickness: 1,
      spacingBetweenSlices: 2,
      rescaleType: 'HU',
      window: { center: 500, width: 2000, explanation: 'BONE' },
      frames: axial,
    },
    {
      number: 2,
      description: 'Sagittal reformat 2 mm',
      modality: 'CT',
      bodyPart: 'CSPINE',
      imageType: ['DERIVED', 'SECONDARY', 'REFORMATTED'],
      derivation:
        'Illustrative image. Sagittal multiplanar reformat following the spinal midline, from the 1 mm axial source (NLM Visible Human, female normal CT).',
      sliceThickness: 1,
      spacingBetweenSlices: 2,
      rescaleType: 'HU',
      window: { center: 500, width: 2000, explanation: 'BONE' },
      frames: sag,
    },
  ];
}

/** Lateral C-spine radiograph reconstructed from the neck CT (a DRR). */
export async function xrCervicalLateral(opts: Opts): Promise<SeriesBuild> {
  const slices = await loadVf(1095, 1255, opts); // skull base → T1
  const zCount = slices.length;
  // Line integral of attenuation left→right, per (z, y).
  const proj = new Float32Array(zCount * GRID);
  for (let z = 0; z < zCount; z++) {
    const hu = slices[z].hu;
    for (let y = 0; y < GRID; y++) {
      let sum = 0;
      for (let x = 0; x < GRID; x++) {
        const v = hu[y * GRID + x];
        if (v <= -500) continue; // air, airway and the space around the body
        // Relative attenuation: soft tissue weighted down, bone up — the
        // contrast a radiograph shows between them is higher than CT's.
        sum += v > 180 ? 1 + (v / 1000) * 2.2 : 0.35 * (1 + v / 1000);
      }
      proj[z * GRID + y] = sum * SPACING;
    }
  }
  // Resample the 1 mm rows to square 0.488 mm pixels and scale to 12 bits.
  const rows = Math.round((zCount * 1) / SPACING);
  const sq = resample(proj, GRID, zCount, GRID, rows);
  // Window on the body's own percentiles (not the global max), with a mild
  // gamma, so bone reads white against grey soft tissue.
  const body = Array.from(sq)
    .filter((v) => v > 0)
    .sort((a, b) => a - b);
  const lo = body[Math.floor(body.length * 0.02)] ?? 0;
  const hi = body[Math.floor(body.length * 0.998)] ?? 1;
  const out = new Uint16Array(sq.length);
  for (let i = 0; i < sq.length; i++) {
    const t = Math.max(0, Math.min(1, (sq[i] - lo) / (hi - lo)));
    out[i] = sq[i] <= 0 ? 0 : Math.round(t ** 0.85 * 4095);
  }
  return {
    number: 1,
    description: 'Lateral (reconstructed from CT)',
    modality: 'DX',
    bodyPart: 'CSPINE',
    imageType: ['DERIVED', 'SECONDARY', 'DRR'],
    derivation:
      'Illustrative image. Digitally reconstructed lateral radiograph computed from CT (NLM Visible Human, female normal CT).',
    // Columns run anterior → posterior (face on the viewer's left); rows run down.
    patientOrientation: ['P', 'F'],
    window: { center: 2048, width: 4096, explanation: 'DEFAULT' },
    frames: [
      { pixels: out, rows, columns: GRID, bitsStored: 12, pixelSpacing: [SPACING, SPACING] },
    ],
  };
}

/** AP skull radiograph (the film label at the lower left is cropped away). */
export async function xrSkullAp(opts: Opts): Promise<SeriesBuild> {
  const [local] = await ensureCached(['Male-Images/radiological/xray14/x_vm_ap.sk.Z'], opts);
  const W = 1248;
  const H = 1536;
  const raw = readRawXray(decompress(local), W, H);
  const top = 60;
  const bottom = 1392; // above the burned-in film label
  const left = 16; // past the bright film edge
  const cols = W - left - 72; // clear of the film mark at the lower right
  const rows = bottom - top;
  const out = new Uint16Array(rows * cols);
  for (let y = 0; y < rows; y++) out.set(raw.subarray((y + top) * W + left, (y + top) * W + left + cols), y * cols);
  return {
    number: 1,
    description: 'AP',
    modality: 'DX',
    bodyPart: 'SKULL',
    imageType: ['DERIVED', 'SECONDARY'],
    derivation:
      'Illustrative image. AP skull radiograph (NLM Visible Human, male), cropped to remove a burned-in film label and the film edge.',
    // Radiological convention: the patient's right on the viewer's left.
    patientOrientation: ['L', 'F'],
    window: { center: 6000, width: 11000, explanation: 'DEFAULT' },
    frames: [{ pixels: out, rows, columns: cols, bitsStored: 14 }],
  };
}

async function loadHv(
  paths: string[],
  opts: Opts,
): Promise<Array<{ hu: Float32Array; z: number; rows: number; columns: number; spacing: number }>> {
  const local = await ensureCached(paths, opts);
  return local.map((f) => {
    const d = parseDicom(decompress(f));
    const p = pixels(d);
    const ps = nums(d, 0x0028, 0x0030);
    return {
      hu: p.data,
      z: nums(d, 0x0020, 0x0032)[2] ?? 0,
      rows: p.rows,
      columns: p.columns,
      spacing: ps[0] ?? 0.489,
    };
  });
}

/** CT angiogram look: axial 3 mm and 10 mm MIPs of the resin-filled head. */
export async function ctAngioHead(opts: Opts): Promise<SeriesBuild[]> {
  const src = await loadHv(range(150, 455).map(hvCtPath), opts); // 0.5 mm apart
  // Air inside the field reads about −500 HU in this specimen; normalise it so
  // a bone window does not show a grey disc.
  for (const s of src) for (let i = 0; i < s.hu.length; i++) if (s.hu[i] < -400) s.hu[i] = -1000;
  const geo = (
    s: (typeof src)[number],
  ): Pick<Frame, 'rows' | 'columns' | 'pixelSpacing' | 'orientation'> => ({
    rows: s.rows,
    columns: s.columns,
    pixelSpacing: [s.spacing, s.spacing],
    orientation: AXIAL,
  });
  const axial: Frame[] = [];
  for (let i = 0; i < src.length; i += 6) {
    const s = src[i];
    axial.push({
      ...geo(s),
      pixels: toHu16(s.hu),
      bitsStored: 16,
      position: [-125, -125, s.z],
      sliceLocation: s.z,
    });
  }
  const mip: Frame[] = [];
  for (let i = 0; i + 20 <= src.length; i += 10) {
    const group = src.slice(i, i + 20);
    const z = (group[0].z + group[group.length - 1].z) / 2;
    mip.push({
      ...geo(group[0]),
      pixels: toHu16(maxProjection(group.map((g) => g.hu))),
      bitsStored: 16,
      position: [-125, -125, z],
      sliceLocation: z,
    });
  }
  return [
    {
      number: 1,
      description: 'Axial 3 mm (angiographic)',
      modality: 'CT',
      bodyPart: 'HEAD',
      imageType: ['DERIVED', 'SECONDARY', 'AXIAL'],
      derivation:
        'Illustrative image. Head CT of a specimen with resin-filled vessels (NLM Visible Human, Additional Head Images), every sixth 0.5 mm slice.',
      sliceThickness: 1.5,
      spacingBetweenSlices: 3,
      rescaleType: 'HU',
      window: { center: 150, width: 600, explanation: 'ANGIO' },
      frames: axial,
    },
    {
      number: 2,
      description: 'Axial MIP 10 mm',
      modality: 'CT',
      bodyPart: 'HEAD',
      imageType: ['DERIVED', 'SECONDARY', 'AXIAL', 'MIP'],
      derivation:
        'Illustrative image. 10 mm maximum-intensity projections of the same source, every 5 mm.',
      sliceThickness: 10,
      spacingBetweenSlices: 5,
      rescaleType: 'HU',
      window: { center: 200, width: 700, explanation: 'ANGIO MIP' },
      frames: mip,
    },
  ];
}

/** MRI brain: axial T2 (512) and T1 of the Harvard head. */
export async function mrBrain(opts: Opts): Promise<SeriesBuild[]> {
  const toU16 = (data: Float32Array): Uint16Array =>
    Uint16Array.from(data, (v) => Math.max(0, Math.min(65535, Math.round(v))));
  const windowOf = (all: Float32Array[]): { center: number; width: number } => {
    const sample: number[] = [];
    for (const d of all) for (let i = 0; i < d.length; i += 97) if (d[i] > 20) sample.push(d[i]);
    sample.sort((a, b) => a - b);
    const lo = sample[Math.floor(sample.length * 0.01)] ?? 0;
    const hi = sample[Math.floor(sample.length * 0.995)] ?? 1000;
    return { center: Math.round((lo + hi) / 2), width: Math.max(1, Math.round(hi - lo)) };
  };
  const t2 = await loadHv(
    range(61, 225, 4).map((n) => hvMrPath('T2_512', n)),
    opts,
  );
  const t1src = await loadHv(
    range(1, 76).map((n) => hvMrPath('T1', n)),
    opts,
  );
  const t2Top = Math.min(...t2.map((s) => s.z));
  const t1 = t1src.filter((s) => s.z >= t2Top - 1).filter((_, i) => i % 2 === 0);
  const frames = (list: typeof t2): Frame[] =>
    list.map((s) => ({
      pixels: toU16(s.hu),
      rows: s.rows,
      columns: s.columns,
      bitsStored: 16,
      pixelSpacing: [s.spacing, s.spacing],
      position: [-(s.columns * s.spacing) / 2, -(s.rows * s.spacing) / 2, s.z],
      orientation: AXIAL,
      sliceLocation: s.z,
    }));
  const w2 = windowOf(t2.map((s) => s.hu));
  const w1 = windowOf(t1.map((s) => s.hu));
  return [
    {
      number: 1,
      description: 'Axial T2',
      modality: 'MR',
      bodyPart: 'BRAIN',
      imageType: ['DERIVED', 'SECONDARY', 'AXIAL'],
      derivation:
        'Illustrative image. Axial T2-weighted MRI of a specimen head (NLM Visible Human, Additional Head Images), every fourth 1 mm slice.',
      sliceThickness: 2,
      spacingBetweenSlices: 4,
      window: { ...w2, explanation: 'AUTO' },
      frames: frames(t2),
    },
    {
      number: 2,
      description: 'Axial T1',
      modality: 'MR',
      bodyPart: 'BRAIN',
      imageType: ['DERIVED', 'SECONDARY', 'AXIAL'],
      derivation:
        'Illustrative image. Axial T1-weighted MRI of the same specimen head, every second 3 mm slice.',
      sliceThickness: 3,
      spacingBetweenSlices: 6,
      window: { ...w1, explanation: 'AUTO' },
      frames: frames(t1),
    },
  ];
}
