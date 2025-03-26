import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EpicProvider } from '../providers/epic.provider'
import { EHRServiceImpl } from '../services/ehr.service'
import { EHRError } from '../types'

describe('eHR Service', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }

  const mockProvider = {
    id: 'test-epic',
    name: 'Test Epic Provider',
    vendor: 'epic' as const,
    baseUrl: 'https://fhir.epic.com/interconnect-fhir-oauth',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    scopes: ['launch/patient', 'patient/*.read'],
  }

  let ehrService: EHRServiceImpl

  beforeEach(() => {
    ehrService = new EHRServiceImpl(mockLogger as unknown as Console)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('configureProvider', () => {
    it('should successfully configure a provider', async () => {
      await expect(
        ehrService.configureProvider(mockProvider),
      ).resolves.not.toThrow()
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Configured EHR provider: ${mockProvider.id}`,
      )
    })

    it('should throw error for invalid provider configuration', async () => {
      const invalidProvider = { ...mockProvider, vendor: 'invalid' }
      await expect(
        ehrService.configureProvider(invalidProvider),
      ).rejects.toThrow(EHRError)
    })
  })

  describe('connect', () => {
    it('should successfully connect to a configured provider', async () => {
      await ehrService.configureProvider(mockProvider)
      await expect(ehrService.connect(mockProvider.id)).resolves.not.toThrow()
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Connected to EHR provider: ${mockProvider.id}`,
      )
    })

    it('should throw error when connecting to non-existent provider', async () => {
      await expect(ehrService.connect('non-existent')).rejects.toThrow(EHRError)
    })
  })

  describe('disconnect', () => {
    it('should successfully disconnect from a connected provider', async () => {
      await ehrService.configureProvider(mockProvider)
      await ehrService.connect(mockProvider.id)
      await expect(
        ehrService.disconnect(mockProvider.id),
      ).resolves.not.toThrow()
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Disconnected from EHR provider: ${mockProvider.id}`,
      )
    })

    it('should throw error when disconnecting from non-connected provider', async () => {
      await ehrService.configureProvider(mockProvider)
      await expect(ehrService.disconnect(mockProvider.id)).rejects.toThrow(
        EHRError,
      )
    })
  })

  describe('getFHIRClient', () => {
    it('should return FHIR client for connected provider', async () => {
      await ehrService.configureProvider(mockProvider)
      await ehrService.connect(mockProvider.id)
      expect(ehrService.getFHIRClient(mockProvider.id)).toBeDefined()
    })

    it('should throw error when getting client for non-connected provider', () => {
      expect(() => ehrService.getFHIRClient('non-existent')).toThrow(EHRError)
    })
  })
})

describe('epic Provider', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }

  const providerConfig = {
    id: 'test-epic',
    name: 'Test Epic Provider',
    baseUrl: 'https://fhir.epic.com/interconnect-fhir-oauth',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    scopes: ['launch/patient', 'patient/*.read'],
  }

  let epicProvider: EpicProvider

  beforeEach(() => {
    epicProvider = new EpicProvider(
      providerConfig.id,
      providerConfig.name,
      providerConfig.baseUrl,
      providerConfig.clientId,
      providerConfig.clientSecret,
      providerConfig.scopes,
      mockLogger as unknown as Console,
    )
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should successfully initialize provider', async () => {
      // Mock the validateEndpoint method to return true
      vi.spyOn(epicProvider as any, 'validateEndpoint').mockResolvedValue(true)

      await expect(epicProvider.initialize()).resolves.not.toThrow()
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Initializing provider ${providerConfig.id}`,
      )
    })

    it('should throw error when endpoint validation fails', async () => {
      // Mock the validateEndpoint method to return false
      vi.spyOn(epicProvider as any, 'validateEndpoint').mockResolvedValue(false)

      await expect(epicProvider.initialize()).rejects.toThrow()
    })
  })

  describe('cleanup', () => {
    it('should successfully cleanup provider', async () => {
      await expect(epicProvider.cleanup()).resolves.not.toThrow()
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Cleaned up provider ${providerConfig.id}`,
      )
    })
  })
})
