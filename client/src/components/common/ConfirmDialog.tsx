import { useState, type ReactNode } from 'react'
import Modal from './Modal'
import Button from './Button'

/**
 * ConfirmDialog — for actions UI_ATLAS §5.7 requires an explicit
 * confirmation on: *"Every destructive or irreversible action has an
 * explicit confirmation naming what will happen. `Sign` is irreversible and
 * says so."*
 *
 * ⚠️ `consequence` is a required prop, not an optional nicety. A dialog that
 * says only "Are you sure?" transfers no information and trains people to
 * click through — which is worse than no dialog, because it manufactures the
 * appearance of a deliberate decision.
 */

interface ConfirmDialogProps {
  open: boolean
  title: string
  /** Plain-language statement of what will happen. Required. */
  consequence: ReactNode
  confirmLabel: string
  cancelLabel?: string
  /** Renders the confirm button as destructive. */
  destructive?: boolean
  /** May return a promise; the dialog shows a busy state until it settles. */
  onConfirm: () => void | Promise<void>
  onCancel: () => void
  /** Extra content, e.g. a mandatory reason field. */
  children?: ReactNode
  /** Blocks confirmation, e.g. while a required reason is empty. */
  confirmDisabled?: boolean
}

export default function ConfirmDialog({
  open,
  title,
  consequence,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
  children,
  confirmDisabled = false,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false)

  const handleConfirm = async (): Promise<void> => {
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      // Always clears, even on a throw — otherwise a failed action leaves the
      // dialog permanently stuck on "Working…" with no way back.
      setBusy(false)
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={busy ? undefined : onCancel}
      title={title}
      size="sm"
      closeable={!busy}
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            size="sm"
            onClick={() => void handleConfirm()}
            loading={busy}
            disabled={confirmDisabled || busy}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm leading-relaxed text-ink-muted">{consequence}</p>
        {children}
      </div>
    </Modal>
  )
}
