import { RedisService } from '../src/lib/services/redis/RedisService'
import { MonitoringService } from '../src/lib/monitoring/setup'
import { BackupVerificationService } from '../src/lib/backup/verify'
import { execSync, exec } from 'child_process'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import path from 'path'

const execAsync = promisify(exec)

// Check for production tags and handle case with only one tag
const getTagForRollback = (): string => {
  try {
    const tags = execSync('git tag -l "production-*" --sort=-committerdate')
      .toString()
      .trim()
      .split('\n')

    if (tags.length === 0 || (tags.length === 1 && tags[0] === '')) {
      console.error('No production tags found. Nothing to roll back to.')
      process.exit(1)
    }

    if (tags.length === 1) {
      console.log(`Only one production tag found: ${tags[0]}`)
      console.log(
        'If you want to roll back, you need at least two production tags.',
      )
      process.exit(1)
    }

    return tags[1] // Get the second most recent tag for rollback
  } catch (error) {
    console.error(
      'Error getting tags:',
      error instanceof Error ? error.message : String(error),
    )
    process.exit(1)
  }
  return '' // This will never be reached due to process.exit() above
}

async function main() {
  console.log('Starting rollback process...')

  try {
    // Get tag for rollback
    const rollbackTag = getTagForRollback()
    console.log(`Rolling back to tag: ${rollbackTag}`)

    // Initialize services
    const redis = new RedisService({
      url: process.env.REDIS_URL!,
      keyPrefix: process.env.REDIS_KEY_PREFIX!,
    })

    const monitoring = new MonitoringService()
    const backup = new BackupVerificationService()

    // Stop current deployment
    await execAsync('pnpm run deploy:stop')

    // Find latest backup
    const backupDir = process.env.BACKUP_DIR || './backups'
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
    console.log(`Checking out tag: ${rollbackTag}`)
    await execAsync(`git checkout ${rollbackTag}`)
    await execAsync('pnpm install')
    await execAsync('pnpm run build')
    await execAsync('pnpm run start')

    console.log('Rollback completed successfully')
    process.exit(0)
  } catch (error) {
    console.error(
      'Rollback failed:',
      error instanceof Error ? error.message : String(error),
    )
    process.exit(1)
  }
}

main()
