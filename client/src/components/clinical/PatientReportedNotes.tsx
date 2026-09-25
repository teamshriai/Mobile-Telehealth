import { useEffect, useState } from 'react'
import { UserRound } from 'lucide-react'
import apiClient from '../../lib/apiClient'
import Card from '../common/Card'
import { useAuth } from '../../app/useAuth'
import { LANGUAGE_LABEL } from '../../services/portal.service'

/**
 * Notes the PATIENT chose to share with their care team — read-only.
 *
 * ⚠️ NOT CLINICAL FINDINGS, AND STYLED SO THEY CANNOT BE MISTAKEN FOR THEM.
 * Patient-reported, unreviewed, possibly transcribed by speech-to-text and
 * then corrected by the patient. The card says all of that in words, uses
 * the patient accent rather than clinical ink, and never offers an action
 * that would copy a note into the record as if the clinician had written it.
 *
 * Only notes the patient marked "Share with my care team", only once
 * confirmed; the server also requires a care relationship. A clinician
 * without `healthnote:read:assigned` does not see the card at all.
 */
interface SharedNote {
  id: string
  source: 'Voice' | 'Typed'
  body: string | null
  language: string
  recordedAt: string
  editedAt: string | null
  correctedAfterTranscription: boolean
}

export default function PatientReportedNotes({ shriPatientId }: { shriPatientId: string }) {
  const { can } = useAuth()
  const allowed = can('healthnote:read:assigned')
  const [notes, setNotes] = useState<SharedNote[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!allowed) return
    let cancelled = false
    apiClient.get<{ notes: SharedNote[] }>(`/patients/${encodeURIComponent(shriPatientId)}/health-notes`)
      .then((r) => { if (!cancelled) setNotes(r.notes) })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [allowed, shriPatientId])

  if (!allowed) return null

  return (
    <Card padding="md">
      <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
        <UserRound size={15} aria-hidden="true" className="text-accent-sand-fg" />
        Patient-reported notes
      </h2>
      <p className="mb-2 text-2xs text-ink-subtle">
        Written or spoken by the patient and shared with the care team. Not clinically verified; not monitored.
      </p>
      {failed ? (
        <p className="text-sm text-ink-muted">Could not load the patient’s shared notes.</p>
      ) : notes === null ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-ink-muted">The patient has not shared any notes.</p>
      ) : (
        <ul className="space-y-2">
          {notes.slice(0, 5).map((n) => (
            <li key={n.id} className="rounded-lg border border-accent-sand-fg/25 bg-accent-sand/60 px-3 py-2">
              <p className="text-2xs text-accent-sand-fg">
                {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(n.recordedAt))}
                {' · '}{n.source === 'Voice' ? 'Voice, transcribed' : 'Typed'}
                {n.correctedAfterTranscription && ', corrected by patient'}
                {' · '}{LANGUAGE_LABEL[n.language] ?? n.language}
              </p>
              <p className="mt-0.5 whitespace-pre-line text-sm text-ink" lang={n.language}>{n.body}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
