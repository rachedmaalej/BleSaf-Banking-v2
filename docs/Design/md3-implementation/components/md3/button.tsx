import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const md3ButtonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-md3-short4 ease-md3-standard focus-visible:outline-none disabled:pointer-events-none disabled:opacity-38 md3-state-layer',
  {
    variants: {
      variant: {
        filled:
          'bg-primary text-on-primary shadow-md3-0 hover:shadow-md3-1 active:shadow-md3-0',
        outlined:
          'border border-outline text-primary bg-transparent hover:bg-primary/[0.08] active:bg-primary/[0.12]',
        text: 'text-primary bg-transparent hover:bg-primary/[0.08] active:bg-primary/[0.12]',
        elevated:
          'bg-surface-container-low text-primary shadow-md3-1 hover:shadow-md3-2 active:shadow-md3-1',
        tonal:
          'bg-secondary-container text-on-secondary-container shadow-md3-0 hover:shadow-md3-1 active:shadow-md3-0',
      },
      size: {
        default: 'h-10 px-6 py-2.5 rounded-md3-full md3-label-large',
        sm: 'h-9 px-4 py-2 rounded-md3-full md3-label-medium',
        lg: 'h-12 px-8 py-3 rounded-md3-full md3-label-large',
        icon: 'h-10 w-10 rounded-md3-full',
      },
    },
    defaultVariants: {
      variant: 'filled',
      size: 'default',
    },
  }
)

export interface MD3ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof md3ButtonVariants> {
  asChild?: boolean
  icon?: React.ReactNode
  trailingIcon?: React.ReactNode
}

const MD3Button = React.forwardRef<HTMLButtonElement, MD3ButtonProps>(
  (
    { className, variant, size, asChild = false, icon, trailingIcon, children, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(md3ButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children}
        {trailingIcon && <span className="flex-shrink-0">{trailingIcon}</span>}
      </Comp>
    )
  }
)
MD3Button.displayName = 'MD3Button'

export { MD3Button, md3ButtonVariants }
