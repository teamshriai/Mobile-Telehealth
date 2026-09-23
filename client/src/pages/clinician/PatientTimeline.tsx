import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ClipboardList, FileText, Pill, Stethoscope } from 'lucide-react'
import { usePatient } from './usePatientRoute'
import Card from '../../components/common/Card'
import { EmptyState, ErrorState, LoadingState, Banner } from '../../components/feedback/States'
import { formatDate, formatTime } from '../../components/clinic/format'
import * as clinicalPatientService from '../../services/clinicalPatient.service'
import { encounterTypeLabel } from '../../components/clinical/encounterLabels'
import { noteStatusLabel, problemStatusLabel } from '../../components/clinical/clinicalLabels'
import * as clinicalNoteService from '../../services/clinicalNote.service'
import * as problemService from '../../services/problem.service'
import * as prescriptionService from '../../services/prescription.service'
import type { ApiError } from '../../types/api'

/**
 * S-06-06 · Clinical Timeline (ARC-25, Compact).
 *
 * The counterpart to the chart summary, and the reason the summary is allowed
 * to be a summary at all. Three properties define it:
 *
 *  1. **Unsummarised.** Every stored event appears. Nothing is rolled up,
 *     bucketed or elided, because the clinician came here precisely because
 *     the summary was not enough.
 *  2. **Obviously complete.** The footer states the range and the count, so a
 *     clinician can tell "nothing happened" from "nothing loaded". A timeline
 *     that silently truncates is worse than no timeline.
 *  3. **Strictly chronological**, newest first, with `←`/`→` stepping between
 *     events so the whole record is walkable from the keyboard.
 */

type EventKind = 'encounter' | 'note' | 'problem' | 'prescription'

interface TimelineEvent {
  id: string
  kind: EventKind
  at: string
  title: string
  detail: string | null
  meta: string | null
  href: string | null
}

const KIND_META: Record<EventKind, { label: string; icon: typeof FileText; tone: string }> = {
  encounter: { label: 'Encounter', icon: Stethoscope, tone: 'bg-primary-50 text-primary-700' },
  note: { label: 'Note', icon: FileText, tone: 'bg-info-bg text-info-fg' },
  problem: { label: 'Problem', icon: ClipboardList, tone: 'bg-warning-bg text-warning-fg' },
  prescription: { label: 'Prescription', icon: Pill, tone: 'bg-success-bg text-success-fg' },
}

