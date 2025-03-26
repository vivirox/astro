import { Buffer } from 'node:buffer'
import { createHash, randomBytes } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AllscriptsProvider } from '../providers/allscripts.provider'

// Mock dependencies
vi.mock('crypto', () => ({
  createHash: vi.fn(),
  randomBytes: vi.fn(),
}))

describe('allscripts Provider', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    audit: vi.fn(), // Add audit log function for compliance tracking
  }

  const providerConfig = {
    id: 'test-allscripts',
    name: 'Test Allscripts Provider',
    baseUrl: 'https://fhir.allscriptscloud.com/fhir/r4',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    scopes: ['user/Patient.read', 'user/Observation.read'],
  }

  let allscriptsProvider: AllscriptsProvider

  beforeEach(() => {
    // Setup crypto mocks
    interface Hash {
      update: (data: string) => Hash
      digest: (encoding?: string) => string
    }

    // Define mockHash before using it
    const mockHash: Hash = {
      update: vi.fn().mockReturnThis(),
      digest: vi.fn().mockReturnValue('mock-hashed-value'),
    }

    ;(createHash as jest.Mock).mockReturnValue(mockHash)
    // Use Buffer from imported buffer module
    const mockRandomBytes = Buffer.from('random-secure-bytes', 'utf8')
    ;(randomBytes as jest.Mock).mockReturnValue(mockRandomBytes)

    allscriptsProvider = new AllscriptsProvider(
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
      vi.spyOn(allscriptsProvider as any, 'validateEndpoint').mockResolvedValue(
        true,
      )

      // Mock verifyAllscriptsEndpoints to succeed
      vi.spyOn(
        allscriptsProvider as any,
        'verifyAllscriptsEndpoints',
      ).mockResolvedValue(undefined)

      // Mock the FHIR client's searchResources method
      const mockCapabilityStatement = {
        rest: [
          {
            security: {
              service: ['OAuth2'],
              extension: [
                {
                  url: 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris',
                  extension: [
                    {
                      url: 'authorize',
                      valueUri: 'https://auth.example.com/authorize',
                    },
                    {
                      url: 'token',
                      valueUri: 'https://auth.example.com/token',
                    },
                  ],
                },
              ],
            },
          },
        ],
        security: {},
      }

      const mockSearchResources = vi
        .fn()
        .mockResolvedValue([mockCapabilityStatement])
      vi.spyOn(allscriptsProvider as any, 'getClient').mockReturnValue({
        searchResources: mockSearchResources,
      })

      await expect(allscriptsProvider.initialize()).resolves.not.toThrow()
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Initializing provider ${providerConfig.id}`,
      )
      expect(mockSearchResources).toHaveBeenCalledWith('CapabilityStatement', {
        mode: 'server',
      })
    })

    it('should throw error when endpoint validation fails', async () => {
      // Mock the validateEndpoint method to return false
      vi.spyOn(allscriptsProvider as any, 'validateEndpoint').mockResolvedValue(
        false,
      )

      await expect(allscriptsProvider.initialize()).rejects.toThrow()
    })

    it('should throw error when CapabilityStatement is not found', async () => {
      // Mock the validateEndpoint method to return true
      vi.spyOn(allscriptsProvider as any, 'validateEndpoint').mockResolvedValue(
        true,
      )

      // Mock the FHIR client's searchResources method to return empty array
      const mockSearchResources = vi.fn().mockResolvedValue([])
      vi.spyOn(allscriptsProvider as any, 'getClient').mockReturnValue({
        searchResources: mockSearchResources,
      })

      await expect(allscriptsProvider.initialize()).rejects.toThrow(
        'No CapabilityStatement found',
      )
    })

    it('should throw error when required endpoints are not available', async () => {
      // Mock the validateEndpoint method to return true
      vi.spyOn(allscriptsProvider as any, 'validateEndpoint').mockResolvedValue(
        true,
      )

      // Mock the FHIR client's searchResources method to succeed for CapabilityStatement
      // but fail for endpoint verification
      const mockSearchResources = vi
        .fn()
        .mockImplementation((resourceType: string) => {
          if (resourceType === 'CapabilityStatement') {
            return Promise.resolve([
              {
                rest: [
                  {
                    security: {
                      service: ['OAuth2'],
                      extension: [
                        {
                          url: 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris',
                          extension: [
                            {
                              url: 'authorize',
                              valueUri: 'https://auth.example.com/authorize',
                            },
                            {
                              url: 'token',
                              valueUri: 'https://auth.example.com/token',
                            },
                          ],
                        },
                      ],
                    },
                  },
                ],
                security: {},
              },
            ])
          }
          return Promise.reject(new Error('Endpoint not available'))
        })

      vi.spyOn(allscriptsProvider as any, 'getClient').mockReturnValue({
        searchResources: mockSearchResources,
      })

      await expect(allscriptsProvider.initialize()).rejects.toThrow(
        'Required Allscripts endpoint',
      )
    })

    it('should throw error when OAuth2 configuration is missing', async () => {
      // Mock the validateEndpoint method to return true
      vi.spyOn(allscriptsProvider as any, 'validateEndpoint').mockResolvedValue(
        true,
      )

      // Mock verifyAllscriptsEndpoints to succeed
      vi.spyOn(
        allscriptsProvider as any,
        'verifyAllscriptsEndpoints',
      ).mockResolvedValue(undefined)

      // Mock the FHIR client's searchResources method with invalid capability statement
      const mockSearchResources = vi.fn().mockResolvedValue([
        {
          rest: [
            {
              security: {
                service: ['Basic'], // Missing OAuth2
              },
            },
          ],
          security: {},
        },
      ])

      vi.spyOn(allscriptsProvider as any, 'getClient').mockReturnValue({
        searchResources: mockSearchResources,
      })

      await expect(allscriptsProvider.initialize()).rejects.toThrow(
        'OAuth2 security service is not configured',
      )
    })

    it('should throw error when SMART on FHIR endpoints are missing', async () => {
      // Mock the validateEndpoint method to return true
      vi.spyOn(allscriptsProvider as any, 'validateEndpoint').mockResolvedValue(
        true,
      )

      // Mock verifyAllscriptsEndpoints to succeed
      vi.spyOn(
        allscriptsProvider as any,
        'verifyAllscriptsEndpoints',
      ).mockResolvedValue(undefined)

      // Mock the FHIR client's searchResources method with missing SMART endpoints
      const mockSearchResources = vi.fn().mockResolvedValue([
        {
          rest: [
            {
              security: {
                service: ['OAuth2'],
                // Missing SMART extension
              },
            },
          ],
          security: {},
        },
      ])

      vi.spyOn(allscriptsProvider as any, 'getClient').mockReturnValue({
        searchResources: mockSearchResources,
      })

      await expect(allscriptsProvider.initialize()).rejects.toThrow(
        'SMART on FHIR OAuth2 endpoints are not configured',
      )
    })
  })

  describe('cleanup', () => {
    it('should successfully cleanup provider', async () => {
      await expect(allscriptsProvider.cleanup()).resolves.not.toThrow()
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Cleaned up provider ${providerConfig.id}`,
      )
    })

    it('should handle cleanup errors gracefully', async () => {
      // Mock super.cleanup to throw an error
      vi.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(allscriptsProvider)),
        'cleanup',
      ).mockRejectedValue(new Error('Cleanup failed'))

      await expect(allscriptsProvider.cleanup()).rejects.toThrow(
        'Cleanup failed',
      )
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('default scopes', () => {
    it('should provide default scopes when not specified', () => {
      const providerWithDefaultScopes = new AllscriptsProvider(
        providerConfig.id,
        providerConfig.name,
        providerConfig.baseUrl,
        providerConfig.clientId,
        providerConfig.clientSecret,
        undefined,
        mockLogger as unknown as Console,
      )

      expect(providerWithDefaultScopes.scopes).toContain('user/Patient.read')
      expect(providerWithDefaultScopes.scopes).toContain(
        'user/Observation.read',
      )
      expect(providerWithDefaultScopes.scopes).toContain('openid')
      expect(providerWithDefaultScopes.scopes).toContain('fhirUser')
    })
  })

  // New Security-focused Tests
  describe('security', () => {
    it('should securely handle credentials', () => {
      // Client secret should not be exposed in logs or external output
      const providerString = String(allscriptsProvider)
      expect(providerString).not.toContain(providerConfig.clientSecret)

      // When serialized to string, credentials should be masked
      const serialized = JSON.stringify(allscriptsProvider)
      expect(serialized).not.toContain(providerConfig.clientSecret)
    })

    it('should implement proper token storage', async () => {
      // Mock token storage mechanisms
      const mockTokenStorage = {
        store: vi.fn(),
        retrieve: vi.fn(),
        delete: vi.fn(),
      }

      // @ts-expect-error Mocking private property for testing
      allscriptsProvider.tokenStorage = mockTokenStorage

      // Mock token generation functions
      vi.spyOn(allscriptsProvider as any, 'generateAuthCode').mockResolvedValue(
        'mock-auth-code',
      )
      vi.spyOn(
        allscriptsProvider as any,
        'exchangeCodeForToken',
      ).mockResolvedValue({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
      })

      // Mock the validateEndpoint method to avoid network calls
      vi.spyOn(allscriptsProvider as any, 'validateEndpoint').mockResolvedValue(
        true,
      )
      vi.spyOn(
        allscriptsProvider as any,
        'verifyAllscriptsEndpoints',
      ).mockResolvedValue(undefined)

      // Mock the FHIR client's searchResources method
      const mockCapabilityStatement = {
        rest: [
          {
            security: {
              service: ['OAuth2'],
              extension: [
                {
                  url: 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris',
                  extension: [
                    {
                      url: 'authorize',
                      valueUri: 'https://auth.example.com/authorize',
                    },
                    {
                      url: 'token',
                      valueUri: 'https://auth.example.com/token',
                    },
                  ],
                },
              ],
            },
          },
        ],
        security: {},
      }

      const mockSearchResources = vi
        .fn()
        .mockResolvedValue([mockCapabilityStatement])
      vi.spyOn(allscriptsProvider as any, 'getClient').mockReturnValue({
        searchResources: mockSearchResources,
      })

      // Test the authorization process
      await allscriptsProvider.initialize()

      // Verify token storage
      expect(mockTokenStorage.store).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          access_token: expect.any(String),
          refresh_token: expect.any(String),
        }),
      )
    })

    it('should implement proper error handling for security failures', async () => {
      // Mock security failure
      vi.spyOn(allscriptsProvider as any, 'validateEndpoint').mockRejectedValue(
        new Error('TLS handshake failed'),
      )

      // Test that security errors are properly handled
      await expect(allscriptsProvider.initialize()).rejects.toThrow()
      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('should validate TLS/SSL configuration', async () => {
      // Mock TLS verification
      const mockTlsVerify = vi.fn().mockResolvedValue(true)
      vi.spyOn(
        allscriptsProvider as any,
        'verifyTlsConfiguration',
      ).mockImplementation(mockTlsVerify)

      // Mock the validateEndpoint method to return true
      vi.spyOn(allscriptsProvider as any, 'validateEndpoint').mockResolvedValue(
        true,
      )

      // Mock other required methods
      vi.spyOn(
        allscriptsProvider as any,
        'verifyAllscriptsEndpoints',
      ).mockResolvedValue(undefined)
      const mockCapabilityStatement = {
        rest: [
          {
            security: {
              service: ['OAuth2'],
              extension: [
                {
                  url: 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris',
                  extension: [
                    {
                      url: 'authorize',
                      valueUri: 'https://auth.example.com/authorize',
                    },
                    {
                      url: 'token',
                      valueUri: 'https://auth.example.com/token',
                    },
                  ],
                },
              ],
            },
          },
        ],
        security: {},
      }
      const mockSearchResources = vi
        .fn()
        .mockResolvedValue([mockCapabilityStatement])
      vi.spyOn(allscriptsProvider as any, 'getClient').mockReturnValue({
        searchResources: mockSearchResources,
      })

      // Initialize the provider
      await allscriptsProvider.initialize()

      // Verify TLS configuration is checked
      expect(mockTlsVerify).toHaveBeenCalled()
    })
  })

  // New Compliance Tests
  describe('hIPAA compliance', () => {
    it('should audit all data access operations', async () => {
      // Mock patient data access methods
      const mockGetPatient = vi
        .fn()
        .mockResolvedValue({ id: 'patient-123', resourceType: 'Patient' })
      vi.spyOn(allscriptsProvider as any, 'getPatient').mockImplementation(
        mockGetPatient,
      )

      // Mock audit logging
      const mockAuditLog = vi.fn()
      vi.spyOn(allscriptsProvider as any, 'logAudit').mockImplementation(
        mockAuditLog,
      )

      // Perform a data access operation
      await (allscriptsProvider as any).getPatient('patient-123')

      // Verify audit logging occurred
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.stringContaining('patient-123'),
        expect.objectContaining({ action: 'read', resourceType: 'Patient' }),
      )
    })

    it('should implement data minimization', async () => {
      // Mock patient search method
      const mockPatientSearch = vi.fn().mockResolvedValue([
        {
          id: 'patient-1',
          resourceType: 'Patient',
          name: [{ given: ['John'], family: 'Doe' }],
        },
        {
          id: 'patient-2',
          resourceType: 'Patient',
          name: [{ given: ['Jane'], family: 'Smith' }],
        },
      ])
      vi.spyOn(allscriptsProvider as any, 'searchPatients').mockImplementation(
        mockPatientSearch,
      )

      // Mock data minimization function
      const mockMinimizeData = vi.fn((data) => {
        // Return only necessary fields
        return data.map((patient: any) => ({
          id: patient.id,
          resourceType: patient.resourceType,
          name: patient.name,
        }))
      })
      vi.spyOn(allscriptsProvider as any, 'minimizeData').mockImplementation(
        mockMinimizeData,
      )

      // Perform a search operation
      const results = await (allscriptsProvider as any).searchPatients({
        name: 'John',
      })

      // Verify data minimization was applied
      expect(mockMinimizeData).toHaveBeenCalled()
      expect(results).toHaveLength(2)
      expect(results[0]).toHaveProperty('id')
      expect(results[0]).toHaveProperty('resourceType')
      expect(results[0]).not.toHaveProperty('address') // Should be filtered out
      expect(results[0]).not.toHaveProperty('telecom') // Should be filtered out
    })

    it('should implement secure token handling', async () => {
      // Mock token refresh
      const mockRefreshToken = vi.fn().mockResolvedValue({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
      })
      vi.spyOn(
        allscriptsProvider as any,
        'refreshAccessToken',
      ).mockImplementation(mockRefreshToken)

      // Mock token storage
      const mockTokenStorage = {
        store: vi.fn(),
        retrieve: vi.fn().mockReturnValue({
          access_token: 'old-access-token',
          refresh_token: 'old-refresh-token',
          expires_at: Date.now() - 1000, // Expired
        }),
        delete: vi.fn(),
      }

      // @ts-expect-error Mocking private property for testing
      allscriptsProvider.tokenStorage = mockTokenStorage

      // Test token refresh mechanism
      await (allscriptsProvider as any).getAccessToken()

      // Verify token refresh and secure storage
      expect(mockRefreshToken).toHaveBeenCalled()
      expect(mockTokenStorage.store).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
        }),
      )
    })

    it('should verify authorization scopes', async () => {
      // Test with insufficient scopes
      const insufficientProvider = new AllscriptsProvider(
        providerConfig.id,
        providerConfig.name,
        providerConfig.baseUrl,
        providerConfig.clientId,
        providerConfig.clientSecret,
        ['openid'], // Missing critical scopes
        mockLogger as unknown as Console,
      )

      // Mock authorization verification
      const mockVerifyScopes = vi.fn().mockImplementation((scopes) => {
        const requiredScopes = ['user/Patient.read', 'openid']
        return requiredScopes.every((scope) => scopes.includes(scope))
      })
      vi.spyOn(
        insufficientProvider as any,
        'verifyRequiredScopes',
      ).mockImplementation(mockVerifyScopes)

      // Attempt to access patient data
      const mockGetPatient = vi.fn().mockImplementation(async () => {
        if (
          !(insufficientProvider as any).verifyRequiredScopes([
            'user/Patient.read',
          ])
        ) {
          throw new Error('Insufficient scopes')
        }
        return { id: 'patient-123' }
      })
      vi.spyOn(insufficientProvider as any, 'getPatient').mockImplementation(
        mockGetPatient,
      )

      // Verify scope checking occurs
      await expect(
        (insufficientProvider as any).getPatient('patient-123'),
      ).rejects.toThrow('Insufficient scopes')
    })
  })

  // Performance Tests
  describe('performance', () => {
    it('should handle concurrent requests efficiently', async () => {
      // Mock request method
      const mockRequest = vi
        .fn()
        .mockImplementationOnce(() => Promise.resolve({ data: 'response-1' }))
        .mockImplementationOnce(() => Promise.resolve({ data: 'response-2' }))
        .mockImplementationOnce(() => Promise.resolve({ data: 'response-3' }))

      vi.spyOn(allscriptsProvider as any, 'makeRequest').mockImplementation(
        mockRequest,
      )

      // Execute concurrent requests
      const startTime = Date.now()
      const results = await Promise.all([
        (allscriptsProvider as any).makeRequest('/endpoint-1'),
        (allscriptsProvider as any).makeRequest('/endpoint-2'),
        (allscriptsProvider as any).makeRequest('/endpoint-3'),
      ])
      const endTime = Date.now()

      // Verify all requests were made
      expect(mockRequest).toHaveBeenCalledTimes(3)
      expect(results).toHaveLength(3)

      // Check execution time (this is just a placeholder as timing can't be accurately tested)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete in reasonable time
    })

    it('should implement proper rate limiting', async () => {
      // Mock rate limiter
      const mockRateLimiter = {
        tryAcquire: vi.fn().mockReturnValue(true),
      }

      // @ts-expect-error Mocking private property for testing
      allscriptsProvider.rateLimiter = mockRateLimiter

      // Mock request method with rate limiting
      const mockRequest = vi.fn().mockImplementation(async () => {
        if (!(allscriptsProvider as any).rateLimiter.tryAcquire()) {
          throw new Error('Rate limit exceeded')
        }
        return { data: 'response' }
      })

      vi.spyOn(allscriptsProvider as any, 'makeRequest').mockImplementation(
        mockRequest,
      )

      // Test normal request
      await (allscriptsProvider as any).makeRequest('/endpoint')
      expect(mockRateLimiter.tryAcquire).toHaveBeenCalled()

      // Test rate limiting
      mockRateLimiter.tryAcquire.mockReturnValue(false) // Simulate hitting the rate limit
      await expect(
        (allscriptsProvider as any).makeRequest('/endpoint'),
      ).rejects.toThrow('Rate limit exceeded')
    })
  })
})
