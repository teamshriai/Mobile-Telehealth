import { useEffect, useState } from 'react'
import { HeartPulse, Phone } from 'lucide-react'
import * as portal from '../../services/portal.service'
import * as profileService from '../../services/profile.service'
import type { Condition, Medication } from '../../services/portal.service'
import type { PatientProfile } from '../../types/domain'

/**
 * "Show this to the ambulance crew" — the facts a first responder asks for.
 *
 * ⚠️ BEST-EFFORT, NEVER IN THE WAY. The Emergency page is useful with no
 * network at all (the 108 button is a `tel:` link), so this card loads on its
 * own and simply does not appear if it cannot. It never delays or replaces
 * the call buttons above it.
 *
 * Allergies here are what the PATIENT reported — there is no structured,
 * clinician-verified allergy record yet — and the card says so.
 */
const BLOOD_GROUP: Record<string, string> = {
  A_Positive: 'A+', A_Negative: 'A−', B_Positive: 'B+', B_Negative: 'B−',
  AB_Positive: 'AB+', AB_Negative: 'AB−', O_Positive: 'O+', O_Negative: 'O−',
}

export default function EmergencyInfoCard() {
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [meds, setMeds] = useState<Medication[]>([])
  const [conditions, setConditions] = useState<Condition[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([profileService.getProfile(), portal.getMedications(), portal.getConditions()])
      .then(([p, m, c]) => {
        if (cancelled) return
        if (p.status === 'fulfilled') setProfile(p.value.profile ?? null)
        if (m.status === 'fulfilled') setMeds(m.value.current)
        if (c.status === 'fulfilled') setConditions(c.value.filter((x) => x.status === 'Active'))
        setReady(p.status === 'fulfilled' || m.status === 'fulfilled' || c.status === 'fulfilled')
      })
    return () => { cancelled = true }
  }, [])

  if (!ready) return null

  const allergies = profile?.knownAllergies?.trim() || null
  const contactPhone = profile?.emergencyContactPhone?.trim() || null

  return (
    <section aria-labelledby="info-heading" className="rounded-xl border border-border-soft bg-surface-1 p-5">
      <h2 id="info-heading" className="flex items-center gap-2 text-base font-semibold text-ink">
        <HeartPulse size={18} aria-hidden="true" className="text-critical-fg" /> Show this to the ambulance crew
      </h2>
      <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Allergies</dt>
          <dd className="mt-1 text-sm text-ink">{allergies ?? 'None recorded'}</dd>
          <dd className="text-xs text-ink-subtle">As you reported them</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Blood group</dt>
          <dd className="mt-1 text-sm text-ink">{profile?.bloodGroup ? (BLOOD_GROUP[profile.bloodGroup] ?? profile.bloodGroup) : 'Not recorded'}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Current prescribed medicines</dt>
          <dd className="mt-1 text-sm text-ink">
            {meds.length === 0 ? 'None on record' : (
              <ul className="space-y-0.5">
                {meds.map((m) => <li key={m.id}>{m.name} {m.dose} {m.doseUnit} — {m.frequencyInWords.toLowerCase()}</li>)}
              </ul>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Conditions</dt>
          <dd className="mt-1 text-sm text-ink">
            {conditions.length === 0 ? 'None on record' : (
              <ul className="space-y-0.5">{conditions.map((c) => <li key={c.id}>{c.title}</li>)}</ul>
            )}
          </dd>
          <dd className="text-xs text-ink-subtle">Recorded by your doctors</dd>
        </div>
      </dl>
      {profile?.emergencyContactName && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-soft pt-4">
          <p className="text-sm text-ink">
            <span className="text-ink-subtle">Emergency contact: </span>
            {profile.emergencyContactName}
            {profile.emergencyContactRelation && <span className="text-ink-subtle"> ({profile.emergencyContactRelation})</span>}
          </p>
          {contactPhone !== null && (
            <a href={`tel:${contactPhone.replace(/[^\d+]/g, '')}`} className="focus-ring tap-target inline-flex items-center gap-1.5 rounded-lg border border-border-soft px-3 text-sm font-medium text-ink hover:bg-surface-2">
              <Phone size={15} aria-hidden="true" /> Call {profile.emergencyContactName.split(' ')[0]}
            </a>
          )}
        </div>
      )}
    </section>
  )
}
