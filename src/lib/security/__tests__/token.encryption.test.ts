import type { TokenEncryptionConfig } from '../token.encryption'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TokenEncryptionService } from '../token.encryption'

describe('token Encryption Service', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }

  const testConfig: TokenEncryptionConfig = {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    salt: 'test-salt',
  }

  const testPassword = 'test-password'
  const testToken = 'test-token'

  let tokenEncryptionService: TokenEncryptionService

  beforeEach(() => {
    tokenEncryptionService = new TokenEncryptionService(
      testConfig,
      mockLogger as unknown as Console,
    )
    vi.clearAllMocks()
  })

  afterEach(() => {
    tokenEncryptionService.cleanup()
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should successfully initialize the service', async () => {
      await expect(
        tokenEncryptionService.initialize(testPassword),
      ).resolves.not.toThrow()
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Token encryption service initialized successfully',
      )
    })

    it('should throw error when salt is missing', () => {
      expect(
        () =>
          new TokenEncryptionService({
            ...testConfig,
            salt: '',
          }),
      ).toThrow('Token encryption salt is required')
    })

    it('should throw error when initialization fails', async () => {
      const error = new Error('Scrypt failed')
      vi.mock('crypto', () => ({
        scrypt: (_: any, __: any, ___: any, callback: Function) =>
          callback(error),
      }))

      await expect(
        tokenEncryptionService.initialize(testPassword),
      ).rejects.toThrow('Failed to initialize token encryption service')
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('token encryption', () => {
    beforeEach(async () => {
      await tokenEncryptionService.initialize(testPassword)
    })

    it('should successfully encrypt and decrypt a token', async () => {
      const { encryptedToken, iv } =
        await tokenEncryptionService.encryptToken(testToken)
      expect(encryptedToken).toBeDefined()
      expect(iv).toBeDefined()

      const decryptedToken = await tokenEncryptionService.decryptToken(
        encryptedToken,
        iv,
      )
      expect(decryptedToken).toBe(testToken)
    })

    it('should throw error when encrypting without initialization', async () => {
      tokenEncryptionService.cleanup()
      await expect(
        tokenEncryptionService.encryptToken(testToken),
      ).rejects.toThrow('Token encryption service not initialized')
    })

    it('should throw error when decrypting without initialization', async () => {
      tokenEncryptionService.cleanup()
      await expect(
        tokenEncryptionService.decryptToken('encrypted', 'iv'),
      ).rejects.toThrow('Token encryption service not initialized')
    })

    it('should throw error when decrypting with invalid data', async () => {
      await expect(
        tokenEncryptionService.decryptToken('invalid', 'invalid'),
      ).rejects.toThrow('Failed to decrypt token')
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('key rotation', () => {
    beforeEach(async () => {
      await tokenEncryptionService.initialize(testPassword)
    })

    it('should successfully rotate encryption key', async () => {
      const newPassword = 'new-password'

      // Encrypt token with old key
      const { encryptedToken, iv } =
        await tokenEncryptionService.encryptToken(testToken)

      // Rotate key
      await tokenEncryptionService.rotateKey(newPassword)
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Encryption key rotated successfully',
      )

      // Verify we can still decrypt with new key
      const decryptedToken = await tokenEncryptionService.decryptToken(
        encryptedToken,
        iv,
      )
      expect(decryptedToken).toBe(testToken)
    })

    it('should throw error when rotating key without initialization', async () => {
      tokenEncryptionService.cleanup()
      await expect(
        tokenEncryptionService.rotateKey('new-password'),
      ).rejects.toThrow('Token encryption service not initialized')
    })

    it('should throw error when key rotation fails', async () => {
      const error = new Error('Scrypt failed')
      vi.mock('crypto', () => ({
        scrypt: (_: any, __: any, ___: any, callback: Function) =>
          callback(error),
      }))

      await expect(
        tokenEncryptionService.rotateKey('new-password'),
      ).rejects.toThrow('Failed to rotate encryption key')
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('should successfully cleanup the service', async () => {
      await tokenEncryptionService.initialize(testPassword)
      tokenEncryptionService.cleanup()
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Token encryption service cleaned up',
      )
    })
  })
})
