import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const md3TopAppBarVariants = cva(
  'w-full transition-all duration-md3-medium2 ease-md3-standard',
  {
    variants: {
      variant: {
        center: 'bg-surface text-on-surface',
        small: 'bg-surface text-on-surface',
        medium: 'bg-surface text-on-surface',
        large: 'bg-surface text-on-surface',
      },
      scrolled: {
        true: 'shadow-md3-2',
        false: 'shadow-md3-0',
      },
    },
    defaultVariants: {
      variant: 'small',
      scrolled: false,
    },
  }
)

export interface MD3TopAppBarProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof md3TopAppBarVariants> {
  title: string
  subtitle?: string
  navigationIcon?: React.ReactNode
  actions?: React.ReactNode[]
  scrolled?: boolean
}

const MD3TopAppBar = React.forwardRef<HTMLElement, MD3TopAppBarProps>(
  (
    {
      className,
      variant,
      scrolled,
      title,
      subtitle,
      navigationIcon,
      actions,
      ...props
    },
    ref
  ) => {
    const getHeightClass = () => {
      switch (variant) {
        case 'medium':
          return 'h-28'
        case 'large':
          return 'h-40'
        default:
          return 'h-16'
      }
    }

    const getTitleClass = () => {
      switch (variant) {
        case 'large':
          return 'md3-headline-medium'
        case 'medium':
          return 'md3-headline-small'
        default:
          return 'md3-title-large'
      }
    }

    return (
      <header
        ref={ref}
        className={cn(
          md3TopAppBarVariants({ variant, scrolled }),
          getHeightClass(),
          'flex items-center',
          className
        )}
        {...props}
      >
        <div className="flex w-full items-center px-4">
          {/* Navigation Icon */}
          {navigationIcon && (
            <div className="flex-shrink-0 -ml-3 mr-2">{navigationIcon}</div>
          )}

          {/* Title Section */}
          <div
            className={cn(
              'flex-1 min-w-0',
              variant === 'center' && 'text-center',
              (variant === 'medium' || variant === 'large') && 'self-end pb-6'
            )}
          >
            <h1 className={cn(getTitleClass(), 'truncate')}>{title}</h1>
            {subtitle && (
              <p className="md3-body-medium text-on-surface-variant truncate">
                {subtitle}
              </p>
            )}
          </div>

          {/* Actions */}
          {actions && actions.length > 0 && (
            <div className="flex items-center gap-1 flex-shrink-0 -mr-3">
              {actions.map((action, index) => (
                <div key={index}>{action}</div>
              ))}
            </div>
          )}
        </div>
      </header>
    )
  }
)
MD3TopAppBar.displayName = 'MD3TopAppBar'

export { MD3TopAppBar, md3TopAppBarVariants }
