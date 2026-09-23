import { useCallback, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'

/**
 * Tabs — `C-28`, the record-detail tab strip used by ARC-02 screens.
 *
 * Two hand-rolled tab implementations already existed in this codebase
 * (AppointmentsPage and Settings) and neither implemented roving tabindex,
 * arrow-key movement or `role="tabpanel"`. This is the one both should
 * eventually use.
 *
 * Keyboard, per UI_ATLAS S-06-02 and the WAI-ARIA tabs pattern:
 *   ←/→        move between tabs (wrapping)
 *   Home/End   first / last tab
 *   1–9        jump directly to the nth tab
 *
 * ⚠️ Roving tabindex, not `tabIndex={0}` on every tab. With every tab
 * focusable, a keyboard user has to Tab through all seven to reach the
 * panel — which is exactly the friction that makes people stop using the
 * keyboard path.
 */

export interface TabDefinition {
  id: string
  label: string
  /** Optional count shown after the label, e.g. a problem count. */
  count?: number
  /** Rendered but not selectable — used for a section that exists but is
   *  not available yet, which must look different from one that is absent. */
  disabled?: boolean
  /** Explains a disabled tab. Required when `disabled` is set. */
  disabledReason?: string
}

interface TabsProps {
  tabs: TabDefinition[]
  activeId: string
  onChange: (id: string) => void
  children?: ReactNode
  /** Accessible name for the tab list. */
  label: string
  className?: string
}

export default function Tabs({ tabs, activeId, onChange, children, label, className = '' }: TabsProps) {
  const baseId = useId()
  const listRef = useRef<HTMLDivElement>(null)

  const selectable = tabs.filter((t) => !t.disabled)

  const focusTab = useCallback((id: string) => {
    const el = listRef.current?.querySelector<HTMLButtonElement>(`[data-tab-id="${id}"]`)
    el?.focus()
  }, [])

  const move = useCallback(
    (delta: number) => {
      const index = selectable.findIndex((t) => t.id === activeId)
      if (index === -1) return
      // Wraps, per the ARIA pattern — a clinician holding → should cycle,
      // not stop dead at the last tab.
      const next = selectable[(index + delta + selectable.length) % selectable.length]
      onChange(next.id)
      focusTab(next.id)
    },
    [activeId, selectable, onChange, focusTab],
  )

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); move(1); return }
    if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); return }
    if (e.key === 'Home' && selectable[0]) {
      e.preventDefault(); onChange(selectable[0].id); focusTab(selectable[0].id); return
    }
    if (e.key === 'End' && selectable.length > 0) {
      const last = selectable[selectable.length - 1]
      e.preventDefault(); onChange(last.id); focusTab(last.id); return
    }
    // 1–9 direct jump (S-06-02's keyboard map).
    if (/^[1-9]$/.test(e.key)) {
      const target = selectable[Number(e.key) - 1]
      if (target !== undefined) {
        e.preventDefault()
        onChange(target.id)
        focusTab(target.id)
      }
    }
  }

  return (
    <div className={className}>
      {/* scrollbar-hide + overflow-x-auto is the <768 rule: the strip
          scrolls rather than wrapping or truncating (S-06-02 responsive). */}
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="scrollbar-hide flex gap-1 overflow-x-auto border-b border-border-soft"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeId
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              data-tab-id={tab.id}
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${tab.id}`}
              aria-disabled={tab.disabled === true}
              title={tab.disabled === true ? tab.disabledReason : undefined}
              // Roving tabindex — only the active tab is in the tab order.
              tabIndex={isActive ? 0 : -1}
              onClick={() => { if (tab.disabled !== true) onChange(tab.id) }}
              className={`focus-ring clinical-row -mb-px flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors ${
                tab.disabled === true
                  ? 'cursor-not-allowed border-transparent text-ink-subtle/60'
                  : isActive
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-ink-subtle hover:text-ink'
              }`}
            >
              {tab.label}
              {typeof tab.count === 'number' && (
                <span
                  className={`rounded-full px-1.5 text-2xs font-semibold tabular-nums ${
                    isActive ? 'bg-primary-100 text-primary-700' : 'bg-surface-2 text-ink-subtle'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-${activeId}`}
        aria-labelledby={`${baseId}-tab-${activeId}`}
        // Focusable so that after activating a tab the panel itself is a
        // legitimate next stop for the keyboard.
        tabIndex={0}
        className="focus-ring pt-4"
      >
        {children}
      </div>
    </div>
  )
}
