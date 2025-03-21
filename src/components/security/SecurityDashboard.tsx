import { useState, useEffect } from 'react'
import type { SecurityEvent } from '../../lib/security/monitoring'
import {
  SecurityEventType,
  SecurityEventSeverity,
} from '../../lib/security/monitoring'

interface SecurityDashboardProps {
  className?: string
}

export function SecurityDashboard({ className }: SecurityDashboardProps) {
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<{
    type: SecurityEventType | 'all'
    severity: SecurityEventSeverity | 'all'
    timeRange: 'day' | 'week' | 'month' | 'all'
  }>({
    type: 'all',
    severity: 'all',
    timeRange: 'day',
  })

  // Fetch security events
  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true)

        // Build query params
        const params = new URLSearchParams()
        if (filter.type !== 'all') params.append('type', filter.type)
        if (filter.severity !== 'all')
          params.append('severity', filter.severity)
        if (filter.timeRange !== 'all')
          params.append('timeRange', filter.timeRange)

        const response = await fetch(
          `/api/security/events?${params.toString()}`
        )

        if (!response?.ok) {
          throw new Error(
            `Failed to fetch security events: ${response.statusText}`
          )
        }

        const data = await response?.json()
        setEvents(data)
        setError(null)
      } catch (error) {
        console.error('Error fetching security events:', error)
        setError('Failed to load security events. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [filter])

  // Get event counts by severity
  const severityCounts = events.reduce(
    (currentAcc, event) => {
      const newAcc = { ...currentAcc }
      newAcc[event.severity] = (newAcc[event.severity] || 0) + 1
      return newAcc
    },
    {} as Record<string, number>
  )

  // Get event counts by type
  const typeCounts = events.reduce(
    (currentAcc, event) => {
      const newAcc = { ...currentAcc }
      newAcc[event.type] = (newAcc[event.type] || 0) + 1
      return newAcc
    },
    {} as Record<string, number>
  )

  return (
    <div className={className}>
      <h2 className="text-2xl font-bold mb-4">Security Dashboard</h2>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-2">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Event Type Filter */}
          <div>
            <label className="block text-sm font-medium mb-1">Event Type</label>
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={filter.type}
              onChange={(e) =>
                setFilter({
                  ...filter,
                  type: e.target.value as SecurityEventType | 'all',
                })
              }
            >
              <option value="all">All Types</option>
              {Object.values(SecurityEventType).map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <label className="block text-sm font-medium mb-1">Severity</label>
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={filter.severity}
              onChange={(e) =>
                setFilter({
                  ...filter,
                  severity: e.target.value as SecurityEventSeverity | 'all',
                })
              }
            >
              <option value="all">All Severities</option>
              {Object.values(SecurityEventSeverity).map((severity) => (
                <option key={severity} value={severity}>
                  {severity}
                </option>
              ))}
            </select>
          </div>

          {/* Time Range Filter */}
          <div>
            <label className="block text-sm font-medium mb-1">Time Range</label>
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={filter.timeRange}
              onChange={(e) =>
                setFilter({
                  ...filter,
                  timeRange: e.target.value as 'day' | 'week' | 'month' | 'all',
                })
              }
            >
              <option value="day">Last 24 hours</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Events"
          value={events.length}
          className="bg-white dark:bg-gray-800"
        />
        <StatCard
          title="Critical Events"
          value={severityCounts[SecurityEventSeverity.CRITICAL] || 0}
          className="bg-red-50 dark:bg-red-900"
        />
        <StatCard
          title="High Severity"
          value={severityCounts[SecurityEventSeverity.HIGH] || 0}
          className="bg-orange-50 dark:bg-orange-900"
        />
        <StatCard
          title="Failed Logins"
          value={typeCounts[SecurityEventType.FAILED_LOGIN] || 0}
          className="bg-blue-50 dark:bg-blue-900"
        />
      </div>

      {/* Events Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <h3 className="text-lg font-semibold p-4 border-b">Security Events</h3>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
            <p className="mt-4">Loading security events...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center">
            <p>No security events found for the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {events.map((event, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(event.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {event.type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <SeverityBadge severity={event.severity} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {event.userId || 'Anonymous'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {event.ip || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 rounded-md text-xs"
                        onClick={() =>
                          alert(JSON.stringify(event.metadata, null, 2))
                        }
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
function StatCard({
  title,
  value,
  className = '',
}: {
  title: string
  value: number
  className?: string
}) {
  return (
    <div className={`rounded-lg shadow p-4 ${className}`}>
      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {title}
      </h4>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  )
}

// Severity badge componen
function SeverityBadge({ severity }: { severity: SecurityEventSeverity }) {
  let color = ''

  switch (severity) {
    case SecurityEventSeverity.CRITICAL:
      color = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
      break
    case SecurityEventSeverity.HIGH:
      color =
        'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100'
      break
    case SecurityEventSeverity.MEDIUM:
      color =
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
      break
    case SecurityEventSeverity.LOW:
      color =
        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
      break
  }

  return (
    <span
      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${color}`}
    >
      {severity}
    </span>
  )
}
