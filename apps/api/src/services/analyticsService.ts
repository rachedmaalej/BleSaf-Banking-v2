import { prisma } from '../lib/prisma';
import { getTodayRangeUTC, calculateDurationMins } from '../lib/datetime';
import { NotFoundError, ForbiddenError } from '../lib/errors';
import { JWTPayload, USER_ROLE, TICKET_STATUS } from '@blesaf/shared';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

export const analyticsService = {
  /**
   * Get today's statistics for a branch
   */
  async getTodayStats(branchId: string, tenantId: string, user: JWTPayload) {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { tenantId: true, timezone: true },
    });

    if (!branch || branch.tenantId !== tenantId) {
      throw new NotFoundError('Branch not found');
    }

    // Check branch access for branch managers
    if (user.role === USER_ROLE.BRANCH_MANAGER && user.branchId !== branchId) {
      throw new ForbiddenError('Cannot access statistics for another branch');
    }

    const { start, end } = getTodayRangeUTC(branch.timezone);

    // Get ticket counts by status
    const [total, waiting, called, serving, completed, noShows, cancelled] = await Promise.all([
      prisma.ticket.count({
        where: { branchId, createdAt: { gte: start, lte: end } },
      }),
      prisma.ticket.count({
        where: { branchId, status: TICKET_STATUS.WAITING, createdAt: { gte: start, lte: end } },
      }),
      prisma.ticket.count({
        where: { branchId, status: TICKET_STATUS.CALLED, createdAt: { gte: start, lte: end } },
      }),
      prisma.ticket.count({
        where: { branchId, status: TICKET_STATUS.SERVING, createdAt: { gte: start, lte: end } },
      }),
      prisma.ticket.count({
        where: { branchId, status: TICKET_STATUS.COMPLETED, createdAt: { gte: start, lte: end } },
      }),
      prisma.ticket.count({
        where: { branchId, status: TICKET_STATUS.NO_SHOW, createdAt: { gte: start, lte: end } },
      }),
      prisma.ticket.count({
        where: { branchId, status: TICKET_STATUS.CANCELLED, createdAt: { gte: start, lte: end } },
      }),
    ]);

    // Calculate average wait and service times
    const completedTickets = await prisma.ticket.findMany({
      where: {
        branchId,
        status: TICKET_STATUS.COMPLETED,
        calledAt: { not: null },
        createdAt: { gte: start, lte: end },
      },
      select: { createdAt: true, calledAt: true, servingStartedAt: true, completedAt: true },
    });

    let avgWaitMins = 0;
    let avgServiceMins = 0;

    if (completedTickets.length > 0) {
      const waitTimes = completedTickets.map((t) =>
        calculateDurationMins(t.createdAt, t.calledAt!)
      );
      avgWaitMins = Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length);

      const serviceTimes = completedTickets
        .filter((t) => t.servingStartedAt && t.completedAt)
        .map((t) => calculateDurationMins(t.servingStartedAt!, t.completedAt!));

      if (serviceTimes.length > 0) {
        avgServiceMins = Math.round(serviceTimes.reduce((a, b) => a + b, 0) / serviceTimes.length);
      }
    }

    // Get counter stats
    const counters = await prisma.counter.findMany({
      where: { branchId },
      select: { status: true },
    });

    const openCounters = counters.filter((c) => c.status === 'open').length;
    const totalCounters = counters.length;

    // Get per-service breakdown
    const serviceStats = await prisma.ticket.groupBy({
      by: ['serviceCategoryId'],
      where: { branchId, createdAt: { gte: start, lte: end } },
      _count: { id: true },
    });

    const services = await prisma.serviceCategory.findMany({
      where: { branchId },
      select: { id: true, nameFr: true, prefix: true },
    });

    const serviceBreakdown = services.map((s) => ({
      serviceId: s.id,
      serviceName: s.nameFr,
      prefix: s.prefix,
      count: serviceStats.find((ss) => ss.serviceCategoryId === s.id)?._count.id || 0,
    }));

    return {
      date: new Date(),
      tickets: {
        total,
        waiting,
        called,
        serving,
        completed,
        noShows,
        cancelled,
      },
      times: {
        avgWaitMins,
        avgServiceMins,
      },
      counters: {
        total: totalCounters,
        open: openCounters,
      },
      serviceBreakdown,
    };
  },

  /**
   * Get historical statistics for a branch
   */
  async getHistoricalStats(
    branchId: string,
    query: DateRange & { groupBy?: 'day' | 'week' | 'month' },
    tenantId: string,
    user: JWTPayload
  ) {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { tenantId: true },
    });

    if (!branch || branch.tenantId !== tenantId) {
      throw new NotFoundError('Branch not found');
    }

    if (user.role === USER_ROLE.BRANCH_MANAGER && user.branchId !== branchId) {
      throw new ForbiddenError('Cannot access statistics for another branch');
    }

    const { startDate, endDate, groupBy = 'day' } = query;

    // Get daily stats from DailyBranchStats table
    const dailyStats = await prisma.dailyBranchStats.findMany({
      where: {
        branchId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });

    // If no pre-computed stats, calculate from tickets
    if (dailyStats.length === 0) {
      const tickets = await prisma.ticket.findMany({
        where: {
          branchId,
          createdAt: { gte: startDate, lte: endDate },
        },
        select: {
          status: true,
          createdAt: true,
          calledAt: true,
          servingStartedAt: true,
          completedAt: true,
        },
      });

      // Group by date
      const byDate = new Map<string, typeof tickets>();
      for (const ticket of tickets) {
        const dateKey = ticket.createdAt.toISOString().split('T')[0];
        const existing = byDate.get(dateKey) || [];
        existing.push(ticket);
        byDate.set(dateKey, existing);
      }

      return Array.from(byDate.entries()).map(([date, dayTickets]) => {
        const completed = dayTickets.filter((t) => t.status === TICKET_STATUS.COMPLETED);
        const noShows = dayTickets.filter((t) => t.status === TICKET_STATUS.NO_SHOW);

        let avgWaitMins = 0;
        if (completed.length > 0) {
          const waitTimes = completed
            .filter((t) => t.calledAt)
            .map((t) => calculateDurationMins(t.createdAt, t.calledAt!));
          if (waitTimes.length > 0) {
            avgWaitMins = Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length);
          }
        }

        return {
          date,
          totalTickets: dayTickets.length,
          completedTickets: completed.length,
          noShows: noShows.length,
          avgWaitMins,
        };
      });
    }

    return dailyStats;
  },

  /**
   * Get agent performance statistics
   */
  async getAgentStats(branchId: string, query: DateRange, tenantId: string, user: JWTPayload) {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { tenantId: true },
    });

    if (!branch || branch.tenantId !== tenantId) {
      throw new NotFoundError('Branch not found');
    }

    if (user.role === USER_ROLE.BRANCH_MANAGER && user.branchId !== branchId) {
      throw new ForbiddenError('Cannot access statistics for another branch');
    }

    const { startDate, endDate } = query;

    // Get all tellers in the branch
    const tellers = await prisma.user.findMany({
      where: { branchId, role: USER_ROLE.TELLER, status: 'active' },
      select: { id: true, name: true },
    });

    // Get ticket stats per teller
    const tellerStats = await Promise.all(
      tellers.map(async (teller) => {
        const tickets = await prisma.ticket.findMany({
          where: {
            servedByUserId: teller.id,
            status: TICKET_STATUS.COMPLETED,
            completedAt: { gte: startDate, lte: endDate },
          },
          select: {
            calledAt: true,
            servingStartedAt: true,
            completedAt: true,
          },
        });

        const totalServed = tickets.length;
        let avgServiceMins = 0;

        if (tickets.length > 0) {
          const serviceTimes = tickets
            .filter((t) => t.servingStartedAt && t.completedAt)
            .map((t) => calculateDurationMins(t.servingStartedAt!, t.completedAt!));

          if (serviceTimes.length > 0) {
            avgServiceMins = Math.round(serviceTimes.reduce((a, b) => a + b, 0) / serviceTimes.length);
          }
        }

        return {
          userId: teller.id,
          userName: teller.name,
          totalServed,
          avgServiceMins,
        };
      })
    );

    return tellerStats.sort((a, b) => b.totalServed - a.totalServed);
  },

  /**
   * Get hourly breakdown for a branch
   */
  async getHourlyBreakdown(branchId: string, date: Date, tenantId: string, user: JWTPayload) {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { tenantId: true, timezone: true },
    });

    if (!branch || branch.tenantId !== tenantId) {
      throw new NotFoundError('Branch not found');
    }

    if (user.role === USER_ROLE.BRANCH_MANAGER && user.branchId !== branchId) {
      throw new ForbiddenError('Cannot access statistics for another branch');
    }

    // Use pre-computed hourly snapshots if available
    const snapshots = await prisma.hourlySnapshot.findMany({
      where: {
        branchId,
        timestamp: {
          gte: new Date(date.setHours(0, 0, 0, 0)),
          lt: new Date(date.setHours(23, 59, 59, 999)),
        },
      },
      orderBy: { hour: 'asc' },
    });

    if (snapshots.length > 0) {
      return snapshots.map((s) => ({
        hour: s.hour,
        queueLength: s.queueLength,
        activeCounters: s.activeCounters,
        avgWaitMins: s.avgWaitTimeMins,
      }));
    }

    // Calculate from tickets if no snapshots
    const { start, end } = getTodayRangeUTC(branch.timezone);

    const tickets = await prisma.ticket.findMany({
      where: {
        branchId,
        createdAt: { gte: start, lte: end },
      },
      select: { createdAt: true },
    });

    // Group by hour
    const byHour = new Map<number, number>();
    for (let h = 0; h < 24; h++) {
      byHour.set(h, 0);
    }

    for (const ticket of tickets) {
      const hour = ticket.createdAt.getHours();
      byHour.set(hour, (byHour.get(hour) || 0) + 1);
    }

    return Array.from(byHour.entries()).map(([hour, count]) => ({
      hour,
      checkIns: count,
    }));
  },

  /**
   * Get tenant-wide overview (all branches)
   */
  async getTenantOverview(tenantId: string) {
    const branches = await prisma.branch.findMany({
      where: { tenantId, status: 'active' },
      select: { id: true, name: true, code: true, timezone: true },
    });

    const branchStats = await Promise.all(
      branches.map(async (branch) => {
        const { start, end } = getTodayRangeUTC(branch.timezone);

        const [waiting, completed, noShows] = await Promise.all([
          prisma.ticket.count({
            where: { branchId: branch.id, status: TICKET_STATUS.WAITING, createdAt: { gte: start, lte: end } },
          }),
          prisma.ticket.count({
            where: { branchId: branch.id, status: TICKET_STATUS.COMPLETED, createdAt: { gte: start, lte: end } },
          }),
          prisma.ticket.count({
            where: { branchId: branch.id, status: TICKET_STATUS.NO_SHOW, createdAt: { gte: start, lte: end } },
          }),
        ]);

        const openCounters = await prisma.counter.count({
          where: { branchId: branch.id, status: 'open' },
        });

        // Determine status color
        let statusColor: 'green' | 'yellow' | 'red' = 'green';
        if (waiting > 20 || (waiting > 0 && openCounters === 0)) {
          statusColor = 'red';
        } else if (waiting > 10) {
          statusColor = 'yellow';
        }

        return {
          branchId: branch.id,
          branchName: branch.name,
          branchCode: branch.code,
          waiting,
          completed,
          noShows,
          openCounters,
          statusColor,
        };
      })
    );

    // Calculate totals
    const totals = branchStats.reduce(
      (acc, b) => ({
        waiting: acc.waiting + b.waiting,
        completed: acc.completed + b.completed,
        noShows: acc.noShows + b.noShows,
        openCounters: acc.openCounters + b.openCounters,
      }),
      { waiting: 0, completed: 0, noShows: 0, openCounters: 0 }
    );

    return {
      branches: branchStats,
      totals,
    };
  },

  /**
   * Compare branches
   */
  async compareBranches(tenantId: string, query: DateRange) {
    const { startDate, endDate } = query;

    const branches = await prisma.branch.findMany({
      where: { tenantId, status: 'active' },
      select: { id: true, name: true, code: true },
    });

    const comparison = await Promise.all(
      branches.map(async (branch) => {
        const dailyStats = await prisma.dailyBranchStats.findMany({
          where: {
            branchId: branch.id,
            date: { gte: startDate, lte: endDate },
          },
        });

        const totalTickets = dailyStats.reduce((sum, d) => sum + d.totalTickets, 0);
        const completedTickets = dailyStats.reduce((sum, d) => sum + d.completedTickets, 0);
        const noShows = dailyStats.reduce((sum, d) => sum + d.noShows, 0);

        const avgWaitMins =
          dailyStats.length > 0
            ? Math.round(
                dailyStats.reduce((sum, d) => sum + (d.avgWaitTimeMins || 0), 0) / dailyStats.length
              )
            : 0;

        return {
          branchId: branch.id,
          branchName: branch.name,
          branchCode: branch.code,
          totalTickets,
          completedTickets,
          noShows,
          avgWaitMins,
          noShowRate: totalTickets > 0 ? ((noShows / totalTickets) * 100).toFixed(1) : '0',
        };
      })
    );

    return comparison.sort((a, b) => b.totalTickets - a.totalTickets);
  },

  /**
   * Get service category breakdown across tenant
   */
  async getServiceCategoryBreakdown(tenantId: string, query: DateRange) {
    const { startDate, endDate } = query;

    const serviceStats = await prisma.ticket.groupBy({
      by: ['serviceCategoryId'],
      where: {
        branch: { tenantId },
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: { id: true },
    });

    const services = await prisma.serviceCategory.findMany({
      where: { branch: { tenantId } },
      select: { id: true, nameFr: true, prefix: true, branch: { select: { name: true } } },
    });

    return services
      .map((s) => ({
        serviceId: s.id,
        serviceName: s.nameFr,
        prefix: s.prefix,
        branchName: s.branch.name,
        count: serviceStats.find((ss) => ss.serviceCategoryId === s.id)?._count.id || 0,
      }))
      .sort((a, b) => b.count - a.count);
  },
};
