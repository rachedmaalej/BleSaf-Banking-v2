import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { SOCKET_EVENTS, JWTPayload } from '@blesaf/shared';
import { createPubSubClients } from '../lib/redis';
import { verifyToken } from '../middleware/auth';
import { config } from '../config';
import { logger } from '../lib/logger';

// Extend Socket type to include user data
interface AuthenticatedSocket extends Socket {
  data: {
    user?: JWTPayload;
  };
}

let io: Server;

export function setupSocketIO(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin
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
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Setup Redis adapter for horizontal scaling
  const { pubClient, subClient } = createPubSubClients();

  Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('Socket.IO Redis adapter connected');
    })
    .catch((err) => {
      logger.error({ err }, 'Socket.IO Redis adapter connection failed');
    });

  // Authentication middleware
  // Allow all connections - auth is enforced at room join level
  io.use(async (socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;

    // Try to authenticate if token provided, but don't require it
    // Public pages (display, ticket status) connect without auth
    if (token) {
      try {
        const payload = verifyToken(token);
        socket.data.user = payload;
      } catch (err) {
        // Invalid token - allow connection but without user data
        // Protected room joins will be rejected
        logger.debug({ err }, 'Socket connected with invalid token');
      }
    }

    next();
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.data.user;

    logger.debug(
      { socketId: socket.id, userId: user?.userId },
      'Socket connected'
    );

    // Join branch room (for staff dashboards)
    socket.on(SOCKET_EVENTS.JOIN_BRANCH, ({ branchId }) => {
      if (!user) {
        socket.emit(SOCKET_EVENTS.ERROR, 'Authentication required');
        return;
      }

      // Verify branch access
      if (user.role === 'teller' && user.branchId !== branchId) {
        socket.emit(SOCKET_EVENTS.ERROR, 'Unauthorized branch access');
        return;
      }

      socket.join(`branch:${branchId}`);
      logger.debug(
        { socketId: socket.id, branchId, userId: user.userId },
        'Joined branch room'
      );
    });

    // Leave branch room
    socket.on(SOCKET_EVENTS.LEAVE_BRANCH, ({ branchId }) => {
      socket.leave(`branch:${branchId}`);
    });

    // Join ticket room (for customer tracking - public)
    socket.on(SOCKET_EVENTS.JOIN_TICKET, ({ ticketId }) => {
      socket.join(`ticket:${ticketId}`);
      logger.debug({ socketId: socket.id, ticketId }, 'Joined ticket room');
    });

    // Leave ticket room
    socket.on(SOCKET_EVENTS.LEAVE_TICKET, ({ ticketId }) => {
      socket.leave(`ticket:${ticketId}`);
    });

    // Join display room (for TV display - public)
    socket.on('join:display', ({ branchId }) => {
      socket.join(`display:${branchId}`);
      logger.debug({ socketId: socket.id, branchId }, 'Joined display room');
    });

    // Disconnect handler
    socket.on('disconnect', (reason) => {
      logger.debug(
        { socketId: socket.id, reason, userId: user?.userId },
        'Socket disconnected'
      );
    });
  });

  return io;
}

// Helper functions to emit events

/**
 * Emit ticket created event to branch room and display
 */
export function emitTicketCreated(branchId: string, data: unknown) {
  io.to(`branch:${branchId}`).to(`display:${branchId}`).emit(SOCKET_EVENTS.TICKET_CREATED, data);
}

/**
 * Emit ticket called event to branch, display, and specific ticket room
 */
export function emitTicketCalled(branchId: string, ticketId: string, data: unknown) {
  io.to(`branch:${branchId}`)
    .to(`display:${branchId}`)
    .to(`ticket:${ticketId}`)
    .emit(SOCKET_EVENTS.TICKET_CALLED, data);
}

/**
 * Emit ticket serving event
 */
export function emitTicketServing(branchId: string, ticketId: string, data: unknown) {
  io.to(`branch:${branchId}`)
    .to(`display:${branchId}`)
    .to(`ticket:${ticketId}`)
    .emit(SOCKET_EVENTS.TICKET_SERVING, data);
}

/**
 * Emit ticket completed event
 */
