import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Search, Sparkles } from 'lucide-react'
import { useAiTouchpoint } from '../useAi'
import AiResultBlock from './AiResultBlock'
import { AiAbstain, AiOffNotice } from './AiStates'
import AiMark from './AiMark'

/**
 * `C-40` — the `Z6` AI side panel on `S-06-02`. `AIP-04`, §6435.
 *
 * Carries the screen's two `Z6` actions (§6443–6444):
 *   "Catch me up"   `AI-105`  G1  explain mandatory
 *   "Ask the record" `AI-901` G1  explain on demand
 *
 * ⚠️ THE ESCAPE HATCH IS PART OF THE SUMMARY, NOT A SEPARATE FEATURE. The atlas
 * states the same requirement in four places — "the unsummarised record is
 * always one click away" — and §6485 explains why: "a summary nobody can go
 * behind is not trusted." So the link to the chronological record renders
 * *inside* the summary block, is never gated on a capability, and is never
 * hidden when AI is off (it is the fallback, and `S-06-02` also carries it in
 * `Z4` where it is always visible regardless of this panel).
 *
 * ⚠️ WHEN AI IS OFF, THIS WHOLE PANEL COLLAPSES TO ONE LINE. No greyed
 * buttons, no placeholder card, no reserved space (§4.8).
 */

interface ChartAiPanelProps {
  /** The patient's display name — the summary fixture's key. */
  patientName: string
  /** Where "the full record" lives for this patient. */
  timelineHref: string
}

export default function ChartAiPanel({ patientName, timelineHref }: ChartAiPanelProps) {
  const [summaryOn, setSummaryOn] = useState(false)
  const [draft, setDraft] = useState('')
  const [question, setQuestion] = useState<string | undefined>(undefined)

  const summary = useAiTouchpoint('AI-105', patientName)
  const search = useAiTouchpoint('AI-901', patientName, question)

  // Both touchpoints share one kill switch in this build, so either is enough
  // to tell whether the fabric is on.
  if (summary.result.status === 'off') {
    return (
      <div className="border-t border-border-soft p-5">
        <AiOffNotice />
      </div>
    )
  }

  function ask(e: FormEvent) {
    e.preventDefault()
    setQuestion(draft.trim() === '' ? undefined : draft.trim())
  }

  return (
    <div className="space-y-3 border-t border-border-soft p-5">
      <h2 className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wide text-ink-subtle">
        <AiMark />
        Assistance
      </h2>

      {/* ── AI-105 · Catch me up ─────────────────────────────────────────── */}
      {!summaryOn ? (
        <button
          type="button"
          onClick={() => setSummaryOn(true)}
          className="focus-ring flex w-full items-center justify-center gap-1.5 rounded-lg border border-ai/30 bg-ai-soft px-3 py-2 text-xs font-medium text-ink transition-colors hover:border-ai/50"
        >
          <Sparkles size={13} aria-hidden="true" className="text-ai" />
          Catch me up
        </button>
      ) : (
        // Bound to a local so the narrowing survives into the callback — the
        // union is re-read on every access otherwise.
        (() => {
          const r = summary.result
          if (r.status === 'abstain') {
            return (
              <AiAbstain missing={r.missing}>
                <Link
                  to={timelineHref}
                  className="focus-ring mt-2 inline-block rounded text-2xs font-medium text-primary-700 underline underline-offset-2"
                >
                  Read the full record instead →
                </Link>
              </AiAbstain>
            )
          }
          if (r.status !== 'ready') return null
          return r.items.map((item) => (
            <AiResultBlock
              key={item.id}
              item={item}
              spec={summary.spec}
              generatedAt={r.generatedAt}
              model={r.model}
              footer={
                // The escape hatch. See the header.
                <Link
                  to={timelineHref}
                  className="focus-ring mt-2 inline-block rounded text-2xs font-medium text-primary-700 underline underline-offset-2"
                >
                  Read the full record instead →
                </Link>
              }
            />
          ))
        })()
      )}

      {/* ── AI-901 · Ask the record ──────────────────────────────────────── */}
      <form onSubmit={ask} className="space-y-1.5">
        <label htmlFor="ask-record" className="sr-only">
          Ask a question about this record
        </label>
        <div className="relative">
          <Search
            size={13}
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-subtle"
          />
          <input
            id="ask-record"
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask the record…"
            className="focus-ring w-full rounded-lg border border-border-soft bg-surface-1 py-2 pl-8 pr-3 text-xs text-ink placeholder:text-ink-subtle"
          />
        </div>
      </form>

      {question !== undefined &&
        (() => {
          const r = search.result
          if (r.status === 'abstain') return <AiAbstain missing={r.missing} />
          if (r.status !== 'ready') return null
          return r.items.map((item) => (
            <AiResultBlock
              key={item.id}
              item={item}
              spec={search.spec}
              generatedAt={r.generatedAt}
              model={r.model}
            />
          ))
        })()}
    </div>
  )
}
