import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Pill, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useEncounter } from './useEncounterRoute'
import { useAuth } from '../../app/useAuth'
import { useToast } from '../../components/common/useToast'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Combobox from '../../components/common/Combobox'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { Banner, EmptyState, ErrorState, LoadingState } from '../../components/feedback/States'
import { formatDate, formatTime } from '../../components/clinic/format'
import HardStopDialog from '../../components/clinical/HardStopDialog'
import { classifyAllergies } from '../../components/clinical/patientDisplay'
import { allergenLabel } from '../../components/clinical/clinicalLabels'
import * as prescriptionService from '../../services/prescription.service'
import type { Drug, HardStop, Prescription, SafetyEvaluation } from '../../types/domain'
import type { ApiError } from '../../types/api'

/**
 * S-06-07 · Prescription Writer (ARC-07, Compact) — the T1 centrepiece.
 *
 * ⚠️ READ THIS BEFORE CHANGING ANYTHING HERE.
 *
 * The allergy hard stop on this screen is **deterministic**. It is a stored
 * rule — allergen class × drug class — evaluated on the server before any
 * commit. It is not a model output, not a suggestion, and not a heuristic. It
 * fires identically whether AI exists or not, and it will still fire when
 * every AI feature in this product is switched off, because none of it is AI.
 *
 * Consequences of that, all of which are load-bearing:
 *
 *  - The client NEVER decides whether signing is allowed. It renders
 *    `safety.canSign`, which the server computed. `sign()` re-evaluates from
 *    the database anyway, so a tampered client gains nothing.
 *  - A hard stop opens a focus-trapped `role="alertdialog"` that cannot be
 *    dismissed without a disposition (AIP-09). It is deliberately not a toast:
 *    a toast can be missed, and this one must not be.
 *  - Overriding needs a reason AND a second consultant's authentication (G4).
 *    Both identities are recorded. It emits the one audit event the atlas says
 *    must alert and be reviewed within 24 hours.
 *  - Dose warnings WARN, allergy collisions BLOCK. That asymmetry is
 *    intentional: an out-of-range dose is frequently correct for this patient,
 *    a documented anaphylaxis never is.
 */

const FREQUENCIES = ['OD', 'BD', 'TDS', 'QDS', 'STAT', 'PRN', 'Q6H', 'Q8H', 'Q12H']

