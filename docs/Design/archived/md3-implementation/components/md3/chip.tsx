import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { MaterialIcon } from '@/components/ui/material-icon'

const md3ChipVariants = cva(
  'inline-flex items-center gap-2 font-medium transition-all duration-md3-short4 ease-md3-standard focus-visible:outline-none disabled:pointer-events-none disabled:opacity-38 md3-state-layer md3-label-large',
  {
    variants: {
      variant: {
        assist:
          'bg-transparent border border-outline text-on-surface hover:shadow-md3-1 active:shadow-md3-0',
        filter:
          'bg-transparent border border-outline text-on-surface-variant hover:shadow-md3-1',
        input:
          'bg-transparent border border-outline text-on-surface-variant hover:shadow-md3-1',
        suggestion:
          'bg-transparent border border-outline text-on-surface-variant hover:shadow-md3-1',
      },
      selected: {
        true: '',
        false: '',
      },
      elevated: {
        true: 'shadow-md3-1 hover:shadow-md3-2',
        false: '',
      },
    },
    compoundVariants: [
      {
        variant: 'filter',
        selected: true,
        className: 'bg-secondary-container text-on-secondary-container border-transparent',
      },
      {
        variant: 'input',
        selected: true,
        className: 'bg-secondary-container text-on-secondary-container border-transparent',
      },
    ],
    defaultVariants: {
      variant: 'assist',
      selected: false,
      elevated: false,
    },
  }
)

export interface MD3ChipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof md3ChipVariants> {
  icon?: React.ReactNode
  avatar?: React.ReactNode
  onRemove?: () => void
  selected?: boolean
}

const MD3Chip = React.forwardRef<HTMLButtonElement, MD3ChipProps>(
  (
    {
      className,
      variant,
      selected,
      elevated,
      icon,
      avatar,
      onRemove,
      children,
      ...props
    },
    ref
  ) => {
    const showCheckmark = selected && (variant === 'filter' || variant === 'input')

    return (
      <button
        ref={ref}
        className={cn(
          md3ChipVariants({ variant, selected, elevated }),
          'h-8 px-4 rounded-md3-sm',
          className
        )}
        {...props}
      >
        {/* Leading element */}
        {showCheckmark ? (
          <MaterialIcon icon="check" className="h-[18px] w-[18px]" />
        ) : avatar ? (
          <div className="h-6 w-6 -ml-1 rounded-full overflow-hidden">{avatar}</div>
        ) : icon ? (
          <span className="h-[18px] w-[18px]">{icon}</span>
        ) : null}

        {/* Label */}
        <span>{children}</span>

        {/* Trailing remove icon */}
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="h-[18px] w-[18px] rounded-full hover:bg-on-surface/[0.12] transition-colors"
          >
            <MaterialIcon icon="close" className="h-[18px] w-[18px]" />
          </button>
        )}
      </button>
    )
  }
)
MD3Chip.displayName = 'MD3Chip'

export { MD3Chip, md3ChipVariants }
