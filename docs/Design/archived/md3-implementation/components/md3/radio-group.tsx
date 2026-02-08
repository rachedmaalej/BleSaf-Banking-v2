import * as React from 'react'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { cn } from '@/lib/utils'

const MD3RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn('grid gap-2', className)}
      {...props}
      ref={ref}
    />
  )
})
MD3RadioGroup.displayName = 'MD3RadioGroup'

export interface MD3RadioGroupItemProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> {
  error?: boolean
}

const MD3RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  MD3RadioGroupItemProps
>(({ className, error, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        'aspect-square h-5 w-5 rounded-full border-2 transition-all duration-md3-short4 ease-md3-standard focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-38',
        'data-[state=checked]:border-primary data-[state=checked]:border-[10px]',
        'data-[state=unchecked]:border-on-surface-variant',
        'hover:data-[state=unchecked]:border-on-surface',
        error &&
          'data-[state=unchecked]:border-error hover:data-[state=unchecked]:border-error',
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center" />
    </RadioGroupPrimitive.Item>
  )
})
MD3RadioGroupItem.displayName = 'MD3RadioGroupItem'

export { MD3RadioGroup, MD3RadioGroupItem }
