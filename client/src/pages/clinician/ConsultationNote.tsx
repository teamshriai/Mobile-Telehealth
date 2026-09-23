import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, LayoutTemplate, Lock, Save, ShieldCheck } from 'lucide-react'
import { useEncounter } from './useEncounterRoute'
import { useAuth } from '../../app/useAuth'
import { useToast } from '../../components/common/useToast'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import Modal from '../../components/common/Modal'
import { Banner, ErrorState, LoadingState } from '../../components/feedback/States'
import { formatDate, formatTime } from '../../components/clinic/format'
import * as clinicalNoteService from '../../services/clinicalNote.service'
import * as templateService from '../../services/clinicalTemplate.service'
import type { ClinicalNote, ClinicalTemplate, QualityFinding } from '../../types/domain'
import type { ApiError } from '../../types/api'

/**
 * S-06-03 · Consultation Note (ARC-15 authoring, Compact) — the T1 screen.
 *
 * Four properties are not negotiable here:
 *
 *  1. **Typed clinical content is never lost.** Autosave every 20s with a
 *     visible timestamp (§5.7). The timestamp matters as much as the save:
 *     "saved" with no time is a claim a clinician cannot check.
 *  2. **A signed note is never edited** (CMP-NABH-10). Signing swaps the whole
 *     surface to LOCKED and an addendum becomes the only way to change
 *     anything — the fields do not stay editable-looking and then 409.
 *  3. **Signing depends on a capability, not a role.** Without
 *     `note:sign:own` the primary action reads "Submit for co-sign", because
 *     that is what will actually happen (see requiresCosign).
 *  4. **Validation on blur, never on keystroke.** The banned-abbreviation
 *     check (CMP-NABH-05) fires when a clinician leaves a field, so it never
 *     flags a half-typed word.
 *
 * AI: `AI-OFF`. There is no draft generation, no suggested assessment and no
 * `◆` affordance anywhere on this screen — absent, not greyed (§4.8). The
 * quality check below is a static word list, and runs identically either way.
 */

type SectionKey = 'subjective' | 'objective' | 'assessment' | 'plan'

const SECTIONS: Array<{ key: SectionKey; label: string; hint: string; rows: number }> = [
  { key: 'subjective', label: 'Subjective', hint: 'What the patient reports — history, symptoms, their own words.', rows: 5 },
  { key: 'objective', label: 'Objective', hint: 'Examination findings and measurements.', rows: 5 },
  { key: 'assessment', label: 'Assessment', hint: 'Your clinical impression.', rows: 4 },
  { key: 'plan', label: 'Plan', hint: 'Management, follow-up, and what the patient was told.', rows: 4 },
]

const AUTOSAVE_MS = 20_000

