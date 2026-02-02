import * as React from 'react'
import { cn } from '@/lib/utils'

export interface MD3ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  indeterminate?: boolean
  variant?: 'linear' | 'circular'
  size?: 'small' | 'medium' | 'large'
}

const MD3Progress = React.forwardRef<HTMLDivElement, MD3ProgressProps>(
  (
    {
      className,
      value = 0,
      max = 100,
      indeterminate = false,
      variant = 'linear',
      size = 'medium',
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

    if (variant === 'circular') {
      const sizeMap = {
        small: 24,
        medium: 48,
        large: 64,
      }
      const strokeWidthMap = {
        small: 3,
        medium: 4,
        large: 5,
      }

      const circleSize = sizeMap[size]
      const strokeWidth = strokeWidthMap[size]
      const radius = (circleSize - strokeWidth) / 2
      const circumference = radius * 2 * Math.PI
      const offset = circumference - (percentage / 100) * circumference

      return (
        <div
          ref={ref}
          className={cn('relative inline-flex', className)}
          style={{ width: circleSize, height: circleSize }}
          {...props}
        >
          <svg
            className={cn(
              'transform -rotate-90',
              indeterminate && 'animate-spin'
            )}
            width={circleSize}
            height={circleSize}
          >
            {/* Background circle */}
            <circle
              cx={circleSize / 2}
              cy={circleSize / 2}
              r={radius}
              strokeWidth={strokeWidth}
              className="stroke-surface-container-highest fill-none"
            />
            {/* Progress circle */}
            {!indeterminate && (
              <circle
                cx={circleSize / 2}
                cy={circleSize / 2}
                r={radius}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="stroke-primary fill-none transition-all duration-md3-medium2 ease-md3-standard"
              />
            )}
            {indeterminate && (
              <circle
                cx={circleSize / 2}
                cy={circleSize / 2}
                r={radius}
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference * 0.25} ${circumference * 0.75}`}
                strokeLinecap="round"
                className="stroke-primary fill-none"
              />
            )}
          </svg>
        </div>
      )
    }

    // Linear variant
    return (
      <div
        ref={ref}
        className={cn(
          'relative h-1 w-full overflow-hidden rounded-full bg-surface-container-highest',
          className
        )}
        {...props}
      >
        {indeterminate ? (
          <div className="absolute inset-0 bg-primary animate-[indeterminate_1.5s_ease-in-out_infinite]" />
        ) : (
          <div
            className="h-full bg-primary transition-all duration-md3-medium2 ease-md3-standard"
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>
    )
  }
)
MD3Progress.displayName = 'MD3Progress'

export { MD3Progress }

// Add this to your globals.css:
/*
@keyframes indeterminate {
  0% {
    transform: translateX(-100%);
    width: 30%;
  }
  50% {
    width: 30%;
  }
  70% {
    width: 70%;
  }
  90% {
    transform: translateX(100%);
    width: 30%;
  }
  100% {
    transform: translateX(100%);
    width: 30%;
  }
}
*/
