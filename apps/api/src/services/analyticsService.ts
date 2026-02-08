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
   * Get agent performance statistics with enhanced metrics
   * Returns: totalServed, avgServiceMins, avgRestMins, utilization, championScore
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

    // Extend endDate to end of day (23:59:59.999)
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all tellers in the branch
    const tellers = await prisma.user.findMany({
      where: { branchId, role: USER_ROLE.TELLER, status: 'active' },
      select: { id: true, name: true },
    });

    // Get ticket stats per teller
    const tellerStats = await Promise.all(
      tellers.map(async (teller) => {
        // Order by completedAt to calculate rest times between consecutive tickets
        const tickets = await prisma.ticket.findMany({
          where: {
            servedByUserId: teller.id,
            status: TICKET_STATUS.COMPLETED,
            completedAt: { gte: startDate, lte: endOfDay },
          },
          select: {
            calledAt: true,
            servingStartedAt: true,
            completedAt: true,
          },
          orderBy: { completedAt: 'asc' },
        });

        const totalServed = tickets.length;
        let avgServiceMins = 0;
        let avgRestMins = 0;
        let utilization = 0;

        if (tickets.length > 0) {
          // Calculate service times
          const serviceTimes = tickets
            .filter((t) => t.servingStartedAt && t.completedAt)
            .map((t) => calculateDurationMins(t.servingStartedAt!, t.completedAt!));

          if (serviceTimes.length > 0) {
            avgServiceMins = Math.round(serviceTimes.reduce((a, b) => a + b, 0) / serviceTimes.length);
          }

          // Calculate rest times (gaps between consecutive tickets)
          // Rest time = time between completing one customer and calling the next
          const restGaps: number[] = [];
          for (let i = 0; i < tickets.length - 1; i++) {
            const currentCompleted = tickets[i].completedAt;
            const nextCalled = tickets[i + 1].calledAt;
            if (currentCompleted && nextCalled && nextCalled > currentCompleted) {
              const gap = calculateDurationMins(currentCompleted, nextCalled);
              // Cap at 30 min to exclude untracked breaks
              if (gap > 0 && gap <= 30) {
                restGaps.push(gap);
              }
            }
          }
          if (restGaps.length > 0) {
            avgRestMins = Math.round(restGaps.reduce((a, b) => a + b, 0) / restGaps.length);
          }

          // Calculate utilization (active service time / total active period)
          const firstCall = tickets[0].calledAt;
          const lastComplete = tickets[tickets.length - 1].completedAt;
          if (firstCall && lastComplete) {
            const totalPeriod = calculateDurationMins(firstCall, lastComplete);
            const totalServiceTime = serviceTimes.reduce((a, b) => a + b, 0);
            utilization = totalPeriod > 0 ? Math.round((totalServiceTime / totalPeriod) * 100) : 0;
          }
        }

        return {
          userId: teller.id,
          userName: teller.name,
          totalServed,
          avgServiceMins,
          avgRestMins,
          utilization,
          championScore: 0, // Will be calculated after team averages
        };
      })
    );

    // Calculate team averages for champion scoring
    const activeTellers = tellerStats.filter((t) => t.totalServed > 0);
    if (activeTellers.length > 0) {
      const teamAvgServed = activeTellers.reduce((sum, t) => sum + t.totalServed, 0) / activeTellers.length;
      const teamAvgServiceMins = activeTellers.reduce((sum, t) => sum + t.avgServiceMins, 0) / activeTellers.length;
      const teamAvgRestMins = activeTellers.reduce((sum, t) => sum + t.avgRestMins, 0) / activeTellers.length;

      // Calculate champion score for each teller
      // Formula: 40% served (higher=better) + 30% service time (lower=better) + 30% rest time (lower=better)
      for (const teller of tellerStats) {
        if (teller.totalServed > 0) {
          const servedScore = teamAvgServed > 0 ? (teller.totalServed / teamAvgServed) * 40 : 0;
          const serviceScore = teller.avgServiceMins > 0 ? (teamAvgServiceMins / teller.avgServiceMins) * 30 : 30;
          const restScore = teller.avgRestMins > 0 ? (teamAvgRestMins / teller.avgRestMins) * 30 : 30;
          teller.championScore = Math.round(servedScore + serviceScore + restScore);
        }
      }
    }

    // Sort by champion score (primary), then by total served (secondary)
    return tellerStats.sort((a, b) => {
      if (b.championScore !== a.championScore) {
        return b.championScore - a.championScore;
      }
      return b.totalServed - a.totalServed;
    });
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

        const [waiting, completed, noShows, totalCounters, openCounters] = await Promise.all([
          prisma.ticket.count({
            where: { branchId: branch.id, status: TICKET_STATUS.WAITING, createdAt: { gte: start, lte: end } },
          }),
          prisma.ticket.count({
            where: { branchId: branch.id, status: TICKET_STATUS.COMPLETED, createdAt: { gte: start, lte: end } },
          }),
          prisma.ticket.count({
            where: { branchId: branch.id, status: TICKET_STATUS.NO_SHOW, createdAt: { gte: start, lte: end } },
          }),
          prisma.counter.count({
            where: { branchId: branch.id },
          }),
          prisma.counter.count({
            where: { branchId: branch.id, status: 'open' },
          }),
        ]);

        // Calculate avg wait time and SLA
        const completedTickets = await prisma.ticket.findMany({
          where: {
            branchId: branch.id,
            status: TICKET_STATUS.COMPLETED,
            calledAt: { not: null },
            createdAt: { gte: start, lte: end },
          },
          select: { createdAt: true, calledAt: true },
        });

        let avgWaitMins = 0;
        let slaPercent = 100;
        const slaThreshold = 15; // Default SLA: 15 min

        if (completedTickets.length > 0) {
          const waitTimes = completedTickets.map((t) =>
            calculateDurationMins(t.createdAt, t.calledAt!)
          );
          avgWaitMins = Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length);
          const withinSla = waitTimes.filter((w) => w <= slaThreshold).length;
          slaPercent = Math.round((withinSla / completedTickets.length) * 100);
        }

        // Determine status color with more criteria
        let statusColor: 'green' | 'yellow' | 'red' = 'green';
        const issues: string[] = [];

        // Critical conditions
        if (waiting > 0 && openCounters === 0) {
          statusColor = 'red';
          issues.push(`${waiting} clients en attente, aucun guichet ouvert`);
        } else if (avgWaitMins > 20) {
          statusColor = 'red';
          issues.push(`Temps d'attente moyen: ${avgWaitMins} min`);
        } else if (slaPercent < 70) {
          statusColor = 'red';
          issues.push(`SLA critique: ${slaPercent}%`);
        } else if (waiting > 20) {
          statusColor = 'red';
          issues.push(`${waiting} clients en attente`);
        }
        // Warning conditions
        else if (waiting > 10) {
          statusColor = 'yellow';
          issues.push(`${waiting} clients en attente`);
        } else if (avgWaitMins > 15) {
          statusColor = 'yellow';
          issues.push(`Temps d'attente moyen: ${avgWaitMins} min`);
        } else if (slaPercent < 85) {
          statusColor = 'yellow';
          issues.push(`SLA: ${slaPercent}%`);
        } else if (openCounters < totalCounters / 2 && waiting > 5) {
          statusColor = 'yellow';
          issues.push(`Sous-effectif: ${openCounters}/${totalCounters} guichets`);
        }

        return {
          branchId: branch.id,
          branchName: branch.name,
          branchCode: branch.code,
          waiting,
          completed,
          noShows,
          openCounters,
          totalCounters,
          avgWaitMins,
          slaPercent,
          statusColor,
          issues,
        };
      })
    );

    // Calculate totals
    const totalBranches = branchStats.length;
    const totals = branchStats.reduce(
      (acc, b) => ({
        waiting: acc.waiting + b.waiting,
        completed: acc.completed + b.completed,
        noShows: acc.noShows + b.noShows,
        openCounters: acc.openCounters + b.openCounters,
        totalCounters: acc.totalCounters + b.totalCounters,
      }),
      { waiting: 0, completed: 0, noShows: 0, openCounters: 0, totalCounters: 0 }
    );

    // Calculate overall SLA (weighted average)
    const totalCompleted = branchStats.reduce((sum, b) => sum + b.completed, 0);
    const weightedSla = totalCompleted > 0
      ? Math.round(
          branchStats.reduce((sum, b) => sum + (b.slaPercent * b.completed), 0) / totalCompleted
        )
      : 100;

    // Identify problem branches (need attention)
    const problemBranches = branchStats
      .filter((b) => b.statusColor !== 'green')
      .map((b) => ({
        branchId: b.branchId,
        branchName: b.branchName,
        branchCode: b.branchCode,
        severity: b.statusColor === 'red' ? 'critical' as const : 'warning' as const,
        issues: b.issues,
        metrics: {
          waiting: b.waiting,
          avgWaitMins: b.avgWaitMins,
          slaPercent: b.slaPercent,
          openCounters: b.openCounters,
          totalCounters: b.totalCounters,
        },
      }));

    // Generate alerts for the banner
    const alerts = problemBranches.map((b) => ({
      branchId: b.branchId,
      branchName: b.branchName,
      type: b.severity,
      message: b.issues.join(', '),
    }));

    return {
      branches: branchStats,
      totals: {
        ...totals,
        slaPercent: weightedSla,
      },
      totalBranches,
      problemBranches,
      alerts,
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
   * Get today vs yesterday comparison for branch manager dashboard
   */
  async getBranchComparison(branchId: string, tenantId: string, user: JWTPayload) {
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

    const { start: todayStart, end: todayEnd } = getTodayRangeUTC(branch.timezone);

    // Calculate yesterday's range
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayEnd);
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

    // Get today's stats
    const [todayServed, todayNoShows, todayTotal] = await Promise.all([
      prisma.ticket.count({
        where: { branchId, status: TICKET_STATUS.COMPLETED, createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.ticket.count({
        where: { branchId, status: TICKET_STATUS.NO_SHOW, createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.ticket.count({
        where: { branchId, createdAt: { gte: todayStart, lte: todayEnd } },
      }),
    ]);

    // Get yesterday's stats
    const [yesterdayServed, yesterdayNoShows, yesterdayTotal] = await Promise.all([
      prisma.ticket.count({
        where: { branchId, status: TICKET_STATUS.COMPLETED, createdAt: { gte: yesterdayStart, lte: yesterdayEnd } },
      }),
      prisma.ticket.count({
        where: { branchId, status: TICKET_STATUS.NO_SHOW, createdAt: { gte: yesterdayStart, lte: yesterdayEnd } },
      }),
      prisma.ticket.count({
        where: { branchId, createdAt: { gte: yesterdayStart, lte: yesterdayEnd } },
      }),
    ]);

    // Calculate average wait times
    const todayCompletedTickets = await prisma.ticket.findMany({
      where: {
        branchId,
        status: TICKET_STATUS.COMPLETED,
        calledAt: { not: null },
        createdAt: { gte: todayStart, lte: todayEnd },
      },
      select: { createdAt: true, calledAt: true },
    });

    const yesterdayCompletedTickets = await prisma.ticket.findMany({
      where: {
        branchId,
        status: TICKET_STATUS.COMPLETED,
        calledAt: { not: null },
        createdAt: { gte: yesterdayStart, lte: yesterdayEnd },
      },
      select: { createdAt: true, calledAt: true },
    });

    let todayAvgWait = 0;
    if (todayCompletedTickets.length > 0) {
      const waitTimes = todayCompletedTickets.map((t) =>
        calculateDurationMins(t.createdAt, t.calledAt!)
      );
      todayAvgWait = Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length);
    }

    let yesterdayAvgWait = 0;
    if (yesterdayCompletedTickets.length > 0) {
      const waitTimes = yesterdayCompletedTickets.map((t) =>
        calculateDurationMins(t.createdAt, t.calledAt!)
      );
      yesterdayAvgWait = Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length);
    }

    // Calculate trends (percentage change)
    const calcTrend = (today: number, yesterday: number) => {
      if (yesterday === 0) return today > 0 ? 100 : 0;
      return Math.round(((today - yesterday) / yesterday) * 100);
    };

    return {
      today: {
        served: todayServed,
        avgWait: todayAvgWait,
        noShows: todayNoShows,
        total: todayTotal,
      },
      yesterday: {
        served: yesterdayServed,
        avgWait: yesterdayAvgWait,
        noShows: yesterdayNoShows,
        total: yesterdayTotal,
      },
      trends: {
        servedChange: calcTrend(todayServed, yesterdayServed),
        waitChange: calcTrend(todayAvgWait, yesterdayAvgWait),
        noShowChange: calcTrend(todayNoShows, yesterdayNoShows),
      },
    };
  },

  /**
   * Get branch ranking across tenant (for competitive awareness)
   * Accessible by branch managers to see their position
   */
  async getBranchRanking(tenantId: string, userBranchId?: string) {
    const branches = await prisma.branch.findMany({
      where: { tenantId, status: 'active' },
      select: { id: true, name: true, code: true, timezone: true },
    });

    const branchStats = await Promise.all(
      branches.map(async (branch) => {
        const { start, end } = getTodayRangeUTC(branch.timezone);

        const [served, waiting] = await Promise.all([
          prisma.ticket.count({
            where: { branchId: branch.id, status: TICKET_STATUS.COMPLETED, createdAt: { gte: start, lte: end } },
          }),
          prisma.ticket.count({
            where: { branchId: branch.id, status: TICKET_STATUS.WAITING, createdAt: { gte: start, lte: end } },
          }),
        ]);

        // Calculate average wait time
        const completedTickets = await prisma.ticket.findMany({
          where: {
            branchId: branch.id,
            status: TICKET_STATUS.COMPLETED,
            calledAt: { not: null },
            createdAt: { gte: start, lte: end },
          },
          select: { createdAt: true, calledAt: true },
        });

        let avgWait = 0;
        if (completedTickets.length > 0) {
          const waitTimes = completedTickets.map((t) =>
            calculateDurationMins(t.createdAt, t.calledAt!)
          );
          avgWait = Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length);
        }

        return {
          branchId: branch.id,
          branchName: branch.name,
          branchCode: branch.code,
          served,
          waiting,
          avgWait,
        };
      })
    );

    // Sort by customers served (descending) for ranking
    const ranked = branchStats.sort((a, b) => b.served - a.served);

    // Add rank and find user's branch position
    const rankedWithPosition = ranked.map((b, index) => ({
      ...b,
      rank: index + 1,
      isUserBranch: b.branchId === userBranchId,
    }));

    const userRank = userBranchId
      ? rankedWithPosition.find((b) => b.branchId === userBranchId)?.rank || null
      : null;

    const leader = rankedWithPosition[0];
    const userBranch = userBranchId
      ? rankedWithPosition.find((b) => b.branchId === userBranchId)
      : null;

    const gapToLeader = userBranch && leader ? leader.served - userBranch.served : 0;

    return {
      branches: rankedWithPosition,
      yourRank: userRank,
      totalBranches: branches.length,
      gapToLeader,
    };
  },

  /**
   * Get SLA metrics for branch manager dashboard
   * Tracks daily target progress and % served within SLA wait time
   */
  async getSlaMetrics(
    branchId: string,
    tenantId: string,
    user: JWTPayload,
    options: { slaTargetMins?: number; dailyTarget?: number } = {}
  ) {
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

    // Default SLA: 15 min wait time, 100 daily target
    const slaTargetMins = options.slaTargetMins ?? 15;
    const dailyTarget = options.dailyTarget ?? 100;

    const { start, end } = getTodayRangeUTC(branch.timezone);

    // Get all completed tickets with wait time data
    const completedTickets = await prisma.ticket.findMany({
      where: {
        branchId,
        status: TICKET_STATUS.COMPLETED,
        calledAt: { not: null },
        createdAt: { gte: start, lte: end },
      },
      select: { createdAt: true, calledAt: true },
    });

    // Count tickets within SLA
    let withinSla = 0;
    const waitTimes: number[] = [];

    for (const ticket of completedTickets) {
      const waitMins = calculateDurationMins(ticket.createdAt, ticket.calledAt!);
      waitTimes.push(waitMins);
      if (waitMins <= slaTargetMins) {
        withinSla++;
      }
    }

    const totalServed = completedTickets.length;
    const slaPercentage = totalServed > 0 ? Math.round((withinSla / totalServed) * 100) : 100;
    const targetProgress = Math.min(Math.round((totalServed / dailyTarget) * 100), 100);

    // Calculate average and max wait
    const avgWaitMins = waitTimes.length > 0
      ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
      : 0;
    const maxWaitMins = waitTimes.length > 0 ? Math.max(...waitTimes) : 0;

    // Get currently waiting count
    const currentlyWaiting = await prisma.ticket.count({
      where: {
        branchId,
        status: TICKET_STATUS.WAITING,
        createdAt: { gte: start, lte: end },
      },
    });

    // SLA status: green (>=90%), yellow (70-89%), red (<70%)
    let slaStatus: 'green' | 'yellow' | 'red' = 'green';
    if (slaPercentage < 70) {
      slaStatus = 'red';
    } else if (slaPercentage < 90) {
      slaStatus = 'yellow';
    }

    return {
      sla: {
        targetMins: slaTargetMins,
        withinSla,
        totalServed,
        percentage: slaPercentage,
        status: slaStatus,
      },
      dailyTarget: {
        target: dailyTarget,
        served: totalServed,
        remaining: Math.max(dailyTarget - totalServed, 0),
        progress: targetProgress,
      },
      waitTimes: {
        avgMins: avgWaitMins,
        maxMins: maxWaitMins,
        currentlyWaiting,
      },
    };
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

  /**
   * Get or create daily target for a branch
   * Returns existing target for the date or creates one with defaults
   */
  async getDailyTarget(branchId: string, date: Date) {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, tenantId: true },
    });

    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    // Normalize date to start of day
    const targetDate = new Date(date);
    targetDate.setUTCHours(0, 0, 0, 0);

    // Try to find existing target
    let target = await prisma.branchTarget.findUnique({
      where: {
        branchId_date: {
          branchId,
          date: targetDate,
        },
      },
    });

    // If no target exists, create one with defaults
    if (!target) {
      target = await prisma.branchTarget.create({
        data: {
          branchId,
          date: targetDate,
          servedTarget: 100,
          avgWaitTarget: 10,
          slaTarget: 90,
          slaThreshold: 15,
        },
      });
    }

    return target;
  },

  /**
   * Get chart data for historical trends visualization
   * Returns formatted data for Recharts (date, value pairs)
   */
  async getChartData(
    branchId: string,
    period: 'week' | 'month',
    metrics: ('served' | 'avgWait' | 'slaPercent' | 'noShows')[],
    tenantId: string,
    user: JWTPayload
  ) {
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

    // Calculate date range
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate.setDate(startDate.getDate() - 30);
    }
    startDate.setHours(0, 0, 0, 0);

    // Get daily stats from DailyBranchStats or calculate from tickets
    let dailyStats = await prisma.dailyBranchStats.findMany({
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

      dailyStats = Array.from(byDate.entries()).map(([dateStr, dayTickets]) => {
        const completed = dayTickets.filter((t) => t.status === TICKET_STATUS.COMPLETED);
        const noShows = dayTickets.filter((t) => t.status === TICKET_STATUS.NO_SHOW);

        let avgWaitMins = 0;
        let withinSla = 0;
        const slaThreshold = 15; // Default SLA threshold

        if (completed.length > 0) {
          const waitTimes = completed
            .filter((t) => t.calledAt)
            .map((t) => calculateDurationMins(t.createdAt, t.calledAt!));

          if (waitTimes.length > 0) {
            avgWaitMins = Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length);
            withinSla = waitTimes.filter((w) => w <= slaThreshold).length;
          }
        }

        const slaPercent = completed.length > 0
          ? Math.round((withinSla / completed.length) * 100)
          : 100;

        return {
          id: `${branchId}-${dateStr}`,
          branchId,
          date: new Date(dateStr),
          totalTickets: dayTickets.length,
          completedTickets: completed.length,
          noShows: noShows.length,
          avgWaitTimeMins: avgWaitMins,
          avgServiceTimeMins: 0,
          peakHour: 0,
          slaPercent,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });
    }

    // Format data for each requested metric
    const result: Record<string, { date: string; value: number }[]> = {};

    for (const metric of metrics) {
      result[metric] = dailyStats.map((day) => {
        let value = 0;
        const dateStr = day.date instanceof Date
          ? day.date.toISOString().split('T')[0]
          : String(day.date).split('T')[0];

        switch (metric) {
          case 'served':
            value = day.completedTickets;
            break;
          case 'avgWait':
            value = day.avgWaitTimeMins || 0;
            break;
          case 'slaPercent':
            // Calculate SLA % if not stored
            if ('slaPercent' in day) {
              value = (day as { slaPercent: number }).slaPercent;
            } else {
              value = 90; // Default if not calculated
            }
            break;
          case 'noShows':
            value = day.noShows;
            break;
        }

        return { date: dateStr, value };
      });
    }

    return {
      period,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      metrics: result,
    };
  },

  /**
   * Get detailed teller activity timeline for a specific day
   * Shows hourly breakdown, events (tickets served, breaks), and performance metrics
   */
  async getTellerTimeline(
    branchId: string,
    tellerId: string,
    date: Date,
    tenantId: string,
    user: JWTPayload
  ) {
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

    // Verify teller exists and belongs to branch
    const teller = await prisma.user.findFirst({
      where: { id: tellerId, branchId, role: USER_ROLE.TELLER },
      select: { id: true, name: true },
    });

    if (!teller) {
      throw new NotFoundError('Teller not found');
    }

    // Calculate date range (full day)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all tickets served by this teller on this day
    const tickets = await prisma.ticket.findMany({
      where: {
        servedByUserId: tellerId,
        status: TICKET_STATUS.COMPLETED,
        completedAt: { gte: startOfDay, lte: endOfDay },
      },
      select: {
        id: true,
        ticketNumber: true,
        calledAt: true,
        servingStartedAt: true,
        completedAt: true,
        serviceCategory: { select: { nameFr: true, prefix: true } },
      },
      orderBy: { completedAt: 'asc' },
    });

    // Get breaks for this teller on this day
    const breaks = await prisma.tellerBreak.findMany({
      where: {
        userId: tellerId,
        startedAt: { gte: startOfDay, lte: endOfDay },
      },
      select: {
        id: true,
        reason: true,
        durationMins: true,
        startedAt: true,
        actualEnd: true,
        expectedEnd: true,
      },
      orderBy: { startedAt: 'asc' },
    });

    // Calculate summary metrics
    let totalBreakMins = 0;
    const serviceTimes: number[] = [];

    for (const ticket of tickets) {
      if (ticket.servingStartedAt && ticket.completedAt) {
        const serviceMins = calculateDurationMins(ticket.servingStartedAt, ticket.completedAt);
        serviceTimes.push(serviceMins);
      }
    }

    for (const breakEntry of breaks) {
      if (breakEntry.actualEnd) {
        totalBreakMins += calculateDurationMins(breakEntry.startedAt, breakEntry.actualEnd);
      } else {
        totalBreakMins += breakEntry.durationMins;
      }
    }

    const avgServiceMins = serviceTimes.length > 0
      ? Math.round(serviceTimes.reduce((a, b) => a + b, 0) / serviceTimes.length)
      : 0;

    // Build hourly breakdown (0-23)
    const hourlyData: { hour: number; ticketsServed: number }[] = [];
    for (let h = 0; h < 24; h++) {
      const ticketsInHour = tickets.filter((t) => {
        const completedHour = t.completedAt?.getHours();
        return completedHour === h;
      }).length;
      hourlyData.push({ hour: h, ticketsServed: ticketsInHour });
    }

    // Build event timeline
    type TimelineEvent = {
      type: 'ticket' | 'break_start' | 'break_end';
      time: Date;
      details: Record<string, unknown>;
    };

    const events: TimelineEvent[] = [];

    for (const ticket of tickets) {
      if (ticket.completedAt) {
        events.push({
          type: 'ticket',
          time: ticket.completedAt,
          details: {
            ticketNumber: ticket.ticketNumber,
            service: ticket.serviceCategory.nameFr,
            durationMins: ticket.servingStartedAt && ticket.completedAt
              ? calculateDurationMins(ticket.servingStartedAt, ticket.completedAt)
              : null,
          },
        });
      }
    }

    for (const breakEntry of breaks) {
      events.push({
        type: 'break_start',
        time: breakEntry.startedAt,
        details: {
          breakId: breakEntry.id,
          reason: breakEntry.reason,
          plannedMins: breakEntry.durationMins,
        },
      });

      if (breakEntry.actualEnd) {
        events.push({
          type: 'break_end',
          time: breakEntry.actualEnd,
          details: {
            breakId: breakEntry.id,
            actualMins: calculateDurationMins(breakEntry.startedAt, breakEntry.actualEnd),
          },
        });
      }
    }

    events.sort((a, b) => a.time.getTime() - b.time.getTime());

    // Calculate active hours
    let activeHours = 0;
    if (tickets.length > 0) {
      const firstTicket = tickets[0];
      const lastTicket = tickets[tickets.length - 1];
      if (firstTicket.calledAt && lastTicket.completedAt) {
        activeHours = Math.round(
          calculateDurationMins(firstTicket.calledAt, lastTicket.completedAt) / 60 * 10
        ) / 10;
      }
    }

    return {
      teller: { id: teller.id, name: teller.name },
      date: date.toISOString().split('T')[0],
      summary: {
        ticketsServed: tickets.length,
        avgServiceMins,
        totalBreakMins,
        activeHours,
      },
      hourlyBreakdown: hourlyData,
      events,
    };
  },

  /**
   * Update daily target for a branch
   */
  async updateDailyTarget(
    branchId: string,
    date: Date,
    data: {
      servedTarget?: number;
      avgWaitTarget?: number;
      slaTarget?: number;
      slaThreshold?: number;
    }
  ) {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true },
    });

    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    // Normalize date to start of day
    const targetDate = new Date(date);
    targetDate.setUTCHours(0, 0, 0, 0);

    // Upsert the target
    const target = await prisma.branchTarget.upsert({
      where: {
        branchId_date: {
          branchId,
          date: targetDate,
        },
      },
      update: {
        ...(data.servedTarget !== undefined && { servedTarget: data.servedTarget }),
        ...(data.avgWaitTarget !== undefined && { avgWaitTarget: data.avgWaitTarget }),
        ...(data.slaTarget !== undefined && { slaTarget: data.slaTarget }),
        ...(data.slaThreshold !== undefined && { slaThreshold: data.slaThreshold }),
      },
      create: {
        branchId,
        date: targetDate,
        servedTarget: data.servedTarget ?? 100,
        avgWaitTarget: data.avgWaitTarget ?? 10,
        slaTarget: data.slaTarget ?? 90,
        slaThreshold: data.slaThreshold ?? 15,
      },
    });

    return target;
  },

  /**
   * Get top services for a branch (today)
   * Returns top N services by ticket count for the current day
   */
  async getTopServices(branchId: string, tenantId: string, user: JWTPayload, limit = 3) {
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

    const { start, end } = getTodayRangeUTC(branch.timezone);

    // Group tickets by service and count
    const serviceStats = await prisma.ticket.groupBy({
      by: ['serviceCategoryId'],
      where: {
        branchId,
        createdAt: { gte: start, lte: end },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    // Get service details
    const serviceIds = serviceStats.map((s) => s.serviceCategoryId);
    const services = await prisma.serviceCategory.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, nameFr: true, prefix: true },
    });

    return serviceStats.map((stat) => {
      const service = services.find((s) => s.id === stat.serviceCategoryId);
      return {
        serviceId: stat.serviceCategoryId,
        serviceName: service?.nameFr || 'Unknown',
        prefix: service?.prefix || '?',
        count: stat._count.id,
      };
    });
  },
};
