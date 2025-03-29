import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

/**
 * Get all messages sorted by timestamp.
 */
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query('messages').order('desc').collect()
  },
})

/**
 * Add a new message.
 */
export const send = mutation({
  args: { text: v.string(), author: v.string() },
  handler: async (ctx, args) => {
    const { text, author } = args
    return await ctx.db.insert('messages', {
      text,
      author,
      timestamp: Date.now(),
    })
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
