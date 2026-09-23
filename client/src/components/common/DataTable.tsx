import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'

/**
 * DataTable — `C-19`/`C-20`, the dense clinical table.
 *
 * There was no `<table>` anywhere in this codebase before this component;
 * every list was a `<ul>` of cards. Cards are right for a patient reading
 * four appointments and wrong for a consultant scanning a twenty-patient
 * clinic, which is what UI_ATLAS's Compact density (§3.3) exists for.
 *
 * ARC-01 keyboard contract:
 *   ↑ / ↓        move the focused row
 *   Enter        open it
 *   Space        preview it (falls back to open when no preview is wired)
 *   Home / End   first / last row
 *
 * ⚠️ RESPONSIVE: below 768px the table becomes stacked cards, per every
 * ARC responsive rule in the atlas. It is NOT a horizontally scrolling
 * table — a clinician on a phone scrolling sideways to find a value is how
 * the wrong value gets read.
 */

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  /** Makes the column sortable; returns the value to sort on. */
  sortValue?: (row: T) => string | number
  align?: 'left' | 'right'
  /** Tailwind width class, e.g. 'w-32'. */
  widthClass?: string
  /**
   * Where this column goes in the <768 card layout.
   * 'title' and 'subtitle' are the card's two headline lines; 'meta' becomes
   * a labelled row beneath; 'hidden' is dropped entirely on small screens.
   */
  card?: 'title' | 'subtitle' | 'meta' | 'hidden'
  /** Hidden below this many px in the TABLE layout (md-breakpoint trimming). */
  hideBelow?: 'lg' | 'xl'
}

interface DataTableProps<T> {
  rows: T[]
  columns: Array<Column<T>>
  rowKey: (row: T) => string
  /** Accessible name for the table. Required — an unnamed table is unusable. */
  caption: string
  onRowActivate?: (row: T) => void
  onRowPreview?: (row: T) => void
  selectedKey?: string | null
  emptyState?: ReactNode
  className?: string
}

type SortState = { key: string; direction: 'asc' | 'desc' } | null

