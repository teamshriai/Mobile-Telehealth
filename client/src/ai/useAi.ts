import { useContext } from 'react'
import { AiContext, type AiDemoMode } from './aiContextObject'
import { touchpoint } from './registry'
import type { AiResult, AiTouchpointSpec } from './types'

/**
 * Read one AI touchpoint.
 *
 * ⚠️ Returns the atlas spec alongside the result so a screen physically cannot
 * render a result without having the gate, the guardrail and the explain mode
 * to hand. Those are the things the atlas fixes and a screen must not choose.
 *
 * ⚠️ Outside an `AiProvider` this returns `{ status: 'off' }` rather than
 * throwing. A missing provider must degrade to a working clinical screen, not
 * a crashed one — the whole premise of `AI-OFF` is that the product works
 * without the fabric.
 */
export function useAiTouchpoint(
  touchpointId: string,
  scopeKey: string,
  query?: string,
): { spec: AiTouchpointSpec; result: AiResult } {
  const ctx = useContext(AiContext)
  const spec = touchpoint(touchpointId)
  if (ctx === null) return { spec, result: { status: 'off' } }
  return { spec, result: ctx.resolve(touchpointId, scopeKey, query) }
}

/** The demo switcher's state. Presentation only — never a clinical record. */
export function useAiMode(): { mode: AiDemoMode; setMode: (m: AiDemoMode) => void } {
  const ctx = useContext(AiContext)
  if (ctx === null) return { mode: 'off', setMode: () => {} }
  return { mode: ctx.mode, setMode: ctx.setMode }
}
