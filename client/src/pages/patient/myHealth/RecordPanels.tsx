import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, ClipboardList, FileText, HeartPulse, Printer } from 'lucide-react'
import * as portal from '../../../services/portal.service'
import type { Condition, IssuedInstruction, VisitSummaryListItem } from '../../../services/portal.service'
import { EmptyState, ErrorState, LoadingState } from '../../../components/feedback/States'
import SourceBadge from '../../../components/common/SourceBadge'
import type { ApiError } from '../../../types/api'

/**
 * The CLINICIAN-authored half of My Health — read-only, signed, attributed.
 *
 * Each panel loads on its own, so a failure in one leaves the others working,
 * the same independence the Home grid already has.
 */

function useLoad<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetcher()
      .then(setData)
      .catch((err: ApiError) => setError(err))
      .finally(() => setLoading(false))
  }, [fetcher])
  useEffect(() => { load() }, [load])
  return { data, error, loading, reload: load }
}

// ── Conditions ──────────────────────────────────────────────────────────────

export function ConditionsPanel() {
  const { data, error, loading, reload } = useLoad(portal.getConditions)
  if (loading) return <LoadingState label="Loading your conditions…" />
  if (error !== null) return <ErrorState description={error} onRetry={reload} />
  const list = data ?? []
  if (list.length === 0) {
    return (
      <EmptyState
        icon={HeartPulse}
        title="No conditions recorded"
        description="When a clinician records a diagnosis at one of your visits, it will appear here."
      />
    )
  }
  const active = list.filter((c) => c.status === 'Active')
  const resolved = list.filter((c) => c.status === 'Resolved')
  return (
    <div className="space-y-5">
      <ConditionGroup title="Current" items={active} empty="No current conditions recorded." />
      {resolved.length > 0 && <ConditionGroup title="Resolved" items={resolved} />}
    </div>
  )
}

