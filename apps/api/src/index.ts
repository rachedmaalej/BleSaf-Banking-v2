import * as Sentry from '@sentry/node';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { config } from './config';
import { logger, requestLogger } from './lib/logger';
import { prisma } from './lib/prisma';
import { connectRedis, disconnectRedis } from './lib/redis';
import { AppError } from './lib/errors';
import { setupSocketIO } from './socket';

// Import routes
import authRoutes from './routes/auth';
import queueRoutes from './routes/queue';
import adminRoutes from './routes/admin';
import analyticsRoutes from './routes/analytics';
import breaksRoutes from './routes/breaks';

// Initialize Sentry
if (config.SENTRY_DSN) {
  Sentry.init({
    dsn: config.SENTRY_DSN,
    environment: config.NODE_ENV,
    tracesSampleRate: config.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app: undefined }),
    ],
  });
}

const app = express();
const httpServer = createServer(app);

// Trust proxy for correct IP in logs behind reverse proxy
app.set('trust proxy', 1);

// Sentry request handler (must be first)
if (config.SENTRY_DSN) {
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: config.NODE_ENV === 'production',
    crossOriginEmbedderPolicy: false,
  })
);

// CORS - allow multiple localhost ports in development
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      // In development, allow any localhost origin
      if (config.NODE_ENV === 'development' && origin.match(/^http:\/\/localhost:\d+$/)) {
        return callback(null, true);
      }

      // In production, only allow configured frontend URL
      if (origin === config.FRONTEND_URL) {
        return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Request logging
app.use(requestLogger);

// Health check endpoint (before auth)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/breaks', breaksRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    code: 'NOT_FOUND',
  });
});

// Sentry error handler (must be before custom error handler)
if (config.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // Log the error
  logger.error({ err }, 'Unhandled error');

  // Handle known errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
      ...(err instanceof Error && 'errors' in err && { errors: (err as any).errors }),
    });
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    if (prismaError.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'A record with this value already exists',
        code: 'DUPLICATE_ENTRY',
      });
    }
    if (prismaError.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Record not found',
        code: 'NOT_FOUND',
      });
    }
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    const zodError = err as any;
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: zodError.flatten?.().fieldErrors || {},
    });
  }

  // Generic error response (don't leak details in production)
  res.status(500).json({
    success: false,
    error: config.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR',
  });
});

// Setup Socket.IO
const io = setupSocketIO(httpServer);

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info({ signal }, 'Received shutdown signal');

  // Close HTTP server
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });

  // Close Socket.IO
  io.close(() => {
    logger.info('Socket.IO closed');
  });

  // Disconnect Redis
  await disconnectRedis();
  logger.info('Redis disconnected');

  // Disconnect Prisma
  await prisma.$disconnect();
  logger.info('Prisma disconnected');

  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
async function start() {
  try {
    // Connect to Redis
    await connectRedis();
    logger.info('Redis connected');

    // Test database connection
    await prisma.$connect();
    logger.info('Database connected');

    // Start HTTP server
    httpServer.listen(config.PORT, () => {
      logger.info({ port: config.PORT, env: config.NODE_ENV }, 'Server started');
    });
  } catch (error) {
    logger.fatal({ error }, 'Failed to start server');
    process.exit(1);
  }
}

start();

export { app, httpServer, io };
