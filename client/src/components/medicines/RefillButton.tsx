import { useId, useState } from 'react'
import { Clock3, RefreshCcw, Send, XCircle } from 'lucide-react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import ConfirmDialog from '../common/ConfirmDialog'
import { useToast } from '../common/useToast'
import * as portal from '../../services/portal.service'
import type { Medicine } from '../../services/portal.service'
import type { ApiError } from '../../types/api'

/**
 * Refill — a REQUEST, never a prescription.
 *
 * The request goes to the hospital administrator, who passes it to a doctor
 * (the prescriber, by default) or declines it with a reason. It closes itself
 * when the doctor signs a new prescription; the old course then moves to
 * "Past" and the new one appears here. Each status says who has it now.
 *
 * A request can be withdrawn only while the hospital has not acted on it.
 */
const NOTE_MAX = 300

export default function RefillButton({ medicine: m, onChanged }: { medicine: Medicine; onChanged: () => void }) {
  const toast = useToast()
  const noteId = useId()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)

  if (m.status !== 'current') return null
  const r = m.refill
  const label = `${m.name} ${m.dose} ${m.doseUnit}`

  if (r?.status === 'Requested') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-bg px-2.5 py-1 text-xs font-semibold text-warning-fg">
          <Clock3 size={13} aria-hidden="true" /> Refill requested · waiting for the hospital
        </span>
        <button
          type="button"
          onClick={() => setConfirmCancel(true)}
          className="focus-ring inline-flex min-h-9 items-center rounded-lg px-2.5 text-xs font-medium text-ink-muted hover:bg-surface-2 hover:text-ink"
        >
          Withdraw
        </button>
        <ConfirmDialog
          open={confirmCancel}
          title="Withdraw this refill request?"
          consequence={`Your request for ${label} will be withdrawn. You can ask again at any time.`}
          confirmLabel="Withdraw request"
          cancelLabel="Keep it"
          onCancel={() => setConfirmCancel(false)}
          onConfirm={async () => {
            try {
              await portal.cancelRefill(r.id)
              toast.notify('Refill request withdrawn.', 'success')
              setConfirmCancel(false)
              onChanged()
            } catch (err) {
              toast.notify((err as ApiError).message || 'Could not withdraw the request.', 'error')
            }
          }}
        />
      </div>
    )
  }

  if (r?.status === 'Forwarded') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-info-bg px-2.5 py-1 text-xs font-semibold text-info-fg">
        <Send size={13} aria-hidden="true" /> Refill request sent to {r.forwardedToName ?? 'your doctor'}
      </span>
    )
  }

  const urgent = m.supplyDaysLeft !== null && m.supplyDaysLeft <= 7

  const submit = async (): Promise<void> => {
    setSending(true)
    setError(null)
    try {
      await portal.requestRefill(m.id, note)
      toast.notify('Refill requested. The hospital will pass it to your doctor.', 'success')
      setOpen(false)
      setNote('')
      onChanged()
    } catch (err) {
      setError((err as ApiError).message || 'Could not send the request. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {r?.status === 'Declined' && (
        <p className="flex items-start gap-1.5 text-xs text-critical-fg">
          <XCircle size={14} aria-hidden="true" className="mt-px flex-shrink-0" />
          <span>
            Your last refill request was not approved{r.declineReason ? `: ${r.declineReason}` : '.'}
          </span>
        </p>
      )}
      <div>
        <Button
          variant={urgent ? 'primary' : 'outline'}
          size="sm"
          icon={<RefreshCcw size={14} aria-hidden="true" />}
          onClick={() => { setError(null); setOpen(true) }}
        >
          Request refill
        </Button>
      </div>

      <Modal
        isOpen={open}
        onClose={sending ? undefined : () => setOpen(false)}
        closeable={!sending}
        size="sm"
        title="Request a refill"
        subtitle={label}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={sending}>Cancel</Button>
            <Button size="sm" onClick={() => void submit()} loading={sending} icon={<Send size={14} aria-hidden="true" />}>
              Send request
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <ol className="space-y-1.5 text-sm text-ink-muted">
            <li>1. The hospital receives your request.</li>
            <li>2. They pass it to {m.prescriber.name ?? 'your doctor'}, who decides whether to prescribe more.</li>
            <li>3. You get a notification, and the new prescription appears here.</li>
          </ol>
          <div>
            <label htmlFor={noteId} className="block text-sm font-medium text-ink">
              Anything to add? <span className="font-normal text-ink-subtle">(optional)</span>
            </label>
            <textarea
              id={noteId}
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
              rows={3}
              maxLength={NOTE_MAX}
              placeholder="For example: I have three tablets left."
              className="focus-ring mt-1.5 w-full resize-y rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-ink placeholder:text-ink-subtle"
            />
            <p className="mt-1 text-right text-2xs text-ink-subtle tabular-nums">{note.length}/{NOTE_MAX}</p>
          </div>
          <p className="text-xs text-ink-subtle">
            Running out today? Don&rsquo;t wait for this request — contact your hospital or pharmacy directly.
          </p>
          {error !== null && <p role="alert" className="text-sm text-critical-fg">{error}</p>}
        </div>
      </Modal>
    </div>
  )
}
