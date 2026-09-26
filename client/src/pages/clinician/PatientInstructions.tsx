import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Languages, MessageSquareText, Printer } from 'lucide-react'
import { useEncounter } from './useEncounterRoute'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import { Banner, EmptyState, ErrorState, LoadingState } from '../../components/feedback/States'
import { formatDate, formatTime } from '../../components/clinic/format'
import { patientFullName } from '../../components/clinical/patientDisplay'
import { useToast } from '../../components/common/useToast'
import * as templateService from '../../services/clinicalTemplate.service'
import type { PatientInstruction } from '../../types/domain'
import type { ApiError } from '../../types/api'

/**
 * S-06-08 · Patient Instructions & Education (ARC-15, **Comfortable** density).
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
 * ⚠️ BILINGUAL — A6, and the screen's drawing note says exactly what it means:
 * "Draw both languages on one printed artefact. A discharge instruction the
 * patient cannot read is not an instruction." The patient reads their own
 * language; the next clinician, the pharmacist and the referral hospital read
 * English. One sheet has to serve both, so the author writes both and the
 * printed sheet sets them side by side.
 *
 * ⚠️ The English counterpart is OPTIONAL and stays that way. A clinician in
 * clinic must never be unable to hand over instructions because a second
 * language is missing. What the screen does instead is say, before Issue is
 * pressed and again on the printed sheet, which half will be absent.
 *
 * AI: `AI-OFF`. `AI-110` (translation) and `AI-111` (patient-friendly rewrite)
 * are registered on this screen in the Atlas and are NOT drawn, because there
 * is nothing behind them — no model, no translation service. §4.8's rule is
 * that an unavailable AI affordance is hidden, not greyed, so there is no
 * Translate button and no Simplify button. The clinician writes both columns.
 * Offering a greyed "Translate" would be a promise the product cannot keep on
 * the one screen where a wrong translation is a clinical event.
 */

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ta', label: 'Tamil — தமிழ்' },
  { code: 'hi', label: 'Hindi — हिन्दी' },
  { code: 'ml', label: 'Malayalam — മലയാളം' },
  { code: 'kn', label: 'Kannada — ಕನ್ನಡ' },
]

function languageLabel(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.label ?? code
}

/** The plain name, without the script — for a printed column heading. */
function languageName(code: string): string {
  return languageLabel(code).split(' — ')[0]
}

