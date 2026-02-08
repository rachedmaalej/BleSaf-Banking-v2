import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import { MaterialIcon } from '@/components/ui/material-icon'

const MD3Dialog = DialogPrimitive.Root

const MD3DialogTrigger = DialogPrimitive.Trigger

const MD3DialogPortal = DialogPrimitive.Portal

const MD3DialogClose = DialogPrimitive.Close

const MD3DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-scrim/32 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
))
MD3DialogOverlay.displayName = 'MD3DialogOverlay'

export interface MD3DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  fullScreen?: boolean
}

const MD3DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  MD3DialogContentProps
>(({ className, fullScreen, children, ...props }, ref) => (
  <MD3DialogPortal>
    <MD3DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-50 grid w-full gap-4 bg-surface-container-high shadow-md3-3 duration-md3-medium4 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        fullScreen
          ? 'inset-0 rounded-none'
          : 'left-[50%] top-[50%] max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-md3-xl p-6 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </MD3DialogPortal>
))
MD3DialogContent.displayName = 'MD3DialogContent'

const MD3DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)}
    {...props}
  />
)
MD3DialogHeader.displayName = 'MD3DialogHeader'

const MD3DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2', className)}
    {...props}
  />
)
MD3DialogFooter.displayName = 'MD3DialogFooter'

const MD3DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('md3-headline-small text-on-surface', className)}
    {...props}
  />
))
MD3DialogTitle.displayName = 'MD3DialogTitle'

const MD3DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('md3-body-medium text-on-surface-variant', className)}
    {...props}
  />
))
MD3DialogDescription.displayName = 'MD3DialogDescription'

const MD3DialogIcon = ({
  className,
  icon,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { icon: string }) => (
  <div className={cn('flex justify-center mb-4', className)} {...props}>
    <div className="w-12 h-12 flex items-center justify-center text-secondary">
      <MaterialIcon icon={icon} className="h-6 w-6" />
    </div>
  </div>
)
MD3DialogIcon.displayName = 'MD3DialogIcon'

export {
  MD3Dialog,
  MD3DialogPortal,
  MD3DialogOverlay,
  MD3DialogClose,
  MD3DialogTrigger,
  MD3DialogContent,
  MD3DialogHeader,
  MD3DialogFooter,
  MD3DialogTitle,
  MD3DialogDescription,
  MD3DialogIcon,
}
