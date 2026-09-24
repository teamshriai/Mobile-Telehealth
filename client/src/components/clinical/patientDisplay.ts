/**
 * patientDisplay.ts — how a patient's fields are SAID to a clinician.
 *
 * Everything in here exists because it was written twice and the copies
 * disagreed on screen. Any new surface showing these fields calls these
 * functions rather than adding a third regex or a third `.replace()`.
 */

/**
 * Classifies a free-text allergy field into the three states that are
 * clinically distinct.
 *
 * ⚠️ THIS EXISTS BECAUSE IT WAS DUPLICATED AND THE COPIES DRIFTED. The Z3
 * banner and the chart summary each had their own regex; the chart's required
 * a whole-string match, so the extremely common value "None known" fell
 * through to the has-an-allergy branch and was rendered in red with a warning
 * icon. A clinician glancing at that chart would read "this patient has a
 * documented allergy" about a patient who has none. Any new surface that shows
 * allergies calls this function — it does not write a fourth regex.
 *
 * The three states are not two:
 *   - `documented` — something is recorded. Show it in full, as text.
 *   - `none`       — somebody asked, and the answer was none. Reassuring.
 *   - `unrecorded` — nobody has asked. NOT the same as none, and the one a
 *                    prescriber has to be warned about.
 */

export type AllergyStatus =
  | { kind: 'documented'; text: string }
  | { kind: 'none' }
  | { kind: 'unrecorded' }

/**
 * Anchored at the start rather than matched whole, so "None known",
 * "Nil known", "No known drug allergies" and "NKDA — confirmed with patient"
 * all read as a negative. A trailing qualifier does not turn a negative into
 * an allergy.
 */
const NEGATIVE = /^(none|nil|nka|nkda|no known|not known|no allerg|denies|n\/a)\b/i

export function classifyAllergies(raw: string | null | undefined): AllergyStatus {
  const text = raw?.trim() ?? ''
  if (text === '') return { kind: 'unrecorded' }
  if (NEGATIVE.test(text)) return { kind: 'none' }
  return { kind: 'documented', text }
}

/**
 * `A_Positive` → `A+`.
 *
 * ⚠️ Lives here rather than being inlined twice for the same reason as
 * `classifyAllergies`: the Z3 banner formatted it and the chart summary did
 * not, so the same patient's blood group read "A+" in one place and
 * "A_Positive" in another on the same screen. A database identifier shown to a
 * clinician is a leak, not a label.
 *
 * Returns null for a missing or explicitly unknown group, so callers render
 * their own em-dash rather than the word "Unknown", which reads like a
 * recorded finding.
 */
export function formatBloodGroup(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '' || value === 'Unknown') return null
  return value.replace('_Positive', '+').replace('_Negative', '−')
}

/**
 * The patient's name, as one string.
 *
 * ⚠️ Here, not inlined, for the same reason as the two above. §5.4's naming
 * rule and the §8.2 cast both include a patient whose record carries a middle
 * name and one whose does not; composing it ad hoc produces a stray double
 * space in some places and not others, and a name that renders differently on
 * `Z3` and `Z4` of the same screen is exactly the wrong-patient cue `Z3` exists
 * to prevent.
 *
 * `filter(Boolean)` drops both `null` and `''` — a middle name stored as an
 * empty string is as absent as one stored as null.
 */
export function patientFullName(patient: {
  firstName: string
  middleName?: string | null
  lastName: string
}): string {
  return [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' ')
}
