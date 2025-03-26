import { EHRError } from '../errors/ehr.error'
import { BaseEHRProvider } from './base.provider'

export class AthenahealthProvider extends BaseEHRProvider {
  private static readonly DEFAULT_SCOPES = [
    'user/Patient.read',
    'user/Observation.read',
    'user/Encounter.read',
    'user/Condition.read',
    'user/Procedure.read',
    'openid',
    'fhirUser',
  ]

  constructor(
    id: string,
    name: string,
    baseUrl: string,
    clientId: string,
    clientSecret: string,
    scopes?: string[],
    logger: Console = console,
  ) {
    super(
      id,
      name,
      baseUrl,
      clientId,
      clientSecret,
      scopes || AthenahealthProvider.DEFAULT_SCOPES,
      logger,
    )
  }

  async initialize(): Promise<void> {
    this.logger.info(`Initializing provider ${this.id}`)

    try {
      // Validate the base endpoint
      const isValid = await this.validateEndpoint()
      if (!isValid) {
        throw new EHRError('Invalid Athenahealth endpoint')
      }

      // Initialize Athenahealth-specific features
      await this.initializeAthenahealthFeatures()

      // Verify required endpoints are available
      await this.verifyAthenahealthEndpoints()

      this.logger.info(`Provider ${this.id} initialized successfully`)
    } catch (error) {
      this.logger.error(`Failed to initialize provider ${this.id}:`, error)
      throw error
    }
  }

  private async initializeAthenahealthFeatures(): Promise<void> {
    try {
      // Get the FHIR client
      const client = this.getClient()

      // Search for CapabilityStatement to verify SMART on FHIR support
      const [capabilityStatement] = await client.searchResources(
        'CapabilityStatement',
        {
          mode: 'server',
        },
      )

      if (!capabilityStatement) {
        throw new EHRError('No CapabilityStatement found')
      }

      // Verify OAuth2 security service is configured
      const rest = capabilityStatement.rest?.[0]
      const security = rest?.security

      if (!security?.service?.includes('OAuth2')) {
        throw new EHRError('OAuth2 security service is not configured')
      }

      // Verify SMART on FHIR OAuth2 endpoints
      const smartExtension = security.extension?.find(
        (ext) =>
          ext.url ===
          'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris',
      )

      if (!smartExtension?.extension?.length) {
        throw new EHRError('SMART on FHIR OAuth2 endpoints are not configured')
      }

      // Verify required OAuth2 endpoints are present
      const hasAuthorize = smartExtension.extension.some(
        (ext) => ext.url === 'authorize',
      )
      const hasToken = smartExtension.extension.some(
        (ext) => ext.url === 'token',
      )

      if (!hasAuthorize || !hasToken) {
        throw new EHRError('Required OAuth2 endpoints are missing')
      }
    } catch (error) {
      this.logger.error('Failed to initialize Athenahealth features:', error)
      throw error
    }
  }

  private async verifyAthenahealthEndpoints(): Promise<void> {
    try {
      const client = this.getClient()

      // Verify access to required FHIR resources
      const requiredEndpoints = [
        'Patient',
        'Observation',
        'Encounter',
        'Condition',
        'Procedure',
      ]

      for (const endpoint of requiredEndpoints) {
        try {
          await client.searchResources(endpoint, { _count: 1 })
        } catch (error) {
          throw new EHRError(
            `Required Athenahealth endpoint ${endpoint} is not available`,
          )
        }
      }
    } catch (error) {
      this.logger.error('Failed to verify Athenahealth endpoints:', error)
      throw error
    }
  }

  async cleanup(): Promise<void> {
    try {
      this.logger.info(`Cleaning up provider ${this.id}`)
      await super.cleanup()
      // Add any Athenahealth-specific cleanup here if needed
      this.logger.info(`Cleaned up provider ${this.id}`)
    } catch (error) {
      this.logger.error(`Failed to cleanup provider ${this.id}:`, error)
      throw error
    }
  }
}
