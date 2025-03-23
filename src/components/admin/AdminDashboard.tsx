import React, { useEffect, useState } from 'react'
import { getLogger } from '../../lib/logging'

// Initialize logger
const logger = getLogger()

// System metrics type
interface SystemMetrics {
  activeUsers: number
  activeSessions: number
  totalTherapists: number
  totalClients: number
  sessionsToday: number
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
}

/**
 * MetricCard component for displaying a single system metric
 */
const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  trend,
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
    <div className="flex justify-between items-start">
      <div>
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {title}
        </h3>
        <p className="text-2xl font-bold mt-2 text-gray-800 dark:text-gray-200">
          {value}
        </p>

        {trend && (
          <div className="mt-2 flex items-center">
            <span
              className={`material-symbols-outlined text-sm ${
                trend.isPositive ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {trend.isPositive ? 'trending_up' : 'trending_down'}
            </span>
            <span
              className={`ml-1 text-xs ${
                trend.isPositive ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {Math.abs(trend.value)}%
            </span>
            <span className="ml-1 text-xs text-gray-500">vs last week</span>
          </div>
        )}
      </div>

      <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400">
        {icon}
      </div>
    </div>
  </div>
)

/**
 * AdminDashboard component
 * Provides an overview of system metrics and stats
 */
export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch system metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/admin/metrics')

        if (!response.ok) {
          throw new Error('Failed to fetch metrics')
        }

        const data = await response.json()
        setMetrics(data.metrics)
      } catch (err) {
        logger.error('Error fetching admin metrics:', err)
        setError('Failed to load system metrics. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()

    // Set up polling for metrics
    const interval = setInterval(fetchMetrics, 60000) // update every minute

    return () => clearInterval(interval)
  }, [])

  // Handle loading state
  if (loading && !metrics) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  // Handle error state
  if (error) {
    return (
      <div
        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
        role="alert"
      >
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    )
  }

  // If we have metrics, render the dashboard
  return (
    <div className="admin-dashboard">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
          System Overview
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Current status of the Gradiant Therapy Chat System
        </p>
      </div>

      {/* Security Level Indicator */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="flex items-center">
          <span className="material-symbols-outlined mr-2 text-purple-600 dark:text-purple-400">
            security
          </span>
          <h3 className="text-md font-medium text-gray-800 dark:text-gray-200">
            Current Security Level:
            <span
              className={`ml-2 ${
                metrics?.activeSecurityLevel === 'maximum'
                  ? 'text-green-600 dark:text-green-400'
                  : metrics?.activeSecurityLevel === 'hipaa'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-yellow-600 dark:text-yellow-400'
              }`}
            >
              {metrics?.activeSecurityLevel === 'maximum'
                ? 'Maximum (FHE)'
                : metrics?.activeSecurityLevel === 'hipaa'
                  ? 'HIPAA Compliant'
                  : 'Standard'}
            </span>
          </h3>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Active Users"
          value={metrics?.activeUsers || 0}
          icon={<span className="material-symbols-outlined">person</span>}
          trend={{ value: 5.3, isPositive: true }}
        />

        <MetricCard
          title="Active Sessions"
          value={metrics?.activeSessions || 0}
          icon={<span className="material-symbols-outlined">chat</span>}
          trend={{ value: 2.7, isPositive: true }}
        />

        <MetricCard
          title="Sessions Today"
          value={metrics?.sessionsToday || 0}
          icon={
            <span className="material-symbols-outlined">calendar_today</span>
          }
          trend={{ value: 1.2, isPositive: true }}
        />

        <MetricCard
          title="Total Therapists"
          value={metrics?.totalTherapists || 0}
          icon={<span className="material-symbols-outlined">psychology</span>}
          trend={{ value: 8.4, isPositive: true }}
        />

        <MetricCard
          title="Total Clients"
          value={metrics?.totalClients || 0}
          icon={<span className="material-symbols-outlined">diversity_3</span>}
          trend={{ value: 12.8, isPositive: true }}
        />

        <MetricCard
          title="Messages Sent"
          value={metrics?.messagesSent || 0}
          icon={<span className="material-symbols-outlined">mail</span>}
          trend={{ value: 15.2, isPositive: true }}
        />

        <MetricCard
          title="Avg. Response Time"
          value={`${metrics?.avgResponseTime || 0}ms`}
          icon={<span className="material-symbols-outlined">speed</span>}
          trend={{ value: 3.1, isPositive: false }}
        />

        <MetricCard
          title="System Load"
          value={`${metrics?.systemLoad || 0}%`}
          icon={<span className="material-symbols-outlined">memory</span>}
        />

        <MetricCard
          title="Storage Used"
          value={metrics?.storageUsed || '0 MB'}
          icon={<span className="material-symbols-outlined">storage</span>}
        />
      </div>

      {/* Additional sections can be added here */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
          Recent Activity
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <p className="text-gray-600 dark:text-gray-400 text-center py-8">
            Activity monitoring coming soon...
          </p>
        </div>
      </div>
    </div>
  )
}