export default function PatientTimeline() {
  const { patient } = usePatient()
  const [events, setEvents] = useState<TimelineEvent[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [partial, setPartial] = useState<string[]>([])
  const [cursor, setCursor] = useState(0)
  const itemRefs = useRef<Array<HTMLLIElement | null>>([])

  const load = useCallback(() => {
    setError(null)
    setPartial([])

    // allSettled, not all: a timeline that fails entirely because ONE source
    // is down is useless. A partial timeline that says which part is missing
    // is still clinically usable — that is the PARTIAL state (§1.5), and the
    // banner below is what keeps it honest.
    Promise.allSettled([
      clinicalPatientService.listEncountersForPatient(patient.shriPatientId),
      clinicalNoteService.listNotes(patient.id),
      problemService.listProblems(patient.id),
      prescriptionService.listForPatient(patient.id),
    ]).then(([enc, notes, problems, rx]) => {
      const out: TimelineEvent[] = []
      const missing: string[] = []

      if (enc.status === 'fulfilled') {
        enc.value.forEach((e) =>
          out.push({
            id: `enc-${e.visitId}`,
            kind: 'encounter',
            at: e.startedAt,
            title: `${encounterTypeLabel(e.type)} encounter`,
            detail: e.chiefComplaint,
            meta: [e.locationName, e.status].filter(Boolean).join(' · ') || null,
            href: `/encounter/${e.visitId}/note`,
          }),
        )
      } else missing.push('encounters')

      if (notes.status === 'fulfilled') {
        notes.value.forEach((n) => {
          out.push({
            id: `note-${n.id}`,
            kind: 'note',
            at: n.signedAt ?? n.createdAt,
            title: n.problemText ?? 'Consultation note',
            detail: n.assessment,
            meta:
              n.signerName === null
                ? noteStatusLabel(n.status)
                : `Signed by ${n.signerName}${
                    n.signerRegistrationNumber ? ` · ${n.signerRegistrationNumber}` : ''
                  }`,
            href: n.encounterId === null ? null : `/encounter/${n.encounterId}/note`,
          })
          // Addenda are separate events, separately attributed. Folding one
          // into its parent note would hide WHEN the record changed, which is
          // the entire point of an addendum (CMP-NABH-10).
          n.addenda.forEach((a) =>
            out.push({
              id: `add-${a.id}`,
              kind: 'note',
              at: a.createdAt,
              title: 'Addendum',
              detail: a.body,
              meta: `${a.authorName}${
                a.authorRegistrationNumber ? ` · ${a.authorRegistrationNumber}` : ''
              }`,
              href: n.encounterId === null ? null : `/encounter/${n.encounterId}/note`,
            }),
          )
        })
      } else missing.push('notes')

      if (problems.status === 'fulfilled') {
        problems.value.forEach((p) => {
          out.push({
            id: `prob-${p.id}`,
            kind: 'problem',
            at: p.onsetDate ?? p.createdAt,
            title: `${p.codeTitle} (${p.code})`,
            detail: p.note,
            meta: `Added to problem list · ${problemStatusLabel(p.status)}`,
            href: null,
          })
          if (p.resolvedAt !== null) {
            out.push({
              id: `prob-res-${p.id}`,
              kind: 'problem',
              at: p.resolvedAt,
              title: `${p.codeTitle} resolved`,
              detail: null,
              meta: `Resolved · ${p.code}`,
              href: null,
            })
          }
        })
      } else missing.push('problems')

      if (rx.status === 'fulfilled') {
        rx.value
          .filter((p) => p.signedAt !== null)
          .forEach((p) =>
            out.push({
              id: `rx-${p.id}`,
              kind: 'prescription',
              at: p.signedAt as string,
              title: `Prescription ${p.rxNumber}`,
              detail: p.items.map((i) => `${i.drug.genericName} ${i.dose}${i.doseUnit} ${i.route} ${i.frequency}`).join('\n'),
              meta: p.signerName === null ? null : `Signed by ${p.signerName}`,
              href: null,
            }),
          )
      } else missing.push('prescriptions')

      if (missing.length === 4) {
        setError((enc as PromiseRejectedResult).reason as ApiError)
        return
      }

      out.sort((a, b) => b.at.localeCompare(a.at))
      setPartial(missing)
      setEvents(out)
      setCursor(0)
    })
  }, [patient.id, patient.shriPatientId])

  useEffect(load, [load])

  // ←/→ walk the record. Scoped to this screen and skipped while the
  // clinician is in a field, so it never eats a cursor key mid-typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      const t = e.target as HTMLElement | null
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return
      if (events === null || events.length === 0) return
      e.preventDefault()
      setCursor((c) => {
        const next = e.key === 'ArrowRight' ? Math.min(c + 1, events.length - 1) : Math.max(c - 1, 0)
        itemRefs.current[next]?.focus()
        return next
      })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [events])

  const range = useMemo(() => {
    if (events === null || events.length === 0) return null
    return { from: events[events.length - 1].at, to: events[0].at }
  }, [events])

  if (error !== null) {
    return <ErrorState title="Could not load the timeline" description={error} onRetry={load} />
  }
  if (events === null) return <LoadingState label="Loading the full record…" />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            Clinical timeline
          </h1>
          <p className="mt-0.5 text-xs text-ink-muted">
            The complete record held in this system, newest first. Nothing is summarised.
            Press <Kbd>←</Kbd> and <Kbd>→</Kbd> to step between events.
          </p>
        </div>
        <Link
          to={`/patient/${patient.shriPatientId}/chart`}
          className="focus-ring inline-flex h-9 items-center rounded-lg border border-border-soft bg-surface-1 px-3 text-sm font-medium text-ink hover:bg-surface-2"
        >
          Back to chart
        </Link>
      </div>

      {partial.length > 0 && (
        <Banner tone="warning" title="This timeline is incomplete">
          {partial.join(', ')} could not be loaded. What is shown below is everything else —
          treat the record as partial until this resolves.
        </Banner>
      )}

      {events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nothing recorded yet"
          description="This patient has no encounters, notes, problems or prescriptions in this system. That is not the same as having no history elsewhere."
        />
      ) : (
        <>
          <ol className="relative space-y-2 border-l border-border-soft pl-5">
            {events.map((ev, i) => {
              const meta = KIND_META[ev.kind]
              const Icon = meta.icon
              return (
                <li
                  key={ev.id}
                  ref={(el) => { itemRefs.current[i] = el }}
                  tabIndex={i === cursor ? 0 : -1}
                  onFocus={() => setCursor(i)}
                  className="focus-ring relative rounded-lg"
                >
                  <span
                    aria-hidden="true"
                    className="absolute -left-[1.6875rem] top-3 h-2 w-2 rounded-full bg-border ring-4 ring-surface-0"
                  />
                  <Card padding="sm" className="clinical-row">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span
                        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs font-semibold ${meta.tone}`}
                      >
                        <Icon size={11} aria-hidden="true" />
                        {meta.label}
                      </span>
                      <time
                        dateTime={ev.at}
                        className="tabular-nums text-2xs text-ink-muted"
                      >
                        {formatDate(ev.at)} · {formatTime(ev.at)}
                      </time>
                      <span className="text-sm font-medium text-ink">{ev.title}</span>
                      {ev.href !== null && (
                        <Link
                          to={ev.href}
                          className="focus-ring ml-auto rounded text-2xs font-medium text-primary-700 underline underline-offset-2"
                        >
                          Open
                        </Link>
                      )}
                    </div>
                    {ev.detail !== null && ev.detail !== '' && (
                      <p className="mt-1 whitespace-pre-line text-sm text-ink-muted">{ev.detail}</p>
                    )}
                    {ev.meta !== null && (
                      <p className="mt-1 text-2xs text-ink-subtle">{ev.meta}</p>
                    )}
                  </Card>
                </li>
              )
            })}
          </ol>

          {/* The completeness statement. ARC-25: a timeline has to prove it is
              the whole thing, or a clinician cannot rely on an absence. */}
          <p className="border-t border-border-soft pt-3 text-xs text-ink-subtle">
            {events.length} event{events.length === 1 ? '' : 's'}
            {range !== null && (
              <>
                {' '}from {formatDate(range.from)} to {formatDate(range.to)}
              </>
            )}
            . This is the complete record held in this system — it does not include care given
            elsewhere.
          </p>
        </>
      )}
    </div>
  )
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded border border-border-soft bg-surface-2 px-1 font-mono text-2xs text-ink-muted">
      {children}
    </kbd>
  )
}
