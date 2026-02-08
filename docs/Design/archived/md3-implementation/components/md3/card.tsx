import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const md3CardVariants = cva(
  'overflow-hidden transition-all duration-md3-medium1 ease-md3-standard',
  {
    variants: {
      variant: {
        elevated:
          'bg-surface-container-low shadow-md3-1 hover:shadow-md3-2 active:shadow-md3-1',
        filled: 'bg-surface-container-highest shadow-md3-0',
        outlined: 'border border-outline bg-surface shadow-md3-0',
      },
      shape: {
        default: 'rounded-md3-md',
        large: 'rounded-md3-lg',
      },
    },
    defaultVariants: {
      variant: 'elevated',
      shape: 'default',
    },
  }
)

export interface MD3CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof md3CardVariants> {
  interactive?: boolean
}

const MD3Card = React.forwardRef<HTMLDivElement, MD3CardProps>(
  ({ className, variant, shape, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        md3CardVariants({ variant, shape }),
        interactive && 'cursor-pointer md3-state-layer',
        className
      )}
      {...props}
    />
  )
)
MD3Card.displayName = 'MD3Card'

const MD3CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
))
MD3CardHeader.displayName = 'MD3CardHeader'

const MD3CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('md3-title-large text-on-surface', className)}
    {...props}
  />
))
MD3CardTitle.displayName = 'MD3CardTitle'

const MD3CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('md3-body-medium text-on-surface-variant', className)}
    {...props}
  />
))
MD3CardDescription.displayName = 'MD3CardDescription'

const MD3CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
))
MD3CardContent.displayName = 'MD3CardContent'

const MD3CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center gap-2 p-6 pt-0', className)}
    {...props}
  />
))
MD3CardFooter.displayName = 'MD3CardFooter'

export {
  MD3Card,
  MD3CardHeader,
  MD3CardFooter,
  MD3CardTitle,
  MD3CardDescription,
  MD3CardContent,
  md3CardVariants,
}
