// ─────────────────────────────────────────────────────────────────────────────
// A small DICOM image parser for the viewer — uncompressed transfer syntaxes
// only (explicit and implicit VR little endian). Sequences are skipped; only
// the tags needed to display a greyscale image are read. A compressed file is
// refused with a clear error rather than shown wrongly.
// ─────────────────────────────────────────────────────────────────────────────

export interface DicomImage {
  rows: number
  columns: number
  /** Row spacing, column spacing (mm); null when unknown. */
  pixelSpacing: [number, number] | null
  slope: number
  intercept: number
  window: { center: number; width: number } | null
  photometric: string
  bitsStored: number
  signed: boolean
  pixels: Int16Array | Uint16Array
  instanceNumber: number
  sliceLocation: number | null
  orientation: number[] | null
  patientOrientation: [string, string] | null
  modality: string
}

const LONG_VR = new Set(['OB', 'OW', 'OF', 'OD', 'OL', 'OV', 'SQ', 'UC', 'UN', 'UR', 'UT'])
const UNCOMPRESSED = new Set(['1.2.840.10008.1.2.1', '1.2.840.10008.1.2'])
const key = (g: number, e: number): number => ((g << 16) | e) >>> 0

interface El { vr: string; offset: number; length: number }

export class UnsupportedDicomError extends Error {}

function skipUndefined(dv: DataView, pos: number, explicit: boolean): number {
  // Items and nested sequences until the matching delimiter.
  while (pos + 8 <= dv.byteLength) {
    const g = dv.getUint16(pos, true)
    const e = dv.getUint16(pos + 2, true)
    const len = dv.getUint32(pos + 4, true)
    if (g === 0xfffe && e === 0xe0dd) return pos + 8
    if (g === 0xfffe && e === 0xe000) {
      pos = len === 0xffffffff ? skipItem(dv, pos + 8, explicit) : pos + 8 + len
      continue
    }
    throw new UnsupportedDicomError('Malformed sequence')
  }
  throw new UnsupportedDicomError('Unterminated sequence')
}

function skipItem(dv: DataView, pos: number, explicit: boolean): number {
  while (pos + 8 <= dv.byteLength) {
    if (dv.getUint16(pos, true) === 0xfffe && dv.getUint16(pos + 2, true) === 0xe00d) return pos + 8
    pos = readEl(dv, pos, explicit).next
  }
  throw new UnsupportedDicomError('Unterminated item')
}

function readEl(dv: DataView, pos: number, explicit: boolean): { tag: number; el: El; next: number } {
  const g = dv.getUint16(pos, true)
  const e = dv.getUint16(pos + 2, true)
  let vr = ''
  let length: number
  let start: number
  if (explicit && g !== 0xfffe) {
    vr = String.fromCharCode(dv.getUint8(pos + 4), dv.getUint8(pos + 5))
    if (LONG_VR.has(vr)) {
      length = dv.getUint32(pos + 8, true)
      start = pos + 12
    } else {
      length = dv.getUint16(pos + 6, true)
      start = pos + 8
    }
  } else {
    length = dv.getUint32(pos + 4, true)
    start = pos + 8
  }
  if (length === 0xffffffff) return { tag: key(g, e), el: { vr, offset: start, length: 0 }, next: skipUndefined(dv, start, explicit) }
  return { tag: key(g, e), el: { vr, offset: start, length }, next: start + length }
}

export function parseDicomImage(buffer: ArrayBuffer): DicomImage {
  const bytes = new Uint8Array(buffer)
  const dv = new DataView(buffer)
  const preamble = bytes.length > 132 && bytes[128] === 0x44 && bytes[129] === 0x49 && bytes[130] === 0x43 && bytes[131] === 0x4d
  let pos = preamble ? 132 : 0
  const els = new Map<number, El>()
  while (pos + 8 <= bytes.length && dv.getUint16(pos, true) === 0x0002) {
    const r = readEl(dv, pos, true)
    els.set(r.tag, r.el)
    pos = r.next
  }
  const text = (g: number, e: number): string | null => {
    const el = els.get(key(g, e))
    if (el === undefined) return null
    let s = ''
    for (let i = el.offset; i < el.offset + el.length; i++) s += String.fromCharCode(bytes[i])
    return s.replace(/[\0\s]+$/g, '').trim()
  }
  const ts = text(0x0002, 0x0010) ?? '1.2.840.10008.1.2.1'
  if (!UNCOMPRESSED.has(ts)) throw new UnsupportedDicomError(`This image uses a compressed format (${ts}) the viewer cannot show yet.`)
  const explicit = ts === '1.2.840.10008.1.2.1'
  while (pos + 8 <= bytes.length) {
    const r = readEl(dv, pos, explicit)
    els.set(r.tag, r.el)
    pos = r.next
  }
  const us = (g: number, e: number, fallback: number): number => {
    const el = els.get(key(g, e))
    if (el === undefined || el.length < 2) return fallback
    return dv.getUint16(el.offset, true)
  }
  const numbers = (g: number, e: number): number[] => {
    const s = text(g, e)
    return s === null || s === '' ? [] : s.split('\\').map(Number).filter((n) => Number.isFinite(n))
  }
  const first = (g: number, e: number): number | null => numbers(g, e)[0] ?? null

  const rows = us(0x0028, 0x0010, 0)
  const columns = us(0x0028, 0x0011, 0)
  const bitsAllocated = us(0x0028, 0x0100, 16)
  const signed = us(0x0028, 0x0103, 0) === 1
  if (bitsAllocated !== 16) throw new UnsupportedDicomError(`Only 16-bit images are supported (this one is ${bitsAllocated}-bit).`)
  const px = els.get(key(0x7fe0, 0x0010))
  if (px === undefined || rows === 0 || columns === 0) throw new UnsupportedDicomError('The file has no image in it.')
  const count = rows * columns
  if (px.length < count * 2) throw new UnsupportedDicomError('The image data is incomplete.')
  // Copy into an aligned buffer (the element may start at an odd offset).
  const raw = buffer.slice(px.offset, px.offset + count * 2)
  const pixels = signed ? new Int16Array(raw) : new Uint16Array(raw)
  const spacing = numbers(0x0028, 0x0030)
  const imager = numbers(0x0018, 0x1164)
  const ps = spacing.length === 2 ? spacing : imager.length === 2 ? imager : null
  const wc = first(0x0028, 0x1050)
  const ww = first(0x0028, 0x1051)
  const po = text(0x0020, 0x0020)?.split('\\')
  return {
    rows,
    columns,
    pixelSpacing: ps === null ? null : [ps[0], ps[1]],
    slope: first(0x0028, 0x1053) ?? 1,
    intercept: first(0x0028, 0x1052) ?? 0,
    window: wc !== null && ww !== null && ww > 0 ? { center: wc, width: ww } : null,
    photometric: text(0x0028, 0x0004) ?? 'MONOCHROME2',
    bitsStored: us(0x0028, 0x0101, 16),
    signed,
    pixels,
    instanceNumber: first(0x0020, 0x0013) ?? 0,
    sliceLocation: first(0x0020, 0x1041),
    orientation: numbers(0x0020, 0x0037).length === 6 ? numbers(0x0020, 0x0037) : null,
    patientOrientation: po !== undefined && po.length === 2 ? [po[0], po[1]] : null,
    modality: text(0x0008, 0x0060) ?? '',
  }
}
