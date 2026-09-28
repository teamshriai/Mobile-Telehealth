import { ChevronDown, UserRound } from 'lucide-react'
import { HOSPITAL_ROLES, hospitalRoleById, parseHospitalRole, type HospitalRoleId } from './audience'

/**
 * "Which role defines you best?" — the Hospital sign-in screen's role dropdown.
 *
 * ⚠️ A NATIVE <select>, on purpose. A phone opens its own picker (the iOS
 * wheel, the Android dialog), every screen reader already knows how to
 * operate and announce it, and nothing about it can be clipped by the card or
 * painted over by a neighbouring field. The chosen role's icon sits inside
 * the field and its one-line description underneath; the list itself is text,
 * as native lists are.
 *
 * ⚠️ Focus does not move on change: arrowing through a closed select on
 * Windows fires `change` at every step, so jumping to the next field would
 * make choosing by keyboard impossible.
 *
 * Touch target and iOS zoom-prevention: `min-h-12` here, and `index.css`
 * gives every select 44px and 16px text below 768px. Below 360px the icon
 * tile steps aside, so the longest label still fits a 320px phone whole.
 */
interface HospitalRoleFieldProps {
  id: string
  value: HospitalRoleId | null
  onChange: (next: HospitalRoleId) => void
  autoFocus?: boolean
  disabled?: boolean
}

export default function HospitalRoleField({
  id, value, onChange, autoFocus = false, disabled = false,
}: HospitalRoleFieldProps) {
  const selected = hospitalRoleById(value)
  const Icon = selected?.icon ?? UserRound
  const hintId = `${id}-hint`

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-muted">
        Which role defines you best?
      </label>
      <div className="group relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-2 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-primary-50 text-primary-700 min-[360px]:flex"
        >
          <Icon size={16} strokeWidth={2} />
        </span>
        <select
          id={id}
          value={value ?? ''}
          autoFocus={autoFocus}
          disabled={disabled}
          onChange={(e) => {
            const next = parseHospitalRole(e.target.value)
            if (next !== null) onChange(next)
          }}
          aria-describedby={hintId}
          className={`min-h-12 w-full cursor-pointer appearance-none rounded-lg border border-border-soft bg-surface-1 py-2.5 pl-3.5 pr-8 text-base transition-all duration-200 hover:border-border focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-700/35 disabled:cursor-not-allowed disabled:opacity-60 min-[360px]:pl-12 [&>option]:text-ink ${
            selected === null ? 'text-ink-subtle' : 'text-ink'
          }`}
        >
          <option value="" disabled>
            Select your role
          </option>
          {HOSPITAL_ROLES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          strokeWidth={2}
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-subtle"
        />
      </div>
      <p id={hintId} className="mt-1 text-xs leading-relaxed text-ink-subtle">
        {selected?.description
          ?? 'Choose the role your hospital set up for you. Registering a new hospital? Choose Hospital administrator.'}
      </p>
    </div>
  )
}
