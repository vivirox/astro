import React, { useEffect, useState } from 'react'
import { getLogger } from '../../lib/logging'

// Initialize logger
const logger = getLogger()

// System metrics type
interface SystemMetrics {
  activeUsers: number
  activeSessions: number
  sessionsToday: number
  totalTherapists: number
  totalClients: number
  messagesSent: number
  avgResponseTime: number
  systemLoad: number
  storageUsed: string
  activeSecurityLevel: 'standard' | 'hipaa' | 'maximum'
}

// Card props
interface MetricCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  color?: string
  loading?: boolean
}

/**
 * MetricCard component for displaying a single system metric
 */
const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  trend,
  color = 'purple',
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="min-w-0 rounded-lg shadow-xs overflow-hidden bg-white dark:bg-gray-800">
        <div className="p-4 flex items-center animate-pulse">
          <div className="p-3 rounded-full bg-gray-200 dark:bg-gray-700 mr-4">
            <div className="h-8 w-8"></div>
          </div>
          <div>
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xs overflow-hidden">
      <div className="p-4 flex items-center">
        <div
          className={`p-3 rounded-full bg-${color}-100 dark:bg-${color}-900 mr-4`}
        >
          <div className={`text-${color}-500 dark:text-${color}-100`}>
            {icon}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">
            {value}
          </p>
          {trend && (
            <div className="flex items-center text-sm mt-1">
              <span
                className={`text-${
                  trend.isPositive ? 'green' : 'red'
                }-500 mr-2`}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                vs last week
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * AdminDashboard component
 * Provides an overview of system metrics and stats
 */
export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const response = await fetch('/api/admin/metrics')
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch metrics')
        }

        setMetrics(data)
        setError(null)
      } catch (err) {
        logger.error('Error fetching metrics:', {
          error: err instanceof Error ? err.message : String(err),
        })
        setError('Failed to load system metrics')
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Monitor and manage your therapy platform's performance
        </p>
      </div>

      {error && (
        <div className="mb-8 bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-200 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Security Status */}
      <div className="mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xs p-4">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
              <svg
                className="w-6 h-6 text-purple-600 dark:text-purple-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Security Level
              </p>
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                {metrics?.activeSecurityLevel === 'maximum' ? (
                  <span className="text-green-600 dark:text-green-400">
                    Maximum (FHE)
                  </span>
                ) : metrics?.activeSecurityLevel === 'hipaa' ? (
                  <span className="text-blue-600 dark:text-blue-400">
                    HIPAA Compliant
                  </span>
                ) : (
                  <span className="text-yellow-600 dark:text-yellow-400">
                    Standard
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-6 mb-8 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Active Users"
          value={metrics?.activeUsers || 0}
          icon={
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clipRule="evenodd"
              />
            </svg>
          }
          trend={{ value: 12, isPositive: true }}
          loading={loading}
        />

        <MetricCard
          title="Active Sessions"
          value={metrics?.activeSessions || 0}
          icon={
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z"
                clipRule="evenodd"
              />
            </svg>
          }
          trend={{ value: 7, isPositive: true }}
          loading={loading}
          color="blue"
        />

        <MetricCard
          title="Average Response Time"
          value={`${metrics?.avgResponseTime || 0}ms`}
          icon={
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
          }
          trend={{ value: 3.2, isPositive: false }}
          loading={loading}
          color="yellow"
        />

        <MetricCard
          title="System Load"
          value={`${metrics?.systemLoad || 0}%`}
          icon={
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z"
                clipRule="evenodd"
              />
            </svg>
          }
          loading={loading}
          color="red"
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 mb-8 md:grid-cols-2">
        <div className="min-w-0 p-4 bg-white rounded-lg shadow-xs dark:bg-gray-800">
          <h4 className="mb-4 font-semibold text-gray-800 dark:text-gray-300">
            Daily Sessions
          </h4>
          {/* Add chart component here */}
          <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded-lg">
            {/* Placeholder for chart */}
          </div>
        </div>

        <div className="min-w-0 p-4 bg-white rounded-lg shadow-xs dark:bg-gray-800">
          <h4 className="mb-4 font-semibold text-gray-800 dark:text-gray-300">
            System Performance
          </h4>
          {/* Add chart component here */}
          <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded-lg">
            {/* Placeholder for chart */}
          </div>
        </div>
      </div>
    </div>
  )
}
