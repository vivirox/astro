import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

/**
 * Get all users.
 */
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query('users').collect()
  },
})

/**
 * Get a user by email.
 */
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('email'), args.email))
      .first()
  },
})

/**
 * Create or update a user.
 */
export const upsert = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { name, email, avatar } = args
    const existingUser = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('email'), email))
      .first()

    if (existingUser) {
      return await ctx.db.patch(existingUser._id, {
        name,
        avatar,
        lastSeen: Date.now(),
      })
    } else {
      return await ctx.db.insert('users', {
        name,
        email,
        avatar,
        lastSeen: Date.now(),
      })
    }
  },
})
