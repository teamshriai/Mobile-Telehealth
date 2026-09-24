import type { ReactNode } from 'react'
import AiMark from './AiMark'

/**
 * `AI-ABSTAIN` and the `AI-OFF` notice. §4.8.
 *
 * ⚠️ ABSTAIN IS NOT AN EMPTY STATE. §4.5: "A risk score of 0 because there are
 * no vitals and a risk score of 0 because the patient is well are clinically
 * opposite and visually identical." So abstention always states *what is
 * missing* and, where one exists, offers the action that would fix it. It never
 * renders a zero, a dash, or a blank panel.
 *
 * ⚠️ THERE IS NO `AiOff` COMPONENT THAT DRAWS A CONTROL. Off means the
 * affordance is gone — §4.8: "affordances hidden entirely, never greyed. A
 * greyed control advertises a missing feature and invites a support call; a
 * hidden one leaves a working screen." `AiOffNotice` is the one quiet line the
 * atlas permits, and it renders no buttons.
 */

export function AiAbstain({ missing, children }: { missing: string; children?: ReactNode }) {
  return (
    <section
      role="region"
      aria-label="AI assistance unavailable for this record"
      className="rounded-xl border border-border-soft bg-surface-2 p-3"
    >
      <h3 className="flex items-center gap-1.5 text-xs font-semibold text-ink">
        <AiMark />
        Cannot answer
      </h3>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{missing}</p>
      {/* ⚠️ §4.5 — abstention "states what is missing and offers the action
          that would fix it". The caller supplies the action because only the
          caller knows where the unsummarised record lives for this patient. */}
      {children}
    </section>
  )
}

/**
 * The single quiet line permitted when the fabric is off.
 *
 * ⚠️ Deliberately NOT a banner, NOT amber, and NOT dismissible. It is a
 * statement of fact in the smallest type on the screen. A clinician who never
 * notices it has lost nothing, which is the point.
 */
export function AiOffNotice() {
  return <p className="text-2xs text-ink-subtle">AI assistance unavailable.</p>
}
