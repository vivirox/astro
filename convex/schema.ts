import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

/**
 * Convex schema definition for Gradiant Therapy platform.
 */
export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    avatar: v.optional(v.string()),
    lastSeen: v.optional(v.number()),
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
  })
    .index('by_email', ['email'])
    .index('by_role', ['role'])
    .searchIndex('search_name', {
      searchField: 'name',
      filterFields: ['role'],
    }),

  sessions: defineTable({
    clientId: v.id('users'),
    therapistId: v.id('users'),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    status: v.union(
      v.literal('scheduled'),
      v.literal('in_progress'),
      v.literal('completed'),
      v.literal('cancelled'),
    ),
    notes: v.optional(v.string()),
    metrics: v.optional(
      v.object({
        mood: v.number(),
        anxiety: v.number(),
        progress: v.number(),
      }),
    ),
    tags: v.array(v.string()),
  })
    .index('by_client', ['clientId', 'startTime'])
    .index('by_therapist', ['therapistId', 'startTime'])
    .index('by_status', ['status', 'startTime']),

  messages: defineTable({
    sessionId: v.optional(v.id('sessions')),
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
  })
    .index('by_session', ['sessionId', 'timestamp'])
    .index('by_sender', ['senderId', 'timestamp'])
    .index('by_recipient', ['recipientId', 'timestamp'])
    .searchIndex('search_content', {
      searchField: 'text',
      filterFields: ['type', 'sessionId'],
    }),

  analytics: defineTable({
    userId: v.id('users'),
    sessionId: v.optional(v.id('sessions')),
    timestamp: v.number(),
    category: v.string(),
    action: v.string(),
    value: v.optional(v.number()),
    metadata: v.optional(
      v.object({
        source: v.optional(v.string()),
        context: v.optional(v.string()),
        details: v.optional(v.any()),
      }),
    ),
  })
    .index('by_user', ['userId', 'timestamp'])
    .index('by_session', ['sessionId', 'timestamp'])
    .index('by_category', ['category', 'timestamp']),

  assessments: defineTable({
    clientId: v.id('users'),
    therapistId: v.id('users'),
    timestamp: v.number(),
    type: v.string(),
    scores: v.object({
      overall: v.number(),
      categories: v.record(v.string(), v.number()),
    }),
    notes: v.optional(v.string()),
    nextAssessmentDate: v.optional(v.number()),
  })
    .index('by_client', ['clientId', 'timestamp'])
    .index('by_therapist', ['therapistId', 'timestamp'])
    .index('by_type', ['type', 'timestamp']),

  metrics: defineTable({
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
    timestamp: v.number(),
  }).index('by_timestamp', ['timestamp']),

  securityEvents: defineTable({
    timestamp: v.number(),
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
  })
    .index('by_timestamp', ['timestamp'])
    .index('by_type_and_severity', ['type', 'severity'])
    .index('by_user', ['userId']),
})
