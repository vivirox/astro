import { initializeApplication, shutdownApplication } from '../lib/startup';
import { getLogger } from '../lib/logging';

const logger = getLogger();

/**
 * Initialize application on server startup
 */
(async function() {
  try {
    await initializeApplication();
    logger.info('Application started successfully');
    
    // Register shutdown handler
    process.on('SIGTERM', handleShutdown);
    process.on('SIGINT', handleShutdown);
  } catch (error) {
    logger.error('Failed to start application', error);
    process.exit(1);
  }
})();

/**
 * Handle graceful shutdown
 */
async function handleShutdown() {
  logger.info('Shutdown signal received, gracefully shutting down...');
  
  try {
    await shutdownApplication();
    logger.info('Application shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', error);
    process.exit(1);
  }
} 