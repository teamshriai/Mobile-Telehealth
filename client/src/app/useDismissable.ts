import { useEffect, type RefObject } from 'react'

export interface UseDismissableOptions {
  open: boolean
  onClose: () => void
  triggerRef?: RefObject<HTMLElement | null>
  panelRef?: RefObject<HTMLElement | null>
}

/**
 * Escape-to-close and click-outside-to-close for a popover or menu.
 *
 * This existed three times over — the account menu, the notification panel,
 * and the doctor dashboard's explainability sheet — with the focus-restore
 * behaviour present in some copies and missing from others. Missing it
 * strands keyboard focus on an element that has just been unmounted, so it is
 * part of the shared contract here rather than a per-copy detail.
 *
 * Escape restores focus to the trigger; an outside click does not, because
 * the click has already moved focus somewhere the user chose.
 */
export function useDismissable({ open, onClose, triggerRef, panelRef }: UseDismissableOptions): void {
  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      onClose()
      triggerRef?.current?.focus()
    }

    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      const inPanel = panelRef?.current?.contains(target)
      const inTrigger = triggerRef?.current?.contains(target)
      if (!inPanel && !inTrigger) onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [open, onClose, triggerRef, panelRef])
}
