import { beforeEach, describe, expect, it } from 'vitest'
import { DatabaseWriter, MutationCtx, QueryCtx } from './_generated/server'
import {
  createTestUser,
  createTestSession,
  cleanupTestData,
  testValidators,
} from './lib/test-utils'
import { api } from './_generated/api'
import {
  create,
  getClientSessions,
  getTherapistSessions,
  updateStatus,
  updateMetrics,
} from './sessions'

describe('sessions', () => {
  let ctx: DatabaseWriter
  let userId: string
  let therapistId: string

  beforeEach(async () => {
    // Clean up any existing test data
    await cleanupTestData(ctx)

    // Create test users
    userId = await createTestUser(ctx)
    therapistId = await createTestUser(ctx)
  })

  describe('getClientSessions', () => {
    it('should return sessions for a client', async () => {
      // Create test sessions
      const session1 = await createTestSession(ctx, userId)
      const session2 = await createTestSession(ctx, userId)

      // Get sessions
      const result = await getClientSessions(ctx as QueryCtx, {
        clientId: userId,
        status: 'active',
        limit: 10,
      })

      // Validate response
      expect(result.sessions).toHaveLength(2)
      expect(result.sessions[0]).toMatchObject(testValidators.session)
      expect(result.sessions[1]).toMatchObject(testValidators.session)
      expect(result.isComplete).toBe(true)
    })

    it('should handle pagination correctly', async () => {
      // Create multiple test sessions
      for (let i = 0; i < 15; i++) {
        await createTestSession(ctx, userId)
      }

      // Get first page
      const page1 = await getClientSessions(ctx as QueryCtx, {
        clientId: userId,
        limit: 10,
      })

      expect(page1.sessions).toHaveLength(10)
      expect(page1.isComplete).toBe(false)
      expect(page1.cursor).toBeDefined()

      // Get second page
      const page2 = await getClientSessions(ctx as QueryCtx, {
        clientId: userId,
        limit: 10,
        cursor: page1.cursor,
      })

      expect(page2.sessions).toHaveLength(5)
      expect(page2.isComplete).toBe(true)
    })
  })

  describe('getTherapistSessions', () => {
    it('should return sessions for a therapist', async () => {
      // Create test sessions
      const session1 = await createTestSession(ctx, therapistId)
      const session2 = await createTestSession(ctx, therapistId)

      // Get sessions
      const result = await getTherapistSessions(ctx as QueryCtx, {
        therapistId,
        status: 'active',
        limit: 10,
      })

      // Validate response
      expect(result.sessions).toHaveLength(2)
      expect(result.sessions[0]).toMatchObject(testValidators.session)
      expect(result.sessions[1]).toMatchObject(testValidators.session)
      expect(result.isComplete).toBe(true)
    })
  })

  describe('create', () => {
    it('should create a new session', async () => {
      const startTime = Date.now()
      const sessionId = await create(ctx as MutationCtx, {
        clientId: userId,
        therapistId,
        startTime,
        notes: 'Test session',
        tags: ['test'],
      })

      const session = await ctx.db.get(sessionId)
      expect(session).toBeDefined()
      expect(session).toMatchObject({
        userId,
        therapistId,
        startTime,
        notes: 'Test session',
        tags: ['test'],
        status: 'active',
      })
    })
  })

  describe('updateStatus', () => {
    it('should update session status', async () => {
      const sessionId = await createTestSession(ctx, userId)
      const success = await updateStatus(ctx as MutationCtx, {
        sessionId,
        status: 'completed',
        endTime: Date.now(),
      })

      expect(success).toBe(true)
      const session = await ctx.db.get(sessionId)
      expect(session?.status).toBe('completed')
      expect(session?.endTime).toBeDefined()
    })
  })

  describe('updateMetrics', () => {
    it('should update session metrics', async () => {
      const sessionId = await createTestSession(ctx, userId)
      const metrics = {
        mood: 8,
        anxiety: 3,
        progress: 7,
      }

      const success = await updateMetrics(ctx as MutationCtx, {
        sessionId,
        metrics,
      })

      expect(success).toBe(true)
      const session = await ctx.db.get(sessionId)
      expect(session?.metrics).toEqual(metrics)
    })
  })
})
