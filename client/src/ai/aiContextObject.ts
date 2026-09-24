import { createContext } from 'react'
import type { AiResult } from './types'

/**
 * The AI context object, alone in its own file.
 *
 * ⚠️ Same reason as `authContextObject.ts`: a module that exports both a
 * component and a non-component breaks React Fast Refresh, so the provider
 * component and the context it fills live apart. Nothing here renders.
 */

export type AiDemoMode = 'on' | 'off' | 'abstain' | 'low'

export interface AiContextValue {
  mode: AiDemoMode
  setMode: (m: AiDemoMode) => void
  /** Resolve one touchpoint for one scope. Pure given (mode, id, scopeKey). */
  resolve: (touchpointId: string, scopeKey: string, query?: string) => AiResult
}

export const AiContext = createContext<AiContextValue | null>(null)
