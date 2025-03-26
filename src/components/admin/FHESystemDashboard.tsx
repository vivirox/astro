import React, { useEffect, useState } from 'react'

/**
 * Admin dashboard for monitoring the FHE system
 */
export default function FHESystemDashboard() {
  const [stats, setStats] = useState({
    totalOperations: 0,
    encryptedData: 0,
    homomorphicOperations: 0,
    authOperations: 0,
    chatOperations: 0,
    encryptedMessages: 0,
    averageProcessingTime: 0,
  })

  const [recentActivity, setRecentActivity] = useState<
    {
      id: string
      type: 'auth' | 'chat'
      action: string
      timestamp: number
      status: 'success' | 'failed' | 'pending'
    }[]
  >([])

  useEffect(() => {
    // In a real implementation, this would fetch actual stats from the server
    // For now, we'll use mock data
    const fetchStats = async () => {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setStats({
        totalOperations: 128,
        encryptedData: 125,
        homomorphicOperations: 86,
        authOperations: 42,
        chatOperations: 86,
        encryptedMessages: 64,
        averageProcessingTime: 120, // ms
      })
    }

    const fetchRecentActivity = async () => {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setRecentActivity([
        {
          id: 'proof-1',
          type: 'auth',
          action: 'session_verification',
          timestamp: Date.now() - 5 * 60 * 1000,
          status: 'success',
        },
        {
          id: 'proof-2',
          type: 'chat',
          action: 'message_encryption',
          timestamp: Date.now() - 10 * 60 * 1000,
          status: 'success',
        },
        {
          id: 'proof-3',
          type: 'chat',
          action: 'sender_verification',
          timestamp: Date.now() - 15 * 60 * 1000,
          status: 'failed',
        },
        {
          id: 'proof-4',
          type: 'auth',
          action: 'login_attempts_verification',
          timestamp: Date.now() - 20 * 60 * 1000,
          status: 'success',
        },
        {
          id: 'proof-5',
          type: 'chat',
          action: 'message_verification',
          timestamp: Date.now() - 25 * 60 * 1000,
          status: 'pending',
        },
      ])
    }

    fetchStats()
    fetchRecentActivity()

    // Set up polling for real-time updates
    const interval = setInterval(() => {
      fetchStats()
      fetchRecentActivity()
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fhe-system-dashboard">
      <h1>Fully Homomorphic Encryption Dashboard</h1>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Total Operations</h3>
          <div className="stat-value">{stats.totalOperations}</div>
        </div>

        <div className="stat-card">
          <h3>Encrypted Data</h3>
          <div className="stat-value">{stats.encryptedData}</div>
        </div>

        <div className="stat-card">
          <h3>Homomorphic Operations</h3>
          <div className="stat-value">{stats.homomorphicOperations}</div>
        </div>

        <div className="stat-card">
          <h3>Auth Operations</h3>
          <div className="stat-value">{stats.authOperations}</div>
        </div>

        <div className="stat-card">
          <h3>Chat Operations</h3>
          <div className="stat-value">{stats.chatOperations}</div>
        </div>

        <div className="stat-card">
          <h3>Encrypted Messages</h3>
          <div className="stat-value">{stats.encryptedMessages}</div>
        </div>

        <div className="stat-card">
          <h3>Avg. Processing Time</h3>
          <div className="stat-value">{stats.averageProcessingTime} ms</div>
        </div>
      </div>

      <h2>Recent Activity</h2>
      <div className="recent-activity">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Action</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentActivity.map((activity) => (
              <tr key={activity.id}>
                <td>{activity.id}</td>
                <td>{activity.type}</td>
                <td>{activity.action}</td>
                <td>{new Date(activity.timestamp).toLocaleTimeString()}</td>
                <td>
                  <span className={`status-badge ${activity.status}`}>
                    {activity.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>System Health</h2>
      <div className="system-health">
        <div className="health-card">
          <h3>FHE Service</h3>
          <div className="health-status healthy">Operational</div>
        </div>

        <div className="health-card">
          <h3>Crypto System</h3>
          <div className="health-status healthy">Operational</div>
        </div>

        <div className="health-card">
          <h3>Key Rotation</h3>
          <div className="health-status healthy">Operational</div>
        </div>

        <div className="health-card">
          <h3>Circuit Compilation</h3>
          <div className="health-status warning">Degraded</div>
          <div className="health-message">
            High compilation times for complex circuits
          </div>
        </div>
      </div>
    </div>
  )
}
