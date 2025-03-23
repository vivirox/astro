import React, { useState, useEffect, useCallback } from 'react'
import { cn } from '../../lib/utils'
import { Button } from './button'

export interface DialogProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Function to call when the dialog is closed */
  onClose: () => void
  /** Dialog title */
  title?: React.ReactNode
  /** Dialog description/content */
  children: React.ReactNode
  /** Footer content */
  footer?: React.ReactNode
  /** Whether to show a close button in the header */
  showCloseButton?: boolean
  /** Additional className for the dialog */
  className?: string
  /** Additional className for the backdrop */
  backdropClassName?: string
  /** Maximum width of the dialog */
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** Whether to close when clicking outside */
  closeOnOutsideClick?: boolean
  /** Whether to close when pressing escape */
  closeOnEsc?: boolean
}

export interface ConfirmDialogProps
  extends Omit<DialogProps, 'footer' | 'children'> {
  /** Message to show in the dialog */
  message: React.ReactNode
  /** Confirm button text */
  confirmText?: string
  /** Cancel button text */
  cancelText?: string
  /** Confirm button variant */
  confirmVariant?: 'primary' | 'danger'
  /** Function to call when confirmed */
  onConfirm: () => void
}

export function Dialog({
  isOpen,
  onClose,
  title,
  children,
  footer,
  showCloseButton = true,
  className = '',
  backdropClassName = '',
  maxWidth = 'md',
  closeOnOutsideClick = true,
  closeOnEsc = true,
}: DialogProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (isOpen && closeOnEsc && e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose, closeOnEsc])

  // Prevent body scrolling when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Handle outside click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (closeOnOutsideClick && e.target === e.currentTarget) {
        onClose()
      }
    },
    [closeOnOutsideClick, onClose]
  )

  // Max width classes
  const maxWidthClasses = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full',
  }

  if (!isOpen) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4',
        backdropClassName
      )}
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
    >
      <div
        className={cn(
          'w-full rounded-lg bg-white shadow-lg dark:bg-gray-800',
          'overflow-hidden flex flex-col',
          maxWidthClasses[maxWidth],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {title}
            </h3>
            {showCloseButton && (
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
                onClick={onClose}
                aria-label="Close dialog"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  isOpen,
  onClose,
  title = 'Confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  onConfirm,
  ...props
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant === 'danger' ? 'danger' : 'primary'}
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </div>
      }
      {...props}
    >
      <div className="text-gray-700 dark:text-gray-300">{message}</div>
    </Dialog>
  )
}

/**
 * Custom hook for using a dialog
 */
export function useDialog(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  return { isOpen, open, close, toggle }
}

/**
 * Custom hook for using a confirm dialog
 */
export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [confirmProps, setConfirmProps] = useState<
    Omit<ConfirmDialogProps, 'isOpen' | 'onClose'>
  >({
    title: 'Confirm',
    message: '',
    onConfirm: () => null,
  })

  const confirm = useCallback(
    (props: Omit<ConfirmDialogProps, 'isOpen' | 'onClose'>) => {
      setConfirmProps(props)
      setIsOpen(true)

      return new Promise<boolean>((resolve) => {
        setConfirmProps({
          ...props,
          onConfirm: () => {
            if (props.onConfirm) props.onConfirm()
            resolve(true)
          },
        })
      })
    },
    []
  )

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  return {
    isOpen,
    confirm,
    close,
    confirmProps,
  }
}

export default Dialog
