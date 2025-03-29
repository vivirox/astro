import React, { forwardRef } from 'react'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** Options for the select */
  options: SelectOption[]
  /** Size of the select */
  size?: 'sm' | 'md' | 'lg'
  /** Error message to display */
  error?: string
  /** Helper text to display below select */
  helperText?: string
  /** Label for the select */
  label?: string
  /** Placeholder text (first disabled option) */
  placeholder?: string
  /** Whether the select is required */
  isRequired?: boolean
  /** Whether the select is disabled */
  isDisabled?: boolean
  /** Make select take full width */
  fullWidth?: boolean
  /** Additional wrapper className for styling */
  wrapperClassName?: string
  /** Additional className for styling */
  className?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      options,
      size = 'md',
      error,
      helperText,
      label,
      placeholder,
      isRequired = false,
      isDisabled = false,
      fullWidth = true,
      wrapperClassName = '',
      className = '',
      ...props
    },
    ref,
  ) => {
    // Base classes for selec
    const baseSelectClasses =
      'block bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md border border-gray-300 dark:border-gray-700 appearance-none focus:border-primary focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed'

    // Size-specific select classes
    const sizeSelectClasses = {
      sm: 'py-1.5 pl-3 pr-8 text-sm',
      md: 'py-2 pl-4 pr-9 text-base',
      lg: 'py-2.5 pl-5 pr-10 text-lg',
    }

    // Error state classes
    const errorSelectClasses = error
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-400 dark:focus:border-red-400 dark:focus:ring-red-400'
      : ''

    // Width classes
    const widthClasses = fullWidth ? 'w-full' : ''

    // Combined select classes
    const selectClasses = [
      baseSelectClasses,
      sizeSelectClasses[size],
      errorSelectClasses,
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
          <select
            ref={ref}
            className={selectClasses}
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
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          {/* Custom arrow */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
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
  },
)

Select.displayName = 'Select'

export default Select

// Additional components for advanced select functionality
export const SelectTrigger = ({
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className="select-trigger" {...props}>
    {children}
  </div>
)

export const SelectValue = ({
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className="select-value" {...props}>
    {children}
  </span>
)

export const SelectContent = ({
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className="select-content" {...props}>
    {children}
  </div>
)

export const SelectItem = ({
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className="select-item" {...props}>
    {children}
  </div>
)
