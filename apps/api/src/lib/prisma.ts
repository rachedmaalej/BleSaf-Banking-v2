import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { logger } from './logger';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      config.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
          ]
        : [{ emit: 'event', level: 'error' }],
  });

if (config.NODE_ENV === 'development') {
  prisma.$on('query' as never, (e: { query: string; params: string; duration: number }) => {
    logger.debug({ query: e.query, params: e.params, duration: e.duration }, 'Prisma Query');
  });
}

prisma.$on('error' as never, (e: { message: string }) => {
  logger.error({ err: e.message }, 'Prisma Error');
});

if (config.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Set the tenant context for Row Level Security (RLS)
 * Must be called at the start of each request for tenant-scoped queries
 */
export async function setTenantContext(tenantId: string): Promise<void> {
  if (!UUID_REGEX.test(tenantId)) {
    throw new Error('Invalid tenant ID format');
  }
  await prisma.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, false)`;
}

/**
 * Clear the tenant context
 */
export async function clearTenantContext(): Promise<void> {
  await prisma.$executeRaw`RESET app.current_tenant`;
}

export default prisma;
