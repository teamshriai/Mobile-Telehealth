import { useCallback, useEffect, useState } from 'react'
import { MessageSquareText, Printer } from 'lucide-react'
import { useEncounter } from './useEncounterRoute'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import { Banner, EmptyState, ErrorState, LoadingState } from '../../components/feedback/States'
import { formatDate, formatTime } from '../../components/clinic/format'
import { useToast } from '../../components/common/useToast'
import * as templateService from '../../services/clinicalTemplate.service'
import type { PatientInstruction } from '../../types/domain'
import type { ApiError } from '../../types/api'

/**
 * S-06-08 · Patient Instructions (ARC-15, **Comfortable** density).
 *
 * ⚠️ The only screen in M-06 that is NOT compact, and the reason is in the
 * data-density attribute below rather than in a stylesheet: this is the one
 * clinician screen whose output a patient reads. It is frequently turned
 * around and shown to the person it is about — often someone older, often in
 * a corridor, often without their glasses. Compact 13px type is the wrong
 * choice for that, so this subtree overrides the clinician shell's density.
 *
 * Language is the PATIENT's, not the clinician's (CMP-DPDP-02). Instructions
 * written in a language the reader does not have are not instructions.
 *
 * AI: `AI-OFF`. There is no "simplify this text" or "translate" affordance,
 * because there is nothing behind one. The field is a plain textarea and the
 * clinician writes the words.
 */

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ta', label: 'Tamil — தமிழ்' },
  { code: 'hi', label: 'Hindi — हिन्दी' },
  { code: 'ml', label: 'Malayalam — മലയാളം' },
  { code: 'te', label: 'Telugu — తెలుగు' },
  { code: 'kn', label: 'Kannada — ಕನ್ನಡ' },
]

export default function PatientInstructions() {
  const { patient, encounter } = useEncounter()
  const toast = useToast()

  const [issued, setIssued] = useState<PatientInstruction[] | null>(null)
  const [loadError, setLoadError] = useState<ApiError | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [language, setLanguage] = useState('en')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoadError(null)
    templateService.listInstructions(patient.id).then(setIssued).catch(setLoadError)
  }, [patient.id])
  useEffect(load, [load])

  const issue = async () => {
    if (title.trim() === '' || body.trim().length < 10) {
      setError('Give the instructions a title and at least a sentence of content.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await templateService.issueInstructions({
        patientId: patient.id,
        encounterId: encounter.id,
        title: title.trim(),
        body: body.trim(),
        language,
      })
      setTitle(''); setBody('')
      toast.notify('Instructions issued to the patient.', 'success')
      load()
    } catch (err) {
      setError((err as ApiError).message || 'Could not issue these instructions.')
    } finally {
      setBusy(false)
    }
  }

  if (loadError !== null) {
    return <ErrorState title="Could not load instructions" description={loadError} onRetry={load} />
  }
  if (issued === null) return <LoadingState label="Loading instructions…" />

  return (
    // Comfortable density: 40px rows, 14px type. Scoped to this subtree only.
    <div data-density="comfortable" className="space-y-5">
      <Banner tone="info">
        These are written for the patient to read, not for the record. Use plain words, name the
        medicine and the reason, and say what to do if things get worse.
      </Banner>

      <Card padding="lg" className="print:hidden">
        <h2 className="mb-4 text-base font-semibold text-ink">Write instructions</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="instr-title" className="mb-1.5 block text-sm font-medium text-ink">
              Title
            </label>
            <input
              id="instr-title" type="text" value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Going home after today's visit"
              className="focus-ring w-full rounded-lg border border-border-soft bg-surface-1 px-3 py-2.5 text-base text-ink"
            />
          </div>

          <div>
            <label htmlFor="instr-lang" className="mb-1.5 block text-sm font-medium text-ink">
              Language the patient reads
            </label>
            <select
              id="instr-lang" value={language} onChange={(e) => setLanguage(e.target.value)}
              className="focus-ring w-full rounded-lg border border-border-soft bg-surface-1 px-3 py-2.5 text-base text-ink sm:max-w-xs"
            >
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
            <p className="mt-1.5 text-xs text-ink-subtle">
              Choose the language the patient reads, not the one you are typing in. Nothing is
              translated automatically — write the text in the language you select.
            </p>
          </div>

          <div>
            <label htmlFor="instr-body" className="mb-1.5 block text-sm font-medium text-ink">
              Instructions
            </label>
            <textarea
              id="instr-body" rows={10} value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={
                'Take your medicine as written on the prescription.\n\nCome back sooner if…\n\nGo to the emergency department if…'
              }
              className="focus-ring w-full resize-y rounded-lg border border-border-soft bg-surface-1 px-3 py-2.5 text-base leading-relaxed text-ink"
            />
          </div>

          {error !== '' && <Banner tone="error">{error}</Banner>}

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => void issue()} loading={busy}>Issue to patient</Button>
            <p className="text-sm text-ink-muted">
              Issued instructions are part of the record and carry your name and the time.
            </p>
          </div>
        </div>
      </Card>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-ink">
            Previously issued {issued.length > 0 && `(${issued.length})`}
          </h2>
          {issued.length > 0 && (
            <Button
              variant="secondary" size="sm" onClick={() => window.print()}
              icon={<Printer size={15} />}
              className="print:hidden"
            >
              Print
            </Button>
          )}
        </div>

        {issued.length === 0 ? (
          <EmptyState
            icon={MessageSquareText}
            title="Nothing issued yet"
            description="Anything you issue above appears here and in the patient's record."
          />
        ) : (
          <ul className="space-y-3">
            {issued.map((ins) => (
              <li key={ins.id}>
                <Card padding="lg">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-base font-semibold text-ink">{ins.title}</h3>
                    <span className="text-xs text-ink-muted">
                      {LANGUAGES.find((l) => l.code === ins.language)?.label ?? ins.language}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-base leading-relaxed text-ink">
                    {ins.body}
                  </p>
                  <p className="mt-3 border-t border-border-soft pt-2 text-xs text-ink-subtle">
                    Issued by {ins.issuedByName} on {formatDate(ins.issuedAt)} at{' '}
                    {formatTime(ins.issuedAt)}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
