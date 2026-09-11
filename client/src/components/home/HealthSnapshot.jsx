import { Link } from 'react-router-dom'
import { Pill, Users, CalendarCheck, ShieldAlert } from 'lucide-react'

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
 * Colour carries meaning rather than variety: blue for care logistics,
 * teal for medication, amber for something needing attention. Tiles that
 * mean the same kind of thing share a colour.
 */

/** Splits the free-text medications field into individual entries. */
export function countMedications(currentMedications) {
  if (typeof currentMedications !== 'string') return 0
  return currentMedications
    .split(/[;\n]/)
    .map((s) => s.trim())
    .filter(Boolean).length
}

/** Splits the free-text allergies field, treating "none"-like text as zero. */
export function countAllergies(knownAllergies) {
  if (typeof knownAllergies !== 'string') return 0
  const text = knownAllergies.trim()
  if (text === '' || /^(none|nil|no known)/i.test(text)) return 0
  return text.split(/[;,\n]/).map((s) => s.trim()).filter(Boolean).length
}

const TONES = {
  blue:  { bg: 'bg-[#EFF6FF]', fg: 'text-[#1D4ED8]', ring: 'border-[#DBEAFE]' },
  teal:  { bg: 'bg-[#E6F4F1]', fg: 'text-[#2F6B5E]', ring: 'border-[#CCE7E1]' },
  amber: { bg: 'bg-[#FBF0E2]', fg: 'text-[#8A5A1B]', ring: 'border-[#F3E0C4]' },
}

function Tile({ to, icon: Icon, value, label, hint, tone = 'blue' }) {
  const t = TONES[tone] ?? TONES.blue
  return (
    <Link
      to={to}
      className={`focus-ring group flex min-h-11 flex-col gap-2.5 rounded-xl border ${t.ring} bg-white p-4 transition-colors hover:bg-[#FAFBFC]`}
    >
      <span
        aria-hidden="true"
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${t.bg}`}
      >
        <Icon size={17} className={t.fg} />
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold leading-none tracking-tight text-[#0F172A]">
          {value}
        </span>
        <span className="text-sm text-[#64748B]">{label}</span>
      </span>
      {/* The hint carries the meaning a number alone cannot, and is what a
          screen reader reads after the value — so status never depends on
          colour. */}
      <span className="text-xs leading-relaxed text-[#64748B]">{hint}</span>
    </Link>
  )
}

export default function HealthSnapshot({ profile, appointments = [], careTeam = [] }) {
  const medicines = countMedications(profile?.currentMedications)
  const allergies = countAllergies(profile?.knownAllergies)
  const upcoming = appointments.filter(
    (a) => a.status !== 'Cancelled' && new Date(a.scheduledAt) > new Date(),
  ).length

  return (
    <section aria-labelledby="snapshot-heading">
      <h2 id="snapshot-heading" className="text-sm font-semibold text-[#0F172A]">
        Your health at a glance
      </h2>
      <p className="mt-1 text-sm text-[#64748B]">
        Counted from your records. Tap any item to see the detail.
      </p>

      <div className="mt-3.5 grid grid-cols-2 gap-3 lg:grid-cols-4">
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
          to="/app/care-team"
          icon={Users}
          tone="blue"
          value={careTeam.length}
          label={careTeam.length === 1 ? 'clinician' : 'clinicians'}
          hint={careTeam.length > 0 ? 'Looking after you' : 'No one assigned yet'}
        />
        <Tile
          to="/app/health"
          icon={ShieldAlert}
          tone={allergies > 0 ? 'amber' : 'blue'}
          value={allergies}
          label={allergies === 1 ? 'allergy' : 'allergies'}
          hint={allergies > 0 ? 'Recorded — tell any new clinician' : 'None recorded'}
        />
      </div>
    </section>
  )
}
