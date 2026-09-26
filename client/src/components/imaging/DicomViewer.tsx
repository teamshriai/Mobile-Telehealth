import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactElement } from 'react'
import { Blend, Contrast, Hand, Keyboard, Layers, Loader2, Maximize2, Minimize2, MoveVertical, RotateCcw, SunMedium, ZoomIn, ZoomOut } from 'lucide-react'
import type { ImagingModality, ImagingSeriesInfo } from '../../services/reports.service'
import type { DicomImage } from '../../lib/dicom/parse'
import { autoWindow, renderGrey, storedRange, valueRange, type Window } from '../../lib/dicom/voi'
import { loadSeries } from '../../lib/dicom/loader'

/**
 * The imaging viewer — CT, MRI and X-ray, from the patient's own DICOM.
 *
 * Two-stage rendering: the current image is windowed into an offscreen
 * canvas (only when the image, window or invert changes), then drawn to the
 * visible canvas with zoom and pan (on every move, cheaply). Pixel spacing is
 * honoured, so a sagittal reformat with 1 mm rows and 0.49 mm columns is not
 * squashed.
 *
 * Mouse and trackpad: wheel scrolls images; ctrl + wheel (or a pinch) zooms at
 * the cursor; drag adjusts window/level, or pans with shift / the middle
 * button / the Pan tool. Touch: one finger scrolls, two pinch and pan,
 * double-tap resets. Keyboard (when the viewer has focus): arrows and
 * PageUp/PageDown, Home/End, 0–5 presets, I invert, R reset, F fullscreen,
 * W/P/S tools, + and − zoom, ? shortcuts.
 *
 * ⚠️ The dark image surface is the same in both themes (atlas: night theme
 * for imaging), and the credit line for sample images is part of the viewer
 * itself — including in fullscreen — so it can never be cropped away.
 */

type Tool = 'window' | 'pan' | 'scroll'
interface Preset { key: string; label: string; window: (img: DicomImage | undefined) => Window }

const CT_PRESETS: Array<{ key: string; label: string; win: Window }> = [
  { key: '1', label: 'Brain', win: { center: 40, width: 80 } },
  { key: '2', label: 'Stroke', win: { center: 40, width: 40 } },
  { key: '3', label: 'Subdural', win: { center: 75, width: 200 } },
  { key: '4', label: 'Bone', win: { center: 600, width: 2800 } },
  { key: '5', label: 'Soft tissue', win: { center: 40, width: 400 } },
]

function presetsFor(modality: ImagingModality, seriesDefault: Window | null): Preset[] {
  const asScanned: Preset = {
    key: '0',
    label: 'As scanned',
    window: (img) => seriesDefault ?? img?.window ?? (img ? autoWindow(img) : { center: 40, width: 400 }),
  }
  const full: Preset = {
    key: modality === 'XR' ? '1' : '2',
    label: 'Full range',
    window: (img) => {
      if (!img) return { center: 0, width: 1 }
      const r = valueRange(img)
      return { center: (r.min + r.max) / 2, width: Math.max(1, r.max - r.min) }
    },
  }
  if (modality === 'CT') return [asScanned, ...CT_PRESETS.map((p) => ({ key: p.key, label: p.label, window: () => p.win }))]
  if (modality === 'MR') return [asScanned, { key: '1', label: 'Auto', window: (img) => (img ? autoWindow(img) : { center: 500, width: 1000 }) }, full]
  return [asScanned, full]
}

const OPPOSITE: Record<string, string> = { L: 'R', R: 'L', A: 'P', P: 'A', H: 'F', F: 'H' }
function letter(v: number[]): string {
  const [x, y, z] = v
  const ax = Math.abs(x), ay = Math.abs(y), az = Math.abs(z)
  if (ax >= ay && ax >= az) return x > 0 ? 'L' : 'R'
  if (ay >= az) return y > 0 ? 'P' : 'A'
  return z > 0 ? 'H' : 'F'
}
/** Edge letters: [top, right, bottom, left]. */
function edgeLetters(img: DicomImage | undefined): [string, string, string, string] | null {
  if (!img) return null
  let right: string | undefined
  let bottom: string | undefined
  if (img.orientation) {
    right = letter(img.orientation.slice(0, 3))
    bottom = letter(img.orientation.slice(3, 6))
  } else if (img.patientOrientation) {
    right = img.patientOrientation[0]?.[0]
    bottom = img.patientOrientation[1]?.[0]
  }
  if (!right || !bottom || !OPPOSITE[right] || !OPPOSITE[bottom]) return null
  return [OPPOSITE[bottom], right, bottom, OPPOSITE[right]]
}

