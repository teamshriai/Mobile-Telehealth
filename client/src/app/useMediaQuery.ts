import { useEffect, useState } from 'react'

/**
 * A CSS media query, as React state.
 *
 * ⚠️ `matchMedia`, NOT a `resize` listener. The atlas's responsive rules are
 * breakpoint rules — "1024–1279 `Z6` collapses to a tab" — and a breakpoint
 * changes a handful of times in a session, while `resize` fires on every pixel
 * of a window drag. `TemplateManager` currently reads `window.innerWidth` on an
 * undebounced `resize` and re-renders a table on every tick; this is the
 * replacement.
 *
 * ⚠️ Use this ONLY where the layout decision cannot be expressed in CSS.
 * Tailwind's `xl:` variants are better in every case where both branches can be
 * rendered and one hidden. This exists for the cases where rendering both would
 * duplicate content in the accessibility tree — a tab that must not exist when
 * the rail is drawn, for instance — or would mount two copies of a fetch.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    // Re-read on subscribe: the viewport may have changed between the initial
    // state and this effect running.
    setMatches(mql.matches)

    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}
