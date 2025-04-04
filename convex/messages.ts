import { mutation, query } from './_generated/server'
import { v } from 'convex/values'


/**
 * Get messages for a session
 */
export const getSessionMessages = query({
  args: {
    sessionId: v.id('sessions'),
    paginationOpts: v.optional(
      v.object({
        numItems: v.number(),
        cursor: v.union(v.string(), v.null()),
      }),
    ),
  },
  returns: v.object({
    messages: v.array(
      v.object({
        _id: v.id('messages'),
        sessionId: v.union(v.id('sessions'), v.null()),
        senderId: v.id('users'),
        recipientId: v.id('users'),
        text: v.string(),
        timestamp: v.number(),
        type: v.union(v.literal('chat'), v.literal('note'), v.literal('alert')),
        metadata: v.optional(
          v.object({
            attachments: v.optional(v.array(v.string())),
            isPrivate: v.optional(v.boolean()),
            importance: v.optional(
              v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
            ),
          }),
        ),
      }),
    ),
    isDone: v.boolean(),
    continueCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query('messages')
      .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
      .paginate(args.paginationOpts || { numItems: 50 })

    return {
      messages: results.page,
      isDone: results.isDone,
      continueCursor: results.continueCursor,
    }
  },
})

/**
 * Get messages for a user (sent or received)
 */
export const getUserMessages = query({
  args: {
    userId: v.id('users'),
    type: v.optional(
      v.union(v.literal('chat'), v.literal('note'), v.literal('alert')),
    ),
    paginationOpts: v.optional(
      v.object({
        numItems: v.number(),
        cursor: v.union(v.string(), v.null()),
      }),
    ),
  },
  returns: v.object({
    messages: v.array(
      v.object({
        _id: v.id('messages'),
        sessionId: v.union(v.id('sessions'), v.null()),
        senderId: v.id('users'),
        recipientId: v.id('users'),
        text: v.string(),
        timestamp: v.number(),
        type: v.union(v.literal('chat'), v.literal('note'), v.literal('alert')),
        metadata: v.optional(
          v.object({
            attachments: v.optional(v.array(v.string())),
            isPrivate: v.optional(v.boolean()),
            importance: v.optional(
              v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
            ),
          }),
        ),
      }),
    ),
    isDone: v.boolean(),
    continueCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('messages')
      .withIndex('by_recipient', (q) => q.eq('recipientId', args.userId))

    if (args.type) {
      query = query.filter((q) => q.eq(q.field('type'), args.type))
    }

    const results = await query.paginate(
      args.paginationOpts || { numItems: 20 },
    )

    return {
      messages: results.page,
      isDone: results.isDone,
      continueCursor: results.continueCursor,
    }
  },
})

/**
 * Send a new message
 */
export const send = mutation({
  args: {
    sessionId: v.optional(v.id('sessions')),
    senderId: v.id('users'),
    recipientId: v.id('users'),
    text: v.string(),
    type: v.union(v.literal('chat'), v.literal('note'), v.literal('alert')),
    metadata: v.optional(
      v.object({
        attachments: v.optional(v.array(v.string())),
        isPrivate: v.optional(v.boolean()),
        importance: v.optional(
          v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
        ),
      }),
    ),
  },
  returns: v.id('messages'),
  handler: async (ctx, args) => {
    // Verify that both sender and recipient exist
    const [sender, recipient] = await Promise.all([
      ctx.db.get(args.senderId),
      ctx.db.get(args.recipientId),
    ])

    if (!sender || !recipient) {
      throw new Error('Sender or recipient not found')
    }

    // If sessionId is provided, verify it exists
    if (args.sessionId) {
      const session = await ctx.db.get(args.sessionId)
      if (!session) {
        throw new Error('Session not found')
      }
    }

    return await ctx.db.insert('messages', {
      sessionId: args.sessionId ?? null,
      senderId: args.senderId,
      recipientId: args.recipientId,
      text: args.text,
      timestamp: Date.now(),
      type: args.type,
      metadata: args.metadata ?? {},
    })
  },
})

/**
 * Search messages
 */
export const search = query({
  args: {
    query: v.string(),
    sessionId: v.optional(v.id('sessions')),
    type: v.optional(
      v.union(v.literal('chat'), v.literal('note'), v.literal('alert')),
    ),
    paginationOpts: v.optional(
      v.object({
        numItems: v.number(),
        cursor: v.union(v.string(), v.null()),
      }),
    ),
  },
  returns: v.object({
    messages: v.array(
      v.object({
        _id: v.id('messages'),
        sessionId: v.union(v.id('sessions'), v.null()),
        senderId: v.id('users'),
        recipientId: v.id('users'),
        text: v.string(),
        timestamp: v.number(),
        type: v.union(v.literal('chat'), v.literal('note'), v.literal('alert')),
        metadata: v.optional(
          v.object({
            attachments: v.optional(v.array(v.string())),
            isPrivate: v.optional(v.boolean()),
            importance: v.optional(
              v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
            ),
          }),
        ),
      }),
    ),
    isDone: v.boolean(),
    continueCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('messages')
      .withSearchIndex('search_content', (q) => {
        let searchQuery = q.search('text', args.query)
        if (args.type) {
          searchQuery = searchQuery.eq('type', args.type)
        }
        if (args.sessionId) {
          searchQuery = searchQuery.eq('sessionId', args.sessionId)
        }
        return searchQuery
      })

    const results = await query.paginate(
      args.paginationOpts || { numItems: 20 },
    )

    return {
      messages: results.page,
      isDone: results.isDone,
      continueCursor: results.continueCursor,
    }
  },
})

/**
 * Delete a message by ID.
 */
export const remove = mutation({
  args: { id: v.id('messages') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
  },
})

export const update = mutation({
  args: {
    messageId: v.id('messages'),
    text: v.optional(v.string()),
    metadata: v.optional(
      v.object({
        assessmentId: v.optional(v.id('assessments')),
        exerciseId: v.optional(v.string()),
        resourceUrl: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { messageId, ...updates } = args
    const message = await ctx.db.get(messageId)

    if (!message) {
      throw new Error('Message not found')
    }

    return await ctx.db.patch(messageId, updates)
  },
})
