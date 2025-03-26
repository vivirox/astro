import { RedisService } from '../src/lib/services/redis/RedisService'
import { MonitoringService } from '../src/lib/monitoring/setup'
import { BackupVerificationService } from '../src/lib/backup/verify'
import { exec } from 'child_process'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import path from 'path'

const execAsync = promisify(exec)

async function main() {
  console.log('Starting rollback process...')

  try {
    // Initialize services
    const redis = new RedisService({
      url: process.env.REDIS_URL!,
      keyPrefix: process.env.REDIS_KEY_PREFIX!,
    })

    const monitoring = new MonitoringService()
    const backup = new BackupVerificationService()

    // Stop current deployment
    await execAsync('npm run deploy:stop')

    // Find latest backup
    const backupDir = process.env.BACKUP_DIR!
    const backups = await fs.readdir(backupDir)
    const latestBackup = backups
      .filter((f) => f.endsWith('.json'))
      .sort()
      .pop()

    if (!latestBackup) {
      throw new Error('No backup found')
    }

    // Restore from backup
    console.log(`Restoring from backup: ${latestBackup}`)
    const backupPath = path.join(backupDir, latestBackup)
    const backupData = JSON.parse(await fs.readFile(backupPath, 'utf-8'))

    // Restore Redis data
    for (const [key, value] of Object.entries(backupData.data)) {
      await redis.set(key, JSON.stringify(value))
    }

    // Deploy previous version
    const { version } = backupData
    await execAsync(`git checkout ${version}`)
    await execAsync('npm install')
    await execAsync('npm run build')
    await execAsync('npm run start')

    console.log('Rollback completed successfully')
    process.exit(0)
  } catch (error) {
    console.error('Rollback failed:', error.message)
    process.exit(1)
  }
}

main()
