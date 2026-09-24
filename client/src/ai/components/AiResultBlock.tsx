import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import ConfidenceBandChip from './ConfidenceBand'
import { bandLabel } from '../confidence'
import WhyDrawer from './WhyDrawer'
import AiMark from './AiMark'
import type { AiItem, AiTouchpointSpec } from '../types'

/**
 * One AI item, rendered with everything the atlas requires around it.
 *
 * ⚠️ `role="region"` WITH THE BAND IN THE ACCESSIBLE NAME (§6478). A sighted
 * user gets the band from the `C-44` chip; without this a screen-reader user
 * would get the text of a model suggestion with no indication that it is one,
 * or how much to trust it. The name is "AI suggestion · <label> · <band>".
 *
 * ⚠️ LOW ARRIVES COLLAPSED AND STAYS COLLAPSED UNTIL OPENED (§4.5). The rule
 * is "delivered collapsed; acceptance blocked until expanded", and the reason
 * is that a low-confidence suggestion sitting expanded beside a high-confidence
 * one gets skimmed identically. Collapsing forces one deliberate act before it
 * can be used. HIGH may be pre-expanded; MED is expanded but never
 * pre-selected.
 *
 * ⚠️ `Why?` is ALWAYS present, not only when `explain === 'mandatory'`.
 * Mandatory means the drawer must exist for G1–G4; there is no case where
 * hiding the reasoning is an improvement, so it is unconditional here.
 */

interface AiResultBlockProps {
  item: AiItem
  spec: AiTouchpointSpec
  generatedAt: string
  model: string
  /** Rendered under the body — e.g. the "one click away" escape hatch. */
  footer?: React.ReactNode
}

export default function AiResultBlock({
  item,
  spec,
  generatedAt,
  model,
  footer,
}: AiResultBlockProps) {
  const [open, setOpen] = useState(item.band !== 'LOW')
  const [why, setWhy] = useState(false)

  return (
    <section
      role="region"
      aria-label={`AI suggestion · ${item.label} · ${bandLabel(item.band)}`}
      className={`rounded-xl border p-3 ${
        item.band === 'LOW' ? 'border-warning-fg/40 bg-warning-bg/40' : 'border-ai/25 bg-ai-soft'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold text-ink">
          <AiMark />
          {item.label}
        </h3>
        {item.band === 'LOW' && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="focus-ring flex shrink-0 items-center gap-1 rounded px-1 py-0.5 text-2xs font-medium text-ink-muted hover:text-ink"
          >
            {open ? 'Hide' : 'Review'}
            <ChevronDown
              size={12}
              aria-hidden="true"
              className={`transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>

      <div className="mt-1.5">
        <ConfidenceBandChip band={item.band} />
      </div>

      {open ? (
        <>
          <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-ink">{item.body}</p>
          {footer}
        </>
      ) : (
        // ⚠️ Collapsed does not mean hidden. The clinician is told what is
        // behind the control and why it is closed, so ignoring it is a choice.
        <p className="mt-2 text-2xs text-ink-muted">
          Held back for review because confidence is low. Open it to read it.
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          onClick={() => setWhy(true)}
          className="focus-ring rounded text-2xs font-medium text-primary-700 underline underline-offset-2"
        >
          Why?
        </button>
        <span className="text-2xs text-ink-subtle">{spec.guardrail}</span>
      </div>

      <WhyDrawer
        open={why}
        onClose={() => setWhy(false)}
        item={item}
        spec={spec}
        generatedAt={generatedAt}
        model={model}
      />
    </section>
  )
}
