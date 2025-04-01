import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { Id } from './_generated/dataModel'

export const list = query({
  args: {
    clientId: v.optional(v.id('users')),
    therapistId: v.optional(v.id('users')),
    status: v.optional(
      v.union(
        v.literal('scheduled'),
        v.literal('in_progress'),
        v.literal('completed'),
        v.literal('cancelled'),
      ),
    ),
    startAfter: v.optional(v.number()),
    startBefore: v.optional(v.number()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let sessionsQuery = ctx.db.query('sessions').order('desc')

    if (args.clientId) {
      sessionsQuery = sessionsQuery.withIndex('by_client', (q) =>
        q.eq('clientId', args.clientId),
      )
    } else if (args.therapistId) {
      sessionsQuery = sessionsQuery.withIndex('by_therapist', (q) =>
        q.eq('therapistId', args.therapistId),
      )
    }

    if (args.status) {
      sessionsQuery = sessionsQuery.filter((q) =>
        q.eq(q.field('status'), args.status),
      )
    }

    if (args.startAfter) {
      sessionsQuery = sessionsQuery.filter((q) =>
        q.gt(q.field('startTime'), args.startAfter),
      )
    }

    if (args.startBefore) {
      sessionsQuery = sessionsQuery.filter((q) =>
        q.lt(q.field('startTime'), args.startBefore),
      )
    }

    if (args.cursor) {
      sessionsQuery = sessionsQuery.paginate({ cursor: args.cursor })
    }

    if (args.limit) {
      sessionsQuery = sessionsQuery.take(args.limit)
    }

    const sessions = await sessionsQuery.collect()
    const cursor = sessionsQuery.getCursor()

    return {
      sessions,
      cursor: cursor || null,
    }
  },
})

export const getById = query({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId)
  },
})

export const create = mutation({
  args: {
    clientId: v.id('users'),
    therapistId: v.id('users'),
    startTime: v.number(),
    endTime: v.number(),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { clientId, therapistId, startTime, endTime, notes, tags } = args

    // Verify client exists and is a client
    const client = await ctx.db.get(clientId)
    if (!client || client.role !== 'client') {
      throw new Error('Invalid client')
    }

    // Verify therapist exists and is a therapist
    const therapist = await ctx.db.get(therapistId)
    if (!therapist || therapist.role !== 'therapist') {
      throw new Error('Invalid therapist')
    }

    // Verify session times
    if (startTime >= endTime) {
      throw new Error('Session end time must be after start time')
    }

    // Check for overlapping sessions for either participant
    const overlappingSessions = await ctx.db
      .query('sessions')
      .withIndex('by_time', (q) =>
        q.gte('startTime', startTime).lte('endTime', endTime),
      )
      .filter((q) =>
        q.or(
          q.eq(q.field('clientId'), clientId),
          q.eq(q.field('therapistId'), therapistId),
        ),
      )
      .collect()

    if (overlappingSessions.length > 0) {
      throw new Error('Session time conflicts with existing session')
    }

    return await ctx.db.insert('sessions', {
      clientId,
      therapistId,
      startTime,
      endTime,
      status: 'scheduled',
      notes,
      tags,
      metrics: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  },
})

export const update = mutation({
  args: {
    sessionId: v.id('sessions'),
    status: v.optional(
      v.union(
        v.literal('scheduled'),
        v.literal('in_progress'),
        v.literal('completed'),
        v.literal('cancelled'),
      ),
    ),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    metrics: v.optional(
      v.object({
        duration: v.optional(v.number()),
        engagement: v.optional(v.number()),
        progress: v.optional(v.number()),
        exercises_completed: v.optional(v.number()),
        custom_metrics: v.optional(v.map(v.any())),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { sessionId, ...updates } = args
    const session = await ctx.db.get(sessionId)

    if (!session) {
      throw new Error('Session not found')
    }

    // If updating times, verify they're valid
    if (updates.startTime && updates.endTime) {
      if (updates.startTime >= updates.endTime) {
        throw new Error('Session end time must be after start time')
      }
    } else if (updates.startTime && updates.startTime >= session.endTime) {
      throw new Error('Session end time must be after start time')
    } else if (updates.endTime && session.startTime >= updates.endTime) {
      throw new Error('Session end time must be after start time')
    }

    // If updating times, check for conflicts
    if (updates.startTime || updates.endTime) {
      const startTime = updates.startTime || session.startTime
      const endTime = updates.endTime || session.endTime

      const overlappingSessions = await ctx.db
        .query('sessions')
        .withIndex('by_time', (q) =>
          q.gte('startTime', startTime).lte('endTime', endTime),
        )
        .filter((q) =>
          q.and(
            q.neq(q.field('_id'), sessionId),
            q.or(
              q.eq(q.field('clientId'), session.clientId),
              q.eq(q.field('therapistId'), session.therapistId),
            ),
          ),
        )
        .collect()

      if (overlappingSessions.length > 0) {
        throw new Error('Session time conflicts with existing session')
      }
    }

    return await ctx.db.patch(sessionId, {
      ...updates,
      updatedAt: Date.now(),
    })
  },
})

export const cancel = mutation({
  args: {
    sessionId: v.id('sessions'),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { sessionId, reason } = args
    const session = await ctx.db.get(sessionId)

    if (!session) {
      throw new Error('Session not found')
    }

    if (session.status === 'completed') {
      throw new Error('Cannot cancel a completed session')
    }

    return await ctx.db.patch(sessionId, {
      status: 'cancelled',
      notes: reason
        ? `Cancelled: ${reason}${session.notes ? `\n\nPrevious notes: ${session.notes}` : ''}`
        : session.notes,
      updatedAt: Date.now(),
    })
  },
})
