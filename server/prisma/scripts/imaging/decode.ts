import zlib from 'node:zlib';

// ─────────────────────────────────────────────────────────────────────────────
// Readers for the two non-DICOM source formats, plus the image operations the
// pipeline needs (windowing to 8-bit, slab averaging, maximum-intensity
// projection, bilinear resampling, a reconstructed radiograph) and a tiny
// grayscale PNG writer for the contact sheets used in the visual check.
// ─────────────────────────────────────────────────────────────────────────────

export interface Slice {
  width: number;
  height: number;
  /** Hounsfield units. */
  hu: Float32Array;
  pixelSpacing: number;
  /** Table position along the body axis, mm (from the scanner header). */
  loc: number;
}

/**
 * GE Genesis "IMGF" (the Visible Human normal CT): big-endian header with the
 * pixel offset at byte 4, width at 8, height at 12; pixel size (float32) in the
 * image header at 2444; the slice location in the text table ("@ loc N mm").
 * Pixels are big-endian 16-bit; the header documents −1024 to reach HU.
 */
export function readGenesis(buf: Buffer): Slice {
  if (buf.toString('latin1', 0, 4) !== 'IMGF') throw new Error('Not a GE Genesis file');
  const offset = buf.readInt32BE(4);
  const width = buf.readInt32BE(8);
  const height = buf.readInt32BE(12);
  const pixelSpacing = buf.readFloatBE(2444);
  const text = buf.toString('latin1', 156, 236);
  const m = /@ loc (-?\d+(?:\.\d+)?) mm/.exec(text);
  if (m === null) throw new Error('No slice location in the Genesis text table');
  const hu = new Float32Array(width * height);
  for (let i = 0; i < hu.length; i++) hu[i] = buf.readInt16BE(offset + i * 2) - 1024;
  return { width, height, hu, pixelSpacing, loc: Number(m[1]) };
}

/** Headerless big-endian 16-bit radiograph. */
export function readRawXray(buf: Buffer, width: number, height: number): Uint16Array {
  if (buf.length !== width * height * 2)
    throw new Error(`Raw X-ray is ${buf.length} bytes, not ${width}×${height}×2`);
  const out = new Uint16Array(width * height);
  for (let i = 0; i < out.length; i++) out[i] = buf.readUInt16BE(i * 2);
  return out;
}

export function averageSlices(slices: Float32Array[]): Float32Array {
  const out = new Float32Array(slices[0].length);
  for (const s of slices) for (let i = 0; i < out.length; i++) out[i] += s[i];
  for (let i = 0; i < out.length; i++) out[i] /= slices.length;
  return out;
}

export function maxProjection(slices: Float32Array[]): Float32Array {
  const out = Float32Array.from(slices[0]);
  for (const s of slices.slice(1))
    for (let i = 0; i < out.length; i++) if (s[i] > out[i]) out[i] = s[i];
  return out;
}

/** Bilinear resample of a w×h image to nw×nh, sampling a source sub-rectangle. */
export function resample(
  src: Float32Array,
  w: number,
  h: number,
  nw: number,
  nh: number,
  crop: { x: number; y: number; w: number; h: number } = { x: 0, y: 0, w, h },
): Float32Array {
  const out = new Float32Array(nw * nh);
  for (let y = 0; y < nh; y++) {
    const sy = crop.y + ((y + 0.5) * crop.h) / nh - 0.5;
    const y0 = Math.max(0, Math.min(h - 1, Math.floor(sy)));
    const y1 = Math.min(h - 1, y0 + 1);
    const fy = sy - Math.floor(sy);
    for (let x = 0; x < nw; x++) {
      const sx = crop.x + ((x + 0.5) * crop.w) / nw - 0.5;
      const x0 = Math.max(0, Math.min(w - 1, Math.floor(sx)));
      const x1 = Math.min(w - 1, x0 + 1);
      const fx = sx - Math.floor(sx);
      const a = src[y0 * w + x0] * (1 - fx) + src[y0 * w + x1] * fx;
      const b = src[y1 * w + x0] * (1 - fx) + src[y1 * w + x1] * fx;
      out[y * nw + x] = a * (1 - fy) + b * fy;
    }
  }
  return out;
}

/** Window a numeric image to 8-bit grey for previews. */
export function toGrey(
  data: ArrayLike<number>,
  center: number,
  width: number,
  invert = false,
): Uint8Array {
  const out = new Uint8Array(data.length);
  const lo = center - width / 2;
  for (let i = 0; i < data.length; i++) {
    let v = ((data[i] - lo) / width) * 255;
    v = v < 0 ? 0 : v > 255 ? 255 : v;
    out[i] = invert ? 255 - v : v;
  }
  return out;
}

// ── PNG (grayscale, 8-bit) ──────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

export function greyPng(grey: Uint8Array, width: number, height: number): Buffer {
  const raw = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width + 1)] = 0;
    Buffer.from(grey.buffer, grey.byteOffset + y * width, width).copy(raw, y * (width + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // greyscale
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Tile equal-sized grey images into one sheet (for eyeballing a series). */
export function contactSheet(
  tiles: Uint8Array[],
  w: number,
  h: number,
  cols: number,
): { grey: Uint8Array; width: number; height: number } {
  const rows = Math.ceil(tiles.length / cols);
  const width = cols * w;
  const height = rows * h;
  const grey = new Uint8Array(width * height);
  tiles.forEach((t, i) => {
    const ox = (i % cols) * w;
    const oy = Math.floor(i / cols) * h;
    for (let y = 0; y < h; y++) grey.set(t.subarray(y * w, (y + 1) * w), (oy + y) * width + ox);
  });
  return { grey, width, height };
}

/** Nearest-neighbour downscale of an 8-bit image, for sheet thumbnails. */
export function shrink(grey: Uint8Array, w: number, h: number, nw: number, nh: number): Uint8Array {
  const out = new Uint8Array(nw * nh);
  for (let y = 0; y < nh; y++)
    for (let x = 0; x < nw; x++)
      out[y * nw + x] = grey[Math.floor((y * h) / nh) * w + Math.floor((x * w) / nw)];
  return out;
}
