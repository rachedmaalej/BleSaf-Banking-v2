import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { disconnectRedis } from './lib/redis';
import { startNotificationWorker, stopNotificationWorker } from './workers/notification';

async function gracefulShutdown(signal: string) {
  logger.info({ signal }, 'Received shutdown signal');

  await stopNotificationWorker();
  await disconnectRedis();
  await prisma.$disconnect();

  logger.info('Worker shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

async function start() {
  try {
    await prisma.$connect();
    logger.info('Database connected');

    startNotificationWorker();

    logger.info('BléSaf worker process started');
  } catch (error) {
    logger.fatal({ error }, 'Failed to start worker');
    process.exit(1);
  }
}

start();