export default function PatientInstructions() {
  const { patient, encounter } = useEncounter()
  const toast = useToast()

  const [issued, setIssued] = useState<PatientInstruction[] | null>(null)
  const [loadError, setLoadError] = useState<ApiError | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [titleEnglish, setTitleEnglish] = useState('')
  const [bodyEnglish, setBodyEnglish] = useState('')
  const [language, setLanguage] = useState('en')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  /**
   * What the printer is currently pointed at. `null` means nothing is staged,
   * and the sheet is not in the DOM at all — an empty `data-print-root` would
   * make the print stylesheet hide the whole application and produce a blank
   * page if someone hit Ctrl+P without choosing anything.
   */
  const [printing, setPrinting] = useState<PatientInstruction[] | null>(null)

  const load = useCallback(() => {
    setLoadError(null)
    templateService.listInstructions(patient.id).then(setIssued).catch(setLoadError)
  }, [patient.id])
  useEffect(load, [load])

  /** Issued at THIS visit — what the patient is being handed today. */
  const thisVisit = useMemo(
    () => (issued ?? []).filter((i) => i.encounterId === encounter.id),
    [issued, encounter.id],
  )

  // ── Printing ─────────────────────────────────────────────────────────────
  // The sheet has to be in the DOM and laid out before the print dialog opens,
  // so staging and printing are two steps rather than one. `useEffect` fires
  // after commit; the extra frame is what stops Chromium capturing the page
  // mid-paint and printing a half-rendered sheet.
  const printQueued = useRef(false)
  useEffect(() => {
    if (printing === null || !printQueued.current) return
    printQueued.current = false
    const id = requestAnimationFrame(() => window.print())
    return () => cancelAnimationFrame(id)
  }, [printing])

  // Un-stage once the dialog closes, so the next Ctrl+P does not silently
  // reprint whatever was chosen twenty minutes ago.
  useEffect(() => {
    const after = () => setPrinting(null)
    window.addEventListener('afterprint', after)
    return () => window.removeEventListener('afterprint', after)
  }, [])

  const print = (rows: PatientInstruction[]) => {
    if (rows.length === 0) return
    printQueued.current = true
    setPrinting(rows)
  }

  const englishOffered = language !== 'en'
  const englishStarted = titleEnglish.trim() !== '' || bodyEnglish.trim() !== ''

  const issue = async () => {
    if (title.trim() === '' || body.trim().length < 10) {
      setError('Give the instructions a title and at least a sentence of content.')
      return
    }
    // ⚠️ Mirrors the server's refine() rather than trusting it. Half a
    // translation prints as a fault: an English heading over text that is not
    // English reads like the document is broken, which is worse than a sheet
    // that plainly says the English version is missing.
    if (englishOffered && englishStarted && (titleEnglish.trim() === '' || bodyEnglish.trim().length < 10)) {
      setError('Fill in both the English title and the English instructions, or leave both empty.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const created = await templateService.issueInstructions({
        patientId: patient.id,
        encounterId: encounter.id,
        title: title.trim(),
        body: body.trim(),
        language,
        titleEnglish: englishOffered && englishStarted ? titleEnglish.trim() : null,
        bodyEnglish: englishOffered && englishStarted ? bodyEnglish.trim() : null,
      })
      setTitle(''); setBody(''); setTitleEnglish(''); setBodyEnglish('')
      toast.notify('Instructions issued to the patient.', 'success')
      load()
      // Straight to the printer — the Atlas action is "Issue instructions →
      // prints bilingually". The patient is still in the room.
      print([created])
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

  const canIssue = title.trim() !== '' && body.trim().length >= 10

  return (
    // Comfortable density: 40px rows, 14px type. Scoped to this subtree only.
    <div data-density="comfortable" className="space-y-5">
      {/*
        ⚠️ Hidden from print ONLY while a sheet is staged. If someone presses
        Ctrl+P with nothing selected, hiding this unconditionally would hand
        them a blank page; leaving it visible prints the readable list instead,
        which is a reasonable thing to want and an unreasonable thing to punish.
      */}
      <div data-print={printing !== null ? 'hide' : undefined} className="space-y-5 pb-24">
        <Banner tone="info">
          These are written for the patient to read, not for the record. Use plain words, name the
          medicine and the reason, and say what to do if things get worse.
        </Banner>

        <Card padding="lg">
          <h2 className="mb-4 text-base font-semibold text-ink">Write instructions</h2>

          <div className="space-y-4">
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
                translated for you — write the text in the language you select.
              </p>
            </div>

            {/*
              Two columns at ≥1280 per the responsive rule, one below. The
              patient's language is on the left because it is the required
              one and the one the reader in front of you needs.
            */}
            <div className={`grid gap-5 ${englishOffered ? 'xl:grid-cols-2' : ''}`}>
              <LanguagePane
                idPrefix="instr"
                // ⚠️ No heading in the monolingual case. There is only one pane,
                // and a heading reading "Instructions" directly above a field
                // labelled "Instructions" is noise, not structure.
                heading={englishOffered ? `In ${languageName(language)}` : undefined}
                subheading={englishOffered ? 'What the patient reads. Required.' : undefined}
                title={title} onTitle={setTitle}
                body={body} onBody={setBody}
                titlePlaceholder="e.g. Going home after today's visit"
                bodyPlaceholder={
                  'Take your medicine as written on the prescription.\n\nCome back sooner if…\n\nGo to the emergency department if…'
                }
              />

              {englishOffered && (
                <LanguagePane
                  idPrefix="instr-en"
                  heading="In English"
                  subheading="For the next clinician, the pharmacist and the referral hospital. Optional."
                  title={titleEnglish} onTitle={setTitleEnglish}
                  body={bodyEnglish} onBody={setBodyEnglish}
                  titlePlaceholder="The same title, in English"
                  bodyPlaceholder="The same instructions, in English."
                />
              )}
            </div>

            {englishOffered && !englishStarted && (
              <Banner tone="warning">
                <span className="font-medium">The printed sheet will be in {languageName(language)} only.</span>{' '}
                It will say so on the page, so nobody mistakes a missing English version for a
                printing fault — but a clinician who does not read {languageName(language)} will not
                be able to check what this patient was told.
              </Banner>
            )}

            {error !== '' && <Banner tone="error">{error}</Banner>}

            <p className="text-sm text-ink-muted">
              Issued instructions are part of the record and carry your name and the time. They
              cannot be edited afterwards — issue a new set if something changes.
            </p>
          </div>
        </Card>

        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-ink">
              Previously issued {issued.length > 0 && `(${issued.length})`}
            </h2>
            {thisVisit.length > 1 && (
              <Button
                variant="secondary" size="sm" onClick={() => print(thisVisit)}
                icon={<Printer size={15} />}
              >
                Print all {thisVisit.length} from this visit
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
                      {/*
                        ⚠️ `lang` on the text itself, not on the page. Without it
                        a screen reader pronounces Kannada and Tamil with an
                        English voice, which on this screen is not a nicety — it
                        is the one surface whose entire premise is that the
                        reader gets their own language.
                      */}
                      <h3 lang={ins.language} className="text-base font-semibold text-ink">
                        {ins.title}
                      </h3>
                      <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                        <Languages size={13} aria-hidden="true" />
                        {(ins.bodyEnglish ?? '') !== ''
                          ? `${languageName(ins.language)} and English`
                          : languageLabel(ins.language)}
                      </span>
                    </div>
                    <p
                      lang={ins.language}
                      className="mt-2 whitespace-pre-line text-base leading-relaxed text-ink"
                    >
                      {ins.body}
                    </p>

                    {(ins.bodyEnglish ?? '') !== '' && (
                      <details lang="en" className="mt-3 border-t border-border-soft pt-3">
                        <summary className="focus-ring cursor-pointer text-sm font-medium text-ink-muted">
                          English version
                        </summary>
                        <h4 className="mt-2 text-sm font-semibold text-ink">{ins.titleEnglish}</h4>
                        <p className="mt-1 whitespace-pre-line text-base leading-relaxed text-ink">
                          {ins.bodyEnglish}
                        </p>
                      </details>
                    )}

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border-soft pt-2">
                      <p className="text-xs text-ink-subtle">
                        Issued by {ins.issuedByName} on {formatDate(ins.issuedAt)} at{' '}
                        {formatTime(ins.issuedAt)}
                      </p>
                      <Button
                        variant="ghost" size="sm" onClick={() => print([ins])}
                        icon={<Printer size={14} />}
                      >
                        Print
                      </Button>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/*
        Z7a — sticky action bar. The primary action lives here rather than
        inside the form card, so it stays reachable while the clinician is at
        the bottom of a long instruction body.
      */}
      <div
        data-print="hide"
        className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-border-soft bg-surface-1/95 px-4 pt-3 backdrop-blur"
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-subtle">
            {canIssue
              ? englishOffered && englishStarted
                ? `Will print in ${languageName(language)} and English.`
                : `Will print in ${languageName(language)}.`
              : 'Nothing written yet.'}
          </p>
          <Button onClick={() => void issue()} loading={busy} disabled={!canIssue}>
            Issue and print
          </Button>
        </div>
      </div>

      {printing !== null && (
        <PrintSheet
          rows={printing}
          patientName={patientFullName(patient)}
          patientId={patient.shriPatientId}
          visitId={encounter.visitId}
        />
      )}
    </div>
  )
}

/* ── One language's title + body ─────────────────────────────────────────── */

function LanguagePane({
  idPrefix, heading, subheading, title, onTitle, body, onBody, titlePlaceholder, bodyPlaceholder,
}: {
  idPrefix: string
  heading?: string
  subheading?: string
  title: string
  onTitle: (v: string) => void
  body: string
  onBody: (v: string) => void
  titlePlaceholder: string
  bodyPlaceholder: string
}) {
  return (
    <div className="space-y-3">
      {heading !== undefined && (
        <div>
          <h3 className="text-sm font-semibold text-ink">{heading}</h3>
          {subheading !== undefined && (
            <p className="mt-0.5 text-xs text-ink-subtle">{subheading}</p>
          )}
        </div>
      )}

      <div>
        <label htmlFor={`${idPrefix}-title`} className="mb-1.5 block text-sm font-medium text-ink">
          Title
        </label>
        <input
          id={`${idPrefix}-title`} type="text" value={title}
          onChange={(e) => onTitle(e.target.value)}
          placeholder={titlePlaceholder}
          className="focus-ring w-full rounded-lg border border-border-soft bg-surface-1 px-3 py-2.5 text-base text-ink"
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-body`} className="mb-1.5 block text-sm font-medium text-ink">
          Instructions
        </label>
        <textarea
          id={`${idPrefix}-body`} rows={10} value={body}
          onChange={(e) => onBody(e.target.value)}
          placeholder={bodyPlaceholder}
          className="focus-ring w-full resize-y rounded-lg border border-border-soft bg-surface-1 px-3 py-2.5 text-base leading-relaxed text-ink"
        />
      </div>
    </div>
  )
}

/* ── The printed artefact ────────────────────────────────────────────────── */

/**
 * ⚠️ This is a DOCUMENT, not a screen. It carries `data-print-root`, which the
 * print stylesheet in index.css uses to hide everything else on the page; it is
 * `sr-only` on screen so it never appears in the application but is still laid
 * out (and still reachable by a screen reader, which is the same audience the
 * paper serves).
 *
 * Every column is labelled with its language in that language's own script. An
 * unlabelled second column is guesswork for whoever picks the sheet up next.
 */
function PrintSheet({
  rows, patientName, patientId, visitId,
}: {
  rows: PatientInstruction[]
  patientName: string
  patientId: string
  visitId: string
}) {
  return (
    <div data-print-root lang="en" className="hidden print:block">
      <header className="mb-4 border-b-2 border-black pb-3">
        <h1 className="text-xl font-bold">Instructions for you</h1>
        <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-0.5 text-sm">
          <div className="flex gap-2">
            <dt className="font-semibold">Name</dt>
            <dd>{patientName}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-semibold">Patient ID</dt>
            <dd>{patientId}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-semibold">Visit</dt>
            <dd>{visitId}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-semibold">Printed</dt>
            <dd>{formatDate(new Date().toISOString())}</dd>
          </div>
        </dl>
      </header>

      {rows.map((ins) => {
        // ⚠️ `?? ''` rather than `!== null`. An older server build that does not
        // yet know the column sends `undefined`, not `null` — and `undefined
        // !== null` is true, which drew a two-column sheet with an empty English
        // half. A printed document that silently loses one of its two languages
        // is the exact failure this screen exists to prevent, so the check is
        // written to treat "absent" and "empty" identically.
        const bilingual = (ins.bodyEnglish ?? '') !== ''
        return (
          <article key={ins.id} data-print-block className="mb-6">
            {bilingual ? (
              <div className="grid grid-cols-2 gap-6">
                <section lang={ins.language}>
                  <p lang="en" className="mb-1 text-xs font-semibold uppercase tracking-wide">
                    {languageLabel(ins.language)}
                  </p>
                  <h2 className="text-base font-bold">{ins.title}</h2>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{ins.body}</p>
                </section>
                <section lang="en" className="border-l border-black/40 pl-6">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide">English</p>
                  <h2 className="text-base font-bold">{ins.titleEnglish}</h2>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">
                    {ins.bodyEnglish}
                  </p>
                </section>
              </div>
            ) : (
              <section lang={ins.language}>
                <p lang="en" className="mb-1 text-xs font-semibold uppercase tracking-wide">
                  {languageLabel(ins.language)}
                </p>
                <h2 className="text-base font-bold">{ins.title}</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{ins.body}</p>
                {ins.language !== 'en' && (
                  // ⚠️ Says it, rather than leaving a reader to wonder whether
                  // the second column failed to print.
                  <p className="mt-3 border border-black/50 px-2 py-1 text-xs">
                    No English version of these instructions was recorded. They were issued in{' '}
                    {languageName(ins.language)} only.
                  </p>
                )}
              </section>
            )}

            <p className="mt-3 border-t border-black/30 pt-1.5 text-xs">
              Issued by {ins.issuedByName} · {formatDate(ins.issuedAt)} {formatTime(ins.issuedAt)}
            </p>
          </article>
        )
      })}

      <footer className="mt-6 border-t border-black pt-2 text-xs">
        SHRI HEALTH · Keep this sheet and bring it to your next visit. If you are worried
        before then, contact the hospital or go to the nearest emergency department.
      </footer>
    </div>
  )
}
