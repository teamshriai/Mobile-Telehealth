import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, LayoutTemplate, Lock, Mic, Save, ShieldCheck } from 'lucide-react'
import { useEncounter } from './useEncounterRoute'
import DiagnosisCodePicker from '../../components/clinical/DiagnosisCodePicker'
import AmbientScribe from './AmbientScribe'
import ConfidenceBandChip from '../../ai/components/ConfidenceBand'
import { bandLabel } from '../../ai/confidence'
import { useAiMode } from '../../ai/useAi'
import type { ScribeDraft } from '../../ai/fixtures/scribe'
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
 *     flags a half-typed word. It also re-runs once more when the clinician
 *     asks to sign — see `openSign`. A check that only ever ran on blur meant
 *     a term typed and never blurred left `Sign` enabled and the server
 *     refused it; asking to sign is not a keystroke, so this keeps rule 4.
 *  5. **The screen never claims a rule is softer than the server enforces.**
 *     `CMP-NABH-05` is a hard block at sign time
 *     (`clinicalNote.service.ts` — "Unsafe abbreviations must be written out
 *     before signing"), and the atlas agrees: `S-06-03`'s Sign action is
 *     "enabled when … banned abbreviations cleared" (§6520). This screen used
 *     to print "These are advisory. They do not block saving or signing."
 *     directly above a live Sign button, so the clinician wrote the note,
 *     pressed Sign and met a 400 that contradicted what they had just read.
 *     ⚠️ Any future validation added here must gate the control **and** say so
 *     in the same breath.
 *
 * AI: `◆AI-101` ambient scribe and `◆AI-103` section drafts, both **G2** — a
 * drafted section is not in the note until it is dispositioned. Drafts render
 * as ghost text inside the field with a left accent rule (§6565: "not a side
 * card. That is the entire pitch"), each carrying its confidence band and the
 * transcript span it came from.
 *
 * ⚠️ The quality check is NOT part of that. It is a static word list evaluated
 * on the server and it runs identically with the fabric off — `CMP-NABH-05` is
 * a rule, not a model output, and nothing here may make it look like one.
 */

type SectionKey = 'subjective' | 'objective' | 'assessment' | 'plan'

const SECTIONS: Array<{ key: SectionKey; label: string; hint: string; rows: number }> = [
  { key: 'subjective', label: 'Subjective', hint: 'What the patient reports — history, symptoms, their own words.', rows: 5 },
  { key: 'objective', label: 'Objective', hint: 'Examination findings and measurements.', rows: 5 },
  { key: 'assessment', label: 'Assessment', hint: 'Your clinical impression.', rows: 4 },
  { key: 'plan', label: 'Plan', hint: 'Management, follow-up, and what the patient was told.', rows: 4 },
]

const AUTOSAVE_MS = 20_000

/**
 * ⚠️ The server labels a finding's section with a CAPITALISED name
 * ("Subjective"), while `SectionKey` is lowercase. Bucketing on the raw label
 * therefore never matched, every `NoteSection` received an empty array, and the
 * per-section warning plus its `aria-invalid` were dead code that looked
 * implemented. Normalise, and drop a label that is not one of the four rather
 * than filing it into a bucket nothing reads.
 */
const SECTION_KEYS = new Set<string>(SECTIONS.map((s) => s.key))

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
  // The coded diagnosis. `problemText` stays as the free-text reason — the two
  // are different facts and the server stores both.
  const [problemCode, setProblemCode] = useState('')
  const [codeQuery, setCodeQuery] = useState('')
  const [codeError, setCodeError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string>('')
  const [findings, setFindings] = useState<QualityFinding[]>([])
  const [confirmSign, setConfirmSign] = useState(false)
  const [addendumOpen, setAddendumOpen] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [scribeOpen, setScribeOpen] = useState(false)
  /**
   * Sections the scribe has drafted but the clinician has not yet dispositioned.
   *
   * ⚠️ G2 (§4.4): "Accept / Edit / Reject **before the value is committed**".
   * These live apart from `draft` on purpose — while a section is in here it is
   * rendered as ghost text and is NOT part of the note. Accepting is the only
   * thing that writes it, which is also why an undispositioned draft can never
   * be autosaved into the record by accident.
   */
  const [pendingDrafts, setPendingDrafts] = useState<ScribeDraft[]>([])
  const { mode: aiMode } = useAiMode()

  // `can` reads the session's capability list. The role name is never
  // consulted — a Resident is simply a user without this capability.
  const canSignAlone = can('note:sign:own')

  const locked = note !== null && note.status !== 'Draft'

  /* ── What stops this note being signed ────────────────────────────────────
   *
   * ⚠️ THE ORDER HERE MIRRORS THE SERVER'S, and that is not cosmetic. The
   * server checks completeness first and abbreviations second; if the client
   * reported them the other way round it would name a reason the server would
   * never have reached, and fixing that reason would not unblock anything.
   *
   * ⚠️ ASSESSMENT AND PLAN ONLY. The atlas marks all four sections required,
   * but the server requires only these two — so gating on all four would
   * refuse notes the server would accept, which is a different kind of lying
   * to the clinician. If the rule should tighten, it tightens on the server
   * first and this follows.
   *
   * ⚠️ Trimmed, because the server trims. `save()` persists `|| null`, so a
   * whitespace-only section reaches the server as whitespace and fails its
   * `.trim()` check; measuring untrimmed here would show a green button for a
   * note the server refuses.
   */
  const missingSections = SECTIONS.filter(
    (s) => (s.key === 'assessment' || s.key === 'plan') && draft[s.key].trim() === '',
  ).map((s) => s.label)

  const signVerb = canSignAlone ? 'signing' : 'submitting'
  /**
   * ⚠️ THE G2 RULE, AND IT IS LAST ON PURPOSE. §4.4: "the page's primary action
   * stays disabled until every G2 item has a disposition". It sits after the
   * server's two rules because those are the ones that would actually refuse
   * the request — naming an undispositioned draft while the note is also
   * incomplete would send the clinician to fix the wrong thing.
   *
   * ⚠️ Deadlock is the risk this creates: a draft that is registered but never
   * rendered would disable Sign forever. It cannot happen here because the
   * pending list IS the render list — the ghost text and the lock read the same
   * array, so an invisible pending item is not expressible.
   */
  // ⚠️ If the sections that are missing are exactly the ones sitting drafted in
  // front of the clinician, telling them to "complete Assessment and Plan" sends
  // them to type something that is already on screen. Name the real next action.
  const missingButDrafted = missingSections.filter((label) =>
    pendingDrafts.some((d) => d.section === label.toLowerCase()),
  )

  const signBlockedReason: string | null =
    missingSections.length > 0
      ? missingButDrafted.length === missingSections.length
        ? `Accept or reject the drafted ${missingSections.join(' and ')} before ${signVerb}.`
        : `Complete ${missingSections.join(' and ')} before ${signVerb}.`
      : findings.length > 0
        ? `Write out ${[...new Set(findings.map((f) => f.term))].join(', ')} before ${signVerb}.`
        : pendingDrafts.length > 0
          ? `Accept or reject the drafted ${pendingDrafts
              .map((d) => d.section)
              .join(', ')} before ${signVerb}.`
          : null

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
          setProblemCode(existing.problemCode ?? '')
          setCodeQuery(existing.problemCode ?? '')
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
            setProblemCode(created.problemCode ?? '')
            setCodeQuery(created.problemCode ?? '')
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
  //
  // ⚠️ ANYTHING A TIMER OR A KEYBOARD HANDLER MUST SEE BELONGS HERE. `findings`
  // and `missingSections` are in it because Alt+Shift+S has to be gated by the
  // same rules as the button — gating only the button leaves a second, unguarded
  // route to the signature.
  const latest = useRef({ draft, problemText, problemCode, dirty, note, locked, findings, missingSections })
  latest.current = { draft, problemText, problemCode, dirty, note, locked, findings, missingSections }

  const save = useCallback(
    async (opts: { silent?: boolean } = {}): Promise<boolean> => {
      const { draft: d, problemText: pt, problemCode: pc, note: n, locked: isLocked } = latest.current
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
          problemCode: pc || null,
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
      // Same gate as the button — see `openSign`.
      if (e.shiftKey) void openSignRef.current()
      else void save()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [save])

  /* ── Quality check, on blur only ──────────────────────────────────────── */

  const runQualityCheck = useCallback(async (): Promise<QualityFinding[]> => {
    const d = latest.current.draft
    if (Object.values(d).every((v) => v.trim() === '')) {
      setFindings([])
      return []
    }
    try {
      const next = await clinicalNoteService.checkNoteQuality(d)
      setFindings(next)
      return next
    } catch {
      // ⚠️ A failed check returns the findings we already had, NOT an empty
      // list. Returning [] would let an unreachable endpoint quietly unblock
      // the Sign button, and the clinician would meet the server's refusal
      // instead — which is the exact failure this whole change exists to
      // remove. Documentation itself is never blocked: saving is untouched.
      return latest.current.findings
    }
  }, [])

  /**
   * The only route to the sign dialog.
   *
   * ⚠️ IT RE-RUNS THE CHECK FIRST. Findings otherwise reflect the last blur,
   * and both stale directions are wrong: a banned term typed and never blurred
   * would leave Sign enabled (and the server would refuse it), while a term
   * corrected and never blurred would leave Sign stuck on a problem that no
   * longer exists.
   */
  const openSign = useCallback(async () => {
    if (latest.current.locked) return
    if (latest.current.missingSections.length > 0) return
    const next = await runQualityCheck()
    if (next.length === 0) setConfirmSign(true)
  }, [runQualityCheck])

  // The Alt+Shift+S effect is registered above this point and must not
  // re-subscribe whenever `openSign` is re-created. Same reasoning as `latest`.
  const openSignRef = useRef(openSign)
  openSignRef.current = openSign

  const dispositionDraft = useCallback(
    (section: SectionKey, action: 'accept' | 'edit' | 'reject') => {
      const d = pendingDrafts.find((x) => x.section === section)
      if (d === undefined) return
      if (action !== 'reject') {
        // Appended, never replacing. A clinician who has already typed
        // something has said more than the scribe heard, and silently
        // overwriting it would be the worst thing this feature could do.
        setDraft((prev) => ({
          ...prev,
          [section]: prev[section].trim() === '' ? d.text : `${prev[section].trim()}\n\n${d.text}`,
        }))
        setDirty(true)
      }
      setPendingDrafts((prev) => prev.filter((x) => x.section !== section))
      if (action === 'edit') {
        window.setTimeout(() => document.getElementById(section)?.focus(), 0)
      }
    },
    [pendingDrafts],
  )

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
      // See SECTION_KEYS — the wire label is capitalised, the key is not.
      const k = f.section.toLowerCase()
      if (!SECTION_KEYS.has(k)) return
      const key = k as SectionKey
      map[key] = [...(map[key] ?? []), f]
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
          {/* ⚠️ This used to read "These are advisory. They do not block saving
              or signing." It was false: the server refuses the signature on
              exactly these findings (CMP-NABH-05). See rule 5 in the header. */}
          <p className="mt-1.5 text-2xs">
            {canSignAlone ? 'Signing' : 'Submitting'} stays unavailable until these are written
            out. Saving and autosave are unaffected — nothing you have typed is at risk.
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

          {/* ── Atlas field 3 · the coded diagnosis ──────────────────────────
              ⚠️ `ClinicalNote.problemCode` existed in the schema, in both
              validators and in the client payload type, and NO screen had ever
              written it — the column was dead. The atlas specifies this field
              as a typeahead with leaf-only validation; the free-text reason
              above is not a substitute for it and does not replace it, because
              "why they came" and "what it is coded as" are different facts.

              ⚠️ Optional here, unlike on the problem list. Coding a note is not
              the same act as adding to the patient's problem list, and forcing
              a code before a clinician has formed an impression would push them
              to pick something wrong to get past the field. The server accepts
              a null code and rejects a bad one. */}
          {locked ? (
            <div>
              <p className="mb-1 block text-sm font-medium text-ink">Coded diagnosis</p>
              <p className="rounded-lg bg-surface-2 px-3 py-2 font-mono text-sm text-ink-muted">
                {problemCode === '' ? 'Not coded' : problemCode}
              </p>
            </div>
          ) : (
            <div>
              <DiagnosisCodePicker
                label="Coded diagnosis (ICD-10)"
                value={codeQuery}
                onValueChange={(v) => { setCodeQuery(v); setProblemCode(''); setCodeError('') }}
                onPick={(c) => {
                  setProblemCode(c.code)
                  setCodeQuery(`${c.code} — ${c.title}`)
                  setCodeError('')
                  setDirty(true)
                }}
                onReject={setCodeError}
              />
              {codeError !== '' && (
                <p role="alert" className="mt-1 text-xs text-critical-fg">{codeError}</p>
              )}
              <p className="mt-1 text-2xs text-ink-subtle">
                Optional. Coding here does not add the diagnosis to the patient&rsquo;s problem
                list — use Problems &amp; coding for that.
              </p>
            </div>
          )}

          {SECTIONS.map((s) => (
            <NoteSection
              key={s.key}
              section={s}
              value={draft[s.key]}
              locked={locked}
              findings={sectionFindings[s.key] ?? []}
              onChange={(v) => { setDraft((d) => ({ ...d, [s.key]: v })); setDirty(true) }}
              onBlur={() => void runQualityCheck()}
              draft={pendingDrafts.find((d) => d.section === s.key) ?? null}
              onAcceptDraft={() => dispositionDraft(s.key, 'accept')}
              onEditDraft={() => dispositionDraft(s.key, 'edit')}
              onRejectDraft={() => dispositionDraft(s.key, 'reject')}
            />
          ))}
        </div>

        {!locked && (
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border-soft pt-4">
            {/* ◆AI-101. Hidden entirely when the fabric is off (§4.8) — a
                greyed Dictate button advertises a feature the clinician cannot
                have, and the note is fully writable without it. */}
            {aiMode !== 'off' && (
              <Button
                onClick={() => setScribeOpen(true)}
                variant="ghost"
                icon={<Mic size={14} />}
              >
                Dictate
              </Button>
            )}
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
            <Button
              onClick={() => void openSign()}
              disabled={saving || signBlockedReason !== null}
              icon={<ShieldCheck size={14} />}
            >
              {canSignAlone ? 'Sign note' : 'Submit for co-signature'}
            </Button>
            {/* ⚠️ Why the primary is unavailable, next to the primary. A
                disabled button with the reason somewhere else up the page is
                how a clinician ends up clicking it repeatedly. `Button` takes
                no `title`, so this is a sibling line rather than a tooltip —
                which is better anyway: a tooltip is invisible on a ward
                tablet. */}
            {signBlockedReason !== null && (
              <p role="status" className="basis-full text-xs font-medium text-warning-fg">
                {signBlockedReason}
              </p>
            )}
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

      {/* S-06-04 — an overlay over this screen, per §6585. The note stays
          mounted and fully editable underneath: dictation is never the only
          input path (§6630). */}
      <AmbientScribe
        open={scribeOpen}
        onClose={() => setScribeOpen(false)}
        patientName={`${patient.firstName} ${patient.lastName}`.trim()}
        onAccept={(ds) => setPendingDrafts([...ds])}
      />

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
  draft, onAcceptDraft, onEditDraft, onRejectDraft,
}: {
  section: { key: SectionKey; label: string; hint: string; rows: number }
  value: string
  locked: boolean
  findings: QualityFinding[]
  onChange: (v: string) => void
  onBlur: () => void
  /** The AI draft awaiting a disposition, or null. */
  draft: ScribeDraft | null
  onAcceptDraft: () => void
  onEditDraft: () => void
  onRejectDraft: () => void
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
        // ⚠️ Shrunk while an undispositioned draft is showing and the field is
        // empty. A full-height empty box above the draft makes the draft look
        // like an afterthought parked below the field; the point of §6565 is
        // that it reads as the note's content.
        rows={draft !== null && value.trim() === '' ? 2 : section.rows}
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

      {/* ── ◆AI-101/AI-103 · the drafted section ──────────────────────────────
          ⚠️ GHOST TEXT INSIDE THE NOTE, NOT A SIDE CARD. §6565 is unusually
          blunt about this — "85% opacity with a left accent rule — not a side
          card. That is the entire pitch." A draft in a panel beside the note is
          something to copy across; a draft in the field is something to correct.
          The difference is the whole product claim.

          ⚠️ G2: it is not in the note until it is dispositioned. `value` is
          untouched while this is showing — accepting is what writes it. */}
      {draft !== null && !locked && (
        <section
          role="region"
          aria-label={`AI draft for ${section.label} · ${bandLabel(draft.band)}`}
          className="mt-1.5 border-l-2 border-ai pl-3"
        >
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink opacity-85">
            {draft.text}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <ConfidenceBandChip band={draft.band} />
            <button
              type="button"
              onClick={onAcceptDraft}
              className="focus-ring rounded text-2xs font-semibold text-primary-700 underline underline-offset-2"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={onEditDraft}
              className="focus-ring rounded text-2xs font-medium text-primary-700 underline underline-offset-2"
            >
              Accept &amp; edit
            </button>
            <button
              type="button"
              onClick={onRejectDraft}
              className="focus-ring rounded text-2xs font-medium text-ink-muted underline underline-offset-2"
            >
              Reject
            </button>
          </div>
        </section>
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
