import type { ConfidenceBand } from '../types'
import { bandLabel } from '../confidence'

/**
 * `C-44` — the confidence indicator. §4.5.
 *
 * ⚠️ THREE BANDS, NEVER A BARE NUMBER. "0.83" tells a clinician nothing they
 * can act on and invites false precision; "Moderate confidence — review
 * closely" tells them what to do. A percentage may accompany the label but the
 * atlas forbids it replacing the label, so this component takes no number at
 * all — there is no way to render one through it.
 *
 * ⚠️ THE GLYPH IS NOT DECORATION AND NOT THE ONLY CARRIER. §5.3: colour is
 * never the only carrier. Each band has a distinct SHAPE — solid disc, half
 * disc, hollow ring — as well as a distinct colour and its own words, so the
 * three are separable in greyscale and by a screen reader.
 */

export default function ConfidenceBandChip({ band }: { band: ConfidenceBand }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-2xs font-medium text-ink-muted">
      <Glyph band={band} />
      {bandLabel(band)}
    </span>
  )
}

function Glyph({ band }: { band: ConfidenceBand }) {
  if (band === 'HIGH') {
    return <span aria-hidden="true" className="h-2 w-2 rounded-full bg-ai" />
  }
  if (band === 'MED') {
    // A half disc: a full ring with only half of it filled.
    return (
      <span
        aria-hidden="true"
        className="h-2 w-2 overflow-hidden rounded-full border border-warning-fg"
      >
        <span className="block h-full w-1/2 bg-warning-fg" />
      </span>
    )
  }
  return <span aria-hidden="true" className="h-2 w-2 rounded-full border border-warning-fg" />
}
