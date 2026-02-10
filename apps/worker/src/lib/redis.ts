import Redis from 'ioredis';
import { config } from './config';
import { logger } from './logger';

let bullmqRedisClient: Redis | null = null;

export function getBullMQRedisConnection(): Redis {
  if (!bullmqRedisClient) {
    bullmqRedisClient = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: null,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    bullmqRedisClient.on('error', (err) => {
      logger.error({ err }, 'BullMQ Redis error');
    });
  }

  return bullmqRedisClient;
}

export async function disconnectRedis(): Promise<void> {
  if (bullmqRedisClient) {
    await bullmqRedisClient.quit();
    bullmqRedisClient = null;
  }
}
