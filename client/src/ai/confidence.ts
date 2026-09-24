import type { ConfidenceBand } from './types'

/**
 * The confidence bands as words. §4.5.
 *
 * ⚠️ Plain module, not the component file, so Fast Refresh keeps working — and
 * so that the accessible-name helper can be imported by files that never
 * render a chip. §6478 requires the band in the accessible name of every `◆`
 * region, which is a lot of callers.
 */
const LABEL: Record<ConfidenceBand, string> = {
  HIGH: 'High confidence',
  MED: 'Moderate confidence',
  LOW: 'Low confidence — review closely',
}

export function bandLabel(band: ConfidenceBand): string {
  return LABEL[band]
}
