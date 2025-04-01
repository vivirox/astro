import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const getActiveUsers = query({
  args: {},
  handler: async (ctx) => {
    const metrics = await ctx.db.query('metrics').order('desc').take(1)
    return metrics[0]?.activeUsers ?? 0
  },
})

export const getActiveSessions = query({
  args: {},
  handler: async (ctx) => {
    const metrics = await ctx.db.query('metrics').order('desc').take(1)
    return metrics[0]?.activeSessions ?? 0
  },
})

export const getAverageResponseTime = query({
  args: {},
  handler: async (ctx) => {
    const metrics = await ctx.db.query('metrics').order('desc').take(1)
    return metrics[0]?.avgResponseTime ?? 0
  },
})

export const getSystemLoad = query({
  args: {},
  handler: async (ctx) => {
    const metrics = await ctx.db.query('metrics').order('desc').take(1)
    return metrics[0]?.systemLoad ?? 0
  },
})

export const getStorageUsed = query({
  args: {},
  handler: async (ctx) => {
    const metrics = await ctx.db.query('metrics').order('desc').take(1)
    return metrics[0]?.storageUsed ?? '0GB'
  },
})

export const getMessagesSent = query({
  args: {},
  handler: async (ctx) => {
    const metrics = await ctx.db.query('metrics').order('desc').take(1)
    return metrics[0]?.messagesSent ?? 0
  },
})

export const getActiveSecurityLevel = query({
  args: {},
  handler: async (ctx) => {
    const metrics = await ctx.db.query('metrics').order('desc').take(1)
    return metrics[0]?.activeSecurityLevel ?? 'standard'
  },
})

export const getAllMetrics = query({
  args: {},
  handler: async (ctx) => {
    const metrics = await ctx.db.query('metrics').order('desc').take(1)
    return (
      metrics[0] ?? {
        activeUsers: 0,
        activeSessions: 0,
        avgResponseTime: 0,
        systemLoad: 0,
        storageUsed: '0GB',
        messagesSent: 0,
        activeSecurityLevel: 'standard',
        timestamp: Date.now(),
      }
    )
  },
})

export const updateMetrics = mutation({
  args: {
    activeUsers: v.number(),
    activeSessions: v.number(),
    avgResponseTime: v.number(),
    systemLoad: v.number(),
    storageUsed: v.string(),
    messagesSent: v.number(),
    activeSecurityLevel: v.union(
      v.literal('maximum'),
      v.literal('hipaa'),
      v.literal('standard'),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('metrics', {
      ...args,
      timestamp: Date.now(),
    })
  },
})
