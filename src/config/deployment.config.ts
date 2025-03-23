import config from './env.config'

/**
 * Deployment environment configurations
 */
export const deploymentConfig = {
  /**
   * Vercel deployment configuration
   */
  vercel: {
    token: config.deployment.vercelToken(),
    orgId: config.deployment.vercelOrgId(),
    projectId: config.deployment.vercelProjectId(),

    /**
     * Get the current deployment environment (development, preview, production)
     */
    getEnvironment: (): string => {
      return process.env.VERCEL_ENV || 'development'
    },

    /**
     * Check if the application is running in a Vercel environmen
     */
    isVercelEnvironment: (): boolean => {
      return !!process.env.VERCEL
    },

    /**
     * Check if the application is running in a Vercel production environmen
     */
    isProduction: (): boolean => {
      return process.env.VERCEL_ENV === 'production'
    },

    /**
     * Check if the application is running in a Vercel preview environmen
     */
    isPreview: (): boolean => {
      return process.env.VERCEL_ENV === 'preview'
    },

    /**
     * Check if the application is running in a Vercel development environmen
     */
    isDevelopment: (): boolean => {
      return process.env.VERCEL_ENV === 'development'
    },

    /**
     * Get the URL of the current deploymen
     */
    getDeploymentUrl: (): string => {
      if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`
      }
      return config.client.apiUrl() || ''
    },
  },

  /**
   * Get the base URL for API requests
   */
  getApiBaseUrl: (): string => {
    // Use the deployment URL if running in Vercel
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}/api`
    }

    // Otherwise use the configured API URL
    return `${config.client.apiUrl() || ''}/api`
  },

  /**
   * Check if the application is running in a development environmen
   */
  isDevelopment: (): boolean => {
    return config.isDevelopment() || deploymentConfig.vercel.isDevelopment()
  },

  /**
   * Check if the application is running in a production environmen
   */
  isProduction: (): boolean => {
    return config.isProduction() || deploymentConfig.vercel.isProduction()
  },

  /**
   * Check if the application is running in a test environmen
   */
  isTest: (): boolean => {
    return config.isTest()
  },
}

export default deploymentConfig
