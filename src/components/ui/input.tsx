import React, { forwardRef } from 'react'

export type InputSize = 'sm' | 'md' | 'lg'
export type InputVariant = 'default' | 'filled' | 'flushed' | 'unstyled'

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Input size */
  size?: InputSize
  /** Input variant */
  variant?: InputVariant
  /** Error message to display */
  error?: string
  /** Helper text to display below input */
  helperText?: string
  /** Left icon or element */
  leftElement?: React.ReactNode
  /** Right icon or element */
  rightElement?: React.ReactNode
  /** Label for the input */
  label?: string
  /** Whether the input is required */
  isRequired?: boolean
  /** Whether the input is disabled */
  isDisabled?: boolean
  /** Whether the input is read-only */
  isReadOnly?: boolean
  /** Make input take full width */
  fullWidth?: boolean
  /** Additional wrapper className for styling */
  wrapperClassName?: string
  /** Additional className for styling */
  className?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = 'md',
      variant = 'default',
      error,
      helperText,
      leftElement,
      rightElement,
      label,
      isRequired = false,
      isDisabled = false,
      isReadOnly = false,
      fullWidth = true,
      wrapperClassName = '',
      className = '',
      ...props
    },
    ref
  ) => {
    // Base classes for input
    const baseInputClasses =
      'block bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md placeholder-gray-400 disabled:opacity-60 disabled:cursor-not-allowed read-only:opacity-60'

    // Variant-specific input classes
    const variantInputClasses = {
      default:
        'border border-gray-300 dark:border-gray-700 focus:border-primary focus:ring-primary dark:focus:border-primary dark:focus:ring-primary',
      filled:
        'bg-gray-100 dark:bg-gray-800 border border-transparent focus:bg-white dark:focus:bg-gray-900 focus:border-primary focus:ring-primary dark:focus:border-primary dark:focus:ring-primary',
      flushed:
        'border-b border-gray-300 dark:border-gray-700 rounded-none focus:border-primary focus:ring-primary dark:focus:border-primary dark:focus:ring-primary',
      unstyled: 'border-none shadow-none focus:ring-0',
    }

    // Size-specific input classes
    const sizeInputClasses = {
      sm: 'py-1.5 px-3 text-sm',
      md: 'py-2 px-4 text-base',
      lg: 'py-2.5 px-5 text-lg',
    }

    // Error state classes
    const errorInputClasses = error
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-400 dark:focus:border-red-400 dark:focus:ring-red-400'
      : ''

    // Width classes
    const widthClasses = fullWidth ? 'w-full' : ''

    // Combined input classes
    const inputClasses = [
      baseInputClasses,
      variantInputClasses[variant],
      sizeInputClasses[size],
      errorInputClasses,
      widthClasses,
      className,
    ].join(' ')

    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${wrapperClassName}`}>
        {label && (
          <label
            className={`block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 ${isDisabled ? 'opacity-60' : ''}`}
          >
            {label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {leftElement && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
              {leftElement}
            </div>
          )}

          <input
            ref={ref}
            className={inputClasses}
            disabled={isDisabled}
            readOnly={isReadOnly}
            style={{
              paddingLeft: leftElement ? 'calc(1.5rem + 0.75rem)' : undefined,
              paddingRight: rightElement ? 'calc(1.5rem + 0.75rem)' : undefined,
            }}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error
                ? `${props.id}-error`
                : helperText
                  ? `${props.id}-helper`
                  : undefined
            }
            {...props}
          />

          {rightElement && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
              {rightElement}
            </div>
          )}
        </div>

        {(error || helperText) && (
          <div className="mt-1 text-sm">
            {error ? (
              <p id={`${props.id}-error`} className="text-red-500">
                {error}
              </p>
            ) : helperText ? (
              <p
                id={`${props.id}-helper`}
                className="text-gray-500 dark:text-gray-400"
              >
                {helperText}
              </p>
            ) : null}
          </div>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
