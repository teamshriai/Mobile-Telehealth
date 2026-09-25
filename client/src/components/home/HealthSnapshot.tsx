import { Link } from 'react-router-dom'
import { Pill, Users, CalendarCheck, ShieldAlert } from 'lucide-react'
import type { ComponentType } from 'react'
import { countMedications, countAllergies } from './healthCounters'
import type { PatientProfile, Appointment, CareTeamMember } from '../../types/domain'

/**
 * Health Snapshot — the page's data anchor.
 *
 * Every figure here is COUNTED FROM REAL RECORDS. Nothing is scored,
 * predicted, or averaged. A count is a fact the patient can verify by
 * tapping through; a "health score" would be an invention, and this product
 * does not invent clinical meaning.
 *
 * Deliberately four tiles and no more. A fifth was considered (profile
 * completeness) and cut: the demo patient's profile is effectively complete,
 * so it would render a permanent 100% — decoration, not information.
 *
 * Colour carries meaning rather than variety: blue for care logistics, teal
 * for medication, violet for people/care team, amber for something needing
 * attention. Each is a solid fill with fixed white text (the `tile-*`
 * tokens) rather than the app's usual quiet pastel, so these four functions
 * are distinguishable at a glance.
 */

/* Solid, saturated fills — one per tile, each with a fixed white foreground —
   so the four containers read as distinct at a glance and their function is
   scannable without reading the label. `amber` stays the one tile whose
   colour carries semantic meaning (an allergy on record); the rest are
   category colour, not state. See the `tile-*` tokens in index.css. */
type Tone = 'blue' | 'teal' | 'violet' | 'amber'

const TONES: Record<Tone, { bg: string; fg: string }> = {
  blue:   { bg: 'bg-tile-blue',   fg: 'text-tile-blue-fg' },
  teal:   { bg: 'bg-tile-teal',   fg: 'text-tile-teal-fg' },
  violet: { bg: 'bg-tile-violet', fg: 'text-tile-violet-fg' },
  amber:  { bg: 'bg-tile-amber',  fg: 'text-tile-amber-fg' },
}

interface TileProps {
  to: string
  icon: ComponentType<{ size?: number; className?: string }>
  value: number
  label: string
  hint: string
  tone?: Tone
}

function Tile({ to, icon: Icon, value, label, hint, tone = 'blue' }: TileProps) {
  const t = TONES[tone] ?? TONES.blue
  return (
    <Link
      to={to}
      className={`focus-ring group flex min-h-11 flex-col gap-2.5 rounded-xl border border-transparent ${t.bg} p-4 shadow-card transition-transform hover:-translate-y-0.5 hover:shadow-card-md`}
    >
      <span
        aria-hidden="true"
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15"
      >
        <Icon size={17} className={t.fg} />
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className={`text-2xl font-semibold leading-none tracking-tight ${t.fg}`}>
          {value}
        </span>
        <span className={`text-sm ${t.fg} opacity-90`}>{label}</span>
      </span>
      {/* The hint carries the meaning a number alone cannot, and is what a
          screen reader reads after the value — so status never depends on
          colour. */}
      <span className={`text-xs leading-relaxed ${t.fg} opacity-75`}>{hint}</span>
    </Link>
  )
}

interface HealthSnapshotProps {
  profile: PatientProfile | null | undefined
  appointments?: Appointment[]
  careTeam?: CareTeamMember[]
}

export default function HealthSnapshot({ profile, appointments = [], careTeam = [] }: HealthSnapshotProps) {
  const medicines = countMedications(profile?.currentMedications)
  const allergies = countAllergies(profile?.knownAllergies)
  const upcoming = appointments.filter(
    (a) => a.status !== 'Cancelled' && new Date(a.scheduledAt) > new Date(),
  ).length

  return (
    <section aria-labelledby="snapshot-heading" className="flex h-full flex-col">
      <h2 id="snapshot-heading" className="text-sm font-semibold text-ink">
        Your health at a glance
      </h2>
      <p className="mt-1 text-sm text-ink-subtle">
        Counted from your records. Tap any item to see the detail.
      </p>

      <div className="mt-3.5 grid flex-1 grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-2">
        <Tile
          to="/app/medicines"
          icon={Pill}
          tone="teal"
          value={medicines}
          label={medicines === 1 ? 'medicine' : 'medicines'}
          hint={medicines > 0 ? 'Currently recorded for you' : 'None recorded yet'}
        />
        <Tile
          to="/app/appointments"
          icon={CalendarCheck}
          tone="blue"
          value={upcoming}
          label={upcoming === 1 ? 'appointment' : 'appointments'}
          hint={upcoming > 0 ? 'Coming up' : 'Nothing scheduled'}
        />
        <Tile
          to="/app/my-doctors"
          icon={Users}
          tone="violet"
          value={careTeam.length}
          label={careTeam.length === 1 ? 'doctor' : 'doctors'}
          hint={careTeam.length > 0 ? 'Looking after you' : 'No one assigned yet'}
        />
        <Tile
          to="/app/health"
          icon={ShieldAlert}
          tone="amber"
          value={allergies}
          label={allergies === 1 ? 'allergy' : 'allergies'}
          hint={allergies > 0 ? 'Recorded — tell any new clinician' : 'None recorded'}
        />
      </div>
    </section>
  )
}
