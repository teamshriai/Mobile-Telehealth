import type { AiEvidence } from '../types'

/**
 * `AI-911` — the contextual assistant's corpus, as a fixture.
 *
 * ⚠️ §6.1 IS EXPLICIT THAT THE RETRIEVAL MODEL IS HYPOTHETICAL: "The RAG
 * backend, its content corpus and its answer quality are not designed here…
 * What this document specifies — and what the mockup must show — is the
 * affordance and the surface." So this file is a small hand-written corpus
 * about **how to use this product**, which is the only thing the assistant is
 * allowed to be about.
 *
 * ⚠️ GUARDRAIL 1 IS THE WHOLE POINT OF `isClinicalQuestion`. §6.1: "It is not a
 * clinical adviser. A clinical question — 'is this dose safe', 'what does this
 * result mean', 'should I thrombolyse' — is declined and routed to the
 * capability that owns it under its own gate. The assistant never answers it
 * directly, at any confidence."
 *
 * An assistant that answers a dosing question *helpfully* is the single most
 * dangerous thing that could be built on this surface, because it is
 * ungated, uncited and sits on every screen. The refusal is therefore checked
 * FIRST, before any retrieval, and it is deliberately over-broad — a wrongly
 * declined how-to question costs a clinician one rephrase, a wrongly answered
 * clinical one costs considerably more.
 *
 * ⚠️ GUARDRAIL 2: grounded or silent. Anything that does not match the corpus
 * returns null and the caller renders `AI-ABSTAIN` with the support route. It
 * never extrapolates.
 */

export interface AssistantAnswer {
  body: string
  /** §6.1: "an uncited answer is not rendered at all". */
  citations: readonly AiEvidence[]
}

/**
 * Words that make a question clinical rather than procedural.
 *
 * ⚠️ Matched before the corpus, never after. Ordering is the guardrail.
 */
const CLINICAL_MARKERS = [
  'dose',
  'dosage',
  'mg',
  'safe to give',
  'contraindicat',
  'interact',
  'prescribe for',
  'should i',
  'diagnos',
  'differential',
  'treat',
  'therapy for',
  'what does this result',
  'is this normal',
  'thrombolys',
  'antibiotic for',
  'management of',
  'workup',
]

/** Which capability owns a clinical question, so the refusal can route it. */
const ROUTES: ReadonlyArray<{ match: string[]; to: string }> = [
  {
    match: ['dose', 'dosage', 'mg'],
    to: 'the dose-range check on the prescription screen, which runs against stored dose tables before you can sign',
  },
  {
    match: ['interact', 'contraindicat', 'allerg'],
    to: 'the safety check on the prescription screen. Allergy blocks there are stored rules evaluated on the server, not model output',
  },
  {
    match: ['diagnos', 'differential'],
    to: 'the differential suggestion on the consultation note, which is labelled as a suggestion and never a conclusion',
  },
]

export function isClinicalQuestion(q: string): boolean {
  const s = q.toLowerCase()
  return CLINICAL_MARKERS.some((m) => s.includes(m))
}

export function routeFor(q: string): string {
  const s = q.toLowerCase()
  return (
    ROUTES.find((r) => r.match.some((m) => s.includes(m)))?.to ??
    'the clinical screen that owns it, where it is checked under its own safeguards'
  )
}

interface Entry {
  answer: AssistantAnswer
  keywords: string[]
  /**
   * The prompt offered in the empty panel, if this entry supplies one.
   *
   * ⚠️ DERIVED, NOT A SEPARATE LIST. A hand-maintained suggestion list drifted
   * from the corpus immediately: "How do I correct a signed note?" matched no
   * keyword, so the panel's own suggestion answered "I do not have
   * documentation for that". Tying the suggestion to the entry that answers it
   * makes that state unreachable — and `SUGGESTED` below asserts the match.
   */
  suggest?: string
}

/**
 * The corpus: how to use this product. Procedural, citable, non-clinical.
 */