export default function DataTable<T>({
  rows,
  columns,
  rowKey,
  caption,
  onRowActivate,
  onRowPreview,
  selectedKey = null,
  emptyState,
  className = '',
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>(null)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const bodyRef = useRef<HTMLTableSectionElement>(null)

  const sorted = useMemo(() => {
    if (sort === null) return rows
    const column = columns.find((c) => c.key === sort.key)
    if (column?.sortValue === undefined) return rows
    const getValue = column.sortValue
    // Copy before sorting — mutating the caller's array would reorder their
    // state behind their back.
    return [...rows].sort((a, b) => {
      const av = getValue(a)
      const bv = getValue(b)
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv))
      return sort.direction === 'asc' ? cmp : -cmp
    })
  }, [rows, columns, sort])

  const toggleSort = (key: string): void => {
    setSort((current) => {
      if (current?.key !== key) return { key, direction: 'asc' }
      if (current.direction === 'asc') return { key, direction: 'desc' }
      // Third click clears it — returning to the source order must always be
      // reachable (the ARC-01 reversibility rule).
      return null
    })
  }

  const focusRow = useCallback((index: number) => {
    const el = bodyRef.current?.querySelectorAll<HTMLTableRowElement>('tr[data-row]')[index]
    el?.focus()
  }, [])

  const onKeyDown = (e: KeyboardEvent<HTMLTableRowElement>, index: number, row: T): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = Math.min(index + 1, sorted.length - 1)
      setFocusedIndex(next); focusRow(next); return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const next = Math.max(index - 1, 0)
      setFocusedIndex(next); focusRow(next); return
    }
    if (e.key === 'Home') { e.preventDefault(); setFocusedIndex(0); focusRow(0); return }
    if (e.key === 'End') {
      e.preventDefault()
      const last = sorted.length - 1
      setFocusedIndex(last); focusRow(last); return
    }
    if (e.key === 'Enter') { e.preventDefault(); onRowActivate?.(row); return }
    if (e.key === ' ') {
      e.preventDefault()
      // Space previews where a preview exists, else it opens — an inert key
      // is worse than a consistent one.
      ;(onRowPreview ?? onRowActivate)?.(row)
    }
  }

  if (rows.length === 0 && emptyState !== undefined) {
    return <>{emptyState}</>
  }

  const interactive = onRowActivate !== undefined || onRowPreview !== undefined
  const hideClass = (c: Column<T>): string =>
    c.hideBelow === 'lg' ? 'hidden lg:table-cell' : c.hideBelow === 'xl' ? 'hidden xl:table-cell' : ''

  return (
    <div className={className}>
      {/* ── Table: md and up ─────────────────────────────────────────────── */}
      <div className="hidden overflow-x-auto rounded-xl border border-border-soft bg-surface-1 md:block">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 z-10 bg-surface-2">
            <tr>
              {columns.map((c) => {
                const isSorted = sort?.key === c.key
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={isSorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className={`border-b border-border-soft px-3 py-2 text-xs font-semibold text-ink-muted ${
                      c.align === 'right' ? 'text-right' : ''
                    } ${c.widthClass ?? ''} ${hideClass(c)}`}
                  >
                    {c.sortValue !== undefined ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className="focus-ring inline-flex items-center gap-1 rounded hover:text-ink"
                      >
                        {c.header}
                        {isSorted
                          ? (sort.direction === 'asc'
                              ? <ChevronUp size={13} aria-hidden="true" />
                              : <ChevronDown size={13} aria-hidden="true" />)
                          : <ChevronsUpDown size={13} aria-hidden="true" className="opacity-40" />}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody ref={bodyRef}>
            {sorted.map((row, index) => {
              const key = rowKey(row)
              const isSelected = key === selectedKey
              return (
                <tr
                  key={key}
                  data-row
                  // Roving tabindex, same reasoning as Tabs: one stop for the
                  // whole table, then arrow keys inside it.
                  tabIndex={interactive ? (index === focusedIndex ? 0 : -1) : undefined}
                  aria-selected={isSelected ? true : undefined}
                  onFocus={() => setFocusedIndex(index)}
                  onKeyDown={interactive ? (e) => onKeyDown(e, index, row) : undefined}
                  onClick={interactive ? () => onRowActivate?.(row) : undefined}
                  className={`clinical-row focus-ring border-b border-border-soft last:border-0 ${
                    interactive ? 'cursor-pointer' : ''
                  } ${isSelected ? 'bg-primary-50' : 'hover:bg-surface-2'}`}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-3 py-1.5 text-xs text-ink ${
                        c.align === 'right' ? 'text-right tabular-nums' : ''
                      } ${hideClass(c)}`}
                    >
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="border-t border-border-soft px-3 py-1.5 text-2xs text-ink-subtle">
          {sorted.length} {sorted.length === 1 ? 'row' : 'rows'}
          {sort !== null && ` · sorted by ${columns.find((c) => c.key === sort.key)?.header}`}
        </p>
      </div>

      {/* ── Stacked cards: below md ──────────────────────────────────────── */}
      <ul className="space-y-2 md:hidden">
        {sorted.map((row) => {
          const key = rowKey(row)
          const title = columns.find((c) => c.card === 'title')
          const subtitle = columns.find((c) => c.card === 'subtitle')
          const meta = columns.filter((c) => c.card === 'meta')
          return (
            <li key={key}>
              <div
                role={interactive ? 'button' : undefined}
                tabIndex={interactive ? 0 : undefined}
                onClick={interactive ? () => onRowActivate?.(row) : undefined}
                onKeyDown={
                  interactive
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onRowActivate?.(row)
                        }
                      }
                    : undefined
                }
                className={`focus-ring rounded-xl border border-border-soft bg-surface-1 p-3 ${
                  key === selectedKey ? 'ring-1 ring-primary-600' : ''
                }`}
              >
                {title && <div className="text-sm font-semibold text-ink">{title.render(row)}</div>}
                {subtitle && <div className="mt-0.5 text-xs text-ink-muted">{subtitle.render(row)}</div>}
                {meta.length > 0 && (
                  <dl className="mt-2 space-y-1">
                    {meta.map((c) => (
                      <div key={c.key} className="flex items-baseline justify-between gap-3">
                        <dt className="text-2xs text-ink-subtle">{c.header}</dt>
                        <dd className="text-xs text-ink">{c.render(row)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