function ConditionGroup({ title, items, empty }: { title: string; items: Condition[]; empty?: string }) {
  return (
    <section aria-labelledby={`conditions-${title}`}>
      <h2 id={`conditions-${title}`} className="mb-2 text-sm font-semibold text-ink">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((c) => (
            <li key={c.id} className="rounded-xl border border-border-soft bg-surface-1 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-ink">{c.title}</p>
                {/* ICD-10 only — the code a clinician or insurer will ask for. */}
                <span className="font-mono text-xs text-ink-subtle">ICD-10 {c.code}</span>
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                Recorded {portal.formatDay(c.recordedAt)}
                {c.status === 'Resolved' && c.resolvedAt !== null && ` · resolved ${portal.formatDay(c.resolvedAt)}`}
              </p>
              <div className="mt-2"><SourceBadge kind="clinician" by={null} /></div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ── Visits ──────────────────────────────────────────────────────────────────

export function VisitsPanel() {
  const { data, error, loading, reload } = useLoad(portal.getVisits)
  if (loading) return <LoadingState label="Loading your visits…" />
  if (error !== null) return <ErrorState description={error} onRetry={reload} />
  const list = data ?? []
  if (list.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No visit summaries yet"
        description="A summary appears here once the clinician who saw you signs their notes."
      />
    )
  }
  return (
    <ul className="space-y-2">
      {list.map((v) => <VisitRow key={v.visitId} v={v} />)}
    </ul>
  )
}

function VisitRow({ v }: { v: VisitSummaryListItem }) {
  const parts = [
    v.counts.diagnoses > 0 && `${v.counts.diagnoses} diagnosis${v.counts.diagnoses === 1 ? '' : 'es'}`,
    v.counts.prescriptions > 0 && `${v.counts.prescriptions} prescription${v.counts.prescriptions === 1 ? '' : 's'}`,
    v.counts.instructions > 0 && `${v.counts.instructions} instruction${v.counts.instructions === 1 ? '' : 's'}`,
  ].filter(Boolean)
  return (
    <li>
      <Link
        to={`/app/visits/${encodeURIComponent(v.visitId)}`}
        className="focus-ring flex items-center gap-3 rounded-xl border border-border-soft bg-surface-1 p-4 transition-colors hover:border-primary-600/40"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            {portal.VISIT_TYPE_LABEL[v.type] ?? v.type} · {portal.formatDay(v.startedAt)}
          </p>
          <p className="mt-0.5 truncate text-xs text-ink-muted">
            {v.clinician ?? 'Your doctor'}
            {v.location !== null && ` · ${v.location}`}
          </p>
          {parts.length > 0 && <p className="mt-1 text-xs text-ink-subtle">{parts.join(' · ')}</p>}
        </div>
        <ChevronRight size={17} aria-hidden="true" className="flex-shrink-0 text-ink-subtle" />
      </Link>
    </li>
  )
}

// ── Instructions ────────────────────────────────────────────────────────────

export function InstructionsPanel() {
  const { data, error, loading, reload } = useLoad(portal.getInstructions)
  const [printing, setPrinting] = useState<string | null>(null)

  // ⚠️ Print ONE sheet: every other card is marked data-print="hide" while
  // printing, and the flag clears on afterprint so the screen is unchanged.
  useEffect(() => {
    if (printing === null) return undefined
    const done = () => setPrinting(null)
    window.addEventListener('afterprint', done)
    const t = window.setTimeout(() => window.print(), 50)
    return () => { window.clearTimeout(t); window.removeEventListener('afterprint', done) }
  }, [printing])

  if (loading) return <LoadingState label="Loading your instructions…" />
  if (error !== null) return <ErrorState description={error} onRetry={reload} />
  const list = data ?? []
  if (list.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No instructions yet"
        description="Instructions your clinician gives you at a visit — how to take a medicine, what to watch for — will appear here."
      />
    )
  }
  return (
    <ul className="space-y-3">
      {list.map((i) => (
        <li key={i.id} data-print={printing !== null && printing !== i.id ? 'hide' : undefined}>
          <InstructionCard i={i} onPrint={() => setPrinting(i.id)} />
        </li>
      ))}
    </ul>
  )
}

function InstructionCard({ i, onPrint }: { i: IssuedInstruction; onPrint: () => void }) {
  const bilingual = i.language !== 'en' && i.bodyEnglish !== null
  return (
    <article className="rounded-xl border border-border-soft bg-surface-1 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink" lang={i.language}>{i.title}</h3>
          {bilingual && i.titleEnglish !== null && (
            <p className="text-xs text-ink-muted" lang="en">{i.titleEnglish}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onPrint}
          data-print="hide"
          className="focus-ring tap-target inline-flex items-center gap-1.5 rounded-lg border border-border-soft px-3 text-xs font-medium text-ink-muted hover:bg-surface-2"
        >
          <Printer size={14} aria-hidden="true" /> Print
        </button>
      </div>

      {/* A6 — the patient's language beside its English counterpart. */}
      <div className={`mt-3 grid gap-4 ${bilingual ? 'md:grid-cols-2' : ''}`}>
        <div>
          {bilingual && (
            <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-ink-subtle">
              {portal.LANGUAGE_LABEL[i.language] ?? i.language}
            </p>
          )}
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink" lang={i.language}>{i.body}</p>
        </div>
        {bilingual && (
          <div>
            <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-ink-subtle">English</p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink" lang="en">{i.bodyEnglish}</p>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SourceBadge kind="clinician" by={i.issuedByName} detail={portal.formatDay(i.issuedAt)} />
        {i.visitId !== null && (
          <Link
            to={`/app/visits/${encodeURIComponent(i.visitId)}`}
            data-print="hide"
            className="focus-ring rounded text-xs font-medium text-primary-700 hover:underline"
          >
            From this visit
          </Link>
        )}
      </div>
    </article>
  )
}
