import type { DicomImage } from './parse'

// ─────────────────────────────────────────────────────────────────────────────
// Window/level: stored pixel values → grey levels, through one lookup table.
//
// Rescale (slope/intercept) first, then the DICOM linear VOI function
// (PS3.3 C.11.2.1.2), then invert (the user's toggle XOR MONOCHROME1). The
// table spans the image's actual stored range, so a 512 × 512 CT frame is one
// pass over its pixels plus a small table — fast enough to follow a drag.
// ─────────────────────────────────────────────────────────────────────────────

export interface Window { center: number; width: number }

export function storedRange(img: DicomImage): { min: number; max: number } {
  let min = Infinity
  let max = -Infinity
  const p = img.pixels
  for (let i = 0; i < p.length; i++) {
    const v = p[i]
    if (v < min) min = v
    if (v > max) max = v
  }
  return { min, max }
}

/** Modality-value range (after rescale) — for "full range" presets. */
export function valueRange(img: DicomImage, range = storedRange(img)): { min: number; max: number } {
  const a = range.min * img.slope + img.intercept
  const b = range.max * img.slope + img.intercept
  return { min: Math.min(a, b), max: Math.max(a, b) }
}

/** p1–p99.5 of the non-background values — an "auto" window for MRI. */
export function autoWindow(img: DicomImage): Window {
  const vals: number[] = []
  const p = img.pixels
  const step = Math.max(1, Math.floor(p.length / 20000))
  for (let i = 0; i < p.length; i += step) {
    const v = p[i] * img.slope + img.intercept
    vals.push(v)
  }
  vals.sort((a, b) => a - b)
  const floor = vals[Math.floor(vals.length * 0.05)] ?? 0
  const body = vals.filter((v) => v > floor)
  const lo = body[Math.floor(body.length * 0.01)] ?? vals[0] ?? 0
  const hi = body[Math.floor(body.length * 0.995)] ?? vals[vals.length - 1] ?? 1
  return { center: (lo + hi) / 2, width: Math.max(1, hi - lo) }
}

/**
 * Render into RGBA. `out` is reused between calls (length rows × cols × 4).
 */
export function renderGrey(img: DicomImage, win: Window, invertToggle: boolean, out: Uint8ClampedArray, range = storedRange(img)): void {
  const invert = invertToggle !== (img.photometric === 'MONOCHROME1')
  const size = range.max - range.min + 1
  const lut = new Uint8Array(size)
  const c = win.center
  const w = Math.max(1, win.width)
  for (let i = 0; i < size; i++) {
    const v = (range.min + i) * img.slope + img.intercept
    let y: number
    if (v <= c - 0.5 - (w - 1) / 2) y = 0
    else if (v > c - 0.5 + (w - 1) / 2) y = 255
    else y = ((v - (c - 0.5)) / (w - 1) + 0.5) * 255
    lut[i] = invert ? 255 - y : y
  }
  const p = img.pixels
  const min = range.min
  for (let i = 0, o = 0; i < p.length; i++, o += 4) {
    const g = lut[p[i] - min]
    out[o] = g
    out[o + 1] = g
    out[o + 2] = g
    out[o + 3] = 255
  }
}
