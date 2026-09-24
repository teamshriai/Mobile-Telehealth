import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { AiContext, type AiContextValue, type AiDemoMode } from './aiContextObject'
import { touchpoint } from './registry'
import { chartSummaryFor } from './fixtures/chartSummary'
import { answerFor } from './fixtures/recordSearch'
import type { AiItem, AiResult, ConfidenceBand } from './types'

/**
 * The AI fabric's root.
 *
 * ⚠️ `demoMode` EXISTS BECAUSE THE FAILURE STATES ARE PART OF THE PRODUCT.
 * §4.8 specifies three of them and §1.5 requires every screen to draw all
 * three. A build where AI is simply always on cannot demonstrate that the
 * screens still work without it — which is the single most important claim the
 * atlas makes about this fabric ("Every screen remains fully usable").
 *
 * The four modes map to §4.8 and §4.5:
 *   on      — normal operation
 *   off     — per-capability or global kill switch; affordances HIDDEN
 *   abstain — below the input-completeness floor; states what is missing
 *   low     — LOW confidence; delivered collapsed, acceptance gated on expansion
 *
 * ⚠️ The mode is deliberately NOT persisted to the server and NOT part of any
 * clinical record. It is a presentation switch for a showcase.
 */

/**
 * The simulated model identity, stamped on every result.
 *
 * ⚠️ It says "Simulated" in the name on purpose. §4.7 panel 4 requires model
 * name and version, and every surface that shows a result shows this. There is
 * no configuration in which this product claims to be running a real model.
 */
const MODEL = 'Simulated assistant · demo-2026.09'

/**
 * A fixed timestamp string rather than `Date.now()`.
 *
 * ⚠️ Determinism is structural here (see the fixture headers). A generated-at
 * time that moved would make two runs of the same demo differ, and would make
 * the fixtures untestable. The UI labels this as a simulation, so a stable
 * time is honest rather than misleading.
 */
const GENERATED_AT = 'from the record as loaded'

function ready(items: readonly AiItem[], band: ConfidenceBand): AiResult {
  return { status: 'ready', band, items, generatedAt: GENERATED_AT, model: MODEL }
}

export function AiProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AiDemoMode>('on')

  const resolve = useCallback(
    (touchpointId: string, scopeKey: string, query?: string): AiResult => {
      // Throws on an unknown id — a typo in a screen should fail loudly in
      // development, not render a silent empty panel.
      const spec = touchpoint(touchpointId)

      if (mode === 'off') return { status: 'off' }

      if (mode === 'abstain') {
        // ⚠️ No `fixAction` here. The fixing action for a chart summary is "go
        // and read the record", and only the screen knows where that record
        // lives for this patient — so the screen supplies it. A placeholder
        // href invented at this layer was dead data that rendered as nothing.
        return {
          status: 'abstain',
          missing:
            'This capability is not answering for this record. It needs more of the chart than ' +
            'is currently available to it.',
        }
      }

      const band: ConfidenceBand = mode === 'low' ? 'LOW' : 'HIGH'

      switch (spec.id) {
        case 'AI-105': {
          // `scopeKey` is the patient's name — see the fixture header for why.
          const item = chartSummaryFor(scopeKey)
          return ready([{ ...item, band: mode === 'low' ? 'LOW' : item.band }], band)
        }

        case 'AI-901': {
          // Nothing asked yet — ready with no items, so the panel renders its
          // prompt rather than an error.
          if (query === undefined || query.trim() === '') return ready([], band)
          const item = answerFor(query)
          // ⚠️ Fails closed. An unmatched question abstains rather than
          // guessing — see the fixture header.
          if (item === null) {
            return {
              status: 'abstain',
              missing:
                'Nothing in this record answers that. Try naming what you are looking for — an ' +
                'allergy, a medication, a visit or a diagnosis.',
            }
          }
          return ready([{ ...item, band: mode === 'low' ? 'LOW' : item.band }], band)
        }

        default:
          // A touchpoint that is registered but has no fixture yet abstains.
          // ⚠️ It must NOT return `off`: off means "the capability is disabled",
          // which is a different fact and would hide the affordance entirely.
          return {
            status: 'abstain',
            missing: `${spec.capability} is not part of this showcase build yet.`,
          }
      }
    },
    [mode],
  )

  const value = useMemo<AiContextValue>(() => ({ mode, setMode, resolve }), [mode, resolve])

  return <AiContext.Provider value={value}>{children}</AiContext.Provider>
}
