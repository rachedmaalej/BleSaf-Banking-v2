import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const md3TextFieldVariants = cva(
  'flex w-full transition-all duration-md3-short4 ease-md3-standard focus-within:outline-none disabled:cursor-not-allowed disabled:opacity-38',
  {
    variants: {
      variant: {
        filled:
          'bg-surface-container-highest rounded-t-md3-xs border-b-2 border-on-surface-variant focus-within:border-primary hover:bg-on-surface/[0.08]',
        outlined:
          'bg-transparent rounded-md3-xs border border-outline focus-within:border-2 focus-within:border-primary hover:border-on-surface',
      },
      hasError: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      {
        variant: 'filled',
        hasError: true,
        className: 'border-error focus-within:border-error hover:bg-error/[0.08]',
      },
      {
        variant: 'outlined',
        hasError: true,
        className: 'border-error focus-within:border-error',
      },
    ],
    defaultVariants: {
      variant: 'filled',
      hasError: false,
    },
  }
)

export interface MD3TextFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof md3TextFieldVariants> {
  label?: string
  supportingText?: string
  error?: string
  leadingIcon?: React.ReactNode
  trailingIcon?: React.ReactNode
}

const MD3TextField = React.forwardRef<HTMLInputElement, MD3TextFieldProps>(
  (
    {
      className,
      variant,
      label,
      supportingText,
      error,
      leadingIcon,
      trailingIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const [hasValue, setHasValue] = React.useState(!!props.value || !!props.defaultValue)
    const hasError = !!error

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      props.onFocus?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)
      props.onBlur?.(e)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(!!e.target.value)
      props.onChange?.(e)
    }

    const shouldFloatLabel = isFocused || hasValue || props.placeholder

    return (
      <div className={cn('relative w-full', className)}>
        <div
          className={cn(
            md3TextFieldVariants({ variant, hasError }),
            'relative overflow-hidden'
          )}
        >
          {/* Leading Icon */}
          {leadingIcon && (
            <div className="flex items-center pl-3 text-on-surface-variant">
              {leadingIcon}
            </div>
          )}

          {/* Input Container */}
          <div className="relative flex-1">
            {/* Label */}
            {label && (
              <label
                className={cn(
                  'absolute left-0 transition-all duration-md3-short4 ease-md3-standard pointer-events-none md3-body-large',
                  variant === 'filled' ? 'top-4' : 'top-4',
                  shouldFloatLabel
                    ? variant === 'filled'
                      ? 'top-1 md3-body-small'
                      : '-top-2 bg-surface px-1 md3-body-small'
                    : '',
                  isFocused
                    ? hasError
                      ? 'text-error'
                      : 'text-primary'
                    : 'text-on-surface-variant',
                  leadingIcon && 'left-0',
                  !leadingIcon && variant === 'filled' && 'left-4',
                  !leadingIcon && variant === 'outlined' && 'left-4'
                )}
              >
                {label}
              </label>
            )}

            {/* Input */}
            <input
              ref={ref}
              className={cn(
                'w-full bg-transparent outline-none md3-body-large text-on-surface placeholder:text-on-surface-variant',
                variant === 'filled' && 'px-4 pt-6 pb-2',
                variant === 'outlined' && 'px-4 py-4',
                leadingIcon && 'pl-0',
                trailingIcon && 'pr-0',
                disabled && 'cursor-not-allowed'
              )}
              disabled={disabled}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onChange={handleChange}
              {...props}
            />
          </div>

          {/* Trailing Icon */}
          {trailingIcon && (
            <div className="flex items-center pr-3 text-on-surface-variant">
              {trailingIcon}
            </div>
          )}
        </div>

        {/* Supporting Text / Error */}
        {(supportingText || error) && (
          <p
            className={cn(
              'mt-1 px-4 md3-body-small',
              hasError ? 'text-error' : 'text-on-surface-variant'
            )}
          >
            {error || supportingText}
          </p>
        )}
      </div>
    )
  }
)
MD3TextField.displayName = 'MD3TextField'

export { MD3TextField, md3TextFieldVariants }
