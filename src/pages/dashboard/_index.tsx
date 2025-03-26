import { Layout } from '../../components/layout'
import { Breadcrumb } from '../../components/ui/Breadcrumb'
import { LineChart, PieChart } from '../../components/ui/charts'
import { StatsCard } from '../../components/ui/StatsCard'
import { useAuth } from '../../lib/auth/hooks'

interface User {
  fullName: string | null
  // existing user properties
}

export default function Dashboard(): JSX.Element {
  const { user } = useAuth()

  // Example data - replace with real data from your API
  const sessionData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    data: [65, 59, 80, 81, 56, 55, 40],
  }

  const userTypesData = {
    labels: ['Clients', 'Therapists', 'Admins'],
    data: [300, 50, 5],
  }

  return (
    <Layout>
      <div className="px-4 pt-6">
        <Breadcrumb
          items={[{ name: 'Dashboard', href: '/dashboard', current: true }]}
        />

        <div className="mt-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Welcome back, {(user as User)?.fullName || 'User'}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Here's what's happening with your therapy platform today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <StatsCard
            title="Active Sessions"
            value="24"
            trend={{ value: 12, isPositive: true, label: 'vs last week' }}
            icon={
              <svg
                className="w-6 h-6 text-purple-600 dark:text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                />
              </svg>
            }
          />

          <StatsCard
            title="Total Users"
            value="355"
            trend={{ value: 8.2, isPositive: true, label: 'vs last month' }}
            icon={
              <svg
                className="w-6 h-6 text-purple-600 dark:text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            }
          />

          <StatsCard
            title="Response Time"
            value="124ms"
            trend={{ value: 3.2, isPositive: false, label: 'vs last hour' }}
            icon={
              <svg
                className="w-6 h-6 text-purple-600 dark:text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />

          <StatsCard
            title="System Health"
            value="98.9%"
            description="All systems operational"
            icon={
              <svg
                className="w-6 h-6 text-purple-600 dark:text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
        </div>

        {/* Charts */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="bg-white rounded-lg shadow-sm dark:bg-gray-800 p-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Weekly Sessions
            </h3>
            <LineChart
              data={sessionData.data}
              labels={sessionData.labels}
              label="Sessions"
            />
          </div>

          <div className="bg-white rounded-lg shadow-sm dark:bg-gray-800 p-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              User Distribution
            </h3>
            <PieChart data={userTypesData.data} labels={userTypesData.labels} />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-sm dark:bg-gray-800 p-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Recent Activity
            </h3>
            <div className="flow-root">
              <ul className="-mb-8">
                {[1, 2, 3].map((item, itemIdx) => (
                  <li key={itemIdx}>
                    <div className="relative pb-8">
                      {itemIdx !== 2 ? (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center ring-8 ring-white dark:ring-gray-800">
                            <svg
                              className="h-5 w-5 text-purple-600 dark:text-purple-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                              />
                            </svg>
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              New session started with{' '}
                              <a
                                href="#"
                                className="font-medium text-purple-600 dark:text-purple-400"
                              >
                                Client #123
                              </a>
                            </p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              2 minutes ago
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
