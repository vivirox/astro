import { v } from 'convex/values'
import {
  DatabaseWriter,
  } from '../_generated/server'


/**
 * Create a test user
 */
export async function createTestUser(ctx: DatabaseWriter) {
  return await ctx.db.insert('users', {
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    role: 'user' as const,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
}

/**
 * Create a test session
 */
export async function createTestSession(ctx: DatabaseWriter, userId: string) {
  return await ctx.db.insert('sessions', {
    userId,
    startTime: Date.now(),
    status: 'active' as const,
    metadata: {
      platform: 'test',
      version: '1.0.0',
      userAgent: 'test',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
}

/**
 * Create a test message
 */
export async function createTestMessage(
  ctx: DatabaseWriter,
  sessionId: string,
  senderId: string,
  recipientId: string,
) {
  return await ctx.db.insert('messages', {
    sessionId,
    senderId,
    recipientId,
    text: 'Test message',
    type: 'text' as const,
    indexed: true,
    searchableContent: 'test message',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
}

/**
 * Clean up test data
 */
export async function cleanupTestData(ctx: DatabaseWriter) {
  const users = await ctx.db
    .query('users')
    .filter((q) => q.eq(q.field('email').like('test-%@example.com')))
    .collect()

  for (const user of users) {
    // Delete related sessions
    const sessions = await ctx.db
      .query('sessions')
      .filter((q) => q.eq(q.field('userId'), user._id))
      .collect()

    for (const session of sessions) {
      // Delete related messages
      const messages = await ctx.db
        .query('messages')
        .filter((q) => q.eq(q.field('sessionId'), session._id))
        .collect()

      for (const message of messages) {
        await ctx.db.delete(message._id)
      }

      await ctx.db.delete(session._id)
    }

    await ctx.db.delete(user._id)
  }
}

/**
 * Type validators for test data
 */
export const testValidators = {
  user: v.object({
    _id: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.literal('user'),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
  session: v.object({
    _id: v.string(),
    userId: v.string(),
    startTime: v.number(),
    status: v.literal('active'),
    metadata: v.object({
      platform: v.string(),
      version: v.string(),
      userAgent: v.string(),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
  message: v.object({
    _id: v.string(),
    sessionId: v.string(),
    senderId: v.string(),
    recipientId: v.string(),
    text: v.string(),
    type: v.literal('text'),
    indexed: v.boolean(),
    searchableContent: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
}
