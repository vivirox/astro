import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '../../lib/utils'

export interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  /**
   * Whether the label is required
   */
  required?: boolean
  /**
   * Whether the label should show an optional indicator
   */
  optional?: boolean
  /**
   * Whether the label is for an input with an error
   */
  error?: boolean
  /**
   * Whether the label is for a disabled input
   */
  disabled?: boolean
}

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(
  (
    { className, children, required, optional, error, disabled, ...props },
    ref,
  ) => (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        error && 'text-destructive',
        disabled && 'opacity-70 cursor-not-allowed',
        className,
      )}
      {...props}
    >
      {children}
      {required && <span className="text-destructive ml-1">*</span>}
      {optional && (
        <span className="text-muted-foreground ml-1">(optional)</span>
      )}
    </LabelPrimitive.Root>
  ),
)

Label.displayName = 'Label'

export { Label }
