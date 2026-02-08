'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { MD3Button } from './button'

export interface MD3SnackbarProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  message: string
  action?: {
    label: string
    onClick: () => void
  }
  closeButton?: boolean
  duration?: number
  position?: 'bottom' | 'top'
}

const MD3Snackbar = React.forwardRef<HTMLDivElement, MD3SnackbarProps>(
  (
    {
      className,
      open = false,
      onOpenChange,
      message,
      action,
      closeButton = false,
      duration = 4000,
      position = 'bottom',
      ...props
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = React.useState(open)
    const timeoutRef = React.useRef<NodeJS.Timeout>()

    React.useEffect(() => {
      setIsVisible(open)

      if (open && duration > 0) {
        timeoutRef.current = setTimeout(() => {
          setIsVisible(false)
          onOpenChange?.(false)
        }, duration)
      }

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
      }
    }, [open, duration, onOpenChange])

    const handleClose = () => {
      setIsVisible(false)
      onOpenChange?.(false)
    }

    if (!isVisible) return null

    return (
      <div
        ref={ref}
        className={cn(
          'fixed left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3.5 bg-inverse-surface text-inverse-on-surface rounded-md3-xs shadow-md3-3 min-w-[344px] max-w-[672px] transition-all duration-md3-medium2 ease-md3-emphasized md3-body-medium',
          position === 'bottom' ? 'bottom-4' : 'top-4',
          isVisible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-2',
          className
        )}
        {...props}
      >
        {/* Message */}
        <span className="flex-1">{message}</span>

        {/* Action Button */}
        {action && (
          <MD3Button
            variant="text"
            size="sm"
            onClick={() => {
              action.onClick()
              handleClose()
            }}
            className="text-inverse-primary hover:bg-inverse-primary/[0.08] -mr-2"
          >
            {action.label}
          </MD3Button>
        )}

        {/* Close Button */}
        {closeButton && !action && (
          <MD3Button
            variant="text"
            size="icon"
            onClick={handleClose}
            className="text-inverse-on-surface hover:bg-inverse-on-surface/[0.08] -mr-2 h-8 w-8"
          >
            ×
          </MD3Button>
        )}
      </div>
    )
  }
)
MD3Snackbar.displayName = 'MD3Snackbar'

// Hook for managing multiple snackbars
export function useMD3Snackbar() {
  const [snackbar, setSnackbar] = React.useState<{
    open: boolean
    message: string
    action?: {
      label: string
      onClick: () => void
    }
  }>({
    open: false,
    message: '',
  })

  const showSnackbar = React.useCallback(
    (
      message: string,
      action?: {
        label: string
        onClick: () => void
      }
    ) => {
      setSnackbar({ open: true, message, action })
    },
    []
  )

  const hideSnackbar = React.useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }))
  }, [])

  return {
    snackbar,
    showSnackbar,
    hideSnackbar,
  }
}

export { MD3Snackbar }
