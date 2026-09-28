import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Check, Hospital, Search } from 'lucide-react'
import Avatar from '../common/Avatar'
import type { BookableDoctor } from '../../types/domain'

/**
 * Who to see — a radio group of doctor cards, each with the doctor's portrait.
 *
 * It replaces a native <select>: an <option> cannot hold an image, and the
 * face is what a patient recognises. It keeps the radio contract a select
 * gave for free — ONE Tab stop, and the arrow keys move and select (WAI-ARIA
 * radio pattern) — so it is no slower to operate by keyboard.
 *
 * "No preference" stays first: the hospital then assigns a doctor. Past eight
 * doctors a filter box appears, so a long directory never becomes a wall.
 */
interface DoctorPickerProps {
  doctors: BookableDoctor[]
  value: string
  onChange: (doctorId: string) => void
}

const FILTER_FROM = 9

export default function DoctorPicker({ doctors, value, onChange }: DoctorPickerProps) {
  const labelId = useId()
  const [query, setQuery] = useState('')
  const refs = useRef(new Map<string, HTMLButtonElement | null>())

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q === '') return doctors
    return doctors.filter(
      (d) => d.id === value || `${d.name} ${d.specialty ?? ''}`.toLowerCase().includes(q),
    )
  }, [doctors, query, value])

  // '' is "No preference".
  const ids = ['', ...shown.map((d) => d.id)]
  const selected = ids.includes(value) ? value : ''
  const unknownChoice = value !== '' && doctors.length > 0 && !doctors.some((d) => d.id === value)

  const choose = (id: string) => {
    onChange(id)
    refs.current.get(id)?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const at = ids.indexOf(selected)
    let next: number | null = null
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (at + 1) % ids.length
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (at - 1 + ids.length) % ids.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = ids.length - 1
    if (next === null) return
    e.preventDefault()
    choose(ids[next])
  }

  const card = (checked: boolean) =>
    `focus-ring relative flex min-h-[4.5rem] w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
      checked
        ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600'
        : 'border-border-soft bg-surface-1 hover:border-border'
    }`

  return (
    <div className="@container">
      <p id={labelId} className="mb-1.5 text-sm font-medium text-ink">
        Clinician <span className="font-normal text-ink-subtle">(optional)</span>
      </p>

      {doctors.length >= FILTER_FROM && (
        <div className="relative mb-2">
          <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
          <label htmlFor={`${labelId}-filter`} className="sr-only">Find a doctor by name or specialty</label>
          <input
            id={`${labelId}-filter`}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a doctor by name or specialty"
            className="focus-ring w-full rounded-lg border border-border bg-surface-1 py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-subtle"
          />
        </div>
      )}

      <div
        role="radiogroup"
        aria-labelledby={labelId}
        onKeyDown={onKeyDown}
        className="grid grid-cols-1 gap-2 @lg:grid-cols-2 @4xl:grid-cols-3"
      >
        <button
          ref={(el) => { refs.current.set('', el) }}
          type="button"
          role="radio"
          aria-checked={selected === ''}
          tabIndex={selected === '' ? 0 : -1}
          onClick={() => choose('')}
          className={card(selected === '')}
        >
          <span aria-hidden="true" className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-subtle">
            <Hospital size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">No preference</span>
            <span className="mt-0.5 block text-xs text-ink-subtle">The hospital will assign a doctor</span>
          </span>
          {selected === '' && <Check size={16} aria-hidden="true" className="flex-shrink-0 text-primary-700" />}
        </button>

        {shown.map((d) => {
          const checked = selected === d.id
          const meta = [d.hospitalName, d.yearsExperience !== null ? `${d.yearsExperience} years’ experience` : null]
            .filter((v): v is string => !!v)
            .join(' · ')
          return (
            <button
              key={d.id}
              ref={(el) => { refs.current.set(d.id, el) }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              onClick={() => choose(d.id)}
              data-testid="doctor-option"
              className={card(checked)}
            >
              <Avatar name={d.name} src={d.photoUrl} size="lg" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{d.name}</span>
                {d.specialty && <span className="mt-0.5 block text-xs text-ink-muted">{d.specialty}</span>}
                {meta !== '' && <span className="mt-0.5 block text-xs text-ink-subtle">{meta}</span>}
              </span>
              {checked && <Check size={16} aria-hidden="true" className="flex-shrink-0 text-primary-700" />}
            </button>
          )
        })}
      </div>

      {shown.length === 0 && query.trim() !== '' && (
        <p className="mt-2 text-sm text-ink-subtle">No doctor matches “{query.trim()}”.</p>
      )}
      {unknownChoice && (
        <p role="status" className="mt-2 text-sm text-warning-fg">
          That doctor is not taking online requests right now. Choose another doctor, or “No preference”.
        </p>
      )}
    </div>
  )
}
