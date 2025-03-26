import { EmailService } from '@/lib/services/email/EmailService'
import { logger } from '@/lib/utils/logger'

const WORKER_ID = crypto.randomUUID()
const PROCESSING_INTERVAL = 1000 // 1 second

async function startWorker() {
  logger.info('Starting email worker', { workerId: WORKER_ID })

  const emailService = new EmailService()

  try {
    await emailService.startProcessing(PROCESSING_INTERVAL)
  } catch (error) {
    logger.error('Email worker failed', {
      workerId: WORKER_ID,
      error: error instanceof Error ? error.message : String(error),
    })
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down email worker', {
    workerId: WORKER_ID,
  })
  process.exit(0)
})

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down email worker', {
    workerId: WORKER_ID,
  })
  process.exit(0)
})

// Start the worker
startWorker().catch((error) => {
  logger.error('Failed to start email worker', {
    workerId: WORKER_ID,
    error: error instanceof Error ? error.message : String(error),
  })
  process.exit(1)
})
