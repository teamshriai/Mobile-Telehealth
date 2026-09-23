import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LayoutTemplate, Plus, Search } from 'lucide-react'
import { usePatientContext } from '../../app/usePatientContext'
import { useAuth } from '../../app/useAuth'
import { useToast } from '../../components/common/useToast'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import DataTable, { type Column } from '../../components/common/DataTable'
import { Banner, EmptyState, ErrorState, LoadingState } from '../../components/feedback/States'
import { formatDate } from '../../components/clinic/format'
import * as templateService from '../../services/clinicalTemplate.service'
import type { ClinicalTemplate } from '../../types/domain'
import type { ApiError } from '../../types/api'

/**
 * S-06-10 · Template & Order-Set Manager (ARC-18, Compact).
 *
 * Templates are effective-dated rather than versioned in place, because a note
 * written last March was written from March's template and the record has to
 * stay explicable. Nothing here edits a template that is already in force —
 * saving creates a new effective period.
 *
 * ⚠️ **Read-only below 768px.** Authoring a template on a phone is how a typo
 * reaches every note in the department. The atlas makes this an explicit
 * responsive rule and it is enforced here, with the reason stated rather than
 * the buttons silently missing.
 *
 * Facility-wide promotion is requested, never taken: a personal template
 * becomes departmental only after review.
 */

export default function TemplateManager() {
  const { setPatient } = usePatientContext()
  const { can } = useAuth()
  const toast = useToast()

  const [templates, setTemplates] = useState<ClinicalTemplate[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<ClinicalTemplate | 'new' | null>(null)
  const [narrow, setNarrow] = useState(() => window.innerWidth < 768)
  const searchRef = useRef<HTMLInputElement>(null)

  const canManage = can('template:manage:own')

  useEffect(() => { setPatient(null) }, [setPatient])

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const load = useCallback(() => {
    setError(null)
    templateService.listTemplates().then(setTemplates).catch(setError)
  }, [])
  useEffect(load, [load])

  const editable = canManage && !narrow

  // `/` focuses search, `n` starts a new template — both standard on an
  // ARC-18 manager, both skipped while the clinician is already in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus() }
      if (e.key === 'n' && editable) { e.preventDefault(); setEditing('new') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editable])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (templates === null) return []
    if (q === '') return templates
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.key.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q),
    )
  }, [templates, query])

  const columns = useMemo<Array<Column<ClinicalTemplate>>>(
    () => [
      {
        key: 'name', header: 'Template', card: 'title',
        sortValue: (r) => r.name,
        render: (r) => (
          <div>
            <span className="font-medium text-ink">{r.name}</span>
            <p className="font-mono text-2xs text-ink-subtle">{r.key}</p>
          </div>
        ),
      },
      {
        key: 'scope', header: 'Scope', card: 'subtitle',
        sortValue: (r) => r.scope,
        render: (r) => (
          <span
            className={`inline-flex rounded px-1.5 py-0.5 text-2xs font-semibold ${
              r.scope === 'Facility' ? 'bg-info-bg text-info-fg' : 'bg-surface-2 text-ink-muted'
            }`}
          >
            {r.scope === 'Facility' ? 'Facility-wide' : 'Personal'}
          </span>
        ),
      },
      {
        key: 'category', header: 'Category', card: 'meta', hideBelow: 'lg',
        sortValue: (r) => r.category,
        render: (r) => <span className="text-ink-muted">{r.category}</span>,
      },
      {
        key: 'effective', header: 'In force from', card: 'meta',
        sortValue: (r) => r.effectiveFrom,
        render: (r) => (
          <span className="tabular-nums text-ink-muted">
            {formatDate(r.effectiveFrom)}
            {r.effectiveTo !== null && ` → ${formatDate(r.effectiveTo)}`}
          </span>
        ),
      },
      {
        key: 'review', header: 'Review due', card: 'meta', hideBelow: 'xl',
        sortValue: (r) => r.reviewDueAt ?? '',
        render: (r) =>
          r.reviewDueAt === null ? (
            <span className="text-ink-subtle">—</span>
          ) : (
            <span
              className={`tabular-nums ${
                new Date(r.reviewDueAt) < new Date() ? 'font-semibold text-warning-fg' : 'text-ink-muted'
              }`}
            >
              {formatDate(r.reviewDueAt)}
              {new Date(r.reviewDueAt) < new Date() && ' · overdue'}
            </span>
          ),
      },
    ],
    [],
  )

  if (error !== null) {
    return <ErrorState title="Could not load templates" description={error} onRetry={load} />
  }
  if (templates === null) return <LoadingState label="Loading templates…" />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Templates</h1>
          <p className="mt-0.5 text-xs text-ink-muted">
            Your note templates and order sets, plus the ones your department has adopted.
          </p>
        </div>
        {editable && (
          <Button onClick={() => setEditing('new')} size="sm" icon={<Plus size={14} />}>
            New template
          </Button>
        )}
      </div>

      {narrow && canManage && (
        <Banner tone="info">
          Templates are read-only on a small screen. A template is used by every note written from
          it, so editing one is done at a desk rather than one-handed in a corridor.
        </Banner>
      )}

      <div className="relative">
        <Search
          size={15} aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle"
        />
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search templates — press / to focus"
          aria-label="Search templates"
          className="focus-ring w-full rounded-lg border border-border-soft bg-surface-1 py-2 pl-9 pr-3 text-sm text-ink"
        />
      </div>

      <DataTable
        caption="Clinical templates and order sets"
        rows={filtered}
        columns={columns}
        rowKey={(r) => r.id}
        onRowActivate={(r) => setEditing(r)}
        emptyState={
          <EmptyState
            icon={LayoutTemplate}
            title={query === '' ? 'No templates yet' : 'No templates match'}
            description={
              query === ''
                ? 'A template saves you retyping the structure of a note you write often. Create one and it appears here.'
                : 'Try a shorter search, or clear it to see everything.'
            }
          />
        }
      />

      {editing !== null && (
        <TemplateEditor
          template={editing === 'new' ? null : editing}
          readOnly={!editable}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); toast.notify('Template saved.', 'success') }}
          onPromotionRequested={() => {
            setEditing(null); load()
            toast.notify('Promotion requested. It stays personal until it is reviewed.', 'success')
          }}
        />
      )}
    </div>
  )
}

