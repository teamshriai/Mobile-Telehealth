import { Link } from 'react-router-dom'
import Drawer from '../../components/common/Drawer'
import ConfidenceBandChip from './ConfidenceBand'
import type { AiItem, AiTouchpointSpec } from '../types'

/**
 * `C-42` — the explainability drawer. §4.7.
 *
 * ⚠️ FOUR PANELS, FIXED, IN THIS ORDER, ON EVERY SCREEN. The atlas is explicit
 * that this is "identical on every screen, so a clinician learns it once", and
 * mandatory for G1–G4. That is why the panel headings are hard-coded here
 * rather than passed in: a screen may supply content, never structure.
 *
 * ⚠️ PANEL 2 IS THE ONE THAT MATTERS. §4.7 calls it "the panel that earns
 * clinical trust" — each input clickable back to its source record. A clinician
 * who can see which four rows a summary was built from can calibrate; one who
 * is shown a paragraph and a percentage cannot. Where an evidence row has an
 * `href` it renders as a link.
 *
 * ⚠️ Panel 4 carries the "not a diagnosis" line and a Report-a-problem action,
 * both required. In this build it also states plainly that the output is
 * simulated, because it is.
 */

interface WhyDrawerProps {
  open: boolean
  onClose: () => void
  item: AiItem | null
  spec: AiTouchpointSpec
  /** Stamped onto panel 1 beside the band. */
  generatedAt: string
  model: string
}

export default function WhyDrawer({
  open,
  onClose,
  item,
  spec,
  generatedAt,
  model,
}: WhyDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} title="Why this was suggested" widthClass="w-full max-w-lg">
      {item === null ? null : (
        <div className="space-y-5 text-sm">
          <Panel n={1} title="What this is">
            <p className="text-ink">{item.explanation.what}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <ConfidenceBandChip band={item.band} />
              <span className="text-2xs text-ink-subtle">{generatedAt}</span>
            </div>
          </Panel>

          <Panel n={2} title="What it used">
            <ul className="space-y-1.5">
              {item.explanation.used.map((e) => (
                <li key={e.label} className="flex flex-col gap-0.5">
                  {e.href === undefined ? (
                    <span className="text-xs font-medium text-ink">{e.label}</span>
                  ) : (
                    <Link
                      to={e.href}
                      className="focus-ring rounded text-xs font-medium text-primary-700 underline underline-offset-2"
                    >
                      {e.label}
                    </Link>
                  )}
                  <span className="text-2xs text-ink-muted">{e.detail}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel n={3} title="Why">
            <ul className="list-disc space-y-1 pl-4 text-xs text-ink">
              {item.explanation.why.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </Panel>

          <Panel n={4} title="Limits and provenance">
            <dl className="space-y-1.5 text-xs">
              <Row label="Model" value={model} />
              <Row label="Version" value={item.explanation.limits.version} />
              <Row label="Validation" value={item.explanation.limits.validatedOn} />
              <Row label="Guardrail" value={spec.guardrail} />
              <Row label="With this off" value={spec.fallback} />
            </dl>
            <p className="mt-2 text-2xs font-medium text-ink-muted">Known limits</p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-2xs text-ink-muted">
              {item.explanation.limits.failureModes.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            {/* Required by §4.7, and true. */}
            <p className="mt-3 rounded-lg bg-surface-2 p-2.5 text-2xs text-ink-muted">
              This is not a diagnosis and does not replace reading the record. In this build the
              output is a fixed simulation — no model is consulted and nothing leaves your browser.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="focus-ring mt-2 rounded text-2xs font-medium text-primary-700 underline underline-offset-2"
            >
              Report a problem with this suggestion
            </button>
          </Panel>
        </div>
      )}
    </Drawer>
  )
}

function Panel({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section aria-label={`Panel ${n}: ${title}`}>
      <h3 className="mb-1.5 flex items-baseline gap-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-subtle">
        <span className="tabular-nums">{n}</span>
        {title}
      </h3>
      {children}
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-ink-muted">{label}</dt>
      <dd className="text-right text-ink">{value}</dd>
    </div>
  )
}
