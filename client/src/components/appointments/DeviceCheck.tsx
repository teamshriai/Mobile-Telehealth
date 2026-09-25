import { useEffect, useRef, useState } from 'react'
import { Camera, Mic } from 'lucide-react'
import Modal from '../common/Modal'
import { Banner } from '../feedback/States'
import { classifyMicError, micPreflight, type MicStatus } from '../../lib/micSupport'

/**
 * Check the camera and microphone before a video consultation.
 *
 * ⚠️ A REAL CHECK, NOT A VIDEO CALL. It opens the devices locally so the
 * patient can see themselves and watch the microphone level move, then
 * releases them the moment the dialog closes. Nothing is recorded or sent.
 * The consultation link itself is not here because no video provider is
 * connected yet — the appointment says so, rather than showing a Join button
 * that does nothing.
 */
const MESSAGE: Record<MicStatus, string> = {
  'insecure-origin': 'This page was opened over plain HTTP, where browsers do not allow the camera or microphone. Open the portal from its secure address to check your devices.',
  denied: 'Camera or microphone access was declined. Allow it from the address bar and try again.',
  'no-device': 'No camera or microphone was found on this device.',
  unsupported: 'This browser cannot open the camera or microphone here.',
}

export default function DeviceCheck({ open, onClose }: { open: boolean; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<MicStatus | null>(null)
  const [level, setLevel] = useState(0)
  const [live, setLive] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    let stream: MediaStream | null = null
    let ctx: AudioContext | null = null
    let raf = 0
    let stopped = false
    setStatus(null)
    setLive(false)

    const blocked = micPreflight()
    if (blocked !== null) { setStatus(blocked); return undefined }

    navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 640, height: 360 } })
      .then((s) => {
        if (stopped) { s.getTracks().forEach((t) => t.stop()); return }
        stream = s
        if (videoRef.current !== null) videoRef.current.srcObject = s
        setLive(true)
        ctx = new AudioContext()
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 512
        ctx.createMediaStreamSource(s).connect(analyser)
        const buf = new Uint8Array(analyser.fftSize)
        const tick = () => {
          analyser.getByteTimeDomainData(buf)
          let peak = 0
          for (const b of buf) peak = Math.max(peak, Math.abs(b - 128))
          setLevel(Math.min(1, peak / 64))
          raf = requestAnimationFrame(tick)
        }
        tick()
      })
      .catch((err: unknown) => setStatus(classifyMicError(err)))

    // ⚠️ Released on close — the browser's camera light must go out.
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      void ctx?.close()
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [open])

  return (
    <Modal isOpen={open} onClose={onClose} title="Check your camera and microphone" size="md">
      <div className="space-y-4">
        {status !== null ? (
          <Banner tone="warning">{MESSAGE[status]}</Banner>
        ) : (
          <>
            <div className="overflow-hidden rounded-xl bg-surface-3">
              {/* Muted: the patient must not hear themselves echo. */}
              <video ref={videoRef} autoPlay playsInline muted className="aspect-video w-full object-cover" aria-label="Your camera preview" />
            </div>
            <div className="flex items-center gap-3">
              <Mic size={16} aria-hidden="true" className="text-ink-subtle" />
              <div aria-hidden="true" className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                <div className="h-full rounded-full bg-success-fg transition-[width] duration-100" style={{ width: `${Math.round(level * 100)}%` }} />
              </div>
            </div>
            <p className="flex items-center gap-1.5 text-sm text-ink-muted" role="status">
              <Camera size={15} aria-hidden="true" />
              {live ? 'If you can see yourself and the bar moves when you speak, you are ready.' : 'Opening your camera…'}
            </p>
          </>
        )}
        <p className="text-xs text-ink-subtle">
          Nothing is recorded or sent during this check. The consultation link will appear on the appointment closer to the time.
        </p>
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="focus-ring tap-target rounded-lg bg-primary-600 px-5 text-sm font-semibold text-on-primary hover:bg-primary-700">Done</button>
        </div>
      </div>
    </Modal>
  )
}
