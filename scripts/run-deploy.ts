import { RedisService } from '../src/lib/services/redis/RedisService'
import { MonitoringService } from '../src/lib/monitoring/setup'
import { BackupVerificationService } from '../src/lib/backup/verify'
import { createDeployment } from './deploy'
import { getConfig } from './deploy.config'

async function main() {
  // Parse environment from command line
  const env = process.argv[2] || 'staging'
  const config = getConfig(env)

  console.log(`Starting deployment to ${env} environment...`)

  try {
    // Initialize services
    const redis = new RedisService({
      url: process.env.REDIS_URL!,
      keyPrefix: process.env.REDIS_KEY_PREFIX!,
    })

    const monitoring = new MonitoringService()
    const backup = new BackupVerificationService()

    // Create deployment service
    const deployment = await createDeployment(redis, monitoring, backup, config)

    // Run deployment
    await deployment.deploy()

    console.log('Deployment completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Deployment failed:', error.message)
    process.exit(1)
  }
}

main()