function TemplateEditor({
  template, readOnly, onClose, onSaved, onPromotionRequested,
}: {
  template: ClinicalTemplate | null
  readOnly: boolean
  onClose: () => void
  onSaved: () => void
  onPromotionRequested: () => void
}) {
  const [name, setName] = useState(template?.name ?? '')
  const [key, setKey] = useState(template?.key ?? '')
  const [category, setCategory] = useState(template?.category ?? 'Consultation')
  const [body, setBody] = useState(template?.body ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (name.trim() === '' || key.trim() === '' || body.trim() === '') {
      setError('A template needs a name, a key and some content.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await templateService.saveTemplate({
        key: key.trim(), name: name.trim(), category, body,
      })
      onSaved()
    } catch (err) {
      setError((err as ApiError).message || 'Could not save this template.')
    } finally {
      setBusy(false)
    }
  }

  const promote = async () => {
    if (template === null) return
    setBusy(true)
    try {
      await templateService.requestPromotion(template.id)
      onPromotionRequested()
    } catch (err) {
      setError((err as ApiError).message || 'Could not request promotion.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="lg"
      title={template === null ? 'New template' : template.name}
      subtitle={
        template === null
          ? 'Saving creates a template effective from today.'
          : `In force from ${formatDate(template.effectiveFrom)}. Saving creates a new effective period rather than editing this one.`
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="tpl-name" className="mb-1 block text-sm font-medium text-ink">Name</label>
            <input
              id="tpl-name" type="text" value={name} readOnly={readOnly}
              onChange={(e) => setName(e.target.value)}
              className="focus-ring w-full rounded-lg border border-border-soft bg-surface-1 px-3 py-2 text-sm text-ink read-only:bg-surface-2"
            />
          </div>
          <div>
            <label htmlFor="tpl-key" className="mb-1 block text-sm font-medium text-ink">Key</label>
            <input
              id="tpl-key" type="text" value={key} readOnly={readOnly || template !== null}
              onChange={(e) => setKey(e.target.value)}
              placeholder="e.g. OS.CAP-ADULT"
              className="focus-ring w-full rounded-lg border border-border-soft bg-surface-1 px-3 py-2 font-mono text-sm text-ink read-only:bg-surface-2"
            />
            {template !== null && (
              <p className="mt-1 text-2xs text-ink-subtle">
                The key is how notes written from this template refer to it, so it never changes.
              </p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="tpl-cat" className="mb-1 block text-sm font-medium text-ink">Category</label>
          <select
            id="tpl-cat" value={category} disabled={readOnly}
            onChange={(e) => setCategory(e.target.value)}
            className="focus-ring w-full rounded-lg border border-border-soft bg-surface-1 px-3 py-2 text-sm text-ink disabled:bg-surface-2 sm:max-w-xs"
          >
            {['Consultation', 'Order set', 'Discharge', 'Procedure', 'Follow-up'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="tpl-body" className="mb-1 block text-sm font-medium text-ink">Content</label>
          <textarea
            id="tpl-body" rows={12} value={body} readOnly={readOnly}
            onChange={(e) => setBody(e.target.value)}
            className="focus-ring w-full resize-y rounded-lg border border-border-soft bg-surface-1 px-3 py-2 font-mono text-xs leading-relaxed text-ink read-only:bg-surface-2"
          />
        </div>

        {template !== null && (
          <p className="text-2xs text-ink-subtle">
            Owned by {template.ownerName} · {template.scope === 'Facility' ? 'Facility-wide' : 'Personal'}
            {template.promotionRequestedAt !== null && template.promotedAt === null &&
              ' · promotion requested, awaiting review'}
            {template.reviewDueAt !== null && ` · review due ${formatDate(template.reviewDueAt)}`}
          </p>
        )}

        {error !== '' && <Banner tone="error">{error}</Banner>}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</Button>
          {!readOnly && template !== null && template.scope === 'Personal' &&
            template.promotionRequestedAt === null && (
              <Button variant="secondary" onClick={() => void promote()} disabled={busy}>
                Request facility-wide adoption
              </Button>
            )}
          {!readOnly && (
            <Button onClick={() => void save()} loading={busy}>
              {template === null ? 'Create template' : 'Save as new version'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
