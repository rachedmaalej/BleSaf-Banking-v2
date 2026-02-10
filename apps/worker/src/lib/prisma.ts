import { PrismaClient } from '@prisma/client';
import { config } from './config';
import { logger } from './logger';

export const prisma = new PrismaClient({
  log:
    config.NODE_ENV === 'development'
      ? [{ emit: 'event', level: 'error' }]
      : [{ emit: 'event', level: 'error' }],
});

prisma.$on('error' as never, (e: { message: string }) => {
  logger.error({ err: e.message }, 'Prisma Error');
});

export default prisma;