export default function PrescriptionWriter() {
  const { patient, encounter } = useEncounter()
  const { can } = useAuth()
  const toast = useToast()

  const [rx, setRx] = useState<Prescription | null>(null)
  const [safety, setSafety] = useState<SafetyEvaluation | null>(null)
  const [loadError, setLoadError] = useState<ApiError | null>(null)
  const [activeStop, setActiveStop] = useState<HardStop | null>(null)
  const [confirmSign, setConfirmSign] = useState(false)
  const [signing, setSigning] = useState(false)

  // Hard stops already shown once. Without this the dialog would re-open on
  // every safety refresh (including the one that follows an override) and
  // trap the clinician in a loop they cannot leave.
  const seenStops = useRef<Set<string>>(new Set())

  const canSignRx = can('rx:sign:own')

  const applySafety = useCallback((next: SafetyEvaluation) => {
    setSafety(next)
    const fresh = next.hardStops.find((h) => !seenStops.current.has(h.itemId))
    if (fresh !== undefined) {
      seenStops.current.add(fresh.itemId)
      setActiveStop(fresh)
    }
  }, [])

  const load = useCallback(() => {
    setLoadError(null)
    prescriptionService
      .getDraftForEncounter(encounter.id)
      .then(async (draft) => {
        setRx(draft)
        applySafety(await prescriptionService.evaluateSafety(draft.id))
      })
      .catch((err: ApiError) => setLoadError(err))
  }, [encounter.id, applySafety])

  useEffect(load, [load])

  const afterMutation = (res: { prescription: Prescription; safety: SafetyEvaluation }) => {
    setRx(res.prescription)
    applySafety(res.safety)
  }

  const removeItem = async (itemId: string) => {
    if (rx === null) return
    try {
      seenStops.current.delete(itemId)
      afterMutation(await prescriptionService.removeItem(rx.id, itemId))
    } catch (err) {
      toast.notify((err as ApiError).message || 'Could not remove that item.', 'error')
    }
  }

  const doSign = async () => {
    if (rx === null) return
    setSigning(true)
    try {
      const signed = await prescriptionService.signPrescription(rx.id)
      setRx(signed)
      setConfirmSign(false)
      toast.notify(`Prescription ${signed.rxNumber} signed.`, 'success')
    } catch (err) {
      // A 409 here means the server re-evaluated and refused. Surface it and
      // reload safety so the screen agrees with the server rather than
      // showing a Sign button the server will keep rejecting.
      toast.notify((err as ApiError).message || 'Could not sign this prescription.', 'error')
      if (rx !== null) {
        prescriptionService.evaluateSafety(rx.id).then(applySafety).catch(() => undefined)
      }
    } finally {
      setSigning(false)
    }
  }

  if (loadError !== null) {
    return <ErrorState title="Could not open the prescription" description={loadError} onRetry={load} />
  }
  if (rx === null || safety === null) return <LoadingState label="Opening the prescription…" />

  const signed = rx.status !== 'Draft'

  return (
    <div className="space-y-4">
      <AllergyStrip allergens={safety.documentedAllergens} raw={patient.knownAllergies} />

      {signed ? (
        <Banner tone="success" title={`Prescription ${rx.rxNumber} signed`}>
          Signed by {rx.signerName}
          {rx.signerRegistrationNumber !== null && ` (${rx.signerRegistrationNumber})`}
          {rx.signerHprId !== null && ` · HPR ${rx.signerHprId}`}
          {rx.signedAt !== null && ` on ${formatDate(rx.signedAt)} at ${formatTime(rx.signedAt)}`}.
          A signed prescription cannot be edited.
        </Banner>
      ) : (
        safety.hardStops.length > 0 && (
          <Banner tone="error" title="Signing is blocked">
            {safety.hardStops.length === 1 ? 'One item collides' : `${safety.hardStops.length} items collide`}{' '}
            with a documented allergy. Remove the item, or record a formal override with a second
            consultant.
            <div className="mt-2 flex flex-wrap gap-2">
              {safety.hardStops.map((h) => (
                <Button key={h.itemId} size="xs" variant="secondary" onClick={() => setActiveStop(h)}>
                  Review {h.drugName}
                </Button>
              ))}
            </div>
          </Banner>
        )
      )}

      {/* Two panes at md and up — the atlas's ARC-07 basket. Below that they
          stack, search first, because on a phone you cannot see both and the
          basket is worthless until something is in it. */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {!signed && <AddItemPane rxId={rx.id} onAdded={afterMutation} />}
        <BasketPane
          rx={rx}
          safety={safety}
          signed={signed}
          onRemove={removeItem}
          onReviewStop={setActiveStop}
        />
      </div>

      {!signed && (
        <Card padding="md">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setConfirmSign(true)}
              disabled={!safety.canSign || rx.items.length === 0 || !canSignRx}
              icon={<ShieldCheck size={14} />}
            >
              Sign prescription
            </Button>
            {/* The reason is always stated in words. A disabled button with no
                explanation is the single most common way a safety control gets
                worked around instead of understood. */}
            <p className="text-xs text-ink-muted">
              {!canSignRx
                ? 'You do not hold prescribing rights. A prescriber must sign this.'
                : rx.items.length === 0
                  ? 'Add at least one medicine.'
                  : !safety.canSign
                    ? 'Blocked by a documented allergy — see above.'
                    : 'Signing stamps your name, registration number and HPR ID onto this prescription permanently.'}
            </p>
          </div>
        </Card>
      )}

      {activeStop !== null && (
        <HardStopDialog
          stop={activeStop}
          prescriptionId={rx.id}
          documentedAllergens={safety.documentedAllergens}
          onRemoveItem={async () => { await removeItem(activeStop.itemId); setActiveStop(null) }}
          onOverridden={(nextSafety) => { setSafety(nextSafety); setActiveStop(null) }}
        />
      )}

      {confirmSign && (
        <ConfirmDialog
          open
          title="Sign this prescription?"
          consequence={`${rx.items.length} item${rx.items.length === 1 ? '' : 's'} will be dispensed against your name, registration number and HPR ID. A signed prescription cannot be edited or withdrawn from this screen.`}
          confirmLabel="Sign prescription"
          confirmDisabled={signing}
          onConfirm={doSign}
          onCancel={() => setConfirmSign(false)}
        />
      )}
    </div>
  )
}