export function emitTicketCompleted(branchId: string, ticketId: string, data: unknown) {
  io.to(`branch:${branchId}`)
    .to(`display:${branchId}`)
    .to(`ticket:${ticketId}`)
    .emit(SOCKET_EVENTS.TICKET_COMPLETED, data);
}

/**
 * Emit ticket no-show event
 */
export function emitTicketNoShow(branchId: string, ticketId: string, data: unknown) {
  io.to(`branch:${branchId}`)
    .to(`display:${branchId}`)
    .to(`ticket:${ticketId}`)
    .emit(SOCKET_EVENTS.TICKET_NO_SHOW, data);
}

/**
 * Emit ticket transferred event
 */
export function emitTicketTransferred(branchId: string, ticketId: string, data: unknown) {
  io.to(`branch:${branchId}`)
    .to(`display:${branchId}`)
    .to(`ticket:${ticketId}`)
    .emit(SOCKET_EVENTS.TICKET_TRANSFERRED, data);
}

/**
 * Emit queue updated event (full refresh)
 */
export function emitQueueUpdated(branchId: string, data: unknown) {
  io.to(`branch:${branchId}`).to(`display:${branchId}`).emit(SOCKET_EVENTS.QUEUE_UPDATED, data);
}

/**
 * Emit counter status updated event
 */
export function emitCounterUpdated(branchId: string, data: unknown) {
  io.to(`branch:${branchId}`).to(`display:${branchId}`).emit(SOCKET_EVENTS.COUNTER_UPDATED, data);
}

/**
 * Emit queue paused event to branch and display
 */
export function emitQueuePaused(branchId: string, data: unknown) {
  io.to(`branch:${branchId}`).to(`display:${branchId}`).emit(SOCKET_EVENTS.QUEUE_PAUSED, data);
}

/**
 * Emit queue resumed event to branch and display
 */
export function emitQueueResumed(branchId: string, data: unknown) {
  io.to(`branch:${branchId}`).to(`display:${branchId}`).emit(SOCKET_EVENTS.QUEUE_RESUMED, data);
}

/**
 * Emit queue reset event to branch and display
 */
export function emitQueueReset(branchId: string, data: unknown) {
  io.to(`branch:${branchId}`).to(`display:${branchId}`).emit(SOCKET_EVENTS.QUEUE_RESET, data);
}

/**
 * Emit queue auto-closed event (end of day)
 */
export function emitQueueAutoClosed(branchId: string, data: unknown) {
  io.to(`branch:${branchId}`).to(`display:${branchId}`).emit(SOCKET_EVENTS.QUEUE_AUTO_CLOSED, data);
}

/**
 * Emit queue auto-opened event (start of day)
 */
export function emitQueueAutoOpened(branchId: string, data: unknown) {
  io.to(`branch:${branchId}`).to(`display:${branchId}`).emit(SOCKET_EVENTS.QUEUE_AUTO_OPENED, data);
}

/**
 * Emit ticket position updated event to individual ticket room
 */
export function emitTicketPositionUpdated(ticketId: string, data: { position: number; estimatedWaitMins: number; urgency: 'normal' | 'approaching' | 'imminent' }) {
  io.to(`ticket:${ticketId}`).emit(SOCKET_EVENTS.TICKET_POSITION_UPDATED, data);
}

/**
 * Emit ticket prioritized event
 */
export function emitTicketPrioritized(branchId: string, ticketId: string, data: unknown) {
  io.to(`branch:${branchId}`)
    .to(`display:${branchId}`)
    .to(`ticket:${ticketId}`)
    .emit(SOCKET_EVENTS.TICKET_PRIORITIZED, data);
}

/**
 * Emit announcement created event to branch and display rooms
 */
export function emitAnnouncement(branchId: string, data: unknown) {
  io.to(`branch:${branchId}`).to(`display:${branchId}`).emit(SOCKET_EVENTS.ANNOUNCEMENT_CREATED, data);
}

/**
 * Emit announcement dismissed event to branch and display rooms
 */
export function emitAnnouncementDismissed(branchId: string, announcementId: string) {
  io.to(`branch:${branchId}`)
    .to(`display:${branchId}`)
    .emit(SOCKET_EVENTS.ANNOUNCEMENT_DISMISSED, { announcementId });
}

export { io };
