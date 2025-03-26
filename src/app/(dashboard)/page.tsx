import React from 'react'
import { Layout } from '@/components/layout'
import { useDashboard } from '@/hooks/useDashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

export const metadata = {
  title: 'Dashboard | Gradiant Therapy',
  description: 'Your therapy dashboard - Overview and quick access to all features',
}

export default function DashboardPage() {
  const { data, loading, error } = useDashboard()

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex flex-col gap-6">
          {/* Welcome Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-1">
                Welcome Back
              </h1>
              <p className="text-muted-foreground">
                Here's an overview of your therapy space
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">Security Level</p>
                <p className="text-xs text-muted-foreground">
                  {loading ? (
                    <Skeleton className="h-4 w-24" />
                  ) : (
                    data?.securityLevel === 'maximum'
                      ? 'Maximum (FHE)'
                      : data?.securityLevel === 'hipaa'
                        ? 'HIPAA Compliant'
                        : 'Standard'
                  )}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-lg">security</span>
              </div>
            </div>
          </div>

          {/* Quick Access Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-600">
                    psychology
                  </span>
                  Mental Health Chat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Start a therapeutic conversation with our AI-powered mental health
                  assistant
                </p>
                <a
                  href="/mental-health-chat"
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  Open Chat →
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600">
                    exercise
                  </span>
                  Practice Simulator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Practice therapeutic techniques in a safe, private environment
                </p>
                <a
                  href="/simulator"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Start Practice →
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-600">
                    analytics
                  </span>
                  Progress Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  View insights and progress from your therapeutic journey
                </p>
                <button
                  onClick={() => {}} // Will be implemented later
                  className="text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  View Analytics →
                </button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    <>
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </>
                  ) : data?.recentSessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No recent sessions found
                    </p>
                  ) : (
                    data?.recentSessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center gap-4 p-3 bg-secondary/10 rounded-lg"
                      >
                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <span
                            className={`material-symbols-outlined ${
                              session.type === 'chat'
                                ? 'text-purple-600'
                                : 'text-blue-600'
                            }`}
                          >
                            {session.type === 'chat' ? 'chat' : 'exercise'}
                          </span>
                        </div>
                        <div className="flex-grow">
                          <p className="text-sm font-medium">{session.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(session.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <a
                          href={`/${session.type}/${session.id}`}
                          className="text-sm text-purple-600 hover:text-purple-700"
                        >
                          View →
                        </a>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    <>
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Sessions This Week
                        </span>
                        <span className="text-2xl font-bold">
                          {data?.stats.sessionsThisWeek}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Total Practice Hours
                        </span>
                        <span className="text-2xl font-bold">
                          {data?.stats.totalPracticeHours}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Progress Score
                        </span>
                        <span className="text-2xl font-bold">
                          {data?.stats.progressScore}%
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}