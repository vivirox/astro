import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function main() {
  console.log('Stopping deployment...')

  try {
    // Stop all running deployment processes
    await execAsync('pm2 stop all')

    // Stop any running containers
    await execAsync('docker-compose down')

    console.log('Deployment stopped successfully')
    process.exit(0)
  } catch (error) {
    console.error('Failed to stop deployment:', error.message)
    process.exit(1)
  }
}

main()
