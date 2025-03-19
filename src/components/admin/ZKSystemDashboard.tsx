import React, { useState, useEffect } from "react";
import { zkAuth } from "../../lib/auth";
import { zkChat } from "../../lib/chat";

/**
 * Admin dashboard for monitoring the ZK system
 */
export default function ZKSystemDashboard() {
  const [stats, setStats] = useState({
    totalProofs: 0,
    validProofs: 0,
    invalidProofs: 0,
    authProofs: 0,
    chatProofs: 0,
    encryptedMessages: 0,
    averageVerificationTime: 0,
  });

  const [recentActivity, setRecentActivity] = useState<
    Array<{
      id: string;
      type: "auth" | "chat";
      action: string;
      timestamp: number;
      status: "valid" | "invalid" | "pending";
    }>
  >([]);

  useEffect(() => {
    // In a real implementation, this would fetch actual stats from the server
    // For now, we'll use mock data
    const fetchStats = async () => {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setStats({
        totalProofs: 128,
        validProofs: 125,
        invalidProofs: 3,
        authProofs: 42,
        chatProofs: 86,
        encryptedMessages: 64,
        averageVerificationTime: 120, // ms
      });
    };

    const fetchRecentActivity = async () => {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setRecentActivity([
        {
          id: "proof-1",
          type: "auth",
          action: "session_verification",
          timestamp: Date.now() - 5 * 60 * 1000,
          status: "valid",
        },
        {
          id: "proof-2",
          type: "chat",
          action: "message_encryption",
          timestamp: Date.now() - 10 * 60 * 1000,
          status: "valid",
        },
        {
          id: "proof-3",
          type: "chat",
          action: "sender_verification",
          timestamp: Date.now() - 15 * 60 * 1000,
          status: "invalid",
        },
        {
          id: "proof-4",
          type: "auth",
          action: "login_attempts_verification",
          timestamp: Date.now() - 20 * 60 * 1000,
          status: "valid",
        },
        {
          id: "proof-5",
          type: "chat",
          action: "message_verification",
          timestamp: Date.now() - 25 * 60 * 1000,
          status: "pending",
        },
      ]);
    };

    fetchStats();
    fetchRecentActivity();

    // Set up polling for real-time updates
    const interval = setInterval(() => {
      fetchStats();
      fetchRecentActivity();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="zk-system-dashboard">
      <h1>Zero-Knowledge System Dashboard</h1>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Total Proofs</h3>
          <div className="stat-value">{stats.totalProofs}</div>
        </div>

        <div className="stat-card">
          <h3>Valid Proofs</h3>
          <div className="stat-value">{stats.validProofs}</div>
          <div className="stat-percentage">
            {stats.totalProofs > 0
              ? Math.round((stats.validProofs / stats.totalProofs) * 100)
              : 0}
            %
          </div>
        </div>

        <div className="stat-card">
          <h3>Invalid Proofs</h3>
          <div className="stat-value">{stats.invalidProofs}</div>
          <div className="stat-percentage">
            {stats.totalProofs > 0
              ? Math.round((stats.invalidProofs / stats.totalProofs) * 100)
              : 0}
            %
          </div>
        </div>

        <div className="stat-card">
          <h3>Auth Proofs</h3>
          <div className="stat-value">{stats.authProofs}</div>
        </div>

        <div className="stat-card">
          <h3>Chat Proofs</h3>
          <div className="stat-value">{stats.chatProofs}</div>
        </div>

        <div className="stat-card">
          <h3>Encrypted Messages</h3>
          <div className="stat-value">{stats.encryptedMessages}</div>
        </div>

        <div className="stat-card">
          <h3>Avg. Verification Time</h3>
          <div className="stat-value">{stats.averageVerificationTime} ms</div>
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
          <h3>ZK Proof Service</h3>
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
  );
}
