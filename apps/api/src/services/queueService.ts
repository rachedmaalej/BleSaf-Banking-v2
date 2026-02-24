import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getRedisClient, REDIS_KEYS } from '../lib/redis';
import { getTodayRangeUTC, getTodayDateString, calculateDurationMins } from '../lib/datetime';
import { NotFoundError, BadRequestError, ForbiddenError } from '../lib/errors';
import { logger } from '../lib/logger';
import {
  TICKET_STATUS,
  TICKET_ACTION,
  CheckinInput,
  TicketStatus,
  NotificationChannel,
  BranchQueueState,
  TicketPosition,
  TicketDisplay,
  CounterDisplay,
  QueueStats,
  ServiceQueueStats,
  JWTPayload,
} from '@blesaf/shared';
import {
  emitTicketCreated,
  emitTicketCalled,
  emitTicketServing,
  emitTicketCompleted,
  emitTicketNoShow,
  emitTicketTransferred,
  emitQueueUpdated,
  emitQueuePaused,
  emitQueueResumed,
  emitQueueReset,
  emitTicketPrioritized,
  emitTicketPositionUpdated,
} from '../socket';
import { notificationQueue } from './notificationQueue';

export const queueService = {
  /**
   * List active branches for display/kiosk selection
   * Public endpoint - returns minimal data
   */
  async listBranchesForDisplay() {
    const branches = await prisma.branch.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
      },
      orderBy: { name: 'asc' },
    });

    return branches;
  },

  /**
   * Get branch staff (tellers + manager) for login page
   * Public endpoint - returns only name, email, role (no sensitive data)
   */
  async getBranchStaffForLogin(branchId: string) {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, name: true },
    });

    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    const staff = await prisma.user.findMany({
      where: {
        branchId,
        status: 'active',
        role: { in: ['teller', 'branch_manager'] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });

    return {
      branchId,
      branchName: branch.name,
      staff,
    };
  },

  /**
   * Create a new ticket (check-in)
   * Public endpoint for kiosk/mobile
   */
  async createTicket(data: CheckinInput) {
    const { branchId, serviceCategoryId, customerPhone, notificationChannel, priority, checkinMethod } = data;

    // Get branch with timezone
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, name: true, timezone: true, notifyAtPosition: true, queueStatus: true },
    });

    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    // Check if queue is paused or closed
    if (branch.queueStatus === 'paused') {
      throw new BadRequestError('Queue is temporarily paused. Please try again later.');
    }
    if (branch.queueStatus === 'closed') {
      throw new BadRequestError('Branch is closed. Queue will open at the scheduled time.');
    }

    // Get service category
    const service = await prisma.serviceCategory.findUnique({
      where: { id: serviceCategoryId, branchId, isActive: true },
      select: { id: true, nameAr: true, nameFr: true, prefix: true, avgServiceTime: true },
    });

    if (!service) {
      throw new NotFoundError('Service category not found');
    }

    // Generate ticket number
    const ticketNumber = await this.generateTicketNumber(branchId, service.prefix, branch.timezone);

    // Get current position in queue
    const { start, end } = getTodayRangeUTC(branch.timezone);
    const waitingCount = await prisma.ticket.count({
      where: {
        branchId,
        serviceCategoryId,
        status: TICKET_STATUS.WAITING,
        createdAt: { gte: start, lte: end },
      },
    });
    const position = waitingCount + 1;

    // Calculate estimated wait
    const activeCounters = await this.getActiveCountersForService(branchId, serviceCategoryId);
    const estimatedWaitMins = this.calculateEstimatedWait(position, service.avgServiceTime, activeCounters);

    // Auto-detect notification channel: if phone provided, default to SMS
    const resolvedChannel = customerPhone
      ? (notificationChannel && notificationChannel !== 'none' ? notificationChannel : 'sms')
      : 'none';

    // Create ticket
    const ticket = await prisma.ticket.create({
      data: {
        branchId,
        serviceCategoryId,
        ticketNumber,
        status: TICKET_STATUS.WAITING,
        priority: priority || 'normal',
        customerPhone: customerPhone || null,
        notificationChannel: resolvedChannel,
        checkinMethod: checkinMethod || 'kiosk',
      },
      include: {
        serviceCategory: { select: { nameAr: true, nameFr: true, prefix: true } },
      },
    });

    // Record in audit log
    await prisma.ticketHistory.create({
      data: {
        ticketId: ticket.id,
        action: TICKET_ACTION.CREATED,
        metadata: { checkinMethod, position },
      },
    });

    // Emit socket event
    const ticketDisplay: TicketDisplay = {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      serviceName: ticket.serviceCategory.nameFr,
      servicePrefix: ticket.serviceCategory.prefix,
      status: ticket.status as TicketStatus,
      position,
      estimatedWaitMins,
      createdAt: ticket.createdAt,
      calledAt: null,
      counterNumber: null,
    };

    emitTicketCreated(branchId, {
      ticket: ticketDisplay,
      queuePosition: position,
      estimatedWait: estimatedWaitMins,
    });

    // Queue notification if phone provided
    if (customerPhone && resolvedChannel !== 'none') {
      await notificationQueue.queueNotification({
        ticketId: ticket.id,
        messageType: 'confirmation',
        channel: resolvedChannel,
        recipient: customerPhone,
        templateData: {
          ticketNumber,
          position,
          estimatedWait: estimatedWaitMins,
          branchName: branch.name,
          serviceName: service.nameFr,
          trackingUrl: `/status/${ticket.id}`,
        },
      });
    }

    logger.info({ ticketId: ticket.id, branchId, ticketNumber, position }, 'Ticket created');

    return {
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        serviceName: ticket.serviceCategory.nameFr,
        serviceNameAr: ticket.serviceCategory.nameAr,
      },
      position,
      estimatedWaitMins,
      branchName: branch.name,
    };
  },

  /**
   * Call next ticket for a counter
   * Uses SELECT FOR UPDATE SKIP LOCKED to prevent race conditions
   */
  async callNextTicket(counterId: string, tellerId: string) {
    return await prisma.$transaction(async (tx) => {
      // Get counter with assigned services
      const counter = await tx.counter.findUnique({
        where: { id: counterId },
        include: {
          branch: { select: { id: true, timezone: true, notifyAtPosition: true } },
          assignedServices: { select: { serviceId: true } },
        },
      });

      if (!counter) {
        throw new NotFoundError('Counter not found');
      }

      if (counter.status !== 'open') {
        throw new BadRequestError('Counter is not open');
      }

      // Check if counter already has a ticket being served
      if (counter.currentTicketId) {
        throw new BadRequestError('Counter already has a ticket being served');
      }

      const { start, end } = getTodayRangeUTC(counter.branch.timezone);

      // Global FIFO: Call the next ticket in the branch regardless of service
      // Any teller can serve any customer - true first-come-first-served
      // Atomic select with row lock - skips locked rows to prevent race conditions
      // This is the key to preventing double-assignment when multiple tellers click "Call Next"
      const tickets = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Ticket"
        WHERE "branchId" = ${counter.branch.id}
          AND "status" = 'waiting'
          AND "createdAt" >= ${start}
          AND "createdAt" <= ${end}
        ORDER BY
          CASE WHEN "priority" = 'vip' THEN 0 ELSE 1 END,
          "createdAt" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `;

      if (tickets.length === 0) {
        return null; // No tickets waiting
      }

      const ticketId = tickets[0].id;

      // Update ticket status - go directly to SERVING (skip CALLED state)
      // This simplifies teller workflow: call next → complete/no-show (no separate "start service" click)
      const now = new Date();
      const ticket = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          status: TICKET_STATUS.SERVING,
          counterId,
          servedByUserId: tellerId,
          calledAt: now,
          servingStartedAt: now,
        },
        include: {
          serviceCategory: { select: { nameAr: true, nameFr: true, prefix: true } },
        },
      });

      // Update counter's current ticket
      await tx.counter.update({
        where: { id: counterId },
        data: { currentTicketId: ticketId },
      });

      // Record in audit log (single entry for combined call+serve action)
      await tx.ticketHistory.create({
        data: {
          ticketId,
          action: TICKET_ACTION.CALLED,
          actorId: tellerId,
          metadata: { counterId, counterNumber: counter.number, autoServing: true },
        },
      });

      // Emit socket events (emit both for compatibility with TV display)
      const ticketDisplay: TicketDisplay = {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        serviceName: ticket.serviceCategory.nameFr,
        servicePrefix: ticket.serviceCategory.prefix,
        status: ticket.status as TicketStatus,
        position: 0,
        estimatedWaitMins: 0,
        createdAt: ticket.createdAt,
        calledAt: ticket.calledAt,
        counterNumber: counter.number,
      };

      emitTicketCalled(counter.branch.id, ticketId, {
        ticket: ticketDisplay,
        counterNumber: counter.number,
        counterLabel: counter.label,
      });

      // Also emit serving event for any listeners expecting it
      emitTicketServing(counter.branch.id, ticketId, {
        ticketId,
        ticketNumber: ticket.ticketNumber,
        counterNumber: counter.number,
      });

      // Queue "your turn" notification
      if (ticket.customerPhone && ticket.notificationChannel !== 'none') {
        await notificationQueue.queueNotification({
          ticketId: ticket.id,
          messageType: 'your_turn',
          channel: ticket.notificationChannel as NotificationChannel,
          recipient: ticket.customerPhone,
          templateData: {
            ticketNumber: ticket.ticketNumber,
            counterNumber: counter.number,
            counterLabel: counter.label,
          },
        });
      }

      // Check if we need to send "almost your turn" notification to next tickets
      await this.sendAlmostYourTurnNotifications(
        counter.branch.id,
        counter.branch.timezone,
        counter.branch.notifyAtPosition
      );

      // Broadcast position updates to all remaining waiting tickets
      await this.broadcastPositionUpdates(counter.branch.id, counter.branch.timezone);

      logger.info(
        { ticketId, branchId: counter.branch.id, counterId, tellerId },
        'Ticket called'
      );

      return {
        ticket: ticketDisplay,
        counterNumber: counter.number,
      };
    });
  },

  /**
   * Call next ticket for a specific service
   */
  async callNextByService(counterId: string, serviceId: string, tellerId: string) {
    return await prisma.$transaction(async (tx) => {
      // Get counter with assigned services
      const counter = await tx.counter.findUnique({
        where: { id: counterId },
        include: {
          branch: { select: { id: true, timezone: true, notifyAtPosition: true } },
          assignedServices: { select: { serviceId: true } },
        },
      });

      if (!counter) {
        throw new NotFoundError('Counter not found');
      }

      if (counter.status !== 'open') {
        throw new BadRequestError('Counter is not open');
      }

      // Check if counter already has a ticket being served
      if (counter.currentTicketId) {
        throw new BadRequestError('Counter already has a ticket being served');
      }

      // Verify counter is assigned to serve this service
      const isAssignedToService = counter.assignedServices.some((cs) => cs.serviceId === serviceId);
      if (!isAssignedToService) {
        throw new BadRequestError('Counter is not assigned to serve this service');
      }

      const { start, end } = getTodayRangeUTC(counter.branch.timezone);

      // Atomic select with row lock - only for the specified service
      const tickets = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Ticket"
        WHERE "branchId" = ${counter.branch.id}
          AND "serviceCategoryId" = ${serviceId}
          AND "status" = 'waiting'
          AND "createdAt" >= ${start}
          AND "createdAt" <= ${end}
        ORDER BY
          CASE WHEN "priority" = 'vip' THEN 0 ELSE 1 END,
          "createdAt" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `;

      if (tickets.length === 0) {
        return null; // No tickets waiting for this service
      }

      const ticketId = tickets[0].id;

      // Update ticket status - go directly to SERVING (skip CALLED state)
      const now = new Date();
      const ticket = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          status: TICKET_STATUS.SERVING,
          counterId,
          servedByUserId: tellerId,
          calledAt: now,
          servingStartedAt: now,
        },
        include: {
          serviceCategory: { select: { nameAr: true, nameFr: true, prefix: true } },
        },
      });

      // Update counter's current ticket
      await tx.counter.update({
        where: { id: counterId },
        data: { currentTicketId: ticketId },
      });

      // Record in audit log
      await tx.ticketHistory.create({
        data: {
          ticketId,
          action: TICKET_ACTION.CALLED,
          actorId: tellerId,
          metadata: { counterId, counterNumber: counter.number, calledByService: serviceId, autoServing: true },
        },
      });

      // Emit socket events
      const ticketDisplay: TicketDisplay = {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        serviceName: ticket.serviceCategory.nameFr,
        servicePrefix: ticket.serviceCategory.prefix,
        status: ticket.status as TicketStatus,
        position: 0,
        estimatedWaitMins: 0,
        createdAt: ticket.createdAt,
        calledAt: ticket.calledAt,
        counterNumber: counter.number,
      };

      emitTicketCalled(counter.branch.id, ticketId, {
        ticket: ticketDisplay,
        counterNumber: counter.number,
        counterLabel: counter.label,
      });

      // Also emit serving event
      emitTicketServing(counter.branch.id, ticketId, {
        ticketId,
        ticketNumber: ticket.ticketNumber,
        counterNumber: counter.number,
      });

      // Queue "your turn" notification
      if (ticket.customerPhone && ticket.notificationChannel !== 'none') {
        await notificationQueue.queueNotification({
          ticketId: ticket.id,
          messageType: 'your_turn',
          channel: ticket.notificationChannel as NotificationChannel,
          recipient: ticket.customerPhone,
          templateData: {
            ticketNumber: ticket.ticketNumber,
            counterNumber: counter.number,
            counterLabel: counter.label,
          },
        });
      }

      // Check if we need to send "almost your turn" notification to next tickets
      await this.sendAlmostYourTurnNotifications(
        counter.branch.id,
        counter.branch.timezone,
        counter.branch.notifyAtPosition
      );

      logger.info(
        { ticketId, branchId: counter.branch.id, counterId, serviceId, tellerId },
        'Ticket called by service'
      );

      return {
        ticket: ticketDisplay,
        counterNumber: counter.number,
      };
    });
  },

  /**
   * Mark ticket as serving (service started)
   */
  async startServing(ticketId: string, tellerId: string) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        branch: { select: { id: true } },
        serviceCategory: { select: { nameAr: true, nameFr: true, prefix: true } },
        counter: { select: { number: true } },
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    if (ticket.status !== TICKET_STATUS.CALLED) {
      throw new BadRequestError('Ticket must be in "called" status to start serving');
    }

    if (ticket.servedByUserId !== tellerId) {
      throw new ForbiddenError('You are not assigned to this ticket');
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: TICKET_STATUS.SERVING,
        servingStartedAt: new Date(),
      },
    });

    await prisma.ticketHistory.create({
      data: {
        ticketId,
        action: TICKET_ACTION.SERVING,
        actorId: tellerId,
      },
    });

    emitTicketServing(ticket.branch.id, ticketId, {
      ticketId,
      ticketNumber: ticket.ticketNumber,
      counterNumber: ticket.counter?.number,
    });

    logger.info({ ticketId, tellerId }, 'Ticket serving started');

    return updatedTicket;
  },

  /**
   * Complete a ticket (service finished)
   */
  async completeTicket(ticketId: string, tellerId: string, notes?: string) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        branch: { select: { id: true } },
        counter: { select: { id: true, number: true } },
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    if (ticket.status !== TICKET_STATUS.SERVING && ticket.status !== TICKET_STATUS.CALLED) {
      throw new BadRequestError('Ticket must be in "serving" or "called" status to complete');
    }

    if (ticket.servedByUserId !== tellerId) {
      throw new ForbiddenError('You are not assigned to this ticket');
    }

    const completedAt = new Date();
    const serviceTimeMins = ticket.servingStartedAt
      ? calculateDurationMins(ticket.servingStartedAt, completedAt)
      : calculateDurationMins(ticket.calledAt!, completedAt);

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: TICKET_STATUS.COMPLETED,
        completedAt,
        notes: notes || null,
      },
    });

    // Clear counter's current ticket
    if (ticket.counter) {
      await prisma.counter.update({
        where: { id: ticket.counter.id },
        data: { currentTicketId: null },
      });
    }

    await prisma.ticketHistory.create({
      data: {
        ticketId,
        action: TICKET_ACTION.COMPLETED,
        actorId: tellerId,
        metadata: { serviceTimeMins },
      },
    });

    emitTicketCompleted(ticket.branch.id, ticketId, {
      ticketId,
      ticketNumber: ticket.ticketNumber,
      serviceTimeMins,
    });

    logger.info({ ticketId, tellerId, serviceTimeMins }, 'Ticket completed');

    return { ...updatedTicket, serviceTimeMins };
  },

  /**
   * Mark ticket as no-show
   */
  async markNoShow(ticketId: string, tellerId: string) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        branch: { select: { id: true } },
        counter: { select: { id: true, number: true } },
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    // Allow no-show for both CALLED and SERVING statuses
    // (Now that we auto-start serving on call, tellers can still mark no-show if customer doesn't arrive)
    if (ticket.status !== TICKET_STATUS.CALLED && ticket.status !== TICKET_STATUS.SERVING) {
      throw new BadRequestError('Ticket must be in "called" or "serving" status to mark as no-show');
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: TICKET_STATUS.NO_SHOW,
        completedAt: new Date(),
      },
    });

    // Clear counter's current ticket
    if (ticket.counter) {
      await prisma.counter.update({
        where: { id: ticket.counter.id },
        data: { currentTicketId: null },
      });
    }

    await prisma.ticketHistory.create({
      data: {
        ticketId,
        action: TICKET_ACTION.NO_SHOW,
        actorId: tellerId,
      },
    });

    emitTicketNoShow(ticket.branch.id, ticketId, {
      ticketId,
      ticketNumber: ticket.ticketNumber,
    });

    logger.info({ ticketId, tellerId }, 'Ticket marked as no-show');

    return updatedTicket;
  },

  /**
   * Transfer ticket to another service category
   */
  async transferTicket(
    ticketId: string,
    targetServiceCategoryId: string,
    tellerId: string,
    notes?: string
  ) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        branch: { select: { id: true, timezone: true } },
        counter: { select: { id: true } },
        serviceCategory: { select: { prefix: true } },
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    // Verify target service exists in same branch
    const targetService = await prisma.serviceCategory.findUnique({
      where: { id: targetServiceCategoryId, branchId: ticket.branchId, isActive: true },
      select: { id: true, nameAr: true, nameFr: true, prefix: true, avgServiceTime: true },
    });

    if (!targetService) {
      throw new NotFoundError('Target service category not found');
    }

    // Generate new ticket number with new prefix
    const newTicketNumber = await this.generateTicketNumber(
      ticket.branchId,
      targetService.prefix,
      ticket.branch.timezone
    );

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        serviceCategoryId: targetServiceCategoryId,
        ticketNumber: newTicketNumber,
        status: TICKET_STATUS.WAITING,
        counterId: null,
        servedByUserId: null,
        calledAt: null,
        servingStartedAt: null,
        notes: notes ? `${ticket.notes || ''}\nTransfer: ${notes}`.trim() : ticket.notes,
      },
    });

    // Clear counter's current ticket if applicable
    if (ticket.counter) {
      await prisma.counter.update({
        where: { id: ticket.counter.id },
        data: { currentTicketId: null },
      });
    }

    await prisma.ticketHistory.create({
      data: {
        ticketId,
        action: TICKET_ACTION.TRANSFERRED,
        actorId: tellerId,
        metadata: {
          fromServiceId: ticket.serviceCategoryId,
          toServiceId: targetServiceCategoryId,
          newTicketNumber,
        },
      },
    });

    emitTicketTransferred(ticket.branch.id, ticketId, {
      ticketId,
      oldTicketNumber: ticket.ticketNumber,
      newTicketNumber,
      targetServiceName: targetService.nameFr,
    });

    logger.info({ ticketId, tellerId, targetServiceCategoryId, newTicketNumber }, 'Ticket transferred');

    return { ...updatedTicket, newTicketNumber };
  },

  /**
   * Cancel a ticket
   */
  async cancelTicket(ticketId: string, actorId: string) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        branch: { select: { id: true } },
        counter: { select: { id: true } },
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    if (ticket.status === TICKET_STATUS.COMPLETED || ticket.status === TICKET_STATUS.NO_SHOW) {
      throw new BadRequestError('Cannot cancel a completed or no-show ticket');
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: TICKET_STATUS.CANCELLED,
        completedAt: new Date(),
      },
    });

    // Clear counter's current ticket if applicable
    if (ticket.counter) {
      await prisma.counter.update({
        where: { id: ticket.counter.id },
        data: { currentTicketId: null },
      });
    }

    await prisma.ticketHistory.create({
      data: {
        ticketId,
        action: TICKET_ACTION.CANCELLED,
        actorId,
      },
    });

    emitQueueUpdated(ticket.branch.id, await this.getBranchQueueStatus(ticket.branchId));

    logger.info({ ticketId, actorId }, 'Ticket cancelled');

    return updatedTicket;
  },

  /**
   * Bump ticket priority to VIP (move to front of queue)
   * Used by branch managers to prioritize urgent customers
   */
  async bumpTicketPriority(ticketId: string, actorId: string, reason?: string) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        branch: { select: { id: true } },
        serviceCategory: { select: { nameFr: true, prefix: true } },
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    if (ticket.status !== TICKET_STATUS.WAITING) {
      throw new BadRequestError('Only waiting tickets can be bumped to front');
    }

    if (ticket.priority === 'vip') {
      throw new BadRequestError('Ticket is already marked as VIP');
    }

    const now = new Date();
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        priority: 'vip',
        priorityReason: reason || null,
        prioritizedBy: actorId,
        prioritizedAt: now,
      },
    });

    await prisma.ticketHistory.create({
      data: {
        ticketId,
        action: TICKET_ACTION.PRIORITY_BUMPED,
        actorId,
        metadata: { previousPriority: ticket.priority, reason },
      },
    });

    // Emit queue updated event
    emitQueueUpdated(ticket.branch.id, await this.getBranchQueueStatus(ticket.branchId));

    // Emit ticket prioritized event
    emitTicketPrioritized(ticket.branch.id, ticketId, {
      ticketId,
      ticketNumber: ticket.ticketNumber,
      newPriority: 'vip',
      previousPriority: ticket.priority,
      reason,
      prioritizedBy: actorId,
    });

    logger.info({ ticketId, actorId, reason }, 'Ticket priority bumped to VIP');

    return {
      ...updatedTicket,
      ticketNumber: ticket.ticketNumber,
      serviceName: ticket.serviceCategory.nameFr,
    };
  },

  /**
   * Pause queue for a branch
   * Stops ticket creation until resumed
   */
  async pauseQueue(branchId: string, actorId: string) {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, name: true, queueStatus: true },
    });

    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    if (branch.queueStatus === 'paused') {
      throw new BadRequestError('Queue is already paused');
    }

    const now = new Date();
    const updatedBranch = await prisma.branch.update({
      where: { id: branchId },
      data: {
        queueStatus: 'paused',
        queuePausedAt: now,
        queuePausedBy: actorId,
      },
    });

    // Emit queue paused event
    emitQueuePaused(branchId, {
      branchId,
      branchName: branch.name,
      pausedBy: actorId,
      pausedAt: now,
    });

    logger.info({ branchId, actorId }, 'Queue paused');

    return {
      queueStatus: updatedBranch.queueStatus,
      pausedAt: updatedBranch.queuePausedAt,
    };
  },

  /**
   * Resume queue for a branch
   * Re-enables ticket creation
   */
  async resumeQueue(branchId: string, actorId: string) {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, name: true, queueStatus: true, queuePausedAt: true },
    });

    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    if (branch.queueStatus === 'open') {
      throw new BadRequestError('Queue is already open');
    }

    const pauseDurationMins = branch.queuePausedAt
      ? Math.round((Date.now() - branch.queuePausedAt.getTime()) / 60000)
      : 0;

    const updatedBranch = await prisma.branch.update({
      where: { id: branchId },
      data: {
        queueStatus: 'open',
        queuePausedAt: null,
        queuePausedBy: null,
      },
    });

    // Emit queue resumed event
    emitQueueResumed(branchId, {
      branchId,
      branchName: branch.name,
      resumedBy: actorId,
      pauseDurationMins,
    });

    logger.info({ branchId, actorId, pauseDurationMins }, 'Queue resumed');

    return {
      queueStatus: updatedBranch.queueStatus,
      pauseDurationMins,
    };
  },

  /**
   * Get branch queue status (public)
   */
  async getBranchQueueStatus(branchId: string): Promise<BranchQueueState> {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, name: true, timezone: true, queueStatus: true },
    });

    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    const { start, end } = getTodayRangeUTC(branch.timezone);

    // Get active services for this branch (for kiosk/mobile)
    const services = await prisma.serviceCategory.findMany({
      where: { branchId, isActive: true },
      select: {
        id: true,
        nameAr: true,
        nameFr: true,
        prefix: true,
        icon: true,
        avgServiceTime: true,
        useAutomaticServiceTime: true,
        displayOrder: true,
        showOnKiosk: true,
        descriptionFr: true,
        descriptionAr: true,
        serviceGroup: true,
        subServicesFr: true,
        subServicesAr: true,
      },
      orderBy: { displayOrder: 'asc' },
    });

    // Get counters with current tickets
    const counters = await prisma.counter.findMany({
      where: { branchId },
      include: {
        currentTicket: {
          include: {
            serviceCategory: { select: { nameAr: true, nameFr: true, prefix: true } },
          },
        },
        assignedUser: { select: { name: true } },
      },
      orderBy: { number: 'asc' },
    });

    // Get waiting tickets
    const waitingTickets = await prisma.ticket.findMany({
      where: {
        branchId,
        status: TICKET_STATUS.WAITING,
        createdAt: { gte: start, lte: end },
      },
      include: {
        serviceCategory: { select: { nameAr: true, nameFr: true, prefix: true, avgServiceTime: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    // Get today's stats
    const [totalServed, totalNoShows] = await Promise.all([
      prisma.ticket.count({
        where: {
          branchId,
          status: TICKET_STATUS.COMPLETED,
          createdAt: { gte: start, lte: end },
        },
      }),
      prisma.ticket.count({
        where: {
          branchId,
          status: TICKET_STATUS.NO_SHOW,
          createdAt: { gte: start, lte: end },
        },
      }),
    ]);

    // Calculate average wait time (for completed tickets today)
    const completedTickets = await prisma.ticket.findMany({
      where: {
        branchId,
        status: TICKET_STATUS.COMPLETED,
        calledAt: { not: null },
        createdAt: { gte: start, lte: end },
      },
      select: { createdAt: true, calledAt: true },
    });

    const avgWaitMins =
      completedTickets.length > 0
        ? Math.round(
            completedTickets.reduce(
              (sum, t) => sum + calculateDurationMins(t.createdAt, t.calledAt!),
              0
            ) / completedTickets.length
          )
        : 0;

    const activeCounters = counters.filter((c) => c.status === 'open').length;

    // Map counters to display format
    const counterDisplays: CounterDisplay[] = counters.map((c) => ({
      id: c.id,
      number: c.number,
      label: c.label,
      status: c.status as 'open' | 'closed' | 'paused',
      currentTicket: c.currentTicket
        ? {
            id: c.currentTicket.id,
            ticketNumber: c.currentTicket.ticketNumber,
            serviceName: c.currentTicket.serviceCategory.nameFr,
            servicePrefix: c.currentTicket.serviceCategory.prefix,
            status: c.currentTicket.status as TicketStatus,
            position: 0,
            estimatedWaitMins: 0,
            createdAt: c.currentTicket.createdAt,
            calledAt: c.currentTicket.calledAt,
            counterNumber: c.number,
          }
        : null,
      assignedUserId: c.assignedUserId || null,
      assignedUserName: c.assignedUser?.name || null,
    }));

    // Map waiting tickets to display format with positions
    const ticketDisplays: TicketDisplay[] = waitingTickets.map((t, index) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      serviceName: t.serviceCategory.nameFr,
      servicePrefix: t.serviceCategory.prefix,
      status: t.status as TicketStatus,
      priority: t.priority,
      position: index + 1,
      estimatedWaitMins: this.calculateEstimatedWait(
        index + 1,
        t.serviceCategory.avgServiceTime,
        activeCounters
      ),
      createdAt: t.createdAt,
      calledAt: null,
      counterNumber: null,
    }));

    // Calculate per-service statistics for TV display
    const serviceStatsMap = new Map<string, {
      service: typeof services[0];
      tickets: typeof waitingTickets;
    }>();

    // Initialize map with all services
    services.forEach((service) => {
      serviceStatsMap.set(service.id, { service, tickets: [] });
    });

    // Group waiting tickets by service
    waitingTickets.forEach((ticket) => {
      const entry = serviceStatsMap.get(ticket.serviceCategoryId);
      if (entry) {
        entry.tickets.push(ticket);
      }
    });

    // Build serviceStats array with dynamic service times
    const serviceStats: ServiceQueueStats[] = await Promise.all(
      Array.from(serviceStatsMap.values()).map(async ({ service, tickets }) => {
        const waitingCount = tickets.length;

        // Get effective service time (dynamic or manual)
        const effectiveServiceTime = await this.getDynamicServiceTime(
          service.id,
          service.avgServiceTime,
          service.useAutomaticServiceTime
        );

        // Calculate estimated wait for all people in queue
        const estimatedWaitMins = waitingCount > 0
          ? this.calculateEstimatedWait(waitingCount, effectiveServiceTime, activeCounters)
          : 0;

        // Calculate time until first person in line is called
        const nextCallEstimateMins = waitingCount > 0
          ? this.calculateNextCallEstimate(activeCounters, effectiveServiceTime)
          : 0;

        return {
          serviceId: service.id,
          serviceName: service.nameFr,
          serviceNameAr: service.nameAr,
          prefix: service.prefix,
          icon: service.icon,
          waitingCount,
          estimatedWaitMins,
          nextCallEstimateMins,
          nextTickets: tickets.slice(0, 3).map((t) => t.ticketNumber),
        };
      })
    );

    return {
      branchId,
      branchName: branch.name,
      queueStatus: branch.queueStatus as 'open' | 'paused' | 'closed',
      counters: counterDisplays,
      waitingTickets: ticketDisplays,
      services,
      serviceStats,
      stats: {
        totalWaiting: waitingTickets.length,
        avgWaitMins,
        activeCounters,
        totalServed,
      },
    };
  },

  /**
   * Get ticket position (public)
   * Uses global FIFO position (same as TV Display) - not service-specific
   * Updated: 2026-02-02 to fix position calculation
   */
  async getTicketPosition(ticketId: string): Promise<TicketPosition> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        branch: { select: { name: true, timezone: true } },
        serviceCategory: { select: { nameAr: true, nameFr: true, avgServiceTime: true } },
        counter: { select: { number: true } },
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    let position = 0;
    let estimatedWaitMins = 0;

    if (ticket.status === TICKET_STATUS.WAITING) {
      const { start, end } = getTodayRangeUTC(ticket.branch.timezone);

      // Global FIFO position: Count ALL tickets ahead in the branch (not just same service)
      // This matches the TV Display ordering: [{ priority: 'desc' }, { createdAt: 'asc' }]
      // Order: All VIP (by createdAt) → All normal (by createdAt)

      if (ticket.priority === 'vip') {
        // VIP ticket: count only VIP tickets created before this one
        const vipTicketsAhead = await prisma.ticket.count({
          where: {
            branchId: ticket.branchId,
            status: TICKET_STATUS.WAITING,
            priority: 'vip',
            createdAt: { gte: start, lte: end, lt: ticket.createdAt },
          },
        });
        position = vipTicketsAhead + 1;
      } else {
        // Normal ticket: all VIP tickets + non-VIP tickets created before this one
        const [allVipTickets, nonVipTicketsAhead] = await Promise.all([
          prisma.ticket.count({
            where: {
              branchId: ticket.branchId,
              status: TICKET_STATUS.WAITING,
              priority: 'vip',
              createdAt: { gte: start, lte: end },
            },
          }),
          prisma.ticket.count({
            where: {
              branchId: ticket.branchId,
              status: TICKET_STATUS.WAITING,
              NOT: { priority: 'vip' },  // Count ALL non-VIP tickets (includes null, 'normal', etc.)
              createdAt: { gte: start, lte: end, lt: ticket.createdAt },
            },
          }),
        ]);
        position = allVipTickets + nonVipTicketsAhead + 1;
      }

      // Use ALL active counters in branch (global FIFO means any teller serves any customer)
      const activeCounters = await prisma.counter.count({
        where: {
          branchId: ticket.branchId,
          status: 'open',
        },
      });

      estimatedWaitMins = this.calculateEstimatedWait(
        position,
        ticket.serviceCategory.avgServiceTime,
        activeCounters
      );
    }

    return {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      serviceName: ticket.serviceCategory.nameFr,
      status: ticket.status as TicketStatus,
      position,
      estimatedWaitMins,
      counterNumber: ticket.counter?.number || null,
      branchName: ticket.branch.name,
    };
  },

  /**
   * Get teller's queue view
   */
  async getTellerQueueView(branchId: string, tellerId: string) {
    // DEBUG: Log input parameters
    logger.debug({ branchId, tellerId }, '[getTellerQueueView] Called');

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { timezone: true },
    });

    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    // Get teller's assigned counter
    const counter = await prisma.counter.findFirst({
      where: { branchId, assignedUserId: tellerId },
      include: {
        currentTicket: {
          include: {
            serviceCategory: { select: { nameAr: true, nameFr: true, prefix: true } },
          },
        },
        assignedServices: {
          include: { service: { select: { id: true, nameAr: true, nameFr: true, prefix: true } } },
        },
      },
    });

    // DEBUG: Log counter lookup result
    if (!counter) {
      logger.warn(
        { branchId, tellerId },
        '[getTellerQueueView] No counter assigned to teller. Check Counter.assignedUserId in database.'
      );
      // Also check if there are ANY counters in this branch
      const allCounters = await prisma.counter.findMany({
        where: { branchId },
        select: { id: true, number: true, assignedUserId: true },
      });
      logger.debug(
        { branchId, counters: allCounters },
        '[getTellerQueueView] All counters in branch (for debugging)'
      );

      return {
        counter: null,
        currentTicket: null,
        nextTickets: [],
        globalQueue: [],
        totalWaitingInBranch: 0,
      };
    }

    logger.debug(
      {
        counterId: counter.id,
        counterNumber: counter.number,
        servicesCount: counter.assignedServices.length,
        services: counter.assignedServices.map((cs) => cs.service.nameFr),
      },
      '[getTellerQueueView] Counter found'
    );

    const { start, end } = getTodayRangeUTC(branch.timezone);
    const serviceIds = counter.assignedServices.map((cs) => cs.serviceId);

    // DEBUG: Log query parameters
    logger.debug(
      { branchId, serviceIds, dateRange: { start, end }, timezone: branch.timezone },
      '[getTellerQueueView] Querying tickets'
    );

    // Get next tickets for this counter's services (for backwards compatibility)
    const nextTickets = await prisma.ticket.findMany({
      where: {
        branchId,
        serviceCategoryId: { in: serviceIds },
        status: TICKET_STATUS.WAITING,
        createdAt: { gte: start, lte: end },
      },
      include: {
        serviceCategory: { select: { id: true, nameAr: true, nameFr: true, prefix: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: 20, // Get more tickets for grouping by service
    });

    // DEBUG: Log ticket query results
    logger.debug(
      {
        ticketCount: nextTickets.length,
        tickets: nextTickets.map((t) => ({ id: t.id, ticketNumber: t.ticketNumber, status: t.status })),
      },
      '[getTellerQueueView] Tickets found'
    );

    if (nextTickets.length === 0 && serviceIds.length > 0) {
      // Check if there are ANY waiting tickets in the branch (to diagnose timezone/date issues)
      const allWaitingTickets = await prisma.ticket.count({
        where: { branchId, status: TICKET_STATUS.WAITING },
      });
      logger.debug(
        { branchId, allWaitingCount: allWaitingTickets },
        '[getTellerQueueView] Total waiting tickets in branch (without date filter)'
      );
    }

    // Group tickets by service for the split queue view
    const ticketsByService = new Map<
      string,
      {
        serviceId: string;
        serviceName: string;
        serviceNameAr: string;
        prefix: string;
        tickets: typeof nextTickets;
      }
    >();

    // Initialize groups for all assigned services (even if empty)
    for (const cs of counter.assignedServices) {
      ticketsByService.set(cs.serviceId, {
        serviceId: cs.serviceId,
        serviceName: cs.service.nameFr,
        serviceNameAr: cs.service.nameAr,
        prefix: cs.service.prefix,
        tickets: [],
      });
    }

    // Distribute tickets to their service groups
    for (const ticket of nextTickets) {
      const group = ticketsByService.get(ticket.serviceCategoryId);
      if (group) {
        group.tickets.push(ticket);
      }
    }

    // Convert to array and limit tickets per service
    const nextTicketsByService = Array.from(ticketsByService.values()).map((group) => ({
      serviceId: group.serviceId,
      serviceName: group.serviceName,
      serviceNameAr: group.serviceNameAr,
      prefix: group.prefix,
      tickets: group.tickets.slice(0, 5).map((t, i) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        serviceName: t.serviceCategory.nameFr,
        serviceNameAr: t.serviceCategory.nameAr,
        priority: t.priority,
        position: i + 1,
        createdAt: t.createdAt,
      })),
    }));

    // FIFO Global Queue: Get ALL waiting tickets in the branch (not filtered by service)
    // This ensures all tellers see the same queue at the bottom
    const globalQueueTickets = await prisma.ticket.findMany({
      where: {
        branchId,
        status: TICKET_STATUS.WAITING,
        createdAt: { gte: start, lte: end },
      },
      include: {
        serviceCategory: { select: { id: true, nameAr: true, nameFr: true, prefix: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: 10, // Show first 10 in global queue
    });

    // DEBUG: Log global queue results
    logger.debug(
      {
        branchId,
        globalQueueCount: globalQueueTickets.length,
        globalQueueTickets: globalQueueTickets.map((t) => t.ticketNumber),
      },
      '[getTellerQueueView] Global queue fetched'
    );

    const globalQueue = globalQueueTickets.map((t, i) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      serviceName: t.serviceCategory.nameFr,
      serviceNameAr: t.serviceCategory.nameAr,
      priority: t.priority,
      position: i + 1,
      createdAt: t.createdAt,
    }));

    // Total waiting count for the entire branch
    const totalWaitingInBranch = await prisma.ticket.count({
      where: {
        branchId,
        status: TICKET_STATUS.WAITING,
        createdAt: { gte: start, lte: end },
      },
    });

    // DEBUG: Log total waiting count
    logger.debug(
      { branchId, totalWaitingInBranch },
      '[getTellerQueueView] Total waiting count'
    );

    return {
      counter: {
        id: counter.id,
        number: counter.number,
        label: counter.label,
        status: counter.status,
        services: counter.assignedServices.map((cs) => cs.service),
      },
      currentTicket: counter.currentTicket
        ? {
            id: counter.currentTicket.id,
            ticketNumber: counter.currentTicket.ticketNumber,
            serviceName: counter.currentTicket.serviceCategory.nameFr,
            status: counter.currentTicket.status,
            calledAt: counter.currentTicket.calledAt,
            servingStartedAt: counter.currentTicket.servingStartedAt,
          }
        : null,
      nextTickets: nextTickets.slice(0, 5).map((t, i) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        serviceName: t.serviceCategory.nameFr,
        serviceNameAr: t.serviceCategory.nameAr,
        priority: t.priority,
        position: i + 1,
        createdAt: t.createdAt,
      })),
      nextTicketsByService,
      // Global FIFO queue (same for all tellers in the branch)
      globalQueue,
      totalWaitingInBranch,
    };
  },

  // ============================================================
  // Helper methods
  // ============================================================

  /**
   * Generate ticket number: PREFIX-NNN (e.g., A-001)
   */
  async generateTicketNumber(branchId: string, prefix: string, timezone: string): Promise<string> {
    const redis = getRedisClient();
    const dateKey = getTodayDateString(timezone);
    const counterKey = REDIS_KEYS.dailyTicketCounter(branchId, prefix, dateKey);

    // If Redis key doesn't exist (first call of the day, after seed, or Redis restart),
    // initialize from the database to avoid duplicate ticket numbers.
    const exists = await redis.exists(counterKey);
    if (!exists) {
      const { start, end } = getTodayRangeUTC(timezone);
      const lastTicket = await prisma.ticket.findFirst({
        where: {
          branchId,
          ticketNumber: { startsWith: `${prefix}-` },
          createdAt: { gte: start, lte: end },
        },
        orderBy: { ticketNumber: 'desc' },
        select: { ticketNumber: true },
      });

      if (lastTicket) {
        const lastNum = parseInt(lastTicket.ticketNumber.split('-')[1]!, 10) || 0;
        // SETNX: only set if key still doesn't exist (avoids race with concurrent requests)
        await redis.setnx(counterKey, lastNum);
      }
      await redis.expire(counterKey, 86400);
    }

    // Atomic increment in Redis
    const count = await redis.incr(counterKey);

    return `${prefix}-${count.toString().padStart(3, '0')}`;
  },

  /**
   * Calculate estimated wait time
   * Uses fixed 10 minutes per interaction per teller for consistency
   */
  calculateEstimatedWait(position: number, _avgServiceTime: number, activeCounters: number): number {
    const FIXED_SERVICE_TIME_MINS = 10; // Fixed 10 minutes per interaction

    if (activeCounters === 0) {
      // No counters serving - use large estimate
      return position * FIXED_SERVICE_TIME_MINS;
    }

    // Divide total wait by parallel capacity (number of open counters)
    // Example: Position 4 with 2 tellers = (4 * 10) / 2 = 20 minutes
    return Math.ceil((position * FIXED_SERVICE_TIME_MINS) / activeCounters);
  },

  /**
   * Get count of active counters serving a specific service
   */
  async getActiveCountersForService(branchId: string, serviceCategoryId: string): Promise<number> {
    return prisma.counter.count({
      where: {
        branchId,
        status: 'open',
        assignedServices: {
          some: { serviceId: serviceCategoryId },
        },
      },
    });
  },

  /**
   * Send "almost your turn" notifications to tickets at threshold position
   */
  async sendAlmostYourTurnNotifications(
    branchId: string,
    timezone: string,
    notifyAtPosition: number
  ) {
    const { start, end } = getTodayRangeUTC(timezone);

    // Get waiting tickets at the notify position
    const waitingTickets = await prisma.ticket.findMany({
      where: {
        branchId,
        status: TICKET_STATUS.WAITING,
        createdAt: { gte: start, lte: end },
        customerPhone: { not: null },
        notificationChannel: { not: 'none' },
      },
      include: {
        serviceCategory: { select: { id: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    // Group by service and find tickets at threshold
    const serviceGroups = new Map<string, typeof waitingTickets>();
    for (const ticket of waitingTickets) {
      const group = serviceGroups.get(ticket.serviceCategoryId) || [];
      group.push(ticket);
      serviceGroups.set(ticket.serviceCategoryId, group);
    }

    // Check each service group
    for (const [serviceId, tickets] of serviceGroups) {
      const ticketAtThreshold = tickets[notifyAtPosition - 1];
      if (ticketAtThreshold && ticketAtThreshold.customerPhone) {
        // Check if we already sent this notification
        const existingNotification = await prisma.notificationLog.findFirst({
          where: {
            ticketId: ticketAtThreshold.id,
            messageType: 'almost_turn',
          },
        });

        if (!existingNotification) {
          await notificationQueue.queueNotification({
            ticketId: ticketAtThreshold.id,
            messageType: 'almost_turn',
            channel: ticketAtThreshold.notificationChannel as NotificationChannel,
            recipient: ticketAtThreshold.customerPhone,
            templateData: {
              ticketNumber: ticketAtThreshold.ticketNumber,
              remaining: notifyAtPosition,
            },
          });
        }
      }
    }
  },

  /**
   * Broadcast position updates to all waiting tickets in a branch.
   * Sends ticket:position_updated with urgency metadata to each ticket room.
   */
  async broadcastPositionUpdates(branchId: string, timezone: string) {
    const { start, end } = getTodayRangeUTC(timezone);

    const waitingTickets = await prisma.ticket.findMany({
      where: {
        branchId,
        status: TICKET_STATUS.WAITING,
        createdAt: { gte: start, lte: end },
      },
      include: {
        serviceCategory: { select: { avgServiceTime: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    const activeCounters = await prisma.counter.count({
      where: { branchId, status: 'open' },
    });

    for (let i = 0; i < waitingTickets.length; i++) {
      const ticket = waitingTickets[i];
      const position = i + 1;
      const estimatedWaitMins = this.calculateEstimatedWait(
        position,
        ticket.serviceCategory.avgServiceTime,
        activeCounters
      );
      const urgency: 'normal' | 'approaching' | 'imminent' =
        position <= 2 ? 'imminent' : position <= 5 ? 'approaching' : 'normal';

      emitTicketPositionUpdated(ticket.id, { position, estimatedWaitMins, urgency });
    }
  },

  /**
   * Calculate dynamic service time based on completed tickets from last 24 hours
   * Returns the manual avgServiceTime if no data available or automatic mode is disabled
   */
  async getDynamicServiceTime(serviceId: string, manualAvgTime: number, useAutomatic: boolean): Promise<number> {
    if (!useAutomatic) {
      return manualAvgTime;
    }

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get completed tickets with service time data from last 24 hours
    const completedTickets = await prisma.ticket.findMany({
      where: {
        serviceCategoryId: serviceId,
        status: 'completed',
        completedAt: { gte: last24h },
        servingStartedAt: { not: null },
      },
      select: {
        servingStartedAt: true,
        completedAt: true,
      },
    });

    if (completedTickets.length < 3) {
      // Not enough data, fall back to manual setting
      return manualAvgTime;
    }

    // Calculate average service time
    const totalServiceMins = completedTickets.reduce((sum, ticket) => {
      const serviceTime = calculateDurationMins(ticket.servingStartedAt!, ticket.completedAt!);
      return sum + serviceTime;
    }, 0);

    const avgServiceTime = Math.round(totalServiceMins / completedTickets.length);

    // Clamp to reasonable bounds (1-60 minutes)
    return Math.max(1, Math.min(60, avgServiceTime));
  },

  /**
   * Calculate time until next person in line is called
   * This estimates when the first person in the service queue will be called
   */
  calculateNextCallEstimate(activeCountersForService: number, avgServiceTime: number): number {
    if (activeCountersForService === 0) {
      // No counters serving this service - can't estimate
      return avgServiceTime; // Return avg time as fallback
    }

    // Time until next call = avg service time / number of parallel counters
    // This represents when the next counter will become available
    return Math.ceil(avgServiceTime / activeCountersForService);
  },

  /**
   * Reset queue for a branch
   * Cancels all waiting/called tickets, resets ticket counters, clears counter assignments
   */
  async resetQueue(branchId: string, actorId: string) {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, name: true, timezone: true },
    });

    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    const { start, end } = getTodayRangeUTC(branch.timezone);

    // 1. Cancel all waiting and called tickets for today
    const cancelledTickets = await prisma.ticket.updateMany({
      where: {
        branchId,
        status: { in: [TICKET_STATUS.WAITING, TICKET_STATUS.CALLED] },
        createdAt: { gte: start, lte: end },
      },
      data: {
        status: TICKET_STATUS.CANCELLED,
      },
    });

    // 2. Clear current ticket from all counters
    await prisma.counter.updateMany({
      where: { branchId },
      data: { currentTicketId: null },
    });

    // 3. Reset Redis ticket counters for this branch
    const redis = getRedisClient();
    const dateKey = getTodayDateString(branch.timezone);

    // Get all service prefixes for this branch
    const services = await prisma.serviceCategory.findMany({
      where: { branchId },
      select: { prefix: true },
    });

    // Delete all daily ticket counters for this branch
    for (const service of services) {
      const counterKey = REDIS_KEYS.dailyTicketCounter(branchId, service.prefix, dateKey);
      await redis.del(counterKey);
    }

    // 4. Emit queue reset event
    emitQueueReset(branchId, {
      branchId,
      branchName: branch.name,
      resetBy: actorId,
      cancelledCount: cancelledTickets.count,
      resetAt: new Date(),
    });

    // 5. Emit queue updated to refresh displays (with full queue status)
    const queueStatus = await this.getBranchQueueStatus(branchId);
    emitQueueUpdated(branchId, queueStatus);

    logger.info(
      { branchId, actorId, cancelledCount: cancelledTickets.count },
      'Queue reset'
    );

    return {
      cancelledCount: cancelledTickets.count,
      resetAt: new Date(),
    };
  },
};
