import { authorizedFetch } from '../apiClient'
import { parseDicomImage, type DicomImage } from './parse'

// ─────────────────────────────────────────────────────────────────────────────
// Loads one series for the viewer.
//
// Primary path: GET …/series/:id/frames — ONE streamed response of
// `[u32 instance][u32 length][gzip DICOM]` records, centre-out, so the first
// image paints before the rest arrive and a 90-image CT costs one request.
// Each record is gunzipped with the browser's DecompressionStream.
//
// Fallback (no DecompressionStream, or a stream that ended early): the
// missing images one at a time from …/instances/:id, four in parallel —
// the browser undoes the gzip Content-Encoding itself.
// ─────────────────────────────────────────────────────────────────────────────

export interface SeriesSource {
  studyId: string
  seriesId: string
  instances: Array<{ id: string; number: number }>
}

export interface LoadCallbacks {
  onFrame: (img: DicomImage) => void
  onProgress?: (loadedBytes: number) => void
}

async function gunzip(bytes: Uint8Array): Promise<ArrayBuffer> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).arrayBuffer()
}

export async function loadSeries(src: SeriesSource, cb: LoadCallbacks, signal: AbortSignal): Promise<void> {
  const seen = new Set<number>()
  if (typeof DecompressionStream !== 'undefined') {
    try {
      const res = await authorizedFetch(`/me/imaging/${src.studyId}/series/${src.seriesId}/frames`, { signal })
      const reader = res.body?.getReader()
      if (reader !== undefined) {
        let buf = new Uint8Array(0)
        let loaded = 0
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          loaded += value.length
          cb.onProgress?.(loaded)
          const merged = new Uint8Array(buf.length + value.length)
          merged.set(buf)
          merged.set(value, buf.length)
          buf = merged
          // Emit every complete record in the buffer.
          let off = 0
          while (buf.length - off >= 8) {
            const dv = new DataView(buf.buffer, buf.byteOffset + off, 8)
            const n = dv.getUint32(0)
            const len = dv.getUint32(4)
            if (buf.length - off - 8 < len) break
            const body = buf.slice(off + 8, off + 8 + len)
            off += 8 + len
            const img = parseDicomImage(await gunzip(body))
            seen.add(n)
            cb.onFrame(img)
          }
          if (off > 0) buf = buf.slice(off)
        }
      }
    } catch (err) {
      if (signal.aborted) return
      // Fall through to fetching whatever is still missing, one at a time.
      if (seen.size === 0 && !(err instanceof TypeError)) throw err
    }
  }
  const missing = src.instances.filter((i) => !seen.has(i.number))
  let next = 0
  const worker = async (): Promise<void> => {
    while (next < missing.length && !signal.aborted) {
      const inst = missing[next++]
      const res = await authorizedFetch(`/me/imaging/${src.studyId}/instances/${inst.id}`, { signal })
      cb.onFrame(parseDicomImage(await res.arrayBuffer()))
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()])
}
