// ─────────────────────────────────────────────────────────────────────────────
// A minimal DICOM reader — enough to read the uncompressed source images the
// demo pipeline converts, and to check in tests what the writer produced.
//
// Handles: Part 10 files (preamble + "DICM"), explicit VR little endian
// datasets, and sequences of defined or undefined length (skipped, including
// the private ones some scanners write). It does not decode compressed pixel
// data; a compressed transfer syntax is refused with a clear error.
// ─────────────────────────────────────────────────────────────────────────────

const LONG_VR = new Set(['OB', 'OW', 'OF', 'OD', 'OL', 'OV', 'SQ', 'UC', 'UN', 'UR', 'UT']);
const UNCOMPRESSED = new Set(['1.2.840.10008.1.2.1', '1.2.840.10008.1.2']);

export interface RawElement {
  tag: number;
  vr: string;
  offset: number;
  length: number;
}

export interface ParsedDicom {
  transferSyntax: string;
  elements: Map<number, RawElement>;
  bytes: Uint8Array;
}

const tagOf = (g: number, e: number): number => ((g << 16) | e) >>> 0;

/** Skip an undefined-length sequence: walk items until the sequence delimiter. */
function skipUndefinedSequence(dv: DataView, pos: number): number {
  while (pos + 8 <= dv.byteLength) {
    const g = dv.getUint16(pos, true);
    const e = dv.getUint16(pos + 2, true);
    const len = dv.getUint32(pos + 4, true);
    pos += 8;
    if (g === 0xfffe && e === 0xe0dd) return pos; // sequence delimitation
    if (g === 0xfffe && e === 0xe000) {
      if (len === 0xffffffff) pos = skipUndefinedItem(dv, pos);
      else pos += len;
      continue;
    }
    throw new Error('Malformed sequence');
  }
  throw new Error('Unterminated sequence');
}

function skipUndefinedItem(dv: DataView, pos: number): number {
  while (pos + 8 <= dv.byteLength) {
    const g = dv.getUint16(pos, true);
    const e = dv.getUint16(pos + 2, true);
    if (g === 0xfffe && e === 0xe00d) return pos + 8; // item delimitation
    const { next } = readHeader(dv, pos, true);
    pos = next;
  }
  throw new Error('Unterminated item');
}

function readHeader(
  dv: DataView,
  pos: number,
  explicit: boolean,
): { el: RawElement; next: number } {
  const g = dv.getUint16(pos, true);
  const e = dv.getUint16(pos + 2, true);
  let vr = '';
  let length: number;
  let valueStart: number;
  if (explicit && g !== 0xfffe) {
    vr = String.fromCharCode(dv.getUint8(pos + 4), dv.getUint8(pos + 5));
    if (LONG_VR.has(vr)) {
      length = dv.getUint32(pos + 8, true);
      valueStart = pos + 12;
    } else {
      length = dv.getUint16(pos + 6, true);
      valueStart = pos + 8;
    }
  } else {
    length = dv.getUint32(pos + 4, true);
    valueStart = pos + 8;
  }
  const el: RawElement = { tag: tagOf(g, e), vr, offset: valueStart, length };
  if (length === 0xffffffff) {
    // Undefined length: only sequences (and encapsulated pixel data) do this.
    return { el: { ...el, length: 0 }, next: skipUndefinedSequence(dv, valueStart) };
  }
  return { el, next: valueStart + length };
}

export function parseDicom(bytes: Uint8Array): ParsedDicom {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const hasPreamble =
    bytes.length > 132 && String.fromCharCode(...bytes.slice(128, 132)) === 'DICM';
  let pos = hasPreamble ? 132 : 0;
  const elements = new Map<number, RawElement>();
  let transferSyntax = '1.2.840.10008.1.2.1';
  // Group 0002 is always explicit VR little endian.
  while (pos + 8 <= bytes.length && dv.getUint16(pos, true) === 0x0002) {
    const { el, next } = readHeader(dv, pos, true);
    elements.set(el.tag, el);
    pos = next;
  }
  const ts = elements.get(tagOf(0x0002, 0x0010));
  if (ts !== undefined) transferSyntax = textAt(bytes, ts).replace(/\0/g, '').trim();
  if (!UNCOMPRESSED.has(transferSyntax))
    throw new Error(`Unsupported transfer syntax ${transferSyntax}`);
  const explicit = transferSyntax === '1.2.840.10008.1.2.1';
  while (pos + 8 <= bytes.length) {
    const { el, next } = readHeader(dv, pos, explicit);
    elements.set(el.tag, el);
    pos = next;
  }
  return { transferSyntax, elements, bytes };
}

function textAt(bytes: Uint8Array, el: RawElement): string {
  return new TextDecoder().decode(bytes.subarray(el.offset, el.offset + el.length));
}

export function str(d: ParsedDicom, group: number, element: number): string | null {
  const el = d.elements.get(tagOf(group, element));
  if (el === undefined) return null;
  return textAt(d.bytes, el)
    .replace(/[\0 ]+$/g, '')
    .trim();
}

export function num(d: ParsedDicom, group: number, element: number): number | null {
  const el = d.elements.get(tagOf(group, element));
  if (el === undefined) return null;
  const dv = new DataView(d.bytes.buffer, d.bytes.byteOffset + el.offset, el.length);
  if (el.vr === 'US') return dv.getUint16(0, true);
  if (el.vr === 'SS') return dv.getInt16(0, true);
  if (el.vr === 'UL') return dv.getUint32(0, true);
  if (el.vr === 'SL') return dv.getInt32(0, true);
  if (el.vr === 'FL') return dv.getFloat32(0, true);
  if (el.vr === 'FD') return dv.getFloat64(0, true);
  const s = str(d, group, element);
  if (s === null || s === '') return null;
  const n = Number(s.split('\\')[0]);
  return Number.isFinite(n) ? n : null;
}

export function nums(d: ParsedDicom, group: number, element: number): number[] {
  const s = str(d, group, element);
  return s === null || s === '' ? [] : s.split('\\').map(Number);
}

/** Pixel data as rescaled numbers (e.g. HU for CT). */
export function pixels(d: ParsedDicom): { rows: number; columns: number; data: Float32Array } {
  const rows = num(d, 0x0028, 0x0010) ?? 0;
  const columns = num(d, 0x0028, 0x0011) ?? 0;
  const bitsAllocated = num(d, 0x0028, 0x0100) ?? 16;
  const signed = (num(d, 0x0028, 0x0103) ?? 0) === 1;
  const slope = num(d, 0x0028, 0x1053) ?? 1;
  const intercept = num(d, 0x0028, 0x1052) ?? 0;
  const el = d.elements.get(tagOf(0x7fe0, 0x0010));
  if (el === undefined) throw new Error('No pixel data');
  if (bitsAllocated !== 16) throw new Error(`Unsupported BitsAllocated ${bitsAllocated}`);
  const dv = new DataView(d.bytes.buffer, d.bytes.byteOffset + el.offset, el.length);
  const n = rows * columns;
  const data = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const raw = signed ? dv.getInt16(i * 2, true) : dv.getUint16(i * 2, true);
    data[i] = raw * slope + intercept;
  }
  return { rows, columns, data };
}
