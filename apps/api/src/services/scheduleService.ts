import { Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { getRedisClient, REDIS_KEYS } from '../lib/redis';
import { logger } from '../lib/logger';
import { getTodayRangeUTC, getTodayDateString } from '../lib/datetime';
import { toZonedTime } from 'date-fns-tz';
import { getDay } from 'date-fns';
import {
  TICKET_STATUS,
  TICKET_ACTION,
  QUEUE_STATUS,
  SYSTEM_ACTOR_ID,
} from '@blesaf/shared';
import {
  emitQueueAutoClosed,
  emitQueueAutoOpened,
  emitQueueUpdated,
  emitCounterUpdated,
} from '../socket';
import { scheduleQueue, startScheduleWorker, ScheduleJobData } from './scheduleQueue';
import { queueService } from './queueService';

/**
 * Schedule Service
 * Manages automatic queue opening/closing based on operating hours
 */
export const scheduleService = {
  /**
   * Initialize the scheduler
   * Called on API startup
   */
  async initialize(): Promise<void> {
    logger.info('Initializing schedule service...');

    // Start the worker with our job processor
    startScheduleWorker(this.processJob.bind(this));

    // Load all branches with auto-queue enabled and schedule their jobs
    await this.scheduleAllBranches();

    // Check for any missed schedules
    await this.checkMissedSchedules();

    logger.info('Schedule service initialized');
  },

  /**
   * Process a schedule job (open or close)
   */
  async processJob(job: Job<ScheduleJobData>): Promise<void> {
    const { branchId, action } = job.data;

    try {
      if (action === 'open') {
        await this.executeQueueOpen(branchId);
      } else if (action === 'close') {
        await this.executeQueueClose(branchId);
      }
    } catch (error) {
      logger.error({ error, branchId, action }, 'Failed to process schedule job');
      throw error;
    }
  },

  /**
   * Schedule jobs for all branches with auto-queue enabled
   */
  async scheduleAllBranches(): Promise<void> {
    const branches = await prisma.branch.findMany({
      where: { autoQueueEnabled: true },
      include: {
        tenant: {
          select: {
            defaultOpeningTime: true,
            defaultClosingTime: true,
          },
        },
      },
    });

    logger.info({ count: branches.length }, 'Scheduling jobs for branches with auto-queue enabled');

    for (const branch of branches) {
      await this.scheduleBranchJobs(branch.id);
    }
  },

  /**
   * Schedule open/close jobs for a specific branch
   */
  async scheduleBranchJobs(branchId: string): Promise<void> {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        tenant: {
          select: {
            defaultOpeningTime: true,
            defaultClosingTime: true,
          },
        },
      },
    });

    if (!branch) {
      logger.warn({ branchId }, 'Branch not found for scheduling');
      return;
    }

    if (!branch.autoQueueEnabled) {
      // Remove any existing jobs if auto-queue is disabled
      await scheduleQueue.removeAllBranchJobs(branchId);
      logger.info({ branchId }, 'Auto-queue disabled, removed scheduled jobs');
      return;
    }

    // Get effective opening/closing times (branch override or tenant default)
    const openingTime = branch.openingTime || branch.tenant.defaultOpeningTime;
    const closingTime = branch.closingTime || branch.tenant.defaultClosingTime;

    if (!openingTime || !closingTime) {
      logger.warn({ branchId }, 'No opening/closing times configured, skipping schedule');
      await scheduleQueue.removeAllBranchJobs(branchId);
      return;
    }

    // Schedule opening job
    await scheduleQueue.scheduleDaily(branchId, 'open', openingTime, branch.timezone);

    // Schedule closing job
    await scheduleQueue.scheduleDaily(branchId, 'close', closingTime, branch.timezone);

    logger.info(
      { branchId, openingTime, closingTime, timezone: branch.timezone },
      'Scheduled open/close jobs for branch'
    );
  },

  /**
   * Remove all scheduled jobs for a branch
   */
  async removeScheduledJobs(branchId: string): Promise<void> {
    await scheduleQueue.removeAllBranchJobs(branchId);
  },

  /**
   * Execute queue opening
   */
  async executeQueueOpen(branchId: string): Promise<{ message: string; skipped?: boolean }> {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: {
        id: true,
        name: true,
        timezone: true,
        closedOnWeekends: true,
        queueStatus: true,
      },
    });

    if (!branch) {
      throw new Error(`Branch ${branchId} not found`);
    }

    // Check if today is a weekend and branch is closed on weekends
    if (branch.closedOnWeekends) {
      const nowInBranchTz = toZonedTime(new Date(), branch.timezone);
      const dayOfWeek = getDay(nowInBranchTz); // 0 = Sunday, 6 = Saturday

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        logger.info(
          { branchId, dayOfWeek },
          'Skipping auto-open: weekend and closedOnWeekends is enabled'
        );
        return { message: 'Skipped: weekend', skipped: true };
      }
    }

    // Check if queue is already open
    if (branch.queueStatus === QUEUE_STATUS.OPEN) {
      logger.info({ branchId }, 'Queue is already open');
      return { message: 'Queue already open', skipped: true };
    }

    // Reset Redis ticket counters for this branch
    const redis = getRedisClient();
    const dateKey = getTodayDateString(branch.timezone);
    const services = await prisma.serviceCategory.findMany({
      where: { branchId },
      select: { prefix: true },
    });

    for (const service of services) {
      const counterKey = REDIS_KEYS.dailyTicketCounter(branchId, service.prefix, dateKey);
      await redis.del(counterKey);
    }

    // Open the queue
    await prisma.branch.update({
      where: { id: branchId },
      data: {
        queueStatus: QUEUE_STATUS.OPEN,
        queuePausedAt: null,
        queuePausedBy: null,
      },
    });

    // Emit socket event
    emitQueueAutoOpened(branchId, {
      branchId,
      branchName: branch.name,
      openedAt: new Date().toISOString(),
    });

    // Emit queue updated
    const queueStatus = await queueService.getBranchQueueStatus(branchId);
    emitQueueUpdated(branchId, queueStatus);

    logger.info({ branchId, branchName: branch.name }, 'Queue auto-opened');

    return { message: 'Queue opened successfully' };
  },

  /**
   * Execute queue closing
   * - Auto-complete all serving tickets
   * - Auto-cancel all waiting/called tickets
   * - Close all counters
   */
  async executeQueueClose(branchId: string): Promise<{
    autoCompletedCount: number;
    autoCancelledCount: number;
    countersClosedCount: number;
  }> {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: {
        id: true,
        name: true,
        timezone: true,
        queueStatus: true,
      },
    });

    if (!branch) {
      throw new Error(`Branch ${branchId} not found`);
    }

    // Check if queue is already closed
    if (branch.queueStatus === QUEUE_STATUS.CLOSED) {
      logger.info({ branchId }, 'Queue is already closed');
      return { autoCompletedCount: 0, autoCancelledCount: 0, countersClosedCount: 0 };
    }

    const { start, end } = getTodayRangeUTC(branch.timezone);
    const now = new Date();

    // 1. Auto-complete all SERVING tickets
    const servingTickets = await prisma.ticket.findMany({
      where: {
        branchId,
        status: TICKET_STATUS.SERVING,
        createdAt: { gte: start, lte: end },
      },
      select: {
        id: true,
        servingStartedAt: true,
        calledAt: true,
      },
    });

    let autoCompletedCount = 0;
    for (const ticket of servingTickets) {
      // Calculate service duration
      const startTime = ticket.servingStartedAt || ticket.calledAt || now;
      const durationMins = Math.round((now.getTime() - startTime.getTime()) / 1000 / 60);

      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: TICKET_STATUS.COMPLETED,
          completedAt: now,
        },
      });

      // Create history record
      await prisma.ticketHistory.create({
        data: {
          ticketId: ticket.id,
          action: TICKET_ACTION.AUTO_COMPLETED,
          actorId: null, // System action
          metadata: {
            reason: 'branch_closed',
            serviceTimeMins: durationMins,
            systemAction: SYSTEM_ACTOR_ID,
          },
        },
      });

      autoCompletedCount++;
    }

    // 2. Auto-cancel all WAITING and CALLED tickets
    const waitingTickets = await prisma.ticket.findMany({
      where: {
        branchId,
        status: { in: [TICKET_STATUS.WAITING, TICKET_STATUS.CALLED] },
        createdAt: { gte: start, lte: end },
      },
      select: { id: true },
    });

    let autoCancelledCount = 0;
    for (const ticket of waitingTickets) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: TICKET_STATUS.CANCELLED,
          completedAt: now,
        },
      });

      // Create history record
      await prisma.ticketHistory.create({
        data: {
          ticketId: ticket.id,
          action: TICKET_ACTION.AUTO_CANCELLED,
          actorId: null,
          metadata: {
            reason: 'branch_closed',
            systemAction: SYSTEM_ACTOR_ID,
          },
        },
      });

      autoCancelledCount++;
    }

    // 3. Clear all counter currentTicketId and close counters
    const countersResult = await prisma.counter.updateMany({
      where: { branchId },
      data: {
        currentTicketId: null,
        status: 'closed',
      },
    });

    // 4. Close the queue
    await prisma.branch.update({
      where: { id: branchId },
      data: {
        queueStatus: QUEUE_STATUS.CLOSED,
        queuePausedAt: now,
        queuePausedBy: SYSTEM_ACTOR_ID,
      },
    });

    // 5. Emit socket events
    emitQueueAutoClosed(branchId, {
      branchId,
      branchName: branch.name,
      closedAt: now.toISOString(),
      autoCompletedCount,
      autoCancelledCount,
    });

    // Emit queue updated
    const queueStatus = await queueService.getBranchQueueStatus(branchId);
    emitQueueUpdated(branchId, queueStatus);

    // Emit counter updated
    const counters = await prisma.counter.findMany({
      where: { branchId },
      include: {
        assignedUser: { select: { id: true, name: true } },
        currentTicket: true,
      },
    });
    emitCounterUpdated(branchId, { counters });

    logger.info(
      {
        branchId,
        branchName: branch.name,
        autoCompletedCount,
        autoCancelledCount,
        countersClosedCount: countersResult.count,
      },
      'Queue auto-closed'
    );

    return {
      autoCompletedCount,
      autoCancelledCount,
      countersClosedCount: countersResult.count,
    };
  },

  /**
   * Check for missed schedules on startup
   * If server was down during a scheduled time, execute it now
   */
  async checkMissedSchedules(): Promise<void> {
    const GRACE_PERIOD_MINS = 30; // Check if scheduled time was within last 30 mins

    const branches = await prisma.branch.findMany({
      where: { autoQueueEnabled: true },
      include: {
        tenant: {
          select: {
            defaultOpeningTime: true,
            defaultClosingTime: true,
          },
        },
      },
    });

    for (const branch of branches) {
      const openingTime = branch.openingTime || branch.tenant.defaultOpeningTime;
      const closingTime = branch.closingTime || branch.tenant.defaultClosingTime;

      if (!openingTime || !closingTime) continue;

      const nowInBranchTz = toZonedTime(new Date(), branch.timezone);
      const currentHour = nowInBranchTz.getHours();
      const currentMin = nowInBranchTz.getMinutes();
      const currentTotalMins = currentHour * 60 + currentMin;

      // Parse opening time
      const [openHour, openMin] = openingTime.split(':').map(Number);
      const openTotalMins = openHour * 60 + openMin;

      // Parse closing time
      const [closeHour, closeMin] = closingTime.split(':').map(Number);
      const closeTotalMins = closeHour * 60 + closeMin;

      // Check if we missed opening (current time is past opening but within grace period)
      if (
        currentTotalMins >= openTotalMins &&
        currentTotalMins < openTotalMins + GRACE_PERIOD_MINS &&
        branch.queueStatus !== QUEUE_STATUS.OPEN
      ) {
        logger.info({ branchId: branch.id, openingTime }, 'Executing missed queue open');
        await this.executeQueueOpen(branch.id);
      }

      // Check if we missed closing (current time is past closing but within grace period)
      if (
        currentTotalMins >= closeTotalMins &&
        currentTotalMins < closeTotalMins + GRACE_PERIOD_MINS &&
        branch.queueStatus !== QUEUE_STATUS.CLOSED
      ) {
        logger.info({ branchId: branch.id, closingTime }, 'Executing missed queue close');
        await this.executeQueueClose(branch.id);
      }
    }
  },

  /**
   * Get next scheduled times for a branch
   */
  async getScheduledTimes(branchId: string): Promise<{
    nextOpen: Date | null;
    nextClose: Date | null;
  }> {
    return scheduleQueue.getNextScheduledTimes(branchId);
  },

  /**
   * Manual trigger for queue close (same logic as auto-close)
   */
  async manualCloseQueue(branchId: string, actorId: string): Promise<{
    autoCompletedCount: number;
    autoCancelledCount: number;
    countersClosedCount: number;
  }> {
    logger.info({ branchId, actorId }, 'Manual queue close triggered');
    return this.executeQueueClose(branchId);
  },

  /**
   * Update branch operating hours and reschedule jobs
   */
  async updateOperatingHours(
    branchId: string,
    data: {
      autoQueueEnabled?: boolean;
      openingTime?: string | null;
      closingTime?: string | null;
      closedOnWeekends?: boolean;
    }
  ): Promise<void> {
    await prisma.branch.update({
      where: { id: branchId },
      data: {
        autoQueueEnabled: data.autoQueueEnabled,
        openingTime: data.openingTime,
        closingTime: data.closingTime,
        closedOnWeekends: data.closedOnWeekends,
      },
    });

    // Reschedule jobs based on new settings
    await this.scheduleBranchJobs(branchId);

    logger.info({ branchId, data }, 'Updated operating hours and rescheduled jobs');
  },

  /**
   * Get operating hours for a branch (with resolved effective times)
   */
  async getOperatingHours(branchId: string): Promise<{
    autoQueueEnabled: boolean;
    openingTime: string | null;
    closingTime: string | null;
    closedOnWeekends: boolean;
    effectiveOpeningTime: string | null;
    effectiveClosingTime: string | null;
    nextScheduledOpen: Date | null;
    nextScheduledClose: Date | null;
  }> {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        tenant: {
          select: {
            defaultOpeningTime: true,
            defaultClosingTime: true,
          },
        },
      },
    });

    if (!branch) {
      throw new Error(`Branch ${branchId} not found`);
    }

    const { nextOpen, nextClose } = await this.getScheduledTimes(branchId);

    return {
      autoQueueEnabled: branch.autoQueueEnabled,
      openingTime: branch.openingTime,
      closingTime: branch.closingTime,
      closedOnWeekends: branch.closedOnWeekends,
      effectiveOpeningTime: branch.openingTime || branch.tenant.defaultOpeningTime,
      effectiveClosingTime: branch.closingTime || branch.tenant.defaultClosingTime,
      nextScheduledOpen: nextOpen,
      nextScheduledClose: nextClose,
    };
  },

  /**
   * Close the scheduler (cleanup on shutdown)
   */
  async close(): Promise<void> {
    await scheduleQueue.close();
    logger.info('Schedule service closed');
  },
};
