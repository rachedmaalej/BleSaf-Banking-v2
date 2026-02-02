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

/**
 * Set the tenant context for Row Level Security (RLS)
 * Must be called at the start of each request for tenant-scoped queries
 */
export async function setTenantContext(tenantId: string): Promise<void> {
  // Set PostgreSQL session variable for RLS policies
  await prisma.$executeRawUnsafe(`SET app.current_tenant = '${tenantId}'`);
}

/**
 * Clear the tenant context
 */
export async function clearTenantContext(): Promise<void> {
  await prisma.$executeRawUnsafe(`RESET app.current_tenant`);
}

export default prisma;