const CORPUS: readonly Entry[] = Object.freeze([
  {
    keywords: ['addendum', 'amend', 'signed note', 'change a signed', 'edit a signed'],
    suggest: 'How do I correct a signed note?',
    answer: {
      body:
        'A signed note is never edited. You add an addendum: open the note and use Addendum — the '
        + 'original text and the addendum both stay visible, each attributed to whoever wrote it '
        + 'and when.\n\nThis is not a product preference. It is what makes the record admissible.',
      citations: [
        { label: 'CMP-NABH-10', detail: 'A signed clinical record is never edited, only amended' },
        { label: 'Consultation note', detail: 'Where the Addendum action lives' },
      ],
    },
  },
  {
    keywords: ['co-sign', 'cosign', 'counter-sign', 'countersign', 'resident'],
    answer: {
      body:
        'A clinician who holds note:write but not note:sign submits the note for counter-signature '
        + 'instead of signing it. It then appears in the consultant’s Co-sign queue, where the '
        + 'consultant can approve it or return it with a reason.\n\nThe author sees the state of '
        + 'everything they have submitted.',
      citations: [
        { label: 'CMP-NABH-03', detail: 'Entries by staff without signing authority require co-signature' },
        { label: 'Co-sign queue', detail: 'Where pending notes are reviewed' },
      ],
    },
  },
  {
    keywords: [
      'break glass',
      'break-glass',
      'emergency access',
      'not my patient',
      'care relationship',
      'no relationship',
    ],
    suggest: 'What happens if I have no care relationship?',
    answer: {
      body:
        'If you hold the capability but have no care relationship with the patient, you are not '
        + 'refused — you are offered emergency access. State a reason, and you proceed.\n\nThe '
        + 'access is logged and reviewed. The amber banner stays up for the life of the grant, and '
        + 'the grant cannot be cancelled from inside the product.',
      citations: [
        { label: 'Emergency access', detail: 'Reason recorded before any clinical data is fetched' },
        { label: 'Access log', detail: 'Reviewed within 24 hours' },
      ],
    },
  },
  {
    keywords: ['full record', 'unsummarised', 'timeline', 'chronological', 'behind the summary'],
    suggest: 'Where is the unsummarised record?',
    answer: {
      body:
        'Every summary in this product has the unsummarised record one click behind it. On the '
        + 'chart that is "View full record", which opens the clinical timeline: every visit, note, '
        + 'prescription and instruction in time order, with nothing generated.\n\nIt is always '
        + 'available, including when assistance is switched off.',
      citations: [
        { label: 'Clinical timeline', detail: 'The chronological, unsummarised record' },
      ],
    },
  },
  {
    keywords: ['offline', 'no connection', 'lost signal', 'network'],
    answer: {
      body:
        'Everything already on screen stays readable. Typed content is kept. Saving, signing and '
        + 'prescribing are unavailable until the connection returns, and the strip at the top of '
        + 'the screen says so while you are offline.',
      citations: [{ label: 'Offline behaviour', detail: 'What works, what is queued, what is blocked' }],
    },
  },
  {
    keywords: ['ai', 'assistance', 'model', 'simulat', 'turn off', 'switch off'],
    answer: {
      body:
        'Assistance in this build is a simulation: no model is consulted and nothing leaves your '
        + 'browser. You can switch it off, or force it to abstain or return low confidence, from '
        + 'the account menu.\n\nSafety rules are not assistance and are unaffected. The allergy '
        + 'block on the prescription screen is a stored rule evaluated on the server and fires '
        + 'identically with assistance off.',
      citations: [
        { label: 'Account menu', detail: 'Where the assistance mode is set in this build' },
        { label: 'Safety rules', detail: 'Server-evaluated, never model output' },
      ],
    },
  },
])

export function lookup(question: string): AssistantAnswer | null {
  const q = question.toLowerCase()
  return CORPUS.find((e) => e.keywords.some((k) => q.includes(k)))?.answer ?? null
}

/**
 * Shown when the panel opens, so it is never a blank box.
 *
 * ⚠️ Built from the corpus, and asserted against it. A suggested prompt that
 * does not resolve is worse than no suggestion at all: the panel offers a
 * question and then declines to answer its own question.
 */
export const SUGGESTED: readonly string[] = Object.freeze(
  CORPUS.flatMap((e) => {
    if (e.suggest === undefined) return []
    if (lookup(e.suggest) === null) {
      throw new Error(
        `Assistant suggestion "${e.suggest}" matches no corpus entry. ` +
          'Add a keyword it contains, or remove the suggestion.',
      )
    }
    return [e.suggest]
  }),
)
