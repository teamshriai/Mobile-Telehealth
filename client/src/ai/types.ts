/**
 * The simulated AI fabric — types.
 *
 * ⚠️ NOTHING HERE CALLS A MODEL. Every result is a frozen fixture selected
 * deterministically from a scope key. The point of the subsystem is to show
 * the *interaction design* the atlas specifies — gates, confidence, evidence,
 * disposition, abstention — not to do inference. `AiSource` is the one seam a
 * real backend would replace.
 *
 * ⚠️ THE MOST IMPORTANT TYPE IN THIS FILE IS `AiResult`, and specifically the
 * fact that `{ status: 'off' }` HAS NO `items` FIELD. §4.8 requires that when a
 * capability is off its affordances are "hidden entirely, never greyed". If
 * `off` were a boolean beside an always-present array, honouring that would be
 * a discipline every screen had to remember. As a discriminated union it is a
 * compile error: a screen cannot reach `.items` without first narrowing away
 * `off`, and `<AiSlot>` renders nothing at all in that branch.
 */

/** §4.5 — three bands, never a bare number. */
export type ConfidenceBand = 'HIGH' | 'MED' | 'LOW'

/** §4.4 — exactly one gate per touchpoint. */
export type Gate = 'G0' | 'G1' | 'G2' | 'G3' | 'G4'

/** §4.3 — the affordance pattern decides where the output is drawn. */
export type AiPattern =
  | 'AIP-01' // inline draft / ghost text
  | 'AIP-02' // inline suggestion on a field
  | 'AIP-03' // suggestion list
  | 'AIP-04' // side panel (Z6, C-40)
  | 'AIP-05' // callout / flag
  | 'AIP-06' // tile badge
  | 'AIP-07' // ranking
  | 'AIP-08' // explainability drawer
  | 'AIP-09' // blocking gate
  | 'AIP-10' // batch review

/** §4.7 — mandatory for G1–G4, on demand only for G0. */
export type ExplainMode = 'mandatory' | 'on-demand'

/**
 * §4.6 — a closed set of five. **No module invents a sixth.**
 * `Overridden` is G4 only and is not reachable from `C-41`.
 */
export type Disposition =
  | 'Accepted'
  | 'Accepted with edits'
  | 'Rejected'
  | 'Deferred'
  | 'Overridden'

/** §4.6 — fixed so the feedback is analysable, not free text. */
export const REJECTION_REASONS = [
  'Clinically incorrect',
  'Not relevant to this patient',
  'Already documented',
  'Insufficient information',
  'Other',
] as const

export type RejectionReason = (typeof REJECTION_REASONS)[number]

/**
 * One row of `C-42` panel 2 — "what it used".
 *
 * ⚠️ `href` is what makes the panel worth having. §4.7 calls panel 2 "the panel
 * that earns clinical trust" precisely because each input is clickable back to
 * its source record; a list of inputs you cannot go and check is a claim, not
 * evidence.
 */
export interface AiEvidence {
  label: string
  detail: string
  href?: string
}

/**
 * `C-42` — the four fixed panels, identical on every screen (§4.7).
 *
 * ⚠️ Every array is `readonly`. Fixtures are `Object.freeze`d and declared
 * `as const`, and a mutable type would force each one to be widened — which
 * would also let a screen sort or splice a frozen fixture and throw at runtime.
 */
export interface AiExplanation {
  /** Panel 1 — plain-language claim. The band and timestamp are added by the UI. */
  what: string
  /** Panel 2 — the inputs, each clickable back to its source. */
  used: readonly AiEvidence[]
  /** Panel 3 — drivers or retrieved evidence. ⚠️ Never raw feature names. */
  why: readonly string[]
  /** Panel 4 — provenance and limits. */
  limits: {
    model: string
    version: string
    validatedOn: string
    failureModes: readonly string[]
  }
}

export interface AiItem {
  id: string
  /** Short label used in gate-pending lists, so a lock always names itself. */
  label: string
  /** The body. Markdown is NOT parsed — plain text, rendered with line breaks. */
  body: string
  band: ConfidenceBand
  explanation: AiExplanation
}

/**
 * ⚠️ A discriminated union, deliberately. See the file header.
 *
 * `off` carries no payload at all. `abstain` carries what is missing and the
 * action that would fix it — §4.5: "a risk score of 0 because there are no
 * vitals and a risk score of 0 because the patient is well are clinically
 * opposite and visually identical".
 */
export type AiResult =
  | { status: 'off' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'abstain'
      /** "no vitals since 02:10" — stated, never implied by a null. */
      missing: string
      fixAction?: { label: string; href: string }
    }
  | {
      status: 'ready'
      band: ConfidenceBand
      items: readonly AiItem[]
      generatedAt: string
      model: string
    }

/** A touchpoint's fixed specification. §M-06.5 and §4.2 are the source. */
export interface AiTouchpointSpec {
  /** `AI-105` etc. */
  id: string
  capability: string
  pattern: AiPattern
  gate: Gate
  explain: ExplainMode
  /**
   * ⚠️ Fixed in the spec, NOT in the fixture. A guardrail that a fixture could
   * vary is not a guardrail. This string is rendered verbatim.
   */
  guardrail: string
  /** What the capability falls back to when it is off (§4.2). */
  fallback: string
}

/**
 * The one replacement seam.
 *
 * A real implementation swaps this for something that calls a backend; no
 * screen imports a fixture, so nothing else changes.
 */
export interface AiSource {
  get(touchpointId: string, scopeKey: string): AiResult
}
