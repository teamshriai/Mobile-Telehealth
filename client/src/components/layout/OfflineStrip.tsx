import { CloudOff } from 'lucide-react'
import { useConnectivity } from '../../app/useConnectivity'
import { formatTime } from '../clinic/format'

/**
 * `C-37` / `GP-12` — the offline strip.
 *
 * ⚠️ IT NAMES WHAT STILL WORKS FIRST. The atlas is specific about the content:
 * "what works, what is queued, what is blocked" — in that order. A strip that
 * only says "You are offline" makes a clinician stop working; one that says
 * "everything on screen is still readable" keeps them moving through the
 * consultation they are already in.
 *
 * ⚠️ NOT DISMISSIBLE. Dismissing it would not restore the connection, and a
 * clinician who dismissed it an hour ago and is now typing a note has been set
 * up to lose work.
 *
 * ⚠️ `role="status"`, not `alert`. Losing signal on a ward is routine. An
 * assertive live region interrupts a screen-reader user mid-sentence for
 * something they cannot act on.
 */
export default function OfflineStrip() {
  const { online, since } = useConnectivity()
  if (online) return null

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="offline-strip"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-warning-fg/30 bg-warning-bg px-4 py-2 text-xs text-warning-fg sm:px-6"
    >
      <span className="flex items-center gap-1.5 font-semibold">
        <CloudOff size={14} aria-hidden="true" />
        No connection
        {since !== null && <span className="font-normal">· since {formatTime(since)}</span>}
      </span>
      <span className="text-warning-fg/90">
        Everything already on screen stays readable. Typed content is kept and will be saved when
        the connection returns. Saving, signing and prescribing are unavailable until then.
      </span>
    </div>
  )
}