/* ── Allergy strip ───────────────────────────────────────────────────────── */

function AllergyStrip({ allergens, raw }: { allergens: string[]; raw: string | null }) {
  if (allergens.length === 0) {
    // Three distinct situations, and conflating them is how a prescriber ends
    // up believing a question was asked that never was. See patientDisplay.ts.
    const status = classifyAllergies(raw)
    if (status.kind === 'none') {
      return (
        <Banner tone="info">
          No known allergies were recorded for this patient. Dose checks still apply.
        </Banner>
      )
    }
    return (
      <Banner tone="warning">
        {status.kind === 'unrecorded'
          ? 'No allergy history has been recorded for this patient. That is not the same as "no known allergies" — ask before prescribing.'
          : `No allergen from this patient’s recorded history could be matched to the formulary, so the automatic check does not cover it. Read it yourself before prescribing: ${status.text}`}
      </Banner>
    )
  }
  // Text, never an icon alone (§6485). A clinician with a colour-vision
  // deficiency and a clinician glancing at a tablet in a corridor both have
  // to be able to read this.
  return (
    <Banner tone="error" title="Documented allergies">
      <div className="mt-1 flex flex-wrap gap-1.5">
        {allergens.map((a) => (
          <span key={a} className="rounded bg-critical-fg/10 px-2 py-0.5 text-xs font-semibold">
            {a}
          </span>
        ))}
      </div>
      {raw !== null && raw.trim() !== '' && (
        <p className="mt-1.5 whitespace-pre-line text-2xs opacity-90">As recorded: {raw}</p>
      )}
    </Banner>
  )
}

/* ── Add-item pane ───────────────────────────────────────────────────────── */

function AddItemPane({
  rxId, onAdded,
}: {
  rxId: string
  onAdded: (res: { prescription: Prescription; safety: SafetyEvaluation }) => void
}) {
  const [query, setQuery] = useState('')
  const [drugs, setDrugs] = useState<Drug[]>([])
  const [searching, setSearching] = useState(false)
  const [drug, setDrug] = useState<Drug | null>(null)
  const [dose, setDose] = useState('')
  const [doseUnit, setDoseUnit] = useState('mg')
  const [frequency, setFrequency] = useState('BD')
  const [durationDays, setDurationDays] = useState('5')
  const [substitutionAllowed, setSubstitutionAllowed] = useState(true)
  const [instructions, setInstructions] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2 || drug !== null) { setDrugs([]); return undefined }
    const t = window.setTimeout(() => {
      setSearching(true)
      prescriptionService
        .searchFormulary(q)
        .then(setDrugs)
        .catch(() => setDrugs([]))
        .finally(() => setSearching(false))
    }, 250)
    return () => window.clearTimeout(t)
  }, [query, drug])

  const reset = () => {
    setDrug(null); setQuery(''); setDose(''); setInstructions('')
  }

  const add = async () => {
    if (drug === null) return
    const doseNum = Number(dose)
    if (!Number.isFinite(doseNum) || doseNum <= 0) {
      setError('Enter a dose greater than zero.')
      return
    }
    const days = Number(durationDays)
    if (!Number.isInteger(days) || days < 1) {
      setError('Enter a duration of at least one day.')
      return
    }
    setBusy(true)
    setError('')
    try {
      onAdded(
        await prescriptionService.addItem(rxId, {
          drugId: drug.id,
          dose: doseNum,
          doseUnit,
          route: drug.route,
          frequency,
          durationDays: days,
          substitutionAllowed,
          instructions: instructions.trim() === '' ? null : instructions.trim(),
        }),
      )
      reset()
    } catch (err) {
      setError((err as ApiError).message || 'Could not add that medicine.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card padding="md">
      <h2 className="mb-3 text-sm font-semibold text-ink">Add a medicine</h2>

      <Combobox<Drug>
        label="Medicine"
        value={query}
        onValueChange={(v) => { setQuery(v); setDrug(null); setError('') }}
        options={drugs}
        optionKey={(d) => d.id}
        loading={searching}
        placeholder="Generic name, e.g. amoxicillin"
        emptyMessage={query.trim().length < 2 ? 'Type at least two characters.' : 'Not in the formulary.'}
        onSelect={(d) => { setDrug(d); setQuery(`${d.genericName} ${d.strength}`) }}
        renderOption={(d) => (
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-medium text-ink">{d.genericName}</span>
            <span className="text-2xs text-ink-muted">{d.strength} · {d.form} · {d.route}</span>
            {d.isNlem && (
              <span className="rounded bg-success-bg px-1 text-2xs font-semibold text-success-fg">
                NLEM
              </span>
            )}
          </div>
        )}
      />

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Field label="Dose" htmlFor="dose">
          <input
            id="dose" type="number" min="0" step="any" inputMode="decimal"
            value={dose} onChange={(e) => setDose(e.target.value)}
            className="focus-ring w-full rounded-lg border border-border-soft bg-surface-1 px-2 py-2 text-sm tabular-nums text-ink"
          />
        </Field>
        <Field label="Unit" htmlFor="unit">
          <select
            id="unit" value={doseUnit} onChange={(e) => setDoseUnit(e.target.value)}
            className="focus-ring w-full rounded-lg border border-border-soft bg-surface-1 px-2 py-2 text-sm text-ink"
          >
            {['mg', 'g', 'mcg', 'mL', 'unit'].map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </Field>
        <Field label="Frequency" htmlFor="freq">
          <select
            id="freq" value={frequency} onChange={(e) => setFrequency(e.target.value)}
            className="focus-ring w-full rounded-lg border border-border-soft bg-surface-1 px-2 py-2 text-sm text-ink"
          >
            {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </Field>
        <Field label="Days" htmlFor="days">
          <input
            id="days" type="number" min="1" step="1" inputMode="numeric"
            value={durationDays} onChange={(e) => setDurationDays(e.target.value)}
            className="focus-ring w-full rounded-lg border border-border-soft bg-surface-1 px-2 py-2 text-sm tabular-nums text-ink"
          />
        </Field>
      </div>

      <div className="mt-3">
        <Field label="Instructions for the patient (optional)" htmlFor="rxinstr">
          <input
            id="rxinstr" type="text" value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g. after food"
            className="focus-ring w-full rounded-lg border border-border-soft bg-surface-1 px-3 py-2 text-sm text-ink"
          />
        </Field>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox" checked={substitutionAllowed}
          onChange={(e) => setSubstitutionAllowed(e.target.checked)}
          className="focus-ring h-4 w-4 rounded border-border-soft"
        />
        Generic substitution allowed
      </label>

      {error !== '' && <div className="mt-3"><Banner tone="error">{error}</Banner></div>}

      <div className="mt-3">
        <Button onClick={() => void add()} loading={busy} disabled={drug === null} icon={<Plus size={14} />}>
          Add to prescription
        </Button>
      </div>

      {drug !== null && drug.allergenClass !== null && (
        <p className="mt-2 text-2xs text-ink-subtle">
          {drug.genericName} belongs to the {drug.allergenClass} class. If this patient has a
          documented allergy to that class, adding it will block signing.
        </p>
      )}
      {drug !== null && !drug.isAtlasVocabulary && (
        <p className="mt-1 text-2xs text-ink-subtle">
          Documented extension to the demo formulary.
        </p>
      )}
    </Card>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-2xs font-medium text-ink-muted">
        {label}
      </label>
      {children}
    </div>
  )
}

/* ── Basket ──────────────────────────────────────────────────────────────── */

function BasketPane({
  rx, safety, signed, onRemove, onReviewStop,
}: {
  rx: Prescription
  safety: SafetyEvaluation
  signed: boolean
  onRemove: (itemId: string) => void
  onReviewStop: (stop: HardStop) => void
}) {
  const stopFor = (itemId: string) => safety.hardStops.find((h) => h.itemId === itemId) ?? null
  const doseFor = (itemId: string) => safety.doseWarnings.find((d) => d.itemId === itemId) ?? null

  return (
    <Card padding="md">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">
          Prescription {rx.items.length > 0 && `(${rx.items.length})`}
        </h2>
        <span className="font-mono text-2xs text-ink-muted">{rx.rxNumber}</span>
      </div>

      {rx.items.length === 0 ? (
        <EmptyState
          icon={Pill}
          title="Nothing prescribed yet"
          description="Search the formulary on the left and add a medicine. Safety checks run as soon as the first item is added."
        />
      ) : (
        <ul className="space-y-2">
          {rx.items.map((item) => {
            const stop = stopFor(item.id)
            const dw = doseFor(item.id)
            return (
              <li
                key={item.id}
                className={`rounded-lg border p-2.5 ${
                  stop !== null ? 'border-critical-fg/40 bg-critical-bg' : 'border-border-soft bg-surface-1'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">
                      {item.drug.genericName} {item.drug.strength}
                    </p>
                    <p className="text-2xs tabular-nums text-ink-muted">
                      {item.dose} {item.doseUnit} · {item.route} · {item.frequency} ·{' '}
                      {item.durationDays} day{item.durationDays === 1 ? '' : 's'}
                      {!item.substitutionAllowed && ' · no substitution'}
                    </p>
                    {item.instructions !== null && item.instructions !== '' && (
                      <p className="mt-0.5 text-2xs text-ink-subtle">{item.instructions}</p>
                    )}
                  </div>
                  {!signed && (
                    <Button
                      size="xs" variant="ghost" onClick={() => onRemove(item.id)}
                      icon={<Trash2 size={13} />}
                    >
                      <span className="sr-only">Remove {item.drug.genericName}</span>
                    </Button>
                  )}
                </div>

                {stop !== null && (
                  <div className="mt-2 rounded border border-critical-fg/30 bg-surface-1 p-2">
                    <p className="flex items-start gap-1.5 text-xs font-semibold text-critical-fg">
                      <AlertTriangle size={13} aria-hidden="true" className="mt-0.5 shrink-0" />
                      Blocked — documented {allergenLabel(stop.allergenKey)} allergy
                    </p>
                    <p className="mt-1 text-2xs text-ink-muted">{stop.rationale}</p>
                    {!signed && (
                      <Button size="xs" variant="secondary" className="mt-1.5" onClick={() => onReviewStop(stop)}>
                        Review options
                      </Button>
                    )}
                  </div>
                )}

                {dw !== null && dw.verdict.status !== 'ok' && (
                  <p className="mt-1.5 flex items-start gap-1.5 text-2xs text-warning-fg">
                    <AlertTriangle size={11} aria-hidden="true" className="mt-0.5 shrink-0" />
                    <span>
                      {dw.verdict.status === 'unknown' ? 'No dose range on file' : 'Dose warning'} —{' '}
                      {dw.verdict.message} This does not block signing.
                    </span>
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
