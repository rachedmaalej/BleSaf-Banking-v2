import { prisma } from '../lib/prisma';
import { NotFoundError, BadRequestError, ForbiddenError } from '../lib/errors';
import { logger } from '../lib/logger';
import { getIO } from '../socket';

// Break reason options
export const BREAK_REASONS = {
  lunch: { label: 'Déjeuner', defaultMins: 30 },
  prayer: { label: 'Prière', defaultMins: 15 },
  personal: { label: 'Personnel', defaultMins: 15 },
  urgent: { label: 'Urgent', defaultMins: 0 },
} as const;

export type BreakReason = keyof typeof BREAK_REASONS;

interface StartBreakInput {
  counterId: string;
  reason: BreakReason;
  durationMins: number;
  startedById: string; // userId who initiated the break
}

interface EndBreakInput {
  breakId: string;
  endedById: string; // userId who ended the break
}

interface ExtendBreakInput {
  breakId: string;
  additionalMins: number;
}

export const breakService = {
  /**
   * Start a teller break
   */
  async startBreak(input: StartBreakInput) {
    const { counterId, reason, durationMins, startedById } = input;

    // Validate reason
    if (!BREAK_REASONS[reason]) {
      throw new BadRequestError(`Invalid break reason: ${reason}`);
    }

    // Validate duration
    if (durationMins < 1 || durationMins > 120) {
      throw new BadRequestError('Break duration must be between 1 and 120 minutes');
    }

    // Get counter with assigned user
    const counter = await prisma.counter.findUnique({
      where: { id: counterId },
      include: {
        assignedUser: true,
        branch: true,
        activeBreak: true,
      },
    });

    if (!counter) {
      throw new NotFoundError('Counter not found');
    }

    if (!counter.assignedUserId) {
      throw new BadRequestError('Cannot start break: no teller assigned to this counter');
    }

    if (counter.activeBreakId) {
      throw new BadRequestError('Counter already has an active break');
    }

    if (counter.status === 'on_break') {
      throw new BadRequestError('Counter is already on break');
    }

    // Calculate expected end time
    const startedAt = new Date();
    const expectedEnd = new Date(startedAt.getTime() + durationMins * 60 * 1000);

    // Create break and update counter in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the break record
      const breakRecord = await tx.tellerBreak.create({
        data: {
          counterId,
          userId: counter.assignedUserId!,
          branchId: counter.branchId,
          reason,
          durationMins,
          startedAt,
          expectedEnd,
          startedById,
        },
        include: {
          user: { select: { id: true, name: true } },
          counter: { select: { id: true, number: true } },
        },
      });

      // Update counter status and link active break
      const updatedCounter = await tx.counter.update({
        where: { id: counterId },
        data: {
          status: 'on_break',
          activeBreakId: breakRecord.id,
        },
        include: {
          assignedUser: { select: { id: true, name: true } },
        },
      });

      return { breakRecord, updatedCounter };
    });

    logger.info(
      {
        breakId: result.breakRecord.id,
        counterId,
        userId: counter.assignedUserId,
        reason,
        durationMins,
      },
      'Teller break started'
    );

    // Emit socket event
    const io = getIO();
    io.to(`branch:${counter.branchId}`).emit('break:started', {
      counterId,
      counterNumber: counter.number,
      userName: result.breakRecord.user.name,
      reason,
      expectedEnd,
      remainingMins: durationMins,
      breakId: result.breakRecord.id,
    });

    return {
      breakId: result.breakRecord.id,
      counter: {
        id: result.updatedCounter.id,
        number: result.updatedCounter.number,
        status: result.updatedCounter.status,
      },
      expectedEnd,
      reason,
      userName: result.breakRecord.user.name,
    };
  },

  /**
   * End a teller break
   */
  async endBreak(input: EndBreakInput) {
    const { breakId, endedById } = input;

    const breakRecord = await prisma.tellerBreak.findUnique({
      where: { id: breakId },
      include: {
        counter: { include: { branch: true } },
        user: { select: { id: true, name: true } },
      },
    });

    if (!breakRecord) {
      throw new NotFoundError('Break not found');
    }

    if (breakRecord.actualEnd) {
      throw new BadRequestError('Break has already ended');
    }

    const actualEnd = new Date();
    const actualDurationMs = actualEnd.getTime() - breakRecord.startedAt.getTime();
    const actualDurationMins = Math.round(actualDurationMs / 60000);

    // End break and update counter in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update break record
      const updatedBreak = await tx.tellerBreak.update({
        where: { id: breakId },
        data: {
          actualEnd,
          endedById,
        },
      });

      // Update counter - reopen and clear active break
      const updatedCounter = await tx.counter.update({
        where: { id: breakRecord.counterId },
        data: {
          status: 'open',
          activeBreakId: null,
        },
      });

      return { updatedBreak, updatedCounter };
    });

    logger.info(
      {
        breakId,
        counterId: breakRecord.counterId,
        actualDurationMins,
        plannedDurationMins: breakRecord.durationMins,
      },
      'Teller break ended'
    );

    // Emit socket event
    const io = getIO();
    io.to(`branch:${breakRecord.counter.branchId}`).emit('break:ended', {
      counterId: breakRecord.counterId,
      counterNumber: breakRecord.counter.number,
      userName: breakRecord.user.name,
      actualDuration: actualDurationMins,
      breakId,
    });

    return {
      breakId,
      actualDuration: actualDurationMins,
      counter: {
        id: result.updatedCounter.id,
        number: result.updatedCounter.number,
        status: result.updatedCounter.status,
      },
    };
  },

  /**
   * Extend an active break
   */
  async extendBreak(input: ExtendBreakInput) {
    const { breakId, additionalMins } = input;

    if (additionalMins < 1 || additionalMins > 60) {
      throw new BadRequestError('Extension must be between 1 and 60 minutes');
    }

    const breakRecord = await prisma.tellerBreak.findUnique({
      where: { id: breakId },
      include: {
        counter: { include: { branch: true } },
        user: { select: { id: true, name: true } },
      },
    });

    if (!breakRecord) {
      throw new NotFoundError('Break not found');
    }

    if (breakRecord.actualEnd) {
      throw new BadRequestError('Cannot extend a break that has already ended');
    }

    const newExpectedEnd = new Date(
      breakRecord.expectedEnd.getTime() + additionalMins * 60 * 1000
    );
    const newTotalDuration = breakRecord.durationMins + additionalMins;

    // Update break record
    await prisma.tellerBreak.update({
      where: { id: breakId },
      data: {
        expectedEnd: newExpectedEnd,
        durationMins: newTotalDuration,
      },
    });

    logger.info(
      {
        breakId,
        additionalMins,
        newTotalDuration,
      },
      'Teller break extended'
    );

    // Emit socket event
    const io = getIO();
    io.to(`branch:${breakRecord.counter.branchId}`).emit('break:extended', {
      counterId: breakRecord.counterId,
      counterNumber: breakRecord.counter.number,
      breakId,
      newExpectedEnd,
      additionalMins,
      totalDuration: newTotalDuration,
    });

    return {
      breakId,
      newExpectedEnd,
      totalDuration: newTotalDuration,
    };
  },

  /**
   * Get all breaks for a branch (today by default)
   */
  async getBranchBreaks(branchId: string, date?: Date) {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const breaks = await prisma.tellerBreak.findMany({
      where: {
        branchId,
        startedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        user: { select: { id: true, name: true } },
        counter: { select: { id: true, number: true } },
        startedBy: { select: { id: true, name: true } },
        endedBy: { select: { id: true, name: true } },
      },
      orderBy: { startedAt: 'desc' },
    });

    const now = new Date();

    // Separate active and completed breaks
    const activeBreaks = breaks
      .filter((b) => !b.actualEnd)
      .map((b) => ({
        breakId: b.id,
        counterId: b.counterId,
        counterNumber: b.counter.number,
        userId: b.userId,
        userName: b.user.name,
        reason: b.reason,
        startedAt: b.startedAt,
        expectedEnd: b.expectedEnd,
        remainingMins: Math.max(
          0,
          Math.ceil((b.expectedEnd.getTime() - now.getTime()) / 60000)
        ),
        isOvertime: b.expectedEnd < now,
        startedByName: b.startedBy.name,
      }));

    const completedToday = breaks
      .filter((b) => b.actualEnd)
      .map((b) => ({
        breakId: b.id,
        counterId: b.counterId,
        counterNumber: b.counter.number,
        userId: b.userId,
        userName: b.user.name,
        reason: b.reason,
        duration: Math.round(
          (b.actualEnd!.getTime() - b.startedAt.getTime()) / 60000
        ),
        plannedDuration: b.durationMins,
        startedAt: b.startedAt,
        endedAt: b.actualEnd,
        startedByName: b.startedBy.name,
        endedByName: b.endedBy?.name || null,
      }));

    // Calculate stats
    const totalBreaks = breaks.length;
    const completedBreaks = completedToday.length;
    const avgDuration =
      completedBreaks > 0
        ? Math.round(
            completedToday.reduce((sum, b) => sum + b.duration, 0) / completedBreaks
          )
        : 0;
    const longestBreak =
      completedBreaks > 0
        ? Math.max(...completedToday.map((b) => b.duration))
        : 0;

    return {
      activeBreaks,
      completedToday,
      stats: {
        totalBreaks,
        completedBreaks,
        activeBreaks: activeBreaks.length,
        avgDuration,
        longestBreak,
      },
    };
  },

  /**
   * Get active break for a specific counter
   */
  async getCounterBreak(counterId: string) {
    const counter = await prisma.counter.findUnique({
      where: { id: counterId },
      include: {
        activeBreak: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!counter) {
      throw new NotFoundError('Counter not found');
    }

    if (!counter.activeBreak) {
      return null;
    }

    const now = new Date();
    const remainingMins = Math.max(
      0,
      Math.ceil((counter.activeBreak.expectedEnd.getTime() - now.getTime()) / 60000)
    );

    return {
      breakId: counter.activeBreak.id,
      reason: counter.activeBreak.reason,
      userName: counter.activeBreak.user.name,
      startedAt: counter.activeBreak.startedAt,
      expectedEnd: counter.activeBreak.expectedEnd,
      remainingMins,
      isOvertime: counter.activeBreak.expectedEnd < now,
    };
  },
};
