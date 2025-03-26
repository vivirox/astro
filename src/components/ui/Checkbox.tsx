import React, { forwardRef } from 'react'

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Size of the checkbox */
  size?: 'sm' | 'md' | 'lg'
  /** Label for the checkbox */
  label?: string
  /** Error message to display */
  error?: string
  /** Helper text to display */
  helperText?: string
  /** Whether the checkbox is required */
  isRequired?: boolean
  /** Whether the checkbox is disabled */
  isDisabled?: boolean
  /** Whether the checkbox is indeterminate */
  isIndeterminate?: boolean
  /** Additional wrapper className for styling */
  wrapperClassName?: string
  /** Additional className for styling */
  className?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      size = 'md',
      label,
      error,
      helperText,
      isRequired = false,
      isDisabled = false,
      isIndeterminate = false,
      wrapperClassName = '',
      className = '',
      ...props
    },
    ref,
  ) => {
    // Base checkbox classes
    const baseCheckboxClasses =
      'rounded border text-primary focus:ring-primary bg-white dark:bg-gray-900'

    // Size-specific checkbox classes
    const sizeCheckboxClasses = {
      sm: 'w-3.5 h-3.5',
      md: 'w-4 h-4',
      lg: 'w-5 h-5',
    }

    // Error state classes
    const errorCheckboxClasses = error
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 dark:border-gray-600'

    // Disabled state classes
    const disabledCheckboxClasses = isDisabled
      ? 'opacity-60 cursor-not-allowed'
      : ''

    // Combined checkbox classes
    const checkboxClasses = [
      baseCheckboxClasses,
      sizeCheckboxClasses[size],
      errorCheckboxClasses,
      disabledCheckboxClasses,
      className,
    ].join(' ')

    // Font size for label based on checkbox size
    const labelSizeClasses = {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    }

    // Effect: Handle indeterminate state
    React.useEffect(() => {
      if (ref && 'current' in ref && ref.current) {
        ref.current.indeterminate = isIndeterminate
      }
    }, [ref, isIndeterminate])

    return (
      <div className={`${wrapperClassName}`}>
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              ref={ref}
              type="checkbox"
              className={checkboxClasses}
              disabled={isDisabled}
              required={isRequired}
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
          </div>

          {label && (
            <div className="ml-2 text-sm">
              <label
                htmlFor={props.id}
                className={`font-medium text-gray-700 dark:text-gray-300 ${labelSizeClasses[size]} ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {label}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </label>
            </div>
          )}
        </div>

        {(error || helperText) && (
          <div className="mt-1 ml-6 text-sm">
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
  },
)

Checkbox.displayName = 'Checkbox'

export default Checkbox
