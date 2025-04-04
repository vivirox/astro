import { mutation, query } from './_generated/server'
import { v } from 'convex/values'


export const list = query({
  args: {
    userId: v.optional(v.id('users')),
    sessionId: v.optional(v.id('sessions')),
    action: v.optional(
      v.union(
        v.literal('session_start'),
        v.literal('session_end'),
        v.literal('message_sent'),
        v.literal('assessment_created'),
        v.literal('assessment_updated'),
        v.literal('exercise_completed'),
        v.literal('resource_accessed'),
        v.literal('custom'),
      ),
    ),
    startAfter: v.optional(v.number()),
    startBefore: v.optional(v.number()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let analyticsQuery = ctx.db.query('analytics').order('desc')

    if (args.userId) {
      analyticsQuery = analyticsQuery.withIndex('by_user', (q) =>
        q.eq('userId', args.userId),
      )
    } else if (args.sessionId) {
      analyticsQuery = analyticsQuery.withIndex('by_session', (q) =>
        q.eq('sessionId', args.sessionId),
      )
    }

    if (args.action) {
      analyticsQuery = analyticsQuery.filter((q) =>
        q.eq(q.field('action'), args.action),
      )
    }

    if (args.startAfter) {
      analyticsQuery = analyticsQuery.filter((q) =>
        q.gt(q.field('timestamp'), args.startAfter),
      )
    }

    if (args.startBefore) {
      analyticsQuery = analyticsQuery.filter((q) =>
        q.lt(q.field('timestamp'), args.startBefore),
      )
    }

    if (args.cursor) {
      analyticsQuery = analyticsQuery.paginate({ cursor: args.cursor })
    }

    if (args.limit) {
      analyticsQuery = analyticsQuery.take(args.limit)
    }

    const events = await analyticsQuery.collect()
    const cursor = analyticsQuery.getCursor()

    return {
      events,
      cursor: cursor || null,
    }
  },
})

export const track = mutation({
  args: {
    userId: v.id('users'),
    sessionId: v.optional(v.id('sessions')),
    action: v.union(
      v.literal('session_start'),
      v.literal('session_end'),
      v.literal('message_sent'),
      v.literal('assessment_created'),
      v.literal('assessment_updated'),
      v.literal('exercise_completed'),
      v.literal('resource_accessed'),
      v.literal('custom'),
    ),
    metadata: v.optional(
      v.object({
        duration: v.optional(v.number()),
        messageId: v.optional(v.id('messages')),
        assessmentId: v.optional(v.id('assessments')),
        exerciseId: v.optional(v.string()),
        resourceUrl: v.optional(v.string()),
        custom_data: v.optional(v.map(v.any())),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { userId, sessionId, action, metadata } = args

    // Verify user exists
    const user = await ctx.db.get(userId)
    if (!user) {
      throw new Error('User not found')
    }

    // If sessionId provided, verify it exists
    if (sessionId) {
      const session = await ctx.db.get(sessionId)
      if (!session) {
        throw new Error('Session not found')
      }
    }

    return await ctx.db.insert('analytics', {
      userId,
      sessionId,
      action,
      metadata,
      timestamp: Date.now(),
    })
  },
})

export const getStats = query({
  args: {
    userId: v.optional(v.id('users')),
    sessionId: v.optional(v.id('sessions')),
    startAfter: v.optional(v.number()),
    startBefore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, sessionId, startAfter, startBefore } = args

    let analyticsQuery = ctx.db.query('analytics')

    if (userId) {
      analyticsQuery = analyticsQuery.withIndex('by_user', (q) =>
        q.eq('userId', userId),
      )
    } else if (sessionId) {
      analyticsQuery = analyticsQuery.withIndex('by_session', (q) =>
        q.eq('sessionId', sessionId),
      )
    }

    if (startAfter) {
      analyticsQuery = analyticsQuery.filter((q) =>
        q.gt(q.field('timestamp'), startAfter),
      )
    }

    if (startBefore) {
      analyticsQuery = analyticsQuery.filter((q) =>
        q.lt(q.field('timestamp'), startBefore),
      )
    }

    const events = await analyticsQuery.collect()

    // Calculate statistics
    const stats = {
      total_events: events.length,
      events_by_action: {} as Record<string, number>,
      average_session_duration: 0,
      total_messages: 0,
      total_assessments: 0,
      total_exercises: 0,
      total_resources: 0,
    }

    let totalSessionDuration = 0
    let sessionCount = 0

    for (const event of events) {
      // Count events by action
      stats.events_by_action[event.action] =
        (stats.events_by_action[event.action] || 0) + 1

      // Track specific metrics
      switch (event.action) {
        case 'session_end':
          if (event.metadata?.duration) {
            totalSessionDuration += event.metadata.duration
            sessionCount++
          }
          break
        case 'message_sent':
          stats.total_messages++
          break
        case 'assessment_created':
          stats.total_assessments++
          break
        case 'exercise_completed':
          stats.total_exercises++
          break
        case 'resource_accessed':
          stats.total_resources++
          break
      }
    }

    // Calculate average session duration
    if (sessionCount > 0) {
      stats.average_session_duration = totalSessionDuration / sessionCount
    }

    return stats
  },
})
