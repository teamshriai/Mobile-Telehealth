// ─────────────────────────────────────────────────────────────────────────────
// A minimal DICOM Part 10 writer — explicit VR little endian, no sequences.
//
// ⚠️ BUILDS, NEVER COPIES. Every file is written from an explicit list of
// elements; nothing is carried over from a source dataset. That is the whole
// de-identification argument: a donor name, a source institution, a source
// UID or a private tag cannot leak into a file because there is no path by
// which one could get in.
//
// Small on purpose (no dictionary, no sequences): it writes the ~45 tags an
// image needs, sorted, with the padding rules the standard requires — UIDs
// padded with NUL, other text with a space, every value an even length.
// ─────────────────────────────────────────────────────────────────────────────

export type TextVR =
  'AE' | 'AS' | 'CS' | 'DA' | 'DS' | 'IS' | 'LO' | 'LT' | 'PN' | 'SH' | 'ST' | 'TM' | 'UI' | 'UT';
export type BinVR = 'US' | 'SS' | 'UL' | 'SL' | 'FL' | 'FD' | 'OB' | 'OW';

export type Element =
  | { tag: number; vr: TextVR; value: string | string[] }
  | { tag: number; vr: 'US' | 'SS' | 'UL' | 'SL' | 'FL' | 'FD'; value: number | number[] }
  | { tag: number; vr: 'OB' | 'OW'; value: Uint8Array };

/** VRs whose explicit-VR header uses a 2-byte reserved field and a 4-byte length. */
const LONG_VR = new Set(['OB', 'OW', 'OF', 'OD', 'OL', 'OV', 'SQ', 'UC', 'UN', 'UR', 'UT']);

export const TRANSFER_SYNTAX_EXPLICIT_LE = '1.2.840.10008.1.2.1';
export const IMPLEMENTATION_CLASS_UID = '2.25.217604419722416218315011457812345678901';
export const IMPLEMENTATION_VERSION = 'SHRIHEALTH_1';

export const tag = (group: number, element: number): number => ((group << 16) | element) >>> 0;

function textBytes(vr: TextVR, value: string | string[]): Uint8Array {
  const joined = Array.isArray(value) ? value.join('\\') : value;
  const bytes = new TextEncoder().encode(joined);
  if (bytes.length % 2 === 0) return bytes;
  const padded = new Uint8Array(bytes.length + 1);
  padded.set(bytes);
  padded[bytes.length] = vr === 'UI' ? 0x00 : 0x20;
  return padded;
}

function binBytes(
  vr: 'US' | 'SS' | 'UL' | 'SL' | 'FL' | 'FD',
  value: number | number[],
): Uint8Array {
  const values = Array.isArray(value) ? value : [value];
  const size = vr === 'US' || vr === 'SS' ? 2 : vr === 'FD' ? 8 : 4;
  const buf = new ArrayBuffer(values.length * size);
  const dv = new DataView(buf);
  values.forEach((v, i) => {
    const o = i * size;
    if (vr === 'US') dv.setUint16(o, v, true);
    else if (vr === 'SS') dv.setInt16(o, v, true);
    else if (vr === 'UL') dv.setUint32(o, v, true);
    else if (vr === 'SL') dv.setInt32(o, v, true);
    else if (vr === 'FL') dv.setFloat32(o, v, true);
    else dv.setFloat64(o, v, true);
  });
  return new Uint8Array(buf);
}

function valueBytes(el: Element): Uint8Array {
  if (el.vr === 'OB' || el.vr === 'OW') {
    if (el.value.length % 2 === 0) return el.value;
    const padded = new Uint8Array(el.value.length + 1);
    padded.set(el.value);
    return padded;
  }
  if (
    el.vr === 'US' ||
    el.vr === 'SS' ||
    el.vr === 'UL' ||
    el.vr === 'SL' ||
    el.vr === 'FL' ||
    el.vr === 'FD'
  ) {
    return binBytes(el.vr, el.value);
  }
  const text = el as Extract<Element, { vr: TextVR }>;
  return textBytes(text.vr, text.value);
}

function encodeElement(el: Element): Uint8Array {
  const value = valueBytes(el);
  const long = LONG_VR.has(el.vr);
  if (!long && value.length > 0xffff)
    throw new Error(`Value too long for VR ${el.vr} at ${el.tag.toString(16)}`);
  const header = new Uint8Array(long ? 12 : 8);
  const dv = new DataView(header.buffer);
  dv.setUint16(0, el.tag >>> 16, true);
  dv.setUint16(2, el.tag & 0xffff, true);
  header[4] = el.vr.charCodeAt(0);
  header[5] = el.vr.charCodeAt(1);
  if (long) dv.setUint32(8, value.length, true);
  else dv.setUint16(6, value.length, true);
  const out = new Uint8Array(header.length + value.length);
  out.set(header);
  out.set(value, header.length);
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/**
 * A complete Part 10 file: 128-byte preamble, "DICM", the group 0002 meta
 * header (with its computed group length), then the dataset in tag order.
 */
export function writeDicom(opts: {
  sopClassUid: string;
  sopInstanceUid: string;
  elements: Element[];
}): Uint8Array {
  const dataset = [...opts.elements].sort((a, b) => a.tag - b.tag);
  for (let i = 0; i < dataset.length; i++) {
    if (dataset[i].tag >>> 16 === 0x0002)
      throw new Error('Group 0002 is written by writeDicom itself');
    if (i > 0 && dataset[i].tag === dataset[i - 1].tag)
      throw new Error(`Duplicate tag ${dataset[i].tag.toString(16)}`);
  }
  const meta = [
    encodeElement({ tag: tag(0x0002, 0x0001), vr: 'OB', value: new Uint8Array([0x00, 0x01]) }),
    encodeElement({ tag: tag(0x0002, 0x0002), vr: 'UI', value: opts.sopClassUid }),
    encodeElement({ tag: tag(0x0002, 0x0003), vr: 'UI', value: opts.sopInstanceUid }),
    encodeElement({ tag: tag(0x0002, 0x0010), vr: 'UI', value: TRANSFER_SYNTAX_EXPLICIT_LE }),
    encodeElement({ tag: tag(0x0002, 0x0012), vr: 'UI', value: IMPLEMENTATION_CLASS_UID }),
    encodeElement({ tag: tag(0x0002, 0x0013), vr: 'SH', value: IMPLEMENTATION_VERSION }),
  ];
  const metaBody = concat(meta);
  const groupLength = encodeElement({ tag: tag(0x0002, 0x0000), vr: 'UL', value: metaBody.length });
  const preamble = new Uint8Array(132);
  preamble.set([0x44, 0x49, 0x43, 0x4d], 128); // "DICM"
  return concat([preamble, groupLength, metaBody, ...dataset.map(encodeElement)]);
}

/** Int16/Uint16 pixels → little-endian bytes for an OW Pixel Data element. */
export function pixelBytes(pixels: Int16Array | Uint16Array): Uint8Array {
  const out = new Uint8Array(pixels.length * 2);
  const dv = new DataView(out.buffer);
  if (pixels instanceof Int16Array) pixels.forEach((v, i) => dv.setInt16(i * 2, v, true));
  else pixels.forEach((v, i) => dv.setUint16(i * 2, v, true));
  return out;
}

/** DS values: at most 16 characters, no exponent for the ranges we write. */
export function ds(n: number): string {
  const s = Number.isInteger(n) ? String(n) : String(Number(n.toFixed(6)));
  return s.length <= 16 ? s : n.toPrecision(10);
}
