import type { AiItem } from '../types'

/**
 * `AI-105` — "catch me up" chart summaries.
 *
 * ⚠️ FROZEN DATA. No `Date.now()`, no `Math.random()`, no network. A demo that
 * produces different text on the second run is a demo nobody can rehearse, and
 * a "simulation" whose output moves is indistinguishable from a broken model.
 *
 * ⚠️ EVERY CLAIM HERE IS TRUE OF THE SEEDED RECORD. The summary names problems,
 * drugs and visits that the seed actually wrote, so a clinician who follows the
 * `used` links in `C-42` panel 2 lands on the row the sentence came from. A
 * fixture that invents a finding would teach exactly the wrong lesson about
 * what these summaries are — and §8.6 forbids inventing data outside the kit.
 *
 * ⚠️ KEYED BY THE §8 CAST NAME, not by `shriPatientId`. The atlas refs
 * (`SD-P-03`) exist only in the seed; the client never sees them, and the
 * generated UHIDs differ per database. The cast names are fixed by §8.2 and
 * written verbatim by the seed, so they are the one stable identity the client
 * actually holds. A name that does not match falls through to the generic
 * summary — which is the safe direction: a wrong-patient summary is far worse
 * than a plain one.
 *
 * The generic fallback is not a failure state: it is a *short* summary of a
 * *short* record, which is honest.
 */

const LIMITS = {
  model: 'Simulated summariser',
  version: 'demo-2026.09',
  validatedOn: 'Not validated. This is a showcase fixture, not a model.',
  failureModes: [
    'Summarises only what is in this record — nothing from outside the hospital.',
    'A recent entry may be missing if it was written in the last few minutes.',
    'Not a diagnosis, and not a substitute for reading the record.',
  ],
} as const

/** The generic summary, used when a patient has no hand-written fixture. */
export const GENERIC_SUMMARY: AiItem = Object.freeze({
  id: 'sum-generic',
  label: 'Chart summary',
  band: 'MED',
  body:
    'This patient has a short record in this hospital. The problem list, medication and visit ' +
    'history shown in the rail beside this panel are the whole of it.\n\n' +
    'Open the full record for the chronological view.',
  explanation: {
    what: 'A plain-language recap of everything in this patient’s chart at this hospital.',
    used: [
      { label: 'Problem list', detail: 'Active and resolved problems coded at this hospital' },
      { label: 'Encounters', detail: 'Every recorded visit' },
      { label: 'Prescriptions', detail: 'Issued through this system' },
    ],
    why: [
      'The record is short, so the summary is short.',
      'Confidence is moderate because there is little history to corroborate.',
    ],
    limits: LIMITS,
  },
})

/**
 * `SD-P-03` R. Lakshmanan — the atlas's sample patient for this screen
 * (§6483: "CAP, day 4, PM-JAY, ⚠️ penicillin allergy").
 */
const LAKSHMANAN: AiItem = Object.freeze({
  id: 'sum-p03',
  label: 'Chart summary',
  band: 'HIGH',
  body:
    '62-year-old man, four days into treatment for community-acquired pneumonia (J18.9), ' +
    'reviewed repeatedly for antibiotic response and oxygen requirement.\n\n' +
    'The single most important thing on this chart is a documented penicillin allergy with ' +
    'anaphylaxis in 2019. Beta-lactams are blocked for this patient by a stored safety rule, ' +
    'not by this summary.\n\n' +
    'He also carries hypertension (I10) and type 2 diabetes (E11.9) as active problems — both ' +
    'longstanding, neither the reason for the current episode.\n\n' +
    'The most recent consultations record confusion and a balance problem alongside the chest ' +
    'findings. Those are worth reading in full rather than taking from here.',
  explanation: {
    what:
      'A recap of this patient’s active problems, current treatment and recent consultations, ' +
      'in plain language.',
    used: [
      {
        label: 'Allergy record',
        detail: 'Penicillin — anaphylaxis, 2019. Documented on the patient record.',
      },
      {
        label: 'Problem list',
        detail: 'J18.9 pneumonia · I10 hypertension · E11.9 type 2 diabetes, all active',
      },
      { label: 'Recent consultation notes', detail: 'Reviews of antibiotic response and oxygen need' },
      { label: 'Prescriptions', detail: 'Non-beta-lactam antibiotics issued at this hospital' },
    ],
    why: [
      'The allergy is stated first because it changes what may be prescribed.',
      'Pneumonia leads because it is the active episode and appears in the most recent notes.',
      'The two chronic problems are named but separated, so they are not read as part of this episode.',
      'Confidence is high because every statement above maps to a coded record entry.',
    ],
    limits: LIMITS,
  },
})

/** `SD-P-01` Meera Krishnan — long, quiet, single-problem follow-up. */
const KRISHNAN: AiItem = Object.freeze({
  id: 'sum-p01',
  label: 'Chart summary',
  band: 'HIGH',
  body:
    'Hypothyroidism on long-term replacement, reviewed roughly six-monthly. The record is ' +
    'stable: dose adjustments at review, no admissions, no other active problems coded.\n\n' +
    'The most recent visit was a thyroid function review with a dose adjustment, and the ' +
    'patient was issued written instructions in two languages.',
  explanation: {
    what: 'A recap of a stable, single-problem follow-up record.',
    used: [
      { label: 'Problem list', detail: 'Hypothyroidism' },
      { label: 'Encounters', detail: 'Six-monthly reviews' },
      { label: 'Patient instructions', detail: 'Issued bilingually at the most recent visit' },
    ],
    why: [
      'One active problem accounts for every recorded visit.',
      'No admission, referral or new problem has been coded.',
      'Confidence is high because the pattern is consistent across the whole record.',
    ],
    limits: LIMITS,
  },
})

/** Lower-cased, punctuation and spacing removed, so "R. Lakshmanan" matches. */
function nameKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, '')
}

const BY_NAME: Readonly<Record<string, AiItem>> = Object.freeze({
  [nameKey('R. Lakshmanan')]: LAKSHMANAN,
  [nameKey('Meera Krishnan')]: KRISHNAN,
})

export function chartSummaryFor(patientName: string): AiItem {
  return BY_NAME[nameKey(patientName)] ?? GENERIC_SUMMARY
}
