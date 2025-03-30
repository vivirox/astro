import React from 'react'

type CalloutType = 'info' | 'warning' | 'success' | 'error'

interface CalloutProps {
  children: React.ReactNode
  type?: CalloutType
  title?: string
}

export function Callout({ children, type = 'info', title }: CalloutProps) {
  const bgColors = {
    info: 'bg-blue-50',
    warning: 'bg-amber-50',
    success: 'bg-green-50',
    error: 'bg-red-50',
  }

  const borderColors = {
    info: 'border-blue-200',
    warning: 'border-amber-200',
    success: 'border-green-200',
    error: 'border-red-200',
  }

  const textColors = {
    info: 'text-blue-800',
    warning: 'text-amber-800',
    success: 'text-green-800',
    error: 'text-red-800',
  }

  const icons = {
    info: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
    ),
    warning: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
    success: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ),
    error: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    ),
  }

  return (
    <div
      className={`p-4 my-4 rounded-md border ${bgColors[type]} ${borderColors[type]} ${textColors[type]}`}
    >
      <div className="flex">
        <div className="flex-shrink-0 mr-2">{icons[type]}</div>
        <div>
          {title && <p className="font-medium">{title}</p>}
          <div className="callout-content">{children}</div>
        </div>
      </div>
    </div>
  )
}
