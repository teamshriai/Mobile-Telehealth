import type {
  ClinicalNoteStatus,
  ProblemStatus,
  PrescriptionStatus,
  RoleName,
} from '../../types/domain'

/**
 * clinicalLabels.ts — how database enum members are SAID to a clinician.
 *
 * ⚠️ A database identifier rendered in the UI is a leak, not a label. An audit
 * found seven of them, the worst being the encounter header — which sits above
 * every consultation screen and read `InProgress` — and the nav drawer, which
 * told people they were "Signed in as HealthcareWorker".
 *
 * ⚠️ EVERY MAP BELOW IS `Record<TheUnion, string>`, DELIBERATELY. That makes
 * exhaustiveness a compile error: add a member to the enum and the build fails
 * here until someone decides how to say it. The alternative — a lookup with a
 * `?? raw` fallback — is how the identifier reaches a clinician the first time
 * anyone extends the schema, silently and in production.
 *
 * Sentence case, not Title Case: these appear inside sentences and table cells,
 * not as headings.
 */

/** Encounter lifecycle. `InProgress` is the one clinicians see most. */
export const ENCOUNTER_STATUS_LABELS: Record<string, string> = {
  InProgress: 'In progress',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
}

export function encounterStatusLabel(status: string): string {
  return ENCOUNTER_STATUS_LABELS[status] ?? status
}

/**
 * Note lifecycle.
 *
 * ⚠️ `CosignPending` must never render as itself — "Awaiting co-signature" is
 * the clinical fact, and the distinction between that and `Draft` is what tells
 * a clinician whether the note is theirs to finish or someone else's to attest.
 */
const NOTE_STATUS_LABELS: Record<ClinicalNoteStatus, string> = {
  Draft: 'Draft',
  CosignPending: 'Awaiting co-signature',
  Signed: 'Signed',
}

export function noteStatusLabel(status: ClinicalNoteStatus): string {
  return NOTE_STATUS_LABELS[status]
}

const PROBLEM_STATUS_LABELS: Record<ProblemStatus, string> = {
  Active: 'Active',
  Resolved: 'Resolved',
}

export function problemStatusLabel(status: ProblemStatus): string {
  return PROBLEM_STATUS_LABELS[status]
}

const PRESCRIPTION_STATUS_LABELS: Record<PrescriptionStatus, string> = {
  Draft: 'Draft',
  Signed: 'Signed',
  Cancelled: 'Cancelled',
}

export function prescriptionStatusLabel(status: PrescriptionStatus): string {
  return PRESCRIPTION_STATUS_LABELS[status]
}

/**
 * Role, as a person would describe their own job.
 *
 * ⚠️ `HealthcareWorker` and `LabTechnician` are the reason this exists —
 * concatenated identifiers are obviously machine-generated to anyone reading
 * them, and "Signed in as HealthcareWorker" undermines the whole surface.
 */
const ROLE_LABELS: Record<RoleName, string> = {
  Patient: 'Patient',
  Doctor: 'Consultant',
  Resident: 'Resident',
  HealthcareWorker: 'Healthcare worker',
  LabTechnician: 'Laboratory technician',
  HospitalAdmin: 'Hospital administrator',
  Admin: 'Administrator',
}

export function roleLabel(role: string | null | undefined): string {
  if (role === null || role === undefined || role === '') return 'your account'
  return ROLE_LABELS[role as RoleName] ?? role
}

/**
 * An allergen key as stored in the formulary (lowercase, e.g. `penicillin`)
 * rendered for a sentence. Capitalised rather than mapped, because the key set
 * is open — it grows with the formulary — and a real allergen name is already
 * readable; it just should not appear mid-sentence in lower case.
 */
export function allergenLabel(key: string): string {
  if (key === '') return key
  return key.charAt(0).toUpperCase() + key.slice(1)
}
