import { beforeEach, describe, expect, it } from 'vitest'
import { DatabaseWriter, MutationCtx, QueryCtx } from './_generated/server'
import {
  createTestUser,
  createTestSession,
  createTestMessage,
  cleanupTestData,
  testValidators,
} from './lib/test-utils'

import { getSessionMessages, getUserMessages, send, search } from './messages'

describe('messages', () => {
  let ctx: DatabaseWriter
  let userId: string
  let recipientId: string
  let sessionId: string

  beforeEach(async () => {
    // Clean up any existing test data
    await cleanupTestData(ctx)

    // Create test users and session
    userId = await createTestUser(ctx)
    recipientId = await createTestUser(ctx)
    sessionId = await createTestSession(ctx, userId)
  })

  describe('getSessionMessages', () => {
    it('should return messages for a session', async () => {
      // Create test messages
      const message1 = await createTestMessage(
        ctx,
        sessionId,
        userId,
        recipientId,
      )
      const message2 = await createTestMessage(
        ctx,
        sessionId,
        recipientId,
        userId,
      )

      // Get messages
      const result = await getSessionMessages(ctx as QueryCtx, {
        sessionId,
        limit: 10,
      })

      // Validate response
      expect(result.messages).toHaveLength(2)
      expect(result.messages[0]).toMatchObject(testValidators.message)
      expect(result.messages[1]).toMatchObject(testValidators.message)
      expect(result.isComplete).toBe(true)
    })

    it('should handle pagination correctly', async () => {
      // Create multiple test messages
      for (let i = 0; i < 15; i++) {
        await createTestMessage(ctx, sessionId, userId, recipientId)
      }

      // Get first page
      const page1 = await getSessionMessages(ctx as QueryCtx, {
        sessionId,
        limit: 10,
      })

      expect(page1.messages).toHaveLength(10)
      expect(page1.isComplete).toBe(false)
      expect(page1.cursor).toBeDefined()

      // Get second page
      const page2 = await getSessionMessages(ctx as QueryCtx, {
        sessionId,
        limit: 10,
        cursor: page1.cursor,
      })

      expect(page2.messages).toHaveLength(5)
      expect(page2.isComplete).toBe(true)
    })
  })

  describe('getUserMessages', () => {
    it('should return messages for a user', async () => {
      // Create test messages
      const message1 = await createTestMessage(
        ctx,
        sessionId,
        userId,
        recipientId,
      )
      const message2 = await createTestMessage(
        ctx,
        sessionId,
        recipientId,
        userId,
      )

      // Get messages
      const result = await getUserMessages(ctx as QueryCtx, {
        userId,
        type: 'text',
        limit: 10,
      })

      // Validate response
      expect(result.messages).toHaveLength(2)
      expect(result.messages[0]).toMatchObject(testValidators.message)
      expect(result.messages[1]).toMatchObject(testValidators.message)
      expect(result.isComplete).toBe(true)
    })
  })

  describe('send', () => {
    it('should send a new message', async () => {
      const messageId = await send(ctx as MutationCtx, {
        sessionId,
        senderId: userId,
        recipientId,
        text: 'Test message',
        type: 'text',
        metadata: { important: true },
      })

      const message = await ctx.db.get(messageId)
      expect(message).toBeDefined()
      expect(message).toMatchObject({
        sessionId,
        senderId: userId,
        recipientId,
        text: 'Test message',
        type: 'text',
        metadata: { important: true },
        indexed: true,
        searchableContent: 'test message',
      })
    })

    it('should throw error if sender does not exist', async () => {
      await expect(
        send(ctx as MutationCtx, {
          sessionId,
          senderId: 'invalid-id',
          recipientId,
          text: 'Test message',
          type: 'text',
        }),
      ).rejects.toThrow()
    })

    it('should throw error if recipient does not exist', async () => {
      await expect(
        send(ctx as MutationCtx, {
          sessionId,
          senderId: userId,
          recipientId: 'invalid-id',
          text: 'Test message',
          type: 'text',
        }),
      ).rejects.toThrow()
    })
  })

  describe('search', () => {
    it('should search messages by query', async () => {
      // Create test messages with different content
      await createTestMessage(ctx, sessionId, userId, recipientId)
      await send(ctx as MutationCtx, {
        sessionId,
        senderId: userId,
        recipientId,
        text: 'Unique search term',
        type: 'text',
      })

      // Search messages
      const result = await search(ctx as QueryCtx, {
        query: 'unique',
        limit: 10,
      })

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toContain('unique')
    })

    it('should filter search by session', async () => {
      // Create another session
      const otherSessionId = await createTestSession(ctx, userId)

      // Create messages in both sessions
      await send(ctx as MutationCtx, {
        sessionId,
        senderId: userId,
        recipientId,
        text: 'Message in first session',
        type: 'text',
      })
      await send(ctx as MutationCtx, {
        sessionId: otherSessionId,
        senderId: userId,
        recipientId,
        text: 'Message in second session',
        type: 'text',
      })

      // Search messages in first session
      const result = await search(ctx as QueryCtx, {
        query: 'message',
        sessionId,
        limit: 10,
      })

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].sessionId).toBe(sessionId)
    })
  })
})