const reduceMotion = (): boolean => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function DicomViewer({
  studyId,
  title,
  modality,
  series,
  attribution,
  note,
}: {
  studyId: string
  title: string
  modality: ImagingModality
  series: ImagingSeriesInfo[]
  attribution: string | null
  note: string | null
}) {
  const [seriesIdx, setSeriesIdx] = useState(0)
  const active = series[seriesIdx]
  const numbers = useMemo(() => [...(active?.instances ?? [])].map((i) => i.number).sort((a, b) => a - b), [active])
  const presets = useMemo(() => presetsFor(modality, active?.defaultWindow ?? null), [modality, active])

  const framesRef = useRef(new Map<number, { img: DicomImage; range: { min: number; max: number } }>())
  const [loadedCount, setLoadedCount] = useState(0)
  const [loadedBytes, setLoadedBytes] = useState(0)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorText, setErrorText] = useState('')
  const [pos, setPos] = useState(0)
  const [presetKey, setPresetKey] = useState('0')
  const [win, setWin] = useState<Window | null>(null)
  const [invert, setInvert] = useState(false)
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 })
  const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  const [tool, setTool] = useState<Tool>(() => (modality === 'XR' ? 'pan' : coarse ? 'scroll' : 'window'))
  const [fullscreen, setFullscreen] = useState(false)
  const [help, setHelp] = useState(false)
  const [announce, setAnnounce] = useState('')

  const rootRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const offRef = useRef<HTMLCanvasElement | null>(null)
  const imgDataRef = useRef<ImageData | null>(null)
  const drawnKeyRef = useRef('')
  const [size, setSize] = useState({ w: 0, h: 0 })

  const currentNumber = numbers[pos]
  const current = currentNumber !== undefined ? framesRef.current.get(currentNumber) : undefined
  const effectiveWin: Window | null = win ?? (current ? presets[0].window(current.img) : null)

  // ── Load the active series ─────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return undefined
    const ctrl = new AbortController()
    framesRef.current = new Map()
    setLoadedCount(0)
    setLoadedBytes(0)
    setStatus('loading')
    setErrorText('')
    setWin(null)
    setPresetKey('0')
    setView({ zoom: 1, x: 0, y: 0 })
    const sorted = [...active.instances].map((i) => i.number).sort((a, b) => a - b)
    const key = active.keyInstanceNumber ?? sorted[Math.floor(sorted.length / 2)]
    setPos(Math.max(0, sorted.indexOf(key)))
    let count = 0
    loadSeries(
      { studyId, seriesId: active.id, instances: active.instances },
      {
        onFrame: (img) => {
          framesRef.current.set(img.instanceNumber, { img, range: storedRange(img) })
          count += 1
          setLoadedCount(count)
          if (count === 1) setStatus('ready')
        },
        onProgress: setLoadedBytes,
      },
      ctrl.signal,
    )
      .then(() => {
        if (ctrl.signal.aborted) return
        if (count === 0) {
          setStatus('error')
          setErrorText('No images could be loaded for this series.')
        }
      })
      .catch((err: Error) => {
        if (ctrl.signal.aborted) return
        setStatus('error')
        setErrorText(err.message || 'The images could not be loaded.')
      })
    return () => ctrl.abort()
  }, [studyId, active])

  // ── Size tracking ─────────────────────────────────────────────────────────
  useEffect(() => {
    const el = stageRef.current
    if (!el) return undefined
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect
      setSize({ w: Math.round(r.width), h: Math.round(r.height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Draw ──────────────────────────────────────────────────────────────────
  const rafRef = useRef(0)
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || size.w === 0 || size.h === 0) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    if (canvas.width !== Math.round(size.w * dpr) || canvas.height !== Math.round(size.h * dpr)) {
      canvas.width = Math.round(size.w * dpr)
      canvas.height = Math.round(size.h * dpr)
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    if (!current || !effectiveWin) return
    const { img, range } = current
    // Stage 1 — window into the offscreen canvas when something relevant changed.
    const drawKey = `${currentNumber}|${effectiveWin.center}|${effectiveWin.width}|${invert}|${seriesIdx}`
    if (!offRef.current) offRef.current = document.createElement('canvas')
    const off = offRef.current
    if (drawnKeyRef.current !== drawKey) {
      if (off.width !== img.columns || off.height !== img.rows) {
        off.width = img.columns
        off.height = img.rows
        imgDataRef.current = null
      }
      const octx = off.getContext('2d')
      if (!octx) return
      if (!imgDataRef.current) imgDataRef.current = octx.createImageData(img.columns, img.rows)
      renderGrey(img, effectiveWin, invert, imgDataRef.current.data, range)
      octx.putImageData(imgDataRef.current, 0, 0)
      drawnKeyRef.current = drawKey
    }
    // Stage 2 — fit, honouring pixel spacing, then zoom and pan.
    const [rs, cs] = img.pixelSpacing ?? [1, 1]
    const physW = img.columns * cs
    const physH = img.rows * rs
    const pad = 12 * dpr
    const fit = Math.min((canvas.width - pad * 2) / physW, (canvas.height - pad * 2) / physH)
    const s = fit * view.zoom
    const dw = physW * s
    const dh = physH * s
    const dx = (canvas.width - dw) / 2 + view.x * dpr
    const dy = (canvas.height - dh) / 2 + view.y * dpr
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(off, dx, dy, dw, dh)
  }, [current, currentNumber, effectiveWin, invert, seriesIdx, size, view])

  useEffect(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [draw, loadedCount])

  // ── Actions ───────────────────────────────────────────────────────────────
  const go = useCallback((delta: number) => {
    setPos((p) => {
      const n = Math.max(0, Math.min(numbers.length - 1, p + delta))
      return n
    })
  }, [numbers.length])

  const applyPreset = useCallback((key: string) => {
    const p = presets.find((x) => x.key === key)
    if (!p) return
    setPresetKey(key)
    setWin(p.window(current?.img))
  }, [presets, current])

  const reset = useCallback(() => {
    setView({ zoom: 1, x: 0, y: 0 })
    setInvert(false)
    setPresetKey('0')
    setWin(null)
  }, [])

  const zoomBy = useCallback((factor: number, cx = 0, cy = 0) => {
    setView((v) => {
      const zoom = Math.max(0.5, Math.min(12, v.zoom * factor))
      const k = zoom / v.zoom
      return { zoom, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k }
    })
  }, [])

  const toggleFullscreen = useCallback(() => {
    const el = rootRef.current
    if (!el) return
    const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void }
    const node = el as HTMLDivElement & { webkitRequestFullscreen?: () => void }
    const inNative = document.fullscreenElement === el || doc.webkitFullscreenElement === el
    if (fullscreen) {
      if (inNative) {
        if (document.exitFullscreen) void document.exitFullscreen()
        else doc.webkitExitFullscreen?.()
      }
      setFullscreen(false)
      return
    }
    if (el.requestFullscreen) el.requestFullscreen().catch(() => { /* CSS fallback below */ })
    else node.webkitRequestFullscreen?.()
    setFullscreen(true)
  }, [fullscreen])

  useEffect(() => {
    const onChange = (): void => {
      if (!document.fullscreenElement) setFullscreen(false)
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // CSS fullscreen (iPhone Safari has no element fullscreen): lock the page scroll.
  useEffect(() => {
    if (!fullscreen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [fullscreen])

  // Announce keyboard slice changes politely.
  useEffect(() => {
    const t = setTimeout(() => setAnnounce(numbers.length > 1 ? `Image ${pos + 1} of ${numbers.length}` : ''), 250)
    return () => clearTimeout(t)
  }, [pos, numbers.length])

  // ── Pointer + wheel ───────────────────────────────────────────────────────
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const drag = useRef<{ x: number; y: number; win: Window | null; view: typeof view; mode: Tool; acc: number; pinch?: { d: number; cx: number; cy: number; zoom: number; vx: number; vy: number } } | null>(null)
  const lastTap = useRef(0)

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>): void => {
    ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const mode: Tool = e.button === 1 || e.shiftKey ? 'pan' : tool
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
      drag.current = {
        x: 0, y: 0, win: effectiveWin, view, mode: 'pan', acc: 0,
        pinch: { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2 - rect.left - rect.width / 2, cy: (a.y + b.y) / 2 - rect.top - rect.height / 2, zoom: view.zoom, vx: view.x, vy: view.y },
      }
      return
    }
    if (e.pointerType === 'touch') {
      const now = Date.now()
      if (now - lastTap.current < 300) reset()
      lastTap.current = now
    }
    drag.current = { x: e.clientX, y: e.clientY, win: effectiveWin, view, mode, acc: 0 }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>): void => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const d = drag.current
    if (!d) return
    if (d.pinch && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const zoom = Math.max(0.5, Math.min(12, (d.pinch.zoom * dist) / Math.max(1, d.pinch.d)))
      const k = zoom / d.pinch.zoom
      setView({ zoom, x: d.pinch.cx - (d.pinch.cx - d.pinch.vx) * k, y: d.pinch.cy - (d.pinch.cy - d.pinch.vy) * k })
      return
    }
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (d.mode === 'pan') {
      setView({ ...d.view, x: d.view.x + dx, y: d.view.y + dy })
    } else if (d.mode === 'window' && d.win) {
      const width = Math.max(1, d.win.width * Math.exp(dx * 0.006))
      const center = d.win.center + (dy * d.win.width) / 300
      setWin({ center, width })
      setPresetKey('')
    } else if (d.mode === 'scroll') {
      const steps = Math.trunc(dy / 10) - d.acc
      if (steps !== 0) {
        d.acc += steps
        go(steps)
      }
    }
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>): void => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size === 0) drag.current = null
  }

  // Wheel must be non-passive to stop the page scrolling under the viewer.
  const wheelAcc = useRef(0)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        const rect = canvas.getBoundingClientRect()
        zoomBy(Math.exp(-e.deltaY * 0.01), e.clientX - rect.left - rect.width / 2, e.clientY - rect.top - rect.height / 2)
        return
      }
      wheelAcc.current += e.deltaY
      const step = e.deltaMode === 1 ? 3 : 60
      while (Math.abs(wheelAcc.current) >= step) {
        go(wheelAcc.current > 0 ? 1 : -1)
        wheelAcc.current -= Math.sign(wheelAcc.current) * step
      }
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [go, zoomBy])

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>): void => {
    const k = e.key
    const handled = (() => {
      if (k === 'ArrowDown' || k === 'ArrowRight') go(1)
      else if (k === 'ArrowUp' || k === 'ArrowLeft') go(-1)
      else if (k === 'PageDown') go(10)
      else if (k === 'PageUp') go(-10)
      else if (k === 'Home') setPos(0)
      else if (k === 'End') setPos(numbers.length - 1)
      else if (/^[0-5]$/.test(k)) applyPreset(k)
      else if (k === 'i' || k === 'I') setInvert((v) => !v)
      else if (k === 'r' || k === 'R') reset()
      else if (k === 'f' || k === 'F') toggleFullscreen()
      else if (k === 'w' || k === 'W') setTool('window')
      else if (k === 'p' || k === 'P') setTool('pan')
      else if (k === 's' || k === 'S') setTool('scroll')
      else if (k === '+' || k === '=') zoomBy(1.2)
      else if (k === '-' || k === '_') zoomBy(1 / 1.2)
      else if (k === '?') setHelp((v) => !v)
      else if (k === 'Escape') {
        if (help) setHelp(false)
        else if (fullscreen) toggleFullscreen()
        else return false
      } else return false
      return true
    })()
    if (handled) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  const letters = edgeLetters(current?.img)
  const pct = active && active.totalBytes > 0 ? Math.min(100, Math.round((loadedBytes / active.totalBytes) * 100)) : 0
  const winLabel = effectiveWin ? `W ${Math.round(effectiveWin.width)} · L ${Math.round(effectiveWin.center)}` : ''
  const ariaLabel = `${title}${active ? `, ${active.description}` : ''}${numbers.length > 1 ? `, image ${pos + 1} of ${numbers.length}` : ''}${effectiveWin ? `, window ${Math.round(effectiveWin.width)}, level ${Math.round(effectiveWin.center)}` : ''}`

  const toolBtn = (t: Tool, label: string, Icon: typeof Hand, shortcut: string): ReactElement => (
    <button
      type="button"
      onClick={() => setTool(t)}
      aria-pressed={tool === t}
      title={`${label} (${shortcut})`}
      className={`focus-ring inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors ${
        tool === t ? 'bg-white/15 text-white' : 'text-neutral-300 hover:bg-white/10 hover:text-white'
      }`}
    >
      <Icon size={16} aria-hidden="true" />
      {/* Labels only when the viewer itself is wide (a container query): beside
          the report at 1280px it is narrower than the window suggests. The
          name stays for screen readers either way. */}
      <span className="sr-only @4xl:not-sr-only">{label}</span>
    </button>
  )
  const iconBtn = (label: string, Icon: typeof Hand, onClick: () => void, pressed?: boolean): ReactElement => (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={`focus-ring inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
        pressed ? 'bg-white/15 text-white' : 'text-neutral-300 hover:bg-white/10 hover:text-white'
      }`}
    >
      <Icon size={16} aria-hidden="true" />
    </button>
  )

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label={`Image viewer — ${title}. Press question mark for keyboard shortcuts.`}
      data-testid="dicom-viewer"
      data-state={status}
      className={`focus-ring @container flex min-w-0 flex-col overflow-hidden bg-[#0A0D12] text-neutral-200 outline-none ${
        fullscreen ? 'fixed inset-0 z-50 rounded-none' : 'rounded-2xl'
      }`}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-white/10 px-2 py-1.5" role="toolbar" aria-label="Viewer tools">
        {series.length > 1 && (
          <label className="flex min-w-0 items-center gap-1.5 pr-1 text-xs text-neutral-400">
            <Layers size={15} aria-hidden="true" className="hidden @4xl:block" />
            <span className="sr-only">Series</span>
            <select
              value={seriesIdx}
              onChange={(e) => setSeriesIdx(Number(e.target.value))}
              className="focus-ring h-10 max-w-[10.5rem] rounded-lg @4xl:max-w-[12rem] border border-white/15 bg-[#11151c] px-2 text-xs text-neutral-100"
            >
              {series.map((s, i) => (
                <option key={s.id} value={i}>
                  {s.description} · {s.instanceCount} {s.instanceCount === 1 ? 'image' : 'images'}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex items-center gap-1.5 text-xs text-neutral-400">
          <SunMedium size={15} aria-hidden="true" className="hidden @4xl:block" />
          <span className="sr-only">Window preset</span>
          <select
            value={presetKey}
            onChange={(e) => applyPreset(e.target.value)}
            className="focus-ring h-10 rounded-lg border border-white/15 bg-[#11151c] px-2 text-xs text-neutral-100"
          >
            {presetKey === '' && <option value="">Custom</option>}
            {presets.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label} ({p.key})
              </option>
            ))}
          </select>
        </label>
        <span className="mx-1 hidden h-6 w-px bg-white/10 sm:block" aria-hidden="true" />
        {modality !== 'XR' && toolBtn('window', 'Window', Contrast, 'W')}
        {toolBtn('pan', 'Pan', Hand, 'P')}
        {numbers.length > 1 && toolBtn('scroll', 'Scroll', MoveVertical, 'S')}
        <span className="mx-1 hidden h-6 w-px bg-white/10 sm:block" aria-hidden="true" />
        {iconBtn('Zoom in (+)', ZoomIn, () => zoomBy(1.25))}
        {iconBtn('Zoom out (−)', ZoomOut, () => zoomBy(1 / 1.25))}
        {iconBtn('Invert (I)', Blend, () => setInvert((v) => !v), invert)}
        {iconBtn('Reset (R)', RotateCcw, reset)}
        <span className="ml-auto" />
        {iconBtn('Keyboard shortcuts (?)', Keyboard, () => setHelp((v) => !v), help)}
        {iconBtn(fullscreen ? 'Exit full screen (F)' : 'Full screen (F)', fullscreen ? Minimize2 : Maximize2, toggleFullscreen)}
      </div>

      {/* Stage */}
      {/* ⚠️ flex-1 only in full screen: inside a column flexbox of no fixed
          height, flex-1 resolves to a zero basis and the stage collapses. */}
      <div ref={stageRef} className={`relative min-h-0 ${fullscreen ? 'flex-1' : 'aspect-square max-h-[72vh] w-full sm:aspect-auto sm:h-[min(72vh,660px)]'}`}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={ariaLabel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={reset}
          className={`absolute inset-0 h-full w-full touch-none select-none ${tool === 'pan' ? 'cursor-grab active:cursor-grabbing' : tool === 'scroll' ? 'cursor-ns-resize' : 'cursor-crosshair'}`}
        />

        {/* Overlay (HTML text, one font) */}
        {status === 'ready' && current && (
          <div className="pointer-events-none absolute inset-0 text-[11px] leading-tight text-neutral-300 tabular-nums sm:text-xs">
            <div className="absolute left-3 top-2.5">
              <p className="font-semibold text-neutral-100">{active?.description}</p>
              {numbers.length > 1 && <p data-testid="slice-counter">{pos + 1} / {numbers.length}</p>}
            </div>
            <div className="absolute bottom-2.5 left-3">{winLabel}</div>
            <div className="absolute bottom-2.5 right-3">{Math.round(view.zoom * 100)}%</div>
            {letters && (
              <>
                <span className="absolute left-1/2 top-2.5 -translate-x-1/2 text-neutral-400">{letters[0]}</span>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">{letters[1]}</span>
                <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 text-neutral-400">{letters[2]}</span>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">{letters[3]}</span>
              </>
            )}
          </div>
        )}

        {status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-neutral-300" role="status">
            <Loader2 size={22} className={reduceMotion() ? '' : 'animate-spin'} aria-hidden="true" />
            <span>Loading images{pct > 0 ? ` · ${pct}%` : '…'}</span>
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-neutral-300" role="alert">
            <p className="max-w-sm">{errorText} The report is shown in full.</p>
          </div>
        )}
        {status === 'ready' && loadedCount < numbers.length && (
          <div className="pointer-events-none absolute right-3 top-2.5 text-[11px] text-neutral-400 tabular-nums sm:text-xs" aria-hidden="true">
            Loading {loadedCount}/{numbers.length}
          </div>
        )}

        {help && (
          <div className="absolute inset-3 overflow-auto rounded-xl border border-white/10 bg-[#0A0D12]/95 p-4 text-xs text-neutral-200" role="dialog" aria-label="Keyboard shortcuts">
            <p className="mb-2 text-sm font-semibold text-white">Viewer shortcuts</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              <dt className="font-semibold">↑ ↓ / wheel</dt><dd>Previous / next image</dd>
              <dt className="font-semibold">PgUp PgDn</dt><dd>Move 10 images</dd>
              <dt className="font-semibold">Home End</dt><dd>First / last image</dd>
              <dt className="font-semibold">0–5</dt><dd>Window presets</dd>
              <dt className="font-semibold">Drag</dt><dd>Window/level (Window tool) · pan (Pan tool, or Shift)</dd>
              <dt className="font-semibold">Ctrl + wheel, pinch</dt><dd>Zoom</dd>
              <dt className="font-semibold">I · R · F</dt><dd>Invert · reset · full screen</dd>
              <dt className="font-semibold">W · P · S</dt><dd>Window · pan · scroll tool</dd>
            </dl>
            <button type="button" onClick={() => setHelp(false)} className="focus-ring mt-3 rounded-lg bg-white/10 px-3 py-1.5 font-medium text-white hover:bg-white/15">Close</button>
          </div>
        )}
      </div>

      {/* Slice bar */}
      {numbers.length > 1 && (
        <div className="border-t border-white/10 px-3 py-2">
          <label className="sr-only" htmlFor={`slice-${studyId}`}>Image</label>
          <input
            id={`slice-${studyId}`}
            type="range"
            min={0}
            max={numbers.length - 1}
            value={pos}
            onChange={(e) => setPos(Number(e.target.value))}
            aria-valuetext={`Image ${pos + 1} of ${numbers.length}`}
            className="w-full accent-neutral-300"
          />
        </div>
      )}

      {/* Credit — part of the viewer, so it travels into full screen too. */}
      {(attribution || note) && (
        <p className="border-t border-white/10 px-3 py-2 text-[11px] leading-snug text-neutral-400 sm:text-xs" data-testid="image-attribution">
          {attribution}
          {note && <span className="text-neutral-300"> {note}</span>}
        </p>
      )}
      <span className="sr-only" aria-live="polite">{announce}</span>
    </div>
  )
}
