import { auth } from '@/lib/auth'
import { fheService } from '@/lib/fhe'
import { logger } from '@/lib/logger'
import { redis } from '@/lib/redis'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BreachNotificationSystem } from '../breach-notification'
import { EmailService } from '~/lib/services/email/EmailService'

// Mock dependencies
vi.mock('@/lib/redis', () => ({
  redis: {
    set: vi.fn(),
    get: vi.fn(),
    keys: vi.fn(),
  },
}))

vi.mock('@/lib/services/email/EmailService', () => ({
  EmailService: {
    sendEmail: vi.fn(),
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: {
    getUserById: vi.fn(),
  },
}))

vi.mock('@/lib/fhe', () => ({
  fheService: {
    encrypt: vi.fn(),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}))

describe('breachNotificationSystem', () => {
  const mockBreachDetails = {
    type: 'unauthorized_access' as const,
    severity: 'high' as const,
    description: 'Unauthorized access detected',
    affectedUsers: ['user1', 'user2'],
    affectedData: ['personal_info', 'contact_details'],
    detectionMethod: 'system_monitoring',
    remediation: 'Access revoked and passwords reset',
  }

  const mockUser = {
    id: 'user1',
    email: 'user@example.com',
    name: 'Test User',
  }

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()

    // Setup default mock implementations
    ;(redis.set as any).mockResolvedValue('OK')
    ;(redis.get as any).mockResolvedValue(null)
    ;(redis.keys as any).mockResolvedValue([])
    ;(auth.getUserById as any).mockResolvedValue(mockUser)
    ;(fheService.encrypt as any).mockResolvedValue('encrypted_data')
    ;(EmailService.sendEmail as any).mockResolvedValue(undefined)

    // Setup process.env
    process.env.ORGANIZATION_NAME = 'Test Org'
    process.env.SECURITY_CONTACT = 'security@test.org'
    process.env.ORGANIZATION_ADDRESS = '123 Test St'
    process.env.HHS_NOTIFICATION_EMAIL = 'hhs@example.com'
    process.env.SECURITY_STAKEHOLDERS =
      'stakeholder1@test.org,stakeholder2@test.org'
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('reportBreach', () => {
    it('should successfully report a breach and initiate notifications', async () => {
      const breachId =
        await BreachNotificationSystem.reportBreach(mockBreachDetails)

      expect(breachId).toMatch(/^breach_\d+_[a-z0-9]+$/)
      expect(redis.set).toHaveBeenCalledTimes(3) // Initial storage + status updates
      expect(logger.error).toHaveBeenCalledWith(
        'Security breach detected:',
        expect.any(Object),
      )
      expect(EmailService.sendEmail).toHaveBeenCalled()
    })

    it('should handle errors during breach reporting', async () => {
      ;(redis.set as any).mockRejectedValue(new Error('Redis error'))

      await expect(
        BreachNotificationSystem.reportBreach(mockBreachDetails),
      ).rejects.toThrow('Redis error')

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to report breach:',
        expect.any(Error),
      )
    })
  })

  describe('notifyAffectedUsers', () => {
    it('should send notifications to all affected users', async () => {
      await BreachNotificationSystem.reportBreach(mockBreachDetails)

      expect(auth.getUserById).toHaveBeenCalledTimes(
        mockBreachDetails.affectedUsers.length,
      )
      expect(fheService.encrypt).toHaveBeenCalled()
      expect(EmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: expect.stringContaining('HIGH Security Event'),
          priority: 'urgent',
        }),
      )
    })

    it('should handle missing user email gracefully', async () => {
      ;(auth.getUserById as any).mockResolvedValue({ id: 'user1' }) // User without email

      await BreachNotificationSystem.reportBreach(mockBreachDetails)

      expect(EmailService.sendEmail).not.toHaveBeenCalled()
    })

    it('should handle user notification errors', async () => {
      ;(EmailService.sendEmail as any).mockRejectedValue(
        new Error('Email error'),
      )

      await BreachNotificationSystem.reportBreach(mockBreachDetails)

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to notify user:',
        expect.any(Object),
      )
    })
  })

  describe('notifyAuthorities', () => {
    it('should notify authorities for large-scale breaches', async () => {
      await BreachNotificationSystem.reportBreach({
        ...mockBreachDetails,
        affectedUsers: Array.from({ length: 500 }, (_, i) => `user_${i}`),
      })

      expect(EmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: process.env.HHS_NOTIFICATION_EMAIL,
          subject: expect.stringContaining('HIPAA Breach Notification'),
          priority: 'urgent',
        }),
      )
    })

    it('should notify authorities for critical severity breaches', async () => {
      const criticalBreachDetails = {
        ...mockBreachDetails,
        severity: 'critical' as const,
      }

      await BreachNotificationSystem.reportBreach(criticalBreachDetails)

      expect(EmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: process.env.HHS_NOTIFICATION_EMAIL,
        }),
      )
    })
  })

  describe('notifyInternalStakeholders', () => {
    it('should notify all internal stakeholders', async () => {
      await BreachNotificationSystem.reportBreach(mockBreachDetails)

      const stakeholders = process.env.SECURITY_STAKEHOLDERS!.split(',')
      expect(EmailService.sendEmail).toHaveBeenCalledTimes(
        stakeholders.length + mockBreachDetails.affectedUsers.length,
      )

      stakeholders.forEach((stakeholder) => {
        expect(EmailService.sendEmail).toHaveBeenCalledWith(
          expect.objectContaining({
            to: stakeholder,
            priority: 'urgent',
          }),
        )
      })
    })

    it('should handle empty stakeholders list', async () => {
      process.env.SECURITY_STAKEHOLDERS = ''

      await BreachNotificationSystem.reportBreach(mockBreachDetails)

      // Should only send notifications to affected users
      expect(EmailService.sendEmail).toHaveBeenCalledTimes(
        mockBreachDetails.affectedUsers.length,
      )
    })
  })

  describe('getBreachStatus', () => {
    it('should return breach details for valid ID', async () => {
      const mockStoredBreach = {
        ...mockBreachDetails,
        id: 'test_breach',
        timestamp: Date.now(),
        notificationStatus: 'completed',
      }

      ;(redis.get as any).mockResolvedValue(JSON.stringify(mockStoredBreach))

      const breach =
        await BreachNotificationSystem.getBreachStatus('test_breach')

      expect(breach).toEqual(mockStoredBreach)
      expect(redis.get).toHaveBeenCalledWith('breach:test_breach')
    })

    it('should return null for non-existent breach', async () => {
      ;(redis.get as any).mockResolvedValue(null)

      const breach =
        await BreachNotificationSystem.getBreachStatus('non_existent')

      expect(breach).toBeNull()
    })

    it('should handle Redis errors', async () => {
      ;(redis.get as any).mockRejectedValue(new Error('Redis error'))

      await expect(
        BreachNotificationSystem.getBreachStatus('test_breach'),
      ).rejects.toThrow('Redis error')

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get breach status:',
        expect.any(Error),
      )
    })
  })

  describe('listRecentBreaches', () => {
    it('should return sorted list of recent breaches', async () => {
      const mockBreaches = [
        {
          ...mockBreachDetails,
          id: 'breach1',
          timestamp: Date.now() - 1000,
          notificationStatus: 'completed',
        },
        {
          ...mockBreachDetails,
          id: 'breach2',
          timestamp: Date.now(),
          notificationStatus: 'completed',
        },
      ]

      ;(redis.keys as any).mockResolvedValue([
        'breach:breach1',
        'breach:breach2',
      ])
      ;(redis.get as any)
        .mockResolvedValueOnce(JSON.stringify(mockBreaches[0]))
        .mockResolvedValueOnce(JSON.stringify(mockBreaches[1]))

      const breaches = await BreachNotificationSystem.listRecentBreaches()

      expect(breaches).toHaveLength(2)
      expect(breaches[0].id).toBe('breach2') // Most recent first
      expect(breaches[1].id).toBe('breach1')
    })

    it('should handle Redis errors', async () => {
      ;(redis.keys as any).mockRejectedValue(new Error('Redis error'))

      await expect(
        BreachNotificationSystem.listRecentBreaches(),
      ).rejects.toThrow('Redis error')

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to list recent breaches:',
        expect.any(Error),
      )
    })

    it('should filter out invalid breach data', async () => {
      ;(redis.keys as any).mockResolvedValue(['breach:valid', 'breach:invalid'])
      ;(redis.get as any)
        .mockResolvedValueOnce(
          JSON.stringify({
            ...mockBreachDetails,
            id: 'valid',
            timestamp: Date.now(),
            notificationStatus: 'completed',
          }),
        )
        .mockResolvedValueOnce('invalid_json')

      const breaches = await BreachNotificationSystem.listRecentBreaches()

      expect(breaches).toHaveLength(1)
      expect(breaches[0].id).toBe('valid')
    })
  })
})