export default function ConsultationNote() {
  const { encounter, patient } = useEncounter()
  const { can } = useAuth()
  const toast = useToast()

  const [note, setNote] = useState<ClinicalNote | null>(null)
  const [loadError, setLoadError] = useState<ApiError | null>(null)
  const [draft, setDraft] = useState<Record<SectionKey, string>>({
    subjective: '', objective: '', assessment: '', plan: '',
  })
  const [problemText, setProblemText] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string>('')
  const [findings, setFindings] = useState<QualityFinding[]>([])
  const [confirmSign, setConfirmSign] = useState(false)
  const [addendumOpen, setAddendumOpen] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)

  // `can` reads the session's capability list. The role name is never
  // consulted — a Resident is simply a user without this capability.
  const canSignAlone = can('note:sign:own')

  const locked = note !== null && note.status !== 'Draft'

  /* ── Load or create the draft ─────────────────────────────────────────── */

  const load = useCallback(() => {
    setLoadError(null)
    clinicalNoteService
      .listNotes(patient.id)
      .then((notes) => {
        const forThis = notes.filter((n) => n.encounterId === encounter.id)
        // Prefer a draft to continue; otherwise show the signed note for this
        // encounter. Never silently create a SECOND note for an encounter
        // that already has one — duplicate notes for one visit is a
        // documentation defect, not a convenience.
        const existing = forThis.find((n) => n.status === 'Draft') ?? forThis[0] ?? null
        if (existing !== null) {
          setNote(existing)
          setDraft({
            subjective: existing.subjective ?? '',
            objective: existing.objective ?? '',
            assessment: existing.assessment ?? '',
            plan: existing.plan ?? '',
          })
          setProblemText(existing.problemText ?? '')
          setSavedAt(existing.updatedAt)
          return
        }
        return clinicalNoteService
          .createNote({
            patientId: patient.id,
            encounterId: encounter.id,
            problemText: encounter.chiefComplaint,
          })
          .then((created) => {
            setNote(created)
            setProblemText(created.problemText ?? '')
            setSavedAt(created.updatedAt)
          })
      })
      .catch((err: ApiError) => setLoadError(err))
  }, [patient.id, encounter.id, encounter.chiefComplaint])

  useEffect(load, [load])

  /* ── Saving ───────────────────────────────────────────────────────────── */

  // Held in a ref so the autosave interval can read the latest draft without
  // being torn down and rebuilt on every keystroke — a re-created interval
  // would reset its 20s clock each time and, on continuous typing, never fire.
  const latest = useRef({ draft, problemText, dirty, note, locked })
  latest.current = { draft, problemText, dirty, note, locked }

  const save = useCallback(
    async (opts: { silent?: boolean } = {}): Promise<boolean> => {
      const { draft: d, problemText: pt, note: n, locked: isLocked } = latest.current
      if (n === null || isLocked) return false
      setSaving(true)
      setSaveError('')
      try {
        const updated = await clinicalNoteService.updateNoteDraft(n.id, {
          subjective: d.subjective || null,
          objective: d.objective || null,
          assessment: d.assessment || null,
          plan: d.plan || null,
          problemText: pt || null,
        })
        setNote(updated)
        setSavedAt(updated.updatedAt)
        setDirty(false)
        if (opts.silent !== true) toast.notify('Note saved.', 'success')
        return true
      } catch (err) {
        // ⚠️ The typed text is NOT cleared or rolled back on a failed save.
        // The clinician keeps what they wrote and can copy it out — §1.5's
        // ERROR state requires the input survive the failure.
        setSaveError((err as ApiError).message || 'Could not save. Your text is still here.')
        return false
      } finally {
        setSaving(false)
      }
    },
    [toast],
  )

  useEffect(() => {
    const t = window.setInterval(() => {
      if (latest.current.dirty && !latest.current.locked) void save({ silent: true })
    }, AUTOSAVE_MS)
    return () => window.clearInterval(t)
  }, [save])

  // Last line of defence: a reload or tab close with unsaved text.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (latest.current.dirty && !latest.current.locked) e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  /* ── Keyboard: Alt+S save, Alt+Shift+S sign ───────────────────────────── */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.key.toLowerCase() !== 's') return
      e.preventDefault()
      if (latest.current.locked) return
      if (e.shiftKey) setConfirmSign(true)
      else void save()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [save])

  /* ── Quality check, on blur only ──────────────────────────────────────── */

  const runQualityCheck = useCallback(() => {
    const d = latest.current.draft
    if (Object.values(d).every((v) => v.trim() === '')) {
      setFindings([])
      return
    }
    clinicalNoteService
      .checkNoteQuality(d)
      .then(setFindings)
      // A failed quality check must never block documentation. Silent by
      // design: the rule is advisory, the note is not.
      .catch(() => undefined)
  }, [])

  /**
   * Insert a template's text into a section.
   *
   * ⚠️ APPENDS, never replaces. A template that overwrote what a clinician had
   * already typed would destroy clinical content to save them a paste, and the
   * one time it mattered would be the one time they had typed something
   * important first. The clinician can still delete what they do not want.
   */
  const insertTemplate = useCallback((template: ClinicalTemplate, section: SectionKey) => {
    setDraft((d) => {
      const existing = d[section].trimEnd()
      return { ...d, [section]: existing === '' ? template.body : `${existing}\n\n${template.body}` }
    })
    setDirty(true)
    setTemplateOpen(false)
    toast.notify(`Inserted "${template.name}".`, 'success')
  }, [toast])

  /* ── Sign ─────────────────────────────────────────────────────────────── */

  const [signing, setSigning] = useState(false)

  const doSign = async () => {
    setSigning(true)
    try {
      // Save first. Signing an unsaved draft would attest to text the server
      // has never seen.
      if (latest.current.dirty) {
        const ok = await save({ silent: true })
        if (!ok) { setSigning(false); return }
      }
      const signed = await clinicalNoteService.signNote((latest.current.note as ClinicalNote).id)
      setNote(signed)
      setConfirmSign(false)
      toast.notify(
        signed.status === 'CosignPending'
          ? 'Submitted for co-signature.'
          : 'Note signed. It is now part of the record.',
        'success',
      )
    } catch (err) {
      toast.notify((err as ApiError).message || 'Could not sign this note.', 'error')
    } finally {
      setSigning(false)
    }
  }

  const sectionFindings = useMemo(() => {
    const map: Partial<Record<SectionKey, QualityFinding[]>> = {}
    findings.forEach((f) => {
      const k = f.section as SectionKey
      map[k] = [...(map[k] ?? []), f]
    })
    return map
  }, [findings])

  if (loadError !== null) {
    return <ErrorState title="Could not open this note" description={loadError} onRetry={load} />
  }
  if (note === null) return <LoadingState label="Opening the note…" />

  return (
    <div className="space-y-4">
      {locked && <LockedBanner note={note} />}

      {saveError !== '' && (
        <Banner tone="error" title="Not saved">
          {saveError} Nothing you typed has been lost — copy it somewhere safe before navigating
          away if this keeps happening.
        </Banner>
      )}

      {findings.length > 0 && !locked && (
        <Banner tone="warning" title={`${findings.length} documentation issue${findings.length === 1 ? '' : 's'}`}>
          <ul className="mt-1 space-y-1">
            {findings.map((f, i) => (
              <li key={`${f.section}-${f.term}-${i}`}>
                <span className="font-mono font-semibold">{f.term}</span> in {f.section} — {f.risk}.
                Write <span className="font-semibold">{f.useInstead}</span> instead.
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-2xs">
            These are advisory. They do not block saving or signing.
          </p>
        </Banner>
      )}

      <Card padding="md">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border-soft pb-3">
          <h2 className="text-sm font-semibold text-ink">
            {locked ? 'Consultation note (read-only)' : 'Consultation note'}
          </h2>
          <SaveStatus saving={saving} dirty={dirty} savedAt={savedAt} locked={locked} />
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="note-reason" className="mb-1 block text-sm font-medium text-ink">
              Reason for this visit
            </label>
            <input
              id="note-reason"
              type="text"
              value={problemText}
              readOnly={locked}
              onChange={(e) => { setProblemText(e.target.value); setDirty(true) }}
              placeholder="e.g. Follow-up, hypothyroidism"
              className="focus-ring w-full rounded-lg border border-border-soft bg-surface-1 px-3 py-2 text-sm text-ink read-only:bg-surface-2 read-only:text-ink-muted"
            />
          </div>

          {SECTIONS.map((s) => (
            <NoteSection
              key={s.key}
              section={s}
              value={draft[s.key]}
              locked={locked}
              findings={sectionFindings[s.key] ?? []}
              onChange={(v) => { setDraft((d) => ({ ...d, [s.key]: v })); setDirty(true) }}
              onBlur={runQualityCheck}
            />
          ))}
        </div>

        {!locked && (
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border-soft pt-4">
            <Button
              onClick={() => setTemplateOpen(true)}
              variant="ghost"
              icon={<LayoutTemplate size={14} />}
            >
              Insert template
            </Button>
            <Button onClick={() => void save()} variant="secondary" loading={saving} icon={<Save size={14} />}>
              Save draft
            </Button>
            <Button onClick={() => setConfirmSign(true)} disabled={saving} icon={<ShieldCheck size={14} />}>
              {canSignAlone ? 'Sign note' : 'Submit for co-signature'}
            </Button>
            <span className="text-2xs text-ink-subtle">
              <Kbd>Alt</Kbd>+<Kbd>S</Kbd> save · <Kbd>Alt</Kbd>+<Kbd>Shift</Kbd>+<Kbd>S</Kbd>{' '}
              {canSignAlone ? 'sign' : 'submit'}
            </span>
            {!canSignAlone && (
              <p className="basis-full text-xs text-ink-muted">
                You do not hold signing rights, so this note will go to your consultant for
                counter-signature rather than entering the record directly.
              </p>
            )}
          </div>
        )}

        {/* Orders are M-09 and are not in this release. Stated, not drawn as a
            dead button — a control that looks live and does nothing is worse
            than an honest absence. */}
        <p className="mt-4 border-t border-border-soft pt-3 text-2xs text-ink-subtle">
          Ordering investigations from a note (module M-09) is not in this release. Prescribing is
          on the Prescription step.
        </p>
      </Card>

      <Addenda note={note} onAdd={() => setAddendumOpen(true)} locked={locked} />

      {confirmSign && (
        <ConfirmDialog
          open
          title={canSignAlone ? 'Sign this note?' : 'Submit for co-signature?'}
          consequence={
            canSignAlone
              ? 'Signing is permanent. The note becomes part of the legal record and can never be edited — only an addendum can be added, and it will carry your name and the time.'
              : 'The note is closed to further editing and sent to your consultant. If they return it you will be notified and can edit it again.'
          }
          confirmLabel={canSignAlone ? 'Sign note' : 'Submit'}
          confirmDisabled={signing}
          onConfirm={doSign}
          onCancel={() => setConfirmSign(false)}
        />
      )}

      {templateOpen && (
        <TemplatePicker onClose={() => setTemplateOpen(false)} onInsert={insertTemplate} />
      )}

      {addendumOpen && (
        <AddendumModal
          noteId={note.id}
          onClose={() => setAddendumOpen(false)}
          onAdded={(updated) => { setNote(updated); setAddendumOpen(false) }}
        />
      )}
    </div>
  )
}

/* ── Pieces ──────────────────────────────────────────────────────────────── */

function NoteSection({
  section, value, locked, findings, onChange, onBlur,
}: {
  section: { key: SectionKey; label: string; hint: string; rows: number }
  value: string
  locked: boolean
  findings: QualityFinding[]
  onChange: (v: string) => void
  onBlur: () => void
}) {
  const hintId = `${section.key}-hint`
  return (
    <div>
      <label htmlFor={section.key} className="mb-1 block text-sm font-medium text-ink">
        {section.label}
      </label>
      <p id={hintId} className="mb-1.5 text-2xs text-ink-subtle">{section.hint}</p>
      <textarea
        id={section.key}
        rows={section.rows}
        value={value}
        readOnly={locked}
        aria-describedby={hintId}
        aria-invalid={findings.length > 0 || undefined}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="focus-ring w-full resize-y rounded-lg border border-border-soft bg-surface-1 px-3 py-2 text-sm leading-relaxed text-ink read-only:bg-surface-2 read-only:text-ink-muted"
      />
      {findings.length > 0 && (
        <p className="mt-1 flex items-start gap-1 text-2xs text-warning-fg">
          <AlertTriangle size={11} aria-hidden="true" className="mt-0.5 shrink-0" />
          {findings.map((f) => f.term).join(', ')} — see the warning above.
        </p>
      )}
    </div>
  )
}

function SaveStatus({
  saving, dirty, savedAt, locked,
}: { saving: boolean; dirty: boolean; savedAt: string | null; locked: boolean }) {
  if (locked) return null
  // aria-live polite, never assertive: an announcement that interrupts
  // mid-sentence is itself a documentation hazard (§5.7).
  return (
    <p aria-live="polite" className="text-2xs text-ink-muted">
      {saving
        ? 'Saving…'
        : dirty
          ? 'Unsaved changes — autosaving within 20 seconds'
          : savedAt !== null
            ? `Saved ${formatDate(savedAt)} at ${formatTime(savedAt)}`
            : 'Not yet saved'}
    </p>
  )
}

function LockedBanner({ note }: { note: ClinicalNote }) {
  const pending = note.status === 'CosignPending'
  return (
    <div
      className={`rounded-xl border p-3 ${
        pending ? 'border-warning-fg/30 bg-warning-bg' : 'border-border-soft bg-surface-2'
      }`}
    >
      <div className="flex items-start gap-2">
        <Lock size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-muted" />
        <div className="text-sm">
          {pending ? (
            <>
              <p className="font-semibold text-warning-fg">Awaiting counter-signature</p>
              <p className="mt-0.5 text-warning-fg">
                This note is closed to editing and is in your consultant&rsquo;s co-sign queue. It
                is not yet part of the record.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-ink">Signed and locked</p>
              <p className="mt-0.5 text-ink-muted">
                {/* ⚠️ An attestation line must never read "Signed by unknown".
                    A signed note always carries its signer; if the name is
                    somehow absent, say what is true — the record is incomplete
                    — rather than asserting an unknown person signed it. */}
                Signed by {note.signerName ?? 'a clinician whose name was not recorded'}
                {note.signerRegistrationNumber !== null && ` (${note.signerRegistrationNumber})`}
                {note.signedAt !== null && ` on ${formatDate(note.signedAt)} at ${formatTime(note.signedAt)}`}.
                {note.cosignerName !== null && (
                  <> Counter-signed by {note.cosignerName}
                    {note.cosignerRegistrationNumber !== null && ` (${note.cosignerRegistrationNumber})`}
                    {note.cosignedAt !== null && ` on ${formatDate(note.cosignedAt)}`}.</>
                )}
              </p>
              <p className="mt-1 text-ink-muted">
                A signed note is never edited. Add an addendum below to record anything further.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Addenda({
  note, onAdd, locked,
}: { note: ClinicalNote; onAdd: () => void; locked: boolean }) {
  if (!locked && note.addenda.length === 0) return null
  return (
    <Card padding="md">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">
          Addenda {note.addenda.length > 0 && `(${note.addenda.length})`}
        </h2>
        {note.status === 'Signed' && (
          <Button onClick={onAdd} variant="secondary" size="sm">Add addendum</Button>
        )}
      </div>
      {note.addenda.length === 0 ? (
        <p className="text-sm text-ink-subtle">
          None. An addendum is the only way to add to a signed note, and is attributed and
          timestamped separately from the note itself.
        </p>
      ) : (
        <ol className="space-y-3">
          {note.addenda.map((a) => (
            <li key={a.id} className="border-l-2 border-border-soft pl-3">
              <p className="whitespace-pre-line text-sm text-ink">{a.body}</p>
              <p className="mt-1 text-2xs text-ink-subtle">
                {a.authorName}
                {a.authorRegistrationNumber !== null && ` (${a.authorRegistrationNumber})`} ·{' '}
                {formatDate(a.createdAt)} {formatTime(a.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}

function AddendumModal({
  noteId, onClose, onAdded,
}: { noteId: string; onClose: () => void; onAdded: (n: ClinicalNote) => void }) {
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (body.trim().length < 3) {
      setError('An addendum needs something in it.')
      return
    }
    setBusy(true)
    setError('')
    try {
      onAdded(await clinicalNoteService.amendNote(noteId, body.trim()))
    } catch (err) {
      setError((err as ApiError).message || 'Could not add the addendum.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Add an addendum">
      <div className="space-y-3">
        <p className="text-sm text-ink-muted">
          This is added to the signed note, not merged into it. It will carry your name,
          registration number and the current time, and it cannot be edited afterwards either.
        </p>
        <label htmlFor="addendum-body" className="block text-sm font-medium text-ink">
          Addendum
        </label>
        <textarea
          id="addendum-body"
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="focus-ring w-full resize-y rounded-lg border border-border-soft bg-surface-1 px-3 py-2 text-sm text-ink"
        />
        {error !== '' && <p role="alert" className="text-xs text-critical-fg">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => void submit()} loading={busy}>Add addendum</Button>
        </div>
      </div>
    </Modal>
  )
}

/**
 * Template picker. Deliberately makes the clinician choose the SECTION as well
 * as the template: a template body is prose, and dropping an examination
 * template into Plan because the picker guessed is how a note ends up saying
 * something its author did not mean.
 */
function TemplatePicker({
  onClose, onInsert,
}: {
  onClose: () => void
  onInsert: (t: ClinicalTemplate, section: SectionKey) => void
}) {
  const [templates, setTemplates] = useState<ClinicalTemplate[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [section, setSection] = useState<SectionKey>('plan')

  useEffect(() => {
    templateService.listTemplates().then(setTemplates).catch(setError)
  }, [])

  return (
    <Modal isOpen onClose={onClose} size="lg" title="Insert a template">
      <div className="space-y-3">
        <div>
          <label htmlFor="tpl-section" className="mb-1 block text-sm font-medium text-ink">
            Insert into
          </label>
          <select
            id="tpl-section"
            value={section}
            onChange={(e) => setSection(e.target.value as SectionKey)}
            className="focus-ring w-full rounded-lg border border-border-soft bg-surface-1 px-3 py-2 text-sm text-ink sm:max-w-xs"
          >
            {SECTIONS.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
          <p className="mt-1 text-2xs text-ink-subtle">
            The text is added to the end of that section. Nothing you have already written is
            replaced.
          </p>
        </div>

        {error !== null ? (
          <ErrorState title="Could not load templates" description={error} />
        ) : templates === null ? (
          <LoadingState label="Loading templates…" />
        ) : templates.length === 0 ? (
          <p className="text-sm text-ink-subtle">
            You have no templates yet. Create one under Templates.
          </p>
        ) : (
          <ul className="max-h-80 space-y-1.5 overflow-y-auto">
            {templates.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onInsert(t, section)}
                  className="focus-ring w-full rounded-lg border border-border-soft bg-surface-1 p-2.5 text-left hover:bg-surface-2"
                >
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-medium text-ink">{t.name}</span>
                    <span className="font-mono text-2xs text-ink-subtle">{t.key}</span>
                    <span className="ml-auto text-2xs text-ink-muted">{t.category}</span>
                  </span>
                  <span className="mt-1 block line-clamp-2 whitespace-pre-line text-2xs text-ink-muted">
                    {t.body}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  )
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded border border-border-soft bg-surface-2 px-1 font-mono text-2xs text-ink-muted">
      {children}
    </kbd>
  )
}
