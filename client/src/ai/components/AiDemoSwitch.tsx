import { useAiMode } from '../useAi'
import type { AiDemoMode } from '../aiContextObject'
import AiMark from './AiMark'

/**
 * The demo switcher, for the account menu.
 *
 * ⚠️ IT EXISTS SO THE FAILURE STATES CAN BE SEEN. §1.5 requires every screen to
 * draw `AI-OFF`, `AI-ABSTAIN` and `AI-LOW`, and §4.8 requires that with the
 * fabric off "every screen remains fully usable". Neither claim is worth
 * anything if there is no way to put the product into those states and walk it.
 *
 * ⚠️ In a real deployment these are not user settings — §4.8 puts the kill
 * switches on `S-25-06` under governance, per capability and per site. This
 * control is a showcase affordance and says so.
 *
 * ⚠️ NOTE WHAT IT CANNOT DO: it cannot disable the allergy hard stop, dose
 * range checks, or any other safety rule, because none of those are AI. They
 * are stored rules evaluated on the server. Setting this to Off and then
 * prescribing co-amoxiclav to a penicillin-allergic patient still blocks —
 * which is the most useful thing this switch can demonstrate.
 */

const OPTIONS: ReadonlyArray<{ value: AiDemoMode; label: string; hint: string }> = [
  { value: 'on', label: 'On', hint: 'Normal operation' },
  { value: 'off', label: 'Off', hint: 'Affordances hidden, screens fully usable' },
  { value: 'abstain', label: 'Abstaining', hint: 'States what is missing' },
  { value: 'low', label: 'Low confidence', hint: 'Collapsed, review required' },
]

export default function AiDemoSwitch() {
  const { mode, setMode } = useAiMode()

  return (
    <div className="border-t border-border-soft px-3.5 py-2.5">
      <p className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wide text-ink-subtle">
        <AiMark />
        Assistance (demo)
      </p>
      <div role="radiogroup" aria-label="AI assistance demo mode" className="mt-1.5 space-y-0.5">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={mode === o.value}
            onClick={() => setMode(o.value)}
            className={`focus-ring flex w-full flex-col items-start rounded px-2 py-1.5 text-left transition-colors hover:bg-surface-2 ${
              mode === o.value ? 'bg-ai-soft' : ''
            }`}
          >
            <span
              className={`text-xs ${mode === o.value ? 'font-semibold text-ink' : 'text-ink-muted'}`}
            >
              {o.label}
            </span>
            <span className="text-2xs text-ink-subtle">{o.hint}</span>
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-2xs leading-relaxed text-ink-subtle">
        Safety rules are not AI and are unaffected by this switch.
      </p>
    </div>
  )
}
