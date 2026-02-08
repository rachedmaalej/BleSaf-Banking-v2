import * as React from 'react'
import * as SwitchPrimitives from '@radix-ui/react-switch'
import { cn } from '@/lib/utils'
import { MaterialIcon } from '@/components/ui/material-icon'

export interface MD3SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  showIcon?: boolean
}

const MD3Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  MD3SwitchProps
>(({ className, showIcon = true, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      'peer inline-flex h-8 w-[52px] shrink-0 cursor-pointer items-center rounded-md3-full border-2 transition-all duration-md3-medium1 ease-md3-emphasized focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-38',
      'data-[state=checked]:bg-primary data-[state=unchecked]:bg-surface-container-highest',
      'data-[state=checked]:border-primary data-[state=unchecked]:border-outline',
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        'pointer-events-none flex items-center justify-center rounded-md3-full bg-surface shadow-md3-1 transition-all duration-md3-medium1 ease-md3-emphasized',
        'data-[state=checked]:h-6 data-[state=checked]:w-6 data-[state=unchecked]:h-4 data-[state=unchecked]:w-4',
        'data-[state=checked]:translate-x-6 data-[state=unchecked]:translate-x-1',
        'data-[state=checked]:bg-on-primary data-[state=unchecked]:bg-outline'
      )}
    >
      {showIcon && (
        <>
          <MaterialIcon
            icon="check"
            className={cn(
              'h-4 w-4 text-primary-container transition-opacity duration-md3-short4',
              props.checked ? 'opacity-100' : 'opacity-0'
            )}
          />
          <MaterialIcon
            icon="close"
            className={cn(
              'absolute h-4 w-4 text-surface-container-highest transition-opacity duration-md3-short4',
              !props.checked ? 'opacity-100' : 'opacity-0'
            )}
          />
        </>
      )}
    </SwitchPrimitives.Thumb>
  </SwitchPrimitives.Root>
))
MD3Switch.displayName = 'MD3Switch'

export { MD3Switch }
