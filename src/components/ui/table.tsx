import React from 'react'
import { cn } from '../../lib/utils'

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  /** Whether the table should have a border */
  bordered?: boolean
  /** Whether the table should have striped rows */
  striped?: boolean
  /** Whether the table should be hoverable */
  hoverable?: boolean
  /** Whether the table should be compact */
  compact?: boolean
  /** Whether the table should be full width */
  fullWidth?: boolean
  /** Whether the table should have a sticky header */
  stickyHeader?: boolean
  /** Additional class name */
  className?: string
}

function Table({
  bordered = false,
  fullWidth = true,
  className,
  children,
  ...props
}: TableProps) {
  // Remove unused props from props object to avoid linter errors
  const { striped, hoverable, compact, stickyHeader, ...restProps } = props

  return (
    <div
      className={cn('relative w-full overflow-auto', {
        'overflow-x-auto': true,
      })}
    >
      <table
        className={cn(
          'border-collapse w-full text-sm',
          {
            'w-full': fullWidth,
            'border border-gray-200 dark:border-gray-700': bordered,
          },
          className,
        )}
        {...restProps}
      >
        {children}
      </table>
    </div>
  )
}

export interface TableHeaderProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {
  className?: string
}

function TableHeader({ className, ...props }: TableHeaderProps) {
  return (
    <thead
      className={cn('bg-gray-50 dark:bg-gray-800', className)}
      {...props}
    />
  )
}

export interface TableBodyProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {
  className?: string
}

function TableBody({ className, ...props }: TableBodyProps) {
  return (
    <tbody
      className={cn('divide-y divide-gray-200 dark:divide-gray-700', className)}
      {...props}
    />
  )
}

export interface TableFooterProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {
  className?: string
}

function TableFooter({ className, ...props }: TableFooterProps) {
  return (
    <tfoo
      className={cn('bg-gray-50 dark:bg-gray-800 font-medium', className)}
      {...props}
    />
  )
}

export interface TableRowProps
  extends React.HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean
  className?: string
}

function TableRow({ selected = false, className, ...props }: TableRowProps) {
  return (
    <tr
      className={cn(
        'transition-colors',
        {
          'hover:bg-gray-100 dark:hover:bg-gray-800/50': true,
          'bg-blue-50 dark:bg-blue-900/20': selected,
        },
        className,
      )}
      {...props}
    />
  )
}

export interface TableHeadProps
  extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** Whether the column is sortable */
  sortable?: boolean
  /** Whether the column is currently sorted ascending */
  sortAsc?: boolean
  /** Whether the column is currently sorted descending */
  sortDesc?: boolean
  /** Function to call when sort direction is changed */
  onSort?: () => void
  className?: string
}

function TableHead({
  sortable = false,
  sortAsc = false,
  sortDesc = false,
  onSort,
  className,
  children,
  ...props
}: TableHeadProps) {
  return (
    <th
      className={cn(
        'h-12 px-4 text-left align-middle font-medium text-gray-500 dark:text-gray-400',
        'border-b border-gray-200 dark:border-gray-700',
        { 'cursor-pointer select-none': sortable },
        className,
      )}
      onClick={sortable ? onSort : undefined}
      {...props}
    >
      {sortable ? (
        <div className="flex items-center gap-2">
          <span>{children}</span>
          <span className="flex flex-col">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={cn('h-2 w-2', {
                'text-gray-700 dark:text-gray-300': sortAsc,
                'text-gray-400 dark:text-gray-600': !sortAsc,
              })}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
            </svg>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={cn('h-2 w-2', {
                'text-gray-700 dark:text-gray-300': sortDesc,
                'text-gray-400 dark:text-gray-600': !sortDesc,
              })}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </span>
        </div>
      ) : (
        children
      )}
    </th>
  )
}

export interface TableCellProps
  extends React.TdHTMLAttributes<HTMLTableCellElement> {
  className?: string
}

function TableCell({ className, ...props }: TableCellProps) {
  return <td className={cn('p-4 align-middle', className)} {...props} />
}

export interface TablePaginationProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Current page (1-based) */
  currentPage: number
  /** Total number of pages */
  totalPages: number
  /** Function to call when page is changed */
  onPageChange: (page: number) => void
  /** Whether to show page size select */
  showPageSize?: boolean
  /** Available page sizes */
  pageSizes?: number[]
  /** Current page size */
  pageSize?: number
  /** Function to call when page size is changed */
  onPageSizeChange?: (pageSize: number) => void
  /** Additional class name */
  className?: string
}

function TablePagination({
  currentPage,
  totalPages,
  onPageChange,
  showPageSize = false,
  pageSizes = [10, 25, 50, 100],
  pageSize = 10,
  onPageSizeChange,
  className,
  ...props
}: TablePaginationProps) {
  // Calculate visible page range
  const getVisiblePages = () => {
    const pages = []
    let startPage = Math.max(1, currentPage - 2)
    const endPage = Math.min(totalPages, startPage + 4)

    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }

    return pages
  }

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200 px-4 py-3 dark:border-gray-700',
        className,
      )}
      {...props}
    >
      {showPageSize && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700 dark:text-gray-300">Show</span>
          <select
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
            value={pageSize}
            onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md',
            'text-gray-500 dark:text-gray-400',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'disabled:opacity-50 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent',
          )}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {getVisiblePages().map((page) => (
          <button
            key={page}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-md text-sm',
              {
                'bg-primary text-white': currentPage === page,
                'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800':
                  currentPage !== page,
              },
            )}
            onClick={() => onPageChange(page)}
            aria-label={`Page ${page}`}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            {page}
          </button>
        ))}

        <button
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md',
            'text-gray-500 dark:text-gray-400',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'disabled:opacity-50 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent',
          )}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      <div className="text-sm text-gray-700 dark:text-gray-300">
        Page <span className="font-medium">{currentPage}</span> of{' '}
        <span className="font-medium">{totalPages}</span>
      </div>
    </div>
  )
}

export {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
}
