import React from 'react'
import { Toaster, type ToastOptions, toast as hotToast } from 'react-hot-toast'
import { cn } from '../../lib/utils'

// Types for toast options
export interface ToastProps extends Omit<ToastOptions, 'icon'> {
  message: string
  icon?: React.ReactNode
}

// Common toast options
const defaultOptions: Partial<ToastOptions> = {
  duration: 3000,
  position: 'bottom-right',
}

// Toast component that provides the Toaster container
export function Toast({
  position = 'bottom-right',
  toastOptions,
  className,
}: {
  position?: ToastOptions['position']
  toastOptions?: Partial<ToastOptions>
  className?: string
}) {
  return (
    <Toaster
      position={position}
      toastOptions={{
        className: cn(
          'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-lg rounded-md',
          className
        ),
        success: {
          className: cn(
            'bg-white dark:bg-gray-800 border-l-4 border-green-500',
            className
          ),
          iconTheme: {
            primary: '#10B981',
            secondary: 'white',
          },
        },
        error: {
          className: cn(
            'bg-white dark:bg-gray-800 border-l-4 border-red-500',
            className
          ),
          iconTheme: {
            primary: '#EF4444',
            secondary: 'white',
          },
        },
        ...toastOptions,
      }}
    />
  )
}

// Promise toast message types
interface ToastPromiseMessages<TData> {
  loading: string
  success: string | ((data: TData) => string)
  error: string | ((err: unknown) => string)
}

// Utility functions to show different types of toasts
export const toast = {
  // Base toast method
  custom: ({ message, icon, ...options }: ToastProps) => {
    return hotToast.custom(
      (t) => (
        <div
          className={cn(
            'flex items-center p-4 bg-white dark:bg-gray-800 rounded-md shadow-md',
            'max-w-md w-full',
            t.visible ? 'animate-enter' : 'animate-leave'
          )}
        >
          {icon && <div className="flex-shrink-0 mr-3">{icon}</div>}
          <div className="flex-1">{message}</div>
          <button
            onClick={() => hotToast.dismiss(t.id)}
            className="ml-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
          >
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      ),
      {
        ...defaultOptions,
        ...options,
      }
    )
  },

  // Success toast
  success: (message: string, options?: Partial<ToastOptions>) => {
    return hotToast.success(message, {
      ...defaultOptions,
      ...options,
    })
  },

  // Error toast
  error: (message: string, options?: Partial<ToastOptions>) => {
    return hotToast.error(message, {
      ...defaultOptions,
      ...options,
    })
  },

  // Info toast
  info: (message: string, options?: Partial<ToastOptions>) => {
    return hotToast(message, {
      ...defaultOptions,
      ...options,
      icon: (
        <svg
          className="w-5 h-5 text-blue-500"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      ),
    })
  },

  // Warning toast
  warning: (message: string, options?: Partial<ToastOptions>) => {
    return hotToast(message, {
      ...defaultOptions,
      ...options,
      icon: (
        <svg
          className="w-5 h-5 text-yellow-500"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      ),
    })
  },

  // Loading toast
  loading: (message: string, options?: Partial<ToastOptions>) => {
    return hotToast.loading(message, {
      ...defaultOptions,
      ...options,
    })
  },

  // Promise toast with proper TypeScript generics
  promise: function promiseToast<T>(
    promise: Promise<T>,
    messages: ToastPromiseMessages<T>,
    options?: Partial<ToastOptions>
  ) {
    return hotToast.promise(
      promise,
      {
        loading: messages.loading,
        success: messages.success,
        error: messages.error,
      },
      {
        ...defaultOptions,
        ...options,
      }
    )
  },

  // Dismiss toast
  dismiss: (toastId?: string) => {
    hotToast.dismiss(toastId)
  },
}

export default Toast
