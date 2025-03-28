import type { APIRoute } from 'astro'
import { isAuthenticated } from '../../lib/auth'
import { getLogger } from '../../lib/logging'

const logger = getLogger()

export const GET: APIRoute = async ({ cookies }) => {
  try {
    // Check authentication
    const authenticated = await isAuthenticated(cookies)
    if (!authenticated) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // TODO: Replace with actual data from database
    const mockData = {
      stats: {
        sessionsThisWeek: 3,
        totalPracticeHours: 12.5,
        progressScore: 85,
      },
      recentSessions: [
        {
          id: 'session-1',
          type: 'chat',
          timestamp: new Date(),
          title: 'Mental Health Chat',
        },
        {
          id: 'session-2',
          type: 'simulator',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
          title: 'Practice Session: Anxiety Management',
        },
      ],
      securityLevel: 'hipaa',
    }

    return new Response(JSON.stringify(mockData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    logger.error('Dashboard API error:', {
      error: error instanceof Error ? error.message : String(error),
    })
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
