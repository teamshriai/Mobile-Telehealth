import { useState } from 'react'
import { Siren, Phone, AlertTriangle, Check } from 'lucide-react'
import { Banner } from '../../components/feedback/States.jsx'

/**
 * Emergency — symptom check and how to get help.
 *
 * Three Phase 1 defects are corrected here:
 *
 *  1. The BEFAST checklist was decorative: handleSendAlert never read the
 *     `checked` state, so an alert could be sent with zero symptoms and the
 *     selections were never transmitted. Here the checklist DRIVES the
 *     outcome — it is the whole feature, not decoration around a button.
 *  2. No emergency number existed anywhere in the codebase, and the timeline
 *     copy said "called 911". India's ambulance number is 108 (112 is the
 *     all-services emergency line). Both are real tel: links.
 *  3. Dispatch was simulated with a fake ETA and a seven-stage tracker. No
 *     dispatch integration exists, so none is implied. The page routes the
 *     patient to the real emergency system instead of a mock of one.
 *
 * BE-FAST (Balance, Eyes, Face, Arm, Speech, Time) is the current form of the
 * scale, not the older three-item FAST.
 */

const BEFAST = [
  { key: 'balance', label: 'Sudden loss of balance', hint: 'Dizziness, or trouble walking or standing' },
  { key: 'eyes',    label: 'Sudden trouble seeing',  hint: 'Blurred or lost vision in one or both eyes' },
  { key: 'face',    label: 'Face drooping',          hint: 'One side of the face droops or feels numb' },
  { key: 'arm',     label: 'Arm weakness',           hint: 'One arm drifts down when both are raised' },
  { key: 'speech',  label: 'Speech difficulty',      hint: 'Slurred speech, or trouble finding words' },
]

export default function EmergencyPage() {
  const [checked, setChecked] = useState({})

  const toggle = (key) =>
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }))

  const positive = BEFAST.filter((s) => checked[s.key])
  // Any single BE-FAST sign is enough to warrant emergency care. The scale is
  // deliberately not a score to be totalled — treating it as "2 of 5 is mild"
  // would be clinically wrong and dangerous.
  const anyPositive = positive.length > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A] sm:text-3xl">Emergency</h1>
        <p className="mt-1.5 text-sm text-[#475569]">
          If you think you are having a stroke, get help now. Do not wait to see if it passes.
        </p>
      </div>

      {/* ── Call first. Always the primary action, before any checklist. ── */}
      <section aria-labelledby="call-heading" className="rounded-xl border border-[#F0C8C0] bg-[#FBEAE7] p-5">
        <h2 id="call-heading" className="flex items-center gap-2 text-base font-semibold text-[#A33A28]">
          <Siren size={18} aria-hidden="true" /> Call for an ambulance
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[#7A3020]">
          Stroke treatment works best within the first hours. Calling an ambulance is
          faster than travelling to hospital yourself — treatment can begin on the way.
        </p>

        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <a
            href="tel:108"
            className="focus-ring inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-[#DC2626] px-5 text-base font-semibold text-white transition-colors hover:bg-[#B91C1C]"
          >
            <Phone size={18} aria-hidden="true" /> Call 108 — Ambulance
          </a>
          <a
            href="tel:112"
            className="focus-ring inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-[#D8A99E] bg-white px-5 text-base font-semibold text-[#A33A28] transition-colors hover:bg-[#FBEAE7]"
          >
            <Phone size={18} aria-hidden="true" /> Call 112 — Emergency
          </a>
        </div>
      </section>

      {/* ── BE-FAST ── */}
      <section aria-labelledby="befast-heading" className="rounded-xl border border-[#E8EDF2] bg-white p-5">
        <h2 id="befast-heading" className="text-base font-semibold text-[#0F172A]">
          Check for stroke signs (BE-FAST)
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[#475569]">
          Tick anything you notice. This is a guide to help you decide — it is not a
          diagnosis, and it does not contact anyone.
        </p>

        <fieldset className="mt-4">
          <legend className="sr-only">Stroke warning signs</legend>
          <ul className="space-y-2">
            {BEFAST.map((sign) => {
              const isOn = Boolean(checked[sign.key])
              return (
                <li key={sign.key}>
                  <label
                    className={`focus-within:ring-2 focus-within:ring-[#2563EB] flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors ${
                      isOn ? 'border-[#D8A99E] bg-[#FBEAE7]' : 'border-[#E8EDF2] bg-white hover:bg-[#FAFBFC]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isOn}
                      onChange={() => toggle(sign.key)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors ${
                        isOn ? 'border-[#A33A28] bg-[#A33A28]' : 'border-[#CBD5E1] bg-white'
                      }`}
                    >
                      {isOn && <Check size={13} className="text-white" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-sm font-semibold ${isOn ? 'text-[#A33A28]' : 'text-[#0F172A]'}`}>
                        {sign.label}
                      </span>
                      <span className="mt-0.5 block text-sm leading-relaxed text-[#475569]">
                        {sign.hint}
                      </span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </fieldset>

        {/* The checklist now genuinely determines what the patient is told.
            aria-live so the result is announced, not just shown. */}
        <div aria-live="polite" className="mt-4">
          {anyPositive && (
            <Banner tone="error" title="Call 108 now">
              You have marked {positive.length === 1 ? 'a stroke warning sign' : `${positive.length} stroke warning signs`}.
              Even one sign is enough — call an ambulance immediately and note the time
              the symptoms started. Your care team needs that time.
            </Banner>
          )}
        </div>
      </section>

      {/* ── Time of onset: the single most treatment-critical fact ── */}
      <section aria-labelledby="time-heading" className="rounded-xl border border-[#E8EDF2] bg-white p-5">
        <h2 id="time-heading" className="flex items-center gap-2 text-base font-semibold text-[#0F172A]">
          <AlertTriangle size={17} aria-hidden="true" className="text-[#8A5A1B]" />
          Remember when it started
        </h2>
        <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-[#475569]">
          The time symptoms began — or the last time the person was completely well —
          decides which treatments are safe to give. Tell the ambulance crew and the
          hospital this time. If you are not sure, say when the person was last seen
          normal.
        </p>
      </section>
    </div>
  )
}
