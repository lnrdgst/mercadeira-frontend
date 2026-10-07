import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

let bodyScrollLocks = 0
let previousBodyOverflow = ''

type Props = {
  open: boolean
  onClose: () => void
  children: ReactNode
  ariaLabel?: string
  ariaLabelledBy?: string
  panelClassName?: string
  closeDisabled?: boolean
  dismissible?: boolean
}

/**
 * Camada modal independente da página que a abriu. O portal impede que
 * transform/overflow de shells e rotas alterem o containing block do painel.
 */
export function Modal({
  open,
  onClose,
  children,
  ariaLabel,
  ariaLabelledBy,
  panelClassName = '',
  closeDisabled = false,
  dismissible = true,
}: Props) {
  useEffect(() => {
    if (!open) return

    if (bodyScrollLocks === 0) {
      previousBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    bodyScrollLocks += 1

    return () => {
      bodyScrollLocks -= 1
      if (bodyScrollLocks === 0) document.body.style.overflow = previousBodyOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dismissible && !closeDisabled) {
        event.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [closeDisabled, dismissible, onClose, open])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div data-modal-portal className="fixed inset-0 z-[100]">
      {dismissible
        ? <button
            type="button"
            tabIndex={-1}
            aria-label="Fechar modal"
            disabled={closeDisabled}
            onClick={onClose}
            className="absolute inset-0 h-full w-full cursor-default bg-foreground/40 disabled:cursor-not-allowed"
          />
        : <div aria-hidden="true" className="absolute inset-0 bg-foreground/40" />}
      <div className="pointer-events-none fixed inset-0 flex items-end p-gutter pt-[max(1rem,env(safe-area-inset-top))] sm:items-center sm:justify-center sm:p-page">
        <section
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          className={`pointer-events-auto flex max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] min-h-0 w-full flex-col overflow-hidden rounded-t-card bg-surface shadow-soft sm:rounded-card ${panelClassName}`}
        >
          {children}
        </section>
      </div>
    </div>,
    document.body,
  )
}
