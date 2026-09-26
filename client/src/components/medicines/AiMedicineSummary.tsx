import { useEffect, useState } from 'react'
import { Info, Loader2, Sparkles } from 'lucide-react'
import AiMark from '../../ai/components/AiMark'
import * as portal from '../../services/portal.service'
import type { MedicineSummaryResult } from '../../services/portal.service'

/**
 * A plain-language explanation of the patient's current prescriptions,
 * written by AI on request.
 *
 * ⚠️ ON DEMAND, AND CACHED. Opening the page never calls the model: it asks
 * for the stored summary only, which the server returns while the
 * prescriptions it was written from are unchanged. Writing one spends the
 * patient's daily AI allowance, so it happens only when they press the button.
 *
 * ⚠️ OPTIONAL BY DESIGN. When AI is off, not permitted for this record, busy
 * or its output fails the safety check, the card is replaced by one quiet
 * line. Nothing else on the page depends on it.
 */

const STAMP = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })

type View =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'writing' }
  | { kind: 'text'; text: string; generatedAt: string }
  | { kind: 'quiet'; message: string }
  | { kind: 'hidden' }

function toView(r: MedicineSummaryResult): View {
  if (r.state === 'ok') return { kind: 'text', text: r.text, generatedAt: r.generatedAt }
  if (r.state === 'none') return { kind: 'ready' }
  if (r.state === 'empty') return { kind: 'hidden' }
  return { kind: 'quiet', message: r.message }
}

export default function AiMedicineSummary({ hasCurrent }: { hasCurrent: boolean }) {
  const [view, setView] = useState<View>({ kind: 'loading' })

  useEffect(() => {
    if (!hasCurrent) {
      setView({ kind: 'hidden' })
      return
    }
    let cancelled = false
    portal
      .getMedicineSummary()
      .then((r) => { if (!cancelled) setView(toView(r)) })
      // No summary is not a page error — fall back to the button.
      .catch(() => { if (!cancelled) setView({ kind: 'ready' }) })
    return () => { cancelled = true }
  }, [hasCurrent])

  const write = (): void => {
    setView({ kind: 'writing' })
    portal
      .generateMedicineSummary()
      .then((r) => setView(toView(r)))
      .catch(() => setView({ kind: 'quiet', message: 'The AI summary could not be written just now. Your medicine list below is complete without it.' }))
  }

  if (view.kind === 'hidden' || view.kind === 'loading') return null

  if (view.kind === 'quiet') {
    return (
      <p className="flex items-start gap-2 text-xs text-ink-subtle" data-testid="ai-summary-quiet">
        <Info size={14} aria-hidden="true" className="mt-px flex-shrink-0" /> {view.message}
      </p>
    )
  }

  return (
    <section
      aria-label="AI summary of your medicines"
      className="rounded-2xl border border-ai/25 bg-ai-soft p-4 sm:p-5"
      data-testid="ai-summary"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <AiMark />
          <h2 className="text-sm font-semibold text-ink">Your medicines in plain words</h2>
          <span className="rounded-md border border-ai/30 px-1.5 py-px text-2xs font-semibold text-ai">AI</span>
        </div>
        {(view.kind === 'ready' || view.kind === 'writing') && (
          <button
            type="button"
            onClick={write}
            disabled={view.kind === 'writing'}
            className="focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-ai/35 bg-surface-1 px-3.5 text-sm font-semibold text-ink transition-colors hover:border-ai/60 disabled:opacity-70"
          >
            {view.kind === 'writing'
              ? <><Loader2 size={15} className="animate-spin" aria-hidden="true" /> Writing…</>
              : <><Sparkles size={15} aria-hidden="true" className="text-ai" /> Explain my medicines</>}
          </button>
        )}
      </div>

      {view.kind === 'text' ? (
        <>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink" aria-live="polite">{view.text}</p>
          <p className="mt-3 text-2xs leading-relaxed text-ink-subtle">
            Written by AI from your signed prescriptions on {STAMP.format(new Date(view.generatedAt))}. It can be wrong —
            your doctor&rsquo;s directions below always come first.
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-ink-muted">
          A short explanation of what each medicine is for and how it is taken, written only from your prescriptions.
        </p>
      )}
    </section>
  )
}
