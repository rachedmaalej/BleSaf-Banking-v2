import * as React from 'react'
import { cn } from '@/lib/utils'

export interface MD3NavigationBarItemProps {
  icon: React.ReactNode
  activeIcon?: React.ReactNode
  label: string
  active?: boolean
  badge?: string | number
  onClick?: () => void
}

const MD3NavigationBarItem = React.forwardRef<
  HTMLButtonElement,
  MD3NavigationBarItemProps
>(({ icon, activeIcon, label, active, badge, onClick }, ref) => {
  return (
    <button
      ref={ref}
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center justify-center gap-1 py-3 px-4 flex-1 transition-all duration-md3-medium1 ease-md3-standard md3-state-layer',
        'min-w-0 max-w-[120px]'
      )}
    >
      {/* Icon Container with Active Indicator */}
      <div
        className={cn(
          'relative flex items-center justify-center h-8 w-16 rounded-md3-lg transition-all duration-md3-medium1 ease-md3-standard',
          active && 'bg-secondary-container'
        )}
      >
        <div
          className={cn(
            'relative transition-colors duration-md3-short4',
            active ? 'text-on-secondary-container' : 'text-on-surface-variant'
          )}
        >
          {active && activeIcon ? activeIcon : icon}
        </div>

        {/* Badge */}
        {badge && (
          <div
            className={cn(
              'absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-md3-full bg-error text-on-error md3-label-small',
              typeof badge === 'number' && badge > 999 ? 'px-1.5' : ''
            )}
          >
            {typeof badge === 'number' && badge > 999 ? '999+' : badge}
          </div>
        )}
      </div>

      {/* Label */}
      <span
        className={cn(
          'md3-label-medium truncate w-full text-center transition-colors duration-md3-short4',
          active ? 'text-on-surface' : 'text-on-surface-variant'
        )}
      >
        {label}
      </span>
    </button>
  )
})
MD3NavigationBarItem.displayName = 'MD3NavigationBarItem'

export interface MD3NavigationBarProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode
}

const MD3NavigationBar = React.forwardRef<HTMLElement, MD3NavigationBarProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <nav
        ref={ref}
        className={cn(
          'flex items-center bg-surface-container shadow-md3-2 h-20',
          className
        )}
        {...props}
      >
        {children}
      </nav>
    )
  }
)
MD3NavigationBar.displayName = 'MD3NavigationBar'

export { MD3NavigationBar, MD3NavigationBarItem }
