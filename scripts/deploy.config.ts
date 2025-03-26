import { DeploymentConfig } from './deploy'

export const stagingConfig: DeploymentConfig = {
  environment: 'staging',
  rolloutPercentage: 100,
  healthCheckInterval: 30000, // 30 seconds
  healthCheckTimeout: 300000, // 5 minutes
  rollbackThreshold: 5, // 5% error rate triggers rollback
}

export const productionConfig: DeploymentConfig = {
  environment: 'production',
  rolloutPercentage: 10, // Start with 10% of instances
  healthCheckInterval: 30000, // 30 seconds
  healthCheckTimeout: 300000, // 5 minutes
  rollbackThreshold: 2, // 2% error rate triggers rollback
}

export const getConfig = (env: string): DeploymentConfig => {
  switch (env) {
    case 'staging':
      return stagingConfig
    case 'production':
      return productionConfig
    default:
      throw new Error(`Unknown environment: ${env}`)
  }
}
