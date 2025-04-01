import { internalMutation } from '../_generated/server'
import { v } from 'convex/values'
import { internal } from '../_generated/api'

/**
 * Migration to add role field to existing users
 */
export const addUserRoles = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    let migratedCount = 0
    const users = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('role'), undefined))
      .collect()

    for (const user of users) {
      await ctx.db.patch(user._id, {
        role: 'user' as const,
        updatedAt: Date.now(),
      })
      migratedCount++
    }

    return migratedCount
  },
})

/**
 * Migration to add indexes to messages
 */
export const addMessageIndexes = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    let migratedCount = 0
    const messages = await ctx.db
      .query('messages')
      .filter((q) => q.eq(q.field('indexed'), undefined))
      .collect()

    for (const message of messages) {
      await ctx.db.patch(message._id, {
        indexed: true,
        searchableContent: message.text?.toLowerCase() ?? '',
        updatedAt: Date.now(),
      })
      migratedCount++
    }

    return migratedCount
  },
})

/**
 * Migration to add session metadata
 */
export const addSessionMetadata = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    let migratedCount = 0
    const sessions = await ctx.db
      .query('sessions')
      .filter((q) => q.eq(q.field('metadata'), undefined))
      .collect()

    for (const session of sessions) {
      await ctx.db.patch(session._id, {
        metadata: {
          platform: 'web',
          version: '1.0.0',
          userAgent: '',
        },
        updatedAt: Date.now(),
      })
      migratedCount++
    }

    return migratedCount
  },
})

/**
 * Run all migrations
 */
export const runAllMigrations = internalMutation({
  args: {},
  returns: v.object({
    userRoles: v.number(),
    messageIndexes: v.number(),
    sessionMetadata: v.number(),
  }),
  handler: async (ctx) => {
    const userRoles = await ctx.runMutation(internal.migrations.addUserRoles)
    const messageIndexes = await ctx.runMutation(
      internal.migrations.addMessageIndexes,
    )
    const sessionMetadata = await ctx.runMutation(
      internal.migrations.addSessionMetadata,
    )

    return {
      userRoles,
      messageIndexes,
      sessionMetadata,
    }
  },
})
