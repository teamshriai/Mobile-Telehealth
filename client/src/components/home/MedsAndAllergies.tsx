import { Link } from 'react-router-dom'
import { Pill, ShieldAlert, ArrowRight } from 'lucide-react'
import type { PatientProfile } from '../../types/domain'

/**
 * Medications and allergies as chips.
 *
 * Both are free-text fields on the profile that the patient types themselves,
 * and until now they were only ever counted (HealthSnapshot shows "3
 * medicines"). The names were on the page's own data the whole time and were
 * never shown. A count tells you how many things you are taking; a chip row
 * tells you which — and that is the thing someone actually checks.
 *
 * No new request: this reads the profile PatientHome has already fetched.
 *
 * Allergy names are never abbreviated to an icon. An icon can say "there is an
 * allergy"; it cannot say "penicillin", and that distinction is the entire
 * clinical value of the field.
 */

const MAX_CHIPS = 6

/** Same splitting rule as HealthSnapshot's counters, so the chips and the
 *  count on the same page can never disagree. */
function splitList(value: string | null | undefined, separators: RegExp): string[] {
  if (!value) return []
  return value
    .split(separators)
    .map((item) => item.trim())
    .filter(Boolean)
}

function isNone(value: string | null | undefined): boolean {
  return /^(none|nil|no known)/i.test((value ?? '').trim())
}

interface ChipRowProps {
  items: string[]
  tone: string
  emptyLabel: string
}

function ChipRow({ items, tone, emptyLabel }: ChipRowProps) {
  if (items.length === 0) {
    return <p className="text-sm text-ink-subtle">{emptyLabel}</p>
  }
  const shown = items.slice(0, MAX_CHIPS)
  const extra = items.length - shown.length

  return (
    <ul className="flex flex-wrap gap-1.5">
      {shown.map((item) => (
        <li
          key={item}
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}
          title={item}
        >
          <span className="line-clamp-1 max-w-[14rem]">{item}</span>
        </li>
      ))}
      {extra > 0 && (
        <li className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-muted">
          +{extra} more
        </li>
      )}
    </ul>
  )
}

export default function MedsAndAllergies({
  profile,
  prescribed,
}: {
  profile: PatientProfile | null | undefined
  /** Current SIGNED prescriptions, when they loaded. Preferred over the
   *  patient's own free text, and labelled so the source is never ambiguous. */
  prescribed?: string[] | null
}) {
  const fromPrescriptions = prescribed !== undefined && prescribed !== null && prescribed.length > 0
  const medicines = fromPrescriptions ? prescribed : splitList(profile?.currentMedications, /[;\n]/)
  const allergiesRaw = profile?.knownAllergies
  const allergies = isNone(allergiesRaw) ? [] : splitList(allergiesRaw, /[;,\n]/)
  const allergiesRecorded = Boolean((allergiesRaw ?? '').trim())

  return (
    <section aria-labelledby="meds-heading" className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3">
        <h2 id="meds-heading" className="text-sm font-semibold text-ink">
          Medicines &amp; allergies
        </h2>
        <Link
          to="/app/medicines"
          className="focus-ring group inline-flex items-center gap-1 rounded text-xs font-semibold text-primary-700"
        >
          View all
          <ArrowRight
            size={12}
            aria-hidden="true"
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      <div className="mt-3.5 flex-1 space-y-4 rounded-xl border border-border bg-surface-1 p-4 shadow-card">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
            <Pill size={13} aria-hidden="true" className="text-accent-teal-fg" />
            Medicines
            <span className="font-normal text-ink-subtle">
              · {fromPrescriptions ? 'prescribed by your doctors' : 'as you told us'}
            </span>
          </p>
          <ChipRow
            items={medicines}
            tone="bg-accent-teal text-accent-teal-fg"
            emptyLabel="None recorded yet."
          />
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
            <ShieldAlert size={13} aria-hidden="true" className="text-warning-fg" />
            Allergies
            <span className="font-normal text-ink-subtle">· as you told us</span>
          </p>
          <ChipRow
            items={allergies}
            tone="bg-warning-bg text-warning-fg"
            emptyLabel={allergiesRecorded ? 'No known allergies.' : 'None recorded yet.'}
          />
        </div>
      </div>
    </section>
  )
}
