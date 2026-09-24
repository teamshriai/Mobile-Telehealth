import type { AiItem } from '../types'

/**
 * `AI-901` — natural-language record search.
 *
 * ⚠️ THE GUARDRAIL IS THE FEATURE. §6201: "Returns nothing the caller cannot
 * already read." In a real implementation that is an authorization property —
 * the retrieval runs as the caller, over the rows the caller may already see.
 * In this simulation there is no retrieval at all, so the honest thing is to
 * answer only from the record already loaded on this screen and to say so.
 *
 * That constraint is why this fixture answers in terms of **where to look**
 * rather than inventing findings. A simulated search that confidently returned
 * a lab value nobody seeded would be teaching users to trust exactly the thing
 * this pattern exists to make checkable.
 */

const LIMITS = {
  model: 'Simulated record search',
  version: 'demo-2026.09',
  validatedOn: 'Not validated. This is a showcase fixture, not a retrieval system.',
  failureModes: [
    'Searches this hospital’s record only.',
    'Cannot return anything the signed-in clinician could not already open.',
    'Phrasing a question differently may surface different parts of the record.',
  ],
} as const

/**
 * Canned answers keyed by a coarse intent, matched on keywords.
 *
 * ⚠️ Keyword matching, not a model — and it is written to **fail closed**. An
 * unmatched question returns the `abstain` path in the provider rather than a
 * confident guess, because "I could not answer that from this record" is a
 * legitimate answer and a fabricated one is not.
 */
interface Answer {
  keywords: string[]
  item: AiItem
}

export const ANSWERS: readonly Answer[] = Object.freeze([
  {
    keywords: ['allerg', 'penicillin', 'beta-lactam', 'betalactam', 'react'],
    item: Object.freeze({
      id: 'q-allergy',
      label: 'Allergies',
      band: 'HIGH',
      body:
        'Allergies are recorded on the patient record and shown in the banner at the top of ' +
        'every screen for this patient, and in the context rail beside this panel.\n\n' +
        'Where an allergy is documented, prescribing a drug in that class is blocked by a ' +
        'stored safety rule — that block is not produced by this assistant.',
      explanation: {
        what: 'Where this record holds allergy information, and what acts on it.',
        used: [
          { label: 'Patient record — allergies', detail: 'The documented allergy field' },
          { label: 'Safety rules', detail: 'Server-evaluated allergen-to-class rules' },
        ],
        why: [
          'The question mentioned allergy or a drug class.',
          'The answer points at the record rather than restating it, so the value read is the live one.',
        ],
        limits: LIMITS,
      },
    }),
  },
  {
    keywords: ['medic', 'drug', 'prescri', 'tablet', 'dose', 'treatment'],
    item: Object.freeze({
      id: 'q-meds',
      label: 'Medication',
      band: 'HIGH',
      body:
        'There are two different things here, and they are kept apart on purpose.\n\n' +
        'What the patient tells us they take is on the record as current medication, in the ' +
        'context rail. What has been prescribed through this system is on the Medications tab, ' +
        'with its prescription number and signing clinician.',
      explanation: {
        what: 'Where medication information lives on this chart.',
        used: [
          { label: 'Patient record — current medication', detail: 'As reported by the patient' },
          { label: 'Prescriptions', detail: 'Issued and signed in this system' },
        ],
        why: [
          'The question mentioned medication or treatment.',
          'Reported and prescribed medication are different sources and are not merged.',
        ],
        limits: LIMITS,
      },
    }),
  },
  {
    keywords: ['visit', 'seen', 'last', 'when', 'admit', 'encounter', 'history'],
    item: Object.freeze({
      id: 'q-visits',
      label: 'Visit history',
      band: 'HIGH',
      body:
        'Every recorded visit is on the Documents tab, and the full chronological record — ' +
        'visits, notes, prescriptions and instructions together — is behind "View full record".\n\n' +
        'The rail beside this panel shows the total and the most recent.',
      explanation: {
        what: 'Where this chart holds the visit history.',
        used: [
          { label: 'Encounters', detail: 'Every recorded visit at this hospital' },
          { label: 'Clinical timeline', detail: 'The same events in time order, unsummarised' },
        ],
        why: [
          'The question asked about visits or timing.',
          'The timeline is offered because it is the unsummarised view.',
        ],
        limits: LIMITS,
      },
    }),
  },
  {
    keywords: ['problem', 'diagnos', 'condition', 'why', 'wrong', 'code'],
    item: Object.freeze({
      id: 'q-problems',
      label: 'Problems and coding',
      band: 'HIGH',
      body:
        'Coded problems are on the Problems tab, split into active and resolved, each with its ' +
        'ICD-10 code and the visit at which it was first coded.\n\n' +
        'Free-text conditions the patient reported at registration are separate, on the Summary tab.',
      explanation: {
        what: 'Where the coded problem list and the reported history live.',
        used: [
          { label: 'Problem list', detail: 'Coded, with onset encounter' },
          { label: 'Patient record — known conditions', detail: 'Free text, as reported' },
        ],
        why: [
          'The question asked about a diagnosis or condition.',
          'Coded problems and reported history are different sources and are not merged.',
        ],
        limits: LIMITS,
      },
    }),
  },
])

export function answerFor(question: string): AiItem | null {
  const q = question.toLowerCase()
  return ANSWERS.find((a) => a.keywords.some((k) => q.includes(k)))?.item ?? null
}
