import { mutation, query } from './_generated/server'
import { v } from 'convex/values'


/**
 * Get a user by their email address
 */
export const getByEmail = query({
  args: { email: v.string() },
  returns: v.union(
    v.object({
      _id: v.id('users'),
      name: v.string(),
      email: v.string(),
      avatar: v.union(v.string(), v.null()),
      lastSeen: v.union(v.number(), v.null()),
      role: v.union(
        v.literal('therapist'),
        v.literal('client'),
        v.literal('admin'),
      ),
      settings: v.optional(
        v.object({
          theme: v.optional(
            v.union(v.literal('light'), v.literal('dark'), v.literal('system')),
          ),
          notifications: v.optional(v.boolean()),
          timezone: v.optional(v.string()),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .unique()
  },
})

/**
 * List users with optional role filter and search
 */
export const list = query({
  args: {
    role: v.optional(
      v.union(v.literal('therapist'), v.literal('client'), v.literal('admin')),
    ),
    search: v.optional(v.string()),
    paginationOpts: v.optional(
      v.object({
        numItems: v.number(),
        cursor: v.union(v.string(), v.null()),
      }),
    ),
  },
  returns: v.object({
    users: v.array(
      v.object({
        _id: v.id('users'),
        name: v.string(),
        email: v.string(),
        avatar: v.union(v.string(), v.null()),
        role: v.union(
          v.literal('therapist'),
          v.literal('client'),
          v.literal('admin'),
        ),
      }),
    ),
    isDone: v.boolean(),
    continueCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    let query = ctx.db.query('users')

    if (args.role) {
      query = query.withIndex('by_role', (q) => q.eq('role', args.role))
    }

    if (args.search) {
      query = query.withSearchIndex('search_name', (q) =>
        q.search('name', args.search),
      )
    }

    const results = await query.paginate(
      args.paginationOpts || { numItems: 10 },
    )

    return {
      users: results.page.map((user) => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar ?? null,
        role: user.role,
      })),
      isDone: results.isDone,
      continueCursor: results.continueCursor,
    }
  },
})

/**
 * Create or update a user
 */
export const upsert = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    role: v.union(
      v.literal('therapist'),
      v.literal('client'),
      v.literal('admin'),
    ),
    avatar: v.optional(v.string()),
    settings: v.optional(
      v.object({
        theme: v.optional(
          v.union(v.literal('light'), v.literal('dark'), v.literal('system')),
        ),
        notifications: v.optional(v.boolean()),
        timezone: v.optional(v.string()),
      }),
    ),
  },
  returns: v.id('users'),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .unique()

    if (existing) {
      return await ctx.db.patch(existing._id, {
        name: args.name,
        role: args.role,
        ...(args.avatar && { avatar: args.avatar }),
        ...(args.settings && { settings: args.settings }),
        lastSeen: Date.now(),
      })
    }

    return await ctx.db.insert('users', {
      email: args.email,
      name: args.name,
      role: args.role,
      avatar: args.avatar ?? null,
      lastSeen: Date.now(),
      settings: args.settings ?? {
        theme: 'system',
        notifications: true,
      },
    })
  },
})

/**
 * Update user settings
 */
export const updateSettings = mutation({
  args: {
    userId: v.id('users'),
    settings: v.object({
      theme: v.optional(
        v.union(v.literal('light'), v.literal('dark'), v.literal('system')),
      ),
      notifications: v.optional(v.boolean()),
      timezone: v.optional(v.string()),
    }),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)
    if (!user) return false

    await ctx.db.patch(args.userId, {
      settings: {
        ...user.settings,
        ...args.settings,
      },
    })

    return true
  },
})
