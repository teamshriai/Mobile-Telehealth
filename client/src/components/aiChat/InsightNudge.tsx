import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react'
import { ArrowRight, X } from 'lucide-react'
import AssistantMark from './AssistantMark'
import * as aiService from '../../services/ai.service'
import { useAuth } from '../../app/useAuth'
import { useAiMode } from '../../ai/useAi'
import type { AiInsight } from '../../types/domain'

/**
 * Short reminders from the patient's record, in a speech bubble beside the AI
 * chat button — "your next visit is on Tue 29 Sep", "your report is ready".
 *
 * ⚠️ WRITTEN BY TEMPLATES ON THE SERVER, NOT BY THE MODEL (ai/insights.service
 * .ts), and only about logistics — never a value, a comparison or advice. The
 * label says where they come from: "From your record".
 *
 * Pacing, so they inform without nagging:
 *  - the first appears a few seconds after the portal opens;
 *  - a bubble never disappears on its own (a slow reader keeps it) — after a
 *    while, unless it is being read (hovered or focused), the next one takes
 *    its place, and the last one stays until closed;
 *  - at most five a session, each shown once;
 *  - ✕ ends them for the session; Settings → "Assistant insights" ends them
 *    for good, and the assistant's Off switch hides them too.
 * Never shown while the chat is open, on Emergency, or under a dialog.
 *
 * Tapping one opens the chat with its question ready in the box, not sent.
 * Session memory is ids and a flag only (sessionStorage, this tab).
 */

const FIRST_DELAY_MS = 4_000
const NEXT_AFTER_MS = 45_000
const MAX_PER_SESSION = 5
const STORE_KEY = 'shri-health.insights'

interface Seen {
  ids: string[]
  stopped: boolean
}

function readSeen(): Seen {
  try {
    const raw = window.sessionStorage.getItem(STORE_KEY)
    const v = raw === null ? null : (JSON.parse(raw) as Partial<Seen>)
    return {
      ids: Array.isArray(v?.ids) ? v.ids.filter((x): x is string => typeof x === 'string') : [],
      stopped: v?.stopped === true,
    }
  } catch {
    return { ids: [], stopped: false }
  }
}

function writeSeen(seen: Seen): void {
  try {
    window.sessionStorage.setItem(STORE_KEY, JSON.stringify(seen))
  } catch {
    /* storage unavailable — they simply may show again */
  }
}

/** A dialog (or the idle warning) is up — Modal, Drawer, BottomSheet, the nav drawer. */
function overlayOpen(): boolean {
  return document.querySelector('[aria-modal="true"], [role="alertdialog"]') !== null
}

export default function InsightNudge({
  paused: pausedByPage,
  onAsk,
}: {
  /** The chat is open, or the page is one they must not sit on (Emergency). */
  paused: boolean
  onAsk: (question: string) => void
}): ReactElement | null {
  const { profile } = useAuth()
  const { mode } = useAiMode()
  const prefs = profile !== null && 'preferences' in profile ? profile.preferences : undefined
  const turnedOff = mode === 'off' || prefs?.notifications?.aiInsights === false

  const [list, setList] = useState<AiInsight[]>([])
  const [seen, setSeen] = useState<Seen>(readSeen)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const [covered, setCovered] = useState(false)
  const nextAt = useRef(0)

  const hidden = turnedOff || seen.stopped || pausedByPage || covered

  // One request, a moment after the portal opens.
  useEffect(() => {
    if (turnedOff || seen.stopped) return undefined
    let alive = true
    const t = window.setTimeout(() => {
      aiService
        .getInsights()
        .then((r) => {
          if (alive && r.enabled) setList(r.insights)
        })
        .catch(() => {
          /* no bubbles is a fine outcome */
        })
    }, FIRST_DELAY_MS)
    return () => {
      alive = false
      window.clearTimeout(t)
    }
  }, [turnedOff, seen.stopped])

  // A dialog opening over the page covers the bubble's moment too.
  useEffect(() => {
    if (list.length === 0) return undefined
    const id = window.setInterval(() => setCovered(overlayOpen()), 1_000)
    return () => window.clearInterval(id)
  }, [list.length])

  const current = list.find((i) => i.id === currentId) ?? null
  const upcoming = seen.ids.length < MAX_PER_SESSION ? (list.find((i) => !seen.ids.includes(i.id)) ?? null) : null

  const show = useCallback((id: string) => {
    setSeen((s) => {
      const next = { ...s, ids: [...s.ids, id] }
      writeSeen(next)
      return next
    })
    setCurrentId(id)
  }, [])

  // The first one, or the next after the patient acted on one.
  useEffect(() => {
    if (hidden || current !== null || upcoming === null) return undefined
    const t = window.setTimeout(() => show(upcoming.id), Math.max(0, nextAt.current - Date.now()))
    return () => window.clearTimeout(t)
  }, [hidden, current, upcoming, show])

  // The next takes this one's place after a while — unless it is being read.
  useEffect(() => {
    if (hidden || current === null || upcoming === null || reading) return undefined
    const t = window.setTimeout(() => show(upcoming.id), NEXT_AFTER_MS)
    return () => window.clearTimeout(t)
  }, [hidden, current, upcoming, reading, show])

  const stop = (): void => {
    setSeen((s) => {
      const next = { ...s, stopped: true }
      writeSeen(next)
      return next
    })
    setCurrentId(null)
  }

  const ask = (insight: AiInsight): void => {
    setCurrentId(null)
    setReading(false)
    nextAt.current = Date.now() + NEXT_AFTER_MS
    onAsk(insight.question)
  }

  if (turnedOff || seen.stopped) return null

  return (
    // Always mounted while insights are on, so a screen reader hears a bubble
    // arrive (a live region must exist before its content changes).
    <div aria-live="polite" data-print="hide">
      {current !== null && !hidden && (
        <div
          data-testid="insight-nudge"
          onMouseEnter={() => setReading(true)}
          onMouseLeave={() => setReading(false)}
          onFocus={() => setReading(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setReading(false)
          }}
          className="insight-nudge fixed bottom-[10.25rem] right-4 z-30 w-[min(20rem,calc(100vw-2rem))] motion-safe:animate-[slideUp_220ms_var(--ease-premium)] md:bottom-[5.75rem] md:right-6"
        >
          <div className="relative rounded-2xl border border-accent-sky-fg/20 bg-accent-sky shadow-card-lg">
            <button
              type="button"
              onClick={() => ask(current)}
              className="focus-ring flex w-full items-start gap-3 rounded-2xl p-3 pr-12 text-left"
            >
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-surface-1 text-accent-sky-fg"
              >
                <AssistantMark size={20} />
              </span>
              <span className="min-w-0">
                <span className="block text-2xs font-semibold uppercase tracking-wide text-accent-sky-fg">
                  From your record
                </span>
                <span className="mt-0.5 block text-sm leading-snug text-ink">{current.text}</span>
                <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-accent-sky-fg">
                  Ask about this <ArrowRight size={12} aria-hidden="true" />
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={stop}
              aria-label="Hide assistant insights"
              title="Hide for now"
              className="focus-ring tap-target absolute right-1 top-1 rounded-lg text-accent-sky-fg hover:bg-surface-1/60"
            >
              <X size={16} aria-hidden="true" />
            </button>
            {/* The tail, pointing down at the chat button. */}
            <span
              aria-hidden="true"
              className="absolute -bottom-[7px] right-[1.3rem] h-3.5 w-3.5 rotate-45 border-b border-r border-accent-sky-fg/20 bg-accent-sky"
            />
          </div>
        </div>
      )}
    </div>
  )
}
