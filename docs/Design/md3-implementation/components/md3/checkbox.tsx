import * as React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { cn } from '@/lib/utils'
import { MaterialIcon } from '@/components/ui/material-icon'

export interface MD3CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  error?: boolean
}

const MD3Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  MD3CheckboxProps
>(({ className, error, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer h-[18px] w-[18px] shrink-0 rounded-[2px] border-2 transition-all duration-md3-short4 ease-md3-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-38',
      'data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-on-primary',
      'data-[state=indeterminate]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:text-on-primary',
      'data-[state=unchecked]:border-on-surface-variant data-[state=unchecked]:bg-transparent',
      'hover:data-[state=unchecked]:border-on-surface',
      error &&
        'data-[state=unchecked]:border-error hover:data-[state=unchecked]:border-error',
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn('flex items-center justify-center text-current')}
    >
      {props.checked === 'indeterminate' ? (
        <MaterialIcon icon="remove" className="h-[18px] w-[18px]" />
      ) : (
        <MaterialIcon icon="check" className="h-[18px] w-[18px]" />
      )}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
MD3Checkbox.displayName = 'MD3Checkbox'

export { MD3Checkbox }
