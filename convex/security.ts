import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

export const getSecurityEvents = query({
  args: {
    type: v.optional(v.string()),
    severity: v.optional(
      v.union(
        v.literal('critical'),
        v.literal('high'),
        v.literal('medium'),
        v.literal('low'),
      ),
    ),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let events = await ctx.db
      .query('securityEvents')
      .order('desc')
      .take(args.limit ?? 100)

    if (args.type) {
      events = events.filter((event) => event.type === args.type)
    }
    if (args.severity) {
      events = events.filter((event) => event.severity === args.severity)
    }
    if (args.startTime) {
      events = events.filter((event) => event.timestamp >= args.startTime)
    }
    if (args.endTime) {
      events = events.filter((event) => event.timestamp <= args.endTime)
    }

    return events
  },
})

export const getEventStats = query({
  handler: async (ctx) => {
    const events = await ctx.db.query('securityEvents').collect()
    const now = Date.now()
    const last24h = now - 24 * 60 * 60 * 1000
    const last7d = now - 7 * 24 * 60 * 60 * 1000

    return {
      total: events.length,
      last24h: events.filter((e) => e.timestamp >= last24h).length,
      last7d: events.filter((e) => e.timestamp >= last7d).length,
      bySeverity: {
        critical: events.filter((e) => e.severity === 'critical').length,
        high: events.filter((e) => e.severity === 'high').length,
        medium: events.filter((e) => e.severity === 'medium').length,
        low: events.filter((e) => e.severity === 'low').length,
      },
    }
  },
})

export const logSecurityEvent = mutation({
  args: {
    type: v.string(),
    severity: v.union(
      v.literal('critical'),
      v.literal('high'),
      v.literal('medium'),
      v.literal('low'),
    ),
    userId: v.optional(v.id('users')),
    ip: v.optional(v.string()),
    metadata: v.optional(
      v.object({
        details: v.string(),
        source: v.optional(v.string()),
        context: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('securityEvents', {
      ...args,
      timestamp: Date.now(),
    })
  },
})
