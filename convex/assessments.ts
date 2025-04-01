import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { Id } from './_generated/dataModel'

export const list = query({
  args: {
    clientId: v.optional(v.id('users')),
    therapistId: v.optional(v.id('users')),
    sessionId: v.optional(v.id('sessions')),
    type: v.optional(v.union(
      v.literal('initial'),
      v.literal('progress'),
      v.literal('final'),
      v.literal('custom')
    )),
    startAfter: v.optional(v.number()),
    startBefore: v.optional(v.number()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let assessmentsQuery = ctx.db
      .query('assessments')
      .order('desc')

    if (args.clientId) {
      assessmentsQuery = assessmentsQuery.withIndex('by_client', (q) =>
        q.eq('clientId', args.clientId)
      )
    } else if (args.therapistId) {
      assessmentsQuery = assessmentsQuery.withIndex('by_therapist', (q) =>
        q.eq('therapistId', args.therapistId)
      )
    } else if (args.sessionId) {
      assessmentsQuery = assessmentsQuery.withIndex('by_session', (q) =>
        q.eq('sessionId', args.sessionId)
      )
    }

    if (args.type) {
      assessmentsQuery = assessmentsQuery.filter((q) => q.eq(q.field('type'), args.type))
    }

    if (args.startAfter) {
      assessmentsQuery = assessmentsQuery.filter((q) => q.gt(q.field('timestamp'), args.startAfter))
    }

    if (args.startBefore) {
      assessmentsQuery = assessmentsQuery.filter((q) => q.lt(q.field('timestamp'), args.startBefore))
    }

    if (args.cursor) {
      assessmentsQuery = assessmentsQuery.paginate({ cursor: args.cursor })
    }

    if (args.limit) {
      assessmentsQuery = assessmentsQuery.take(args.limit)
    }

    const assessments = await assessmentsQuery.collect()
    const cursor = assessmentsQuery.getCursor()

    return {
      assessments,
      cursor: cursor || null,
    }
  },
})

export const getById = query({
  args: { assessmentId: v.id('assessments') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.assessmentId)
  },
})

export const create = mutation({
  args: {
    clientId: v.id('users'),
    therapistId: v.id('users'),
    sessionId: v.optional(v.id('sessions')),
    type: v.union(
      v.literal('initial'),
      v.literal('progress'),
      v.literal('final'),
      v.literal('custom')
    ),
    title: v.string(),
    description: v.optional(v.string()),
    scores: v.object({
      anxiety: v.optional(v.number()),
      depression: v.optional(v.number()),
      stress: v.optional(v.number()),
      sleep: v.optional(v.number()),
      mood: v.optional(v.number()),
      custom_scores: v.optional(v.map(v.number())),
    }),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { clientId, therapistId, sessionId, ...assessmentData } = args

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

    // If sessionId provided, verify it exists
    if (sessionId) {
      const session = await ctx.db.get(sessionId)
      if (!session) {
        throw new Error('Session not found')
      }

      // Verify session belongs to the same client and therapist
      if (session.clientId !== clientId || session.therapistId !== therapistId) {
        throw new Error('Session does not belong to the specified client and therapist')
      }
    }

    return await ctx.db.insert('assessments', {
      clientId,
      therapistId,
      sessionId,
      ...assessmentData,
      timestamp: Date.now(),
      updatedAt: Date.now(),
    })
  },
})

export const update = mutation({
  args: {
    assessmentId: v.id('assessments'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    scores: v.optional(v.object({
      anxiety: v.optional(v.number()),
      depression: v.optional(v.number()),
      stress: v.optional(v.number()),
      sleep: v.optional(v.number()),
      mood: v.optional(v.number()),
      custom_scores: v.optional(v.map(v.number())),
    })),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { assessmentId, ...updates } = args
    const assessment = await ctx.db.get(assessmentId)

    if (!assessment) {
      throw new Error('Assessment not found')
    }

    return await ctx.db.patch(assessmentId, {
      ...updates,
      updatedAt: Date.now(),
    })
  },
})

export const delete = mutation({
  args: { assessmentId: v.id('assessments') },
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.assessmentId)

    if (!assessment) {
      throw new Error('Assessment not found')
    }

    await ctx.db.delete(args.assessmentId)
    return true
  },
})
