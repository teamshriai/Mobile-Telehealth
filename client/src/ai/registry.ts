import type { AiTouchpointSpec } from './types'

/**
 * The 17 M-06 touchpoints, transcribed from `UI_ATLAS.md` §M-06.5 (:6196–6214)
 * plus `AI-911`, the universal `Z7b` assistant present on every screen (§6.1).
 *
 * ⚠️ THIS IS A TRANSCRIPTION, NOT A DESIGN. Gate, pattern, explain mode and
 * guardrail are all fixed by the atlas. They live here rather than in fixtures
 * so that a fixture cannot quietly downgrade a gate or soften a guardrail —
 * §4.4: "exactly one gate per touchpoint. The gate determines the UI treatment
 * completely."
 *
 * ⚠️ `AI-205` IS LISTED BUT DOES NOT OWN THE HARD STOP. The penicillin block on
 * `S-06-07` is a stored rule evaluated on the server by `drugSafety.ts`, which
 * imports nothing. `AI-205` may render advisory interaction pairs or a pointer
 * that opens the existing dialog; it must never wrap `safety.canSign`, and it
 * is never a `G2` gate item — that would imply dispositioning a model output is
 * what unblocks signing, which is the exact inversion the atlas forbids.
 */
export const AI_TOUCHPOINTS: Readonly<Record<string, AiTouchpointSpec>> = Object.freeze({
  // ── S-06-01 ────────────────────────────────────────────────────────────────
  'AI-613': {
    id: 'AI-613',
    capability: 'Clinician worklist prioritisation',
    pattern: 'AIP-07',
    gate: 'G0',
    explain: 'on-demand',
    guardrail: 'A deterministic sort is always one click away.',
    fallback: 'Deterministic sort by appointment time',
  },
  'AI-201': {
    id: 'AI-201',
    capability: 'Deterioration risk',
    pattern: 'AIP-06',
    gate: 'G1',
    explain: 'mandatory',
    guardrail: 'Abstains below the vitals-recency floor.',
    fallback: 'Manual NEWS2 from charted vitals',
  },

  // ── S-06-02 · S-06-06 ──────────────────────────────────────────────────────
  'AI-105': {
    id: 'AI-105',
    capability: 'Chart summarisation — "catch me up"',
    pattern: 'AIP-04',
    gate: 'G1',
    explain: 'mandatory',
    guardrail: 'The unsummarised record is always one click away.',
    fallback: 'Chronological record, unsummarised',
  },
  'AI-901': {
    id: 'AI-901',
    capability: 'Natural-language record search',
    pattern: 'AIP-04',
    gate: 'G1',
    explain: 'on-demand',
    guardrail: 'Returns nothing the caller cannot already read.',
    fallback: 'Structured filters',
  },

  // ── S-06-03 · S-06-04 ──────────────────────────────────────────────────────
  'AI-101': {
    id: 'AI-101',
    capability: 'Ambient scribe — consultation',
    pattern: 'AIP-01',
    gate: 'G2',
    explain: 'mandatory',
    guardrail: 'Raw transcript retained verbatim; typing is always available.',
    fallback: 'Type the note',
  },
  'AI-103': {
    id: 'AI-103',
    capability: 'Note section draft from chart context',
    pattern: 'AIP-01',
    gate: 'G2',
    explain: 'mandatory',
    guardrail: 'Per-section disposition required before Sign enables.',
    fallback: 'Type the note',
  },
  'AI-104': {
    id: 'AI-104',
    capability: 'Dictation cleanup',
    pattern: 'AIP-01',
    gate: 'G2',
    explain: 'on-demand',
    guardrail: 'Raw transcript preserved.',
    fallback: 'The raw transcript',
  },
  'AI-203': {
    id: 'AI-203',
    capability: 'Differential diagnosis suggestion',
    pattern: 'AIP-03',
    gate: 'G1',
    explain: 'mandatory',
    guardrail: 'Suggests, never concludes. This is not a diagnosis.',
    fallback: "The clinician's own differential",
  },
  'AI-501': {
    id: 'AI-501',
    capability: 'Diagnosis & procedure code assist',
    pattern: 'AIP-02',
    gate: 'G2',
    explain: 'mandatory',
    guardrail: 'Blocks parent-only codes; manual search is always available.',
    fallback: 'Manual ICD-10 search',
  },
  'AI-114': {
    id: 'AI-114',
    capability: 'Banned-abbreviation & documentation-quality check',
    pattern: 'AIP-05',
    gate: 'G1',
    explain: 'on-demand',
    guardrail: 'CMP-NABH-05; checked on blur.',
    fallback: 'Retrospective audit',
  },
  'AI-110': {
    id: 'AI-110',
    capability: 'Translation & transliteration',
    pattern: 'AIP-02',
    gate: 'G2',
    explain: 'on-demand',
    guardrail: 'English-only fallback, with the limitation stated.',
    fallback: 'English only',
  },

  // ── S-06-05 ────────────────────────────────────────────────────────────────
  'AI-204': {
    id: 'AI-204',
    capability: 'Diagnosis–evidence consistency check',
    pattern: 'AIP-05',
    gate: 'G1',
    explain: 'mandatory',
    guardrail: 'Flags only; coder review is the fallback.',
    fallback: 'Coder review',
  },

  // ── S-06-07 ────────────────────────────────────────────────────────────────
  'AI-305': {
    id: 'AI-305',
    capability: 'Prescription completeness & dose-range check',
    pattern: 'AIP-05',
    gate: 'G2',
    explain: 'mandatory',
    guardrail: 'Static dose tables remain when the model is off.',
    fallback: 'Static dose tables',
  },
  'AI-205': {
    id: 'AI-205',
    capability: 'Interaction & contraindication advisory',
    pattern: 'AIP-09',
    gate: 'G2',
    explain: 'mandatory',
    guardrail:
      'The allergy hard stop is a stored rule evaluated on the server, not a model output. It fires identically with AI off.',
    fallback: 'The deterministic safety engine, which is always on',
  },
  'AI-206': {
    id: 'AI-206',
    capability: 'Renal & hepatic dose adjustment',
    pattern: 'AIP-02',
    gate: 'G2',
    explain: 'mandatory',
    guardrail: 'The printed reference is the fallback.',
    fallback: 'Printed dose reference',
  },

  // ── S-06-08 ────────────────────────────────────────────────────────────────
  'AI-111': {
    id: 'AI-111',
    capability: 'Patient-friendly instruction rewrite',
    pattern: 'AIP-01',
    gate: 'G2',
    explain: 'on-demand',
    guardrail: "The clinician's own wording is retained alongside.",
    fallback: 'The wording as written',
  },

  // ── S-06-10 ────────────────────────────────────────────────────────────────
  'AI-302': {
    id: 'AI-302',
    capability: 'Order-set & pathway recommendation',
    pattern: 'AIP-03',
    gate: 'G2',
    explain: 'mandatory',
    guardrail: 'The browsable library is the fallback.',
    fallback: 'Browse the library',
  },

  // ── Every screen · Z7b ─────────────────────────────────────────────────────
  'AI-911': {
    id: 'AI-911',
    capability: 'Contextual assistant',
    pattern: 'AIP-04',
    gate: 'G1',
    explain: 'mandatory',
    guardrail: 'Never clinical advice. Answers are grounded and cited, or it stays silent.',
    fallback: 'Static help centre and support contact — never removed',
  },
})

export function touchpoint(id: string): AiTouchpointSpec {
  const spec = AI_TOUCHPOINTS[id]
  if (spec === undefined) throw new Error(`Unknown AI touchpoint: ${id}`)
  return spec
}
