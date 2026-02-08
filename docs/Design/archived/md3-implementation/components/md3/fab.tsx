import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const md3FABVariants = cva(
  'inline-flex items-center justify-center gap-3 font-medium transition-all duration-md3-medium1 ease-md3-standard focus-visible:outline-none disabled:pointer-events-none disabled:opacity-38 md3-state-layer md3-label-large',
  {
    variants: {
      variant: {
        surface:
          'bg-surface-container-high text-primary shadow-md3-3 hover:shadow-md3-4 active:shadow-md3-3',
        primary:
          'bg-primary-container text-on-primary-container shadow-md3-3 hover:shadow-md3-4 active:shadow-md3-3',
        secondary:
          'bg-secondary-container text-on-secondary-container shadow-md3-3 hover:shadow-md3-4 active:shadow-md3-3',
        tertiary:
          'bg-tertiary-container text-on-tertiary-container shadow-md3-3 hover:shadow-md3-4 active:shadow-md3-3',
      },
      size: {
        small: 'h-10 w-10 rounded-md3-sm [&_svg]:h-6 [&_svg]:w-6',
        default: 'h-14 w-14 rounded-md3-lg [&_svg]:h-6 [&_svg]:w-6',
        large: 'h-24 w-24 rounded-md3-xl [&_svg]:h-9 [&_svg]:w-9',
        extended: 'h-14 px-4 rounded-md3-lg [&_svg]:h-6 [&_svg]:w-6',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
)

export interface MD3FABProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof md3FABVariants> {
  icon: React.ReactNode
  label?: string
  lowered?: boolean
}

const MD3FAB = React.forwardRef<HTMLButtonElement, MD3FABProps>(
  ({ className, variant, size, icon, label, lowered, ...props }, ref) => {
    const isExtended = size === 'extended' || (label && size !== 'small')

    return (
      <button
        className={cn(
          md3FABVariants({ 
            variant, 
            size: isExtended ? 'extended' : size 
          }),
          lowered && 'shadow-md3-1 hover:shadow-md3-2',
          className
        )}
        ref={ref}
        {...props}
      >
        <span className="flex-shrink-0">{icon}</span>
        {label && <span className="md3-label-large">{label}</span>}
      </button>
    )
  }
)
MD3FAB.displayName = 'MD3FAB'

export { MD3FAB, md3FABVariants }
