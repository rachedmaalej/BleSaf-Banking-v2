import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: true,
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected');
    });

    redisClient.on('error', (err) => {
      logger.error({ err }, 'Redis error');
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
    });
  }

  return redisClient;
}

export async function connectRedis(): Promise<void> {
  const client = getRedisClient();
  await client.connect();
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

// Pub/Sub clients for Socket.IO Redis Adapter
export function createPubSubClients(): { pubClient: Redis; subClient: Redis } {
  const pubClient = new Redis(config.REDIS_URL);
  const subClient = pubClient.duplicate();

  return { pubClient, subClient };
}

// BullMQ requires maxRetriesPerRequest: null
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

// Redis key helpers
export const REDIS_KEYS = {
  branchQueue: (branchId: string) => `queue:${branchId}`,
  ticketPosition: (ticketId: string) => `ticket:position:${ticketId}`,
  branchStats: (branchId: string) => `stats:${branchId}`,
  dailyTicketCounter: (branchId: string, servicePrefix: string, date: string) =>
    `counter:${branchId}:${servicePrefix}:${date}`,
} as const;
