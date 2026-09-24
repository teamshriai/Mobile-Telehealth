import { useEffect, useState } from 'react'
import Combobox from '../common/Combobox'
import * as problemService from '../../services/problem.service'
import type { DiagnosisCode } from '../../types/domain'

/**
 * The ICD-10 diagnosis typeahead, shared by `S-06-05` and `S-06-03`.
 *
 * ⚠️ MOVED OUT OF `ProblemList`, NOT COPIED FROM IT. Two copies of a code
 * picker means two places where the leaf rule can be forgotten, and the leaf
 * rule is the point: a category like `J18` is not a diagnosis, and a record
 * coded to one is a claim that will be rejected and a problem list that cannot
 * be reasoned about. There is one implementation.
 *
 * ⚠️ THE CLIENT RULE IS A CONVENIENCE, NOT A CONTROL. The same check exists in
 * `problemService.add` and — since this picker reached the consultation note —
 * in `clinicalNoteService.create/update`. This one exists so the clinician
 * learns the rule while choosing, rather than after submitting.
 *
 * ⚠️ ICD-10 ONLY, AND IT SAYS SO. `UI_ATLAS` §6660 describes this typeahead as
 * SNOMED, and `AI-501` claims ICD-10 + ICD-11 + SNOMED. The deployed
 * terminology pack contains neither: it is ICD-10, and small. §CMP-INTL-03
 * treats terminology bindings as *configuration, not code* — "a pack change
 * re-binds without a release" — so this is a missing pack, not a missing
 * feature. The label names what is actually loaded; it must not imply breadth
 * the catalogue does not have.
 *
 * ⚠️ The input is never disabled while a query is in flight — `ARC-17` forbids
 * it, and a clinician typing a code should never have characters swallowed by
 * a network round-trip.
 */

interface DiagnosisCodePickerProps {
  /** The visible text. The parent owns it so it can echo `CODE — Title` on pick. */
  value: string
  onValueChange: (v: string) => void
  /** Called only with a code that passed the leaf and duplicate rules. */
  onPick: (code: DiagnosisCode) => void
  /** Called with the refusal to render — the parent decides where it appears. */
  onReject: (message: string) => void
  /**
   * Codes already on the patient's active problem list. Selecting one is
   * refused. Empty on the note screen, where coding the note does not add to
   * the problem list and a repeat is not a duplicate.
   */
  activeCodes?: ReadonlySet<string>
  label?: string
}

export default function DiagnosisCodePicker({
  value,
  onValueChange,
  onPick,
  onReject,
  activeCodes,
  label = 'ICD-10 code or diagnosis',
}: DiagnosisCodePickerProps) {
  const [codes, setCodes] = useState<DiagnosisCode[]>([])
  const [searching, setSearching] = useState(false)
  const active = activeCodes ?? new Set<string>()

  useEffect(() => {
    const q = value.trim()
    if (q.length < 2) {
      setCodes([])
      return undefined
    }
    const t = window.setTimeout(() => {
      setSearching(true)
      problemService
        .searchDiagnosisCodes(q)
        .then(setCodes)
        .catch(() => setCodes([]))
        .finally(() => setSearching(false))
    }, 250)
    return () => window.clearTimeout(t)
  }, [value])

  return (
    <Combobox<DiagnosisCode>
      label={label}
      value={value}
      onValueChange={onValueChange}
      options={codes}
      optionKey={(c) => c.code}
      loading={searching}
      placeholder="Start typing, e.g. pneumonia or J18"
      hint="Only specific codes can be selected. Categories are shown for context but cannot be coded."
      emptyMessage={value.trim().length < 2 ? 'Type at least two characters.' : 'No matching codes.'}
      onSelect={(c) => {
        // ⚠️ Leaf first, then duplicate — the same order as the server, so the
        // clinician is never told about the second problem while the first
        // still stands.
        if (!c.isLeaf) {
          onReject(`${c.code} is a category, not a diagnosis. Choose one of the codes beneath it.`)
          return
        }
        if (active.has(c.code)) {
          onReject(`${c.code} is already on the active problem list.`)
          return
        }
        onPick(c)
      }}
      renderOption={(c) => (
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-2xs text-ink-muted">{c.code}</span>
          <span className={c.isLeaf ? 'text-ink' : 'text-ink-subtle'}>{c.title}</span>
          {/* Categories are SHOWN, not hidden: seeing where a code sits in the
              tree is how a clinician finds the specific one beneath it. */}
          {!c.isLeaf && (
            <span className="ml-auto rounded bg-surface-2 px-1 text-2xs text-ink-subtle">
              Category — not codable
            </span>
          )}
          {c.isLeaf && active.has(c.code) && (
            <span className="ml-auto rounded bg-warning-bg px-1 text-2xs text-warning-fg">
              Already active
            </span>
          )}
        </div>
      )}
    />
  )
}
