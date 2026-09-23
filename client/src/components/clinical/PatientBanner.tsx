import { Link } from 'react-router-dom'
import { ShieldAlert, IdCard, CircleUser } from 'lucide-react'
import { usePatientContext } from '../../app/usePatientContext'
import { formatDate } from '../clinic/format'
import { Skeleton } from '../feedback/States'
import { classifyAllergies, formatBloodGroup } from './patientDisplay'

/**
 * `GP-05` — the patient context banner (`Z3`).
 *
 * ⚠️ UI_ATLAS calls this "the highest-leverage component in the product … it
 * appears on ~150 screens, it is where a wrong-patient error is caught".
 * It is specified once and MUST NOT be redesigned inside a screen. Every
 * clinical screen gets this exact component via the shell.
 *
 * Fields per GP-05: UHID · name · age/sex · ward-bed · consultant · LOS ·
 * payer · allergy flag · MLC flag · ABHA chip.
 *
 * ⚠️ Fields this product genuinely does not hold — ward-bed, length of stay,
 * payer, MLC status — are OMITTED, not rendered as "—" or invented. An
 * outpatient record has no bed and no LOS; drawing an empty slot for one
 * implies the data exists and is missing, which is a different and worse
 * claim than not showing it.
 *
 * ⚠️ THE ALLERGY IS TEXT, NEVER AN ICON ALONE (§6485). An icon can say "there
 * is an allergy"; it cannot say "penicillin", and that distinction is the
 * entire clinical value of the field.
 */
export default function PatientBanner() {
  const { patient, loading } = usePatientContext()

  if (loading && patient === null) {
    return (
      <div className="border-b border-border-soft bg-surface-2 px-4 py-2 sm:px-6">
        <Skeleton className="h-9 w-full max-w-2xl" rounded="rounded-lg" />
      </div>
    )
  }

  if (patient === null) return null

  const fullName = [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(' ')

  const ageSex = [
    patient.age !== null ? `${patient.age}${patient.dobIsEstimated ? '~' : ''}` : null,
    patient.gender !== null ? patient.gender.charAt(0) : null,
  ]
    .filter(Boolean)
    .join('/')

  // "None known" and friends are an ANSWER, not an absence — they mean the
  // question was asked. Distinguished from never having been recorded.
  // Shared with the chart summary — see patientDisplay.ts on why this
  // classification lives in exactly one place.
  const allergy = classifyAllergies(patient.knownAllergies)
  const allergyText = allergy.kind === 'documented' ? allergy.text : ''
  const hasAllergy = allergy.kind === 'documented'
  const allergyAsked = allergy.kind !== 'unrecorded'

  return (
    <div
      // 64px / two lines, per §5.2's Z3 geometry.
      className="border-b border-border-soft bg-surface-2 px-4 py-2 sm:px-6"
      aria-label="Patient in context"
      // The browser suite asserts this banner is present on every
      // patient-scoped screen. Z3 is the wrong-patient control; its silent
      // disappearance is exactly the regression a test has to catch.
      data-testid="patient-banner"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-3 gap-y-1">
        <CircleUser size={18} aria-hidden="true" className="flex-shrink-0 text-ink-subtle" />

        <Link
          to={`/patient/${patient.shriPatientId}/chart`}
          className="focus-ring truncate rounded text-sm font-semibold text-ink hover:underline"
        >
          {fullName}
        </Link>

        {ageSex !== '' && (
          <span className="text-sm tabular-nums text-ink-muted">{ageSex}</span>
        )}

        <span className="inline-flex items-center gap-1 rounded bg-surface-3 px-1.5 py-0.5 font-mono text-2xs text-ink-muted">
          <IdCard size={11} aria-hidden="true" />
          {patient.shriPatientId}
        </span>

        {formatBloodGroup(patient.bloodGroup) !== null && (
          <span className="text-xs text-ink-subtle">
            {formatBloodGroup(patient.bloodGroup)}
          </span>
        )}

        {patient.dateOfBirth !== null && (
          <span className="hidden text-xs text-ink-subtle lg:inline">
            Born {formatDate(patient.dateOfBirth)}
          </span>
        )}

        {/* ── ABHA chip (GP-09) ────────────────────────────────────────── */}
        <span
          className={`rounded px-1.5 py-0.5 text-2xs font-medium ${
            patient.abhaId !== null
              ? 'bg-success-bg text-success-fg'
              : 'bg-surface-3 text-ink-subtle'
          }`}
        >
          ABHA {patient.abhaId !== null ? 'linked' : 'not linked'}
        </span>

        {/* ── Allergy: the unmissable one ──────────────────────────────── */}
        <span className="ml-auto flex min-w-0 items-center gap-1.5">
          {hasAllergy ? (
            <span
              className="flex min-w-0 items-center gap-1.5 rounded bg-critical-bg px-2 py-0.5 text-xs font-semibold text-critical-fg"
              // Read out in full — an abbreviated allergy is not an allergy.
              title={allergyText}
            >
              <ShieldAlert size={13} aria-hidden="true" className="flex-shrink-0" />
              <span className="truncate">Allergy: {allergyText}</span>
            </span>
          ) : allergyAsked ? (
            <span className="rounded bg-success-bg px-2 py-0.5 text-xs font-medium text-success-fg">
              No known allergies
            </span>
          ) : (
            // ⚠️ Not the same as "no allergies". Says so.
            <span className="rounded bg-warning-bg px-2 py-0.5 text-xs font-medium text-warning-fg">
              Allergies not recorded
            </span>
          )}
        </span>
      </div>
    </div>
  )
}
