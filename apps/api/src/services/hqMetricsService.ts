import { prisma } from '../lib/prisma';
import { getTodayRangeUTC, calculateDurationMins } from '../lib/datetime';
import { getRedisClient, REDIS_KEYS } from '../lib/redis';
import { TICKET_STATUS } from '@blesaf/shared';
import type { TenantCompositeMetrics, BranchHealthRow, TrendDirection } from '@blesaf/shared';

const CACHE_TTL = 60; // 60 seconds

/**
 * Compute health score for a single branch using the same formula as metricsService
 */
function computeHealthScore(
  avgWaitMins: number,
  slaPercent: number,
  openCounters: number,
  waitingCount: number,
  slaThreshold: number
): number {
  const neededCounters = Math.max(1, Math.ceil(waitingCount / 5));
  const queueCritical = 20;

  const waitScore = Math.max(0, 1 - Math.min(avgWaitMins / slaThreshold, 2));
  const slaScore = slaPercent / 100;
  const capacityScore = Math.min(openCounters / Math.max(neededCounters, 1), 1);
  const pressureScore = Math.max(0, 1 - Math.min(waitingCount / queueCritical, 1));

  return Math.round(
    (0.35 * waitScore + 0.25 * slaScore + 0.20 * capacityScore + 0.20 * pressureScore) * 100
  );
}

function healthLabel(score: number): 'excellent' | 'good' | 'attention' | 'critical' {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 30) return 'attention';
  return 'critical';
}

function trendDirection(current: number, previous: number): TrendDirection {
  const diff = current - previous;
  if (Math.abs(diff) < 0.5) return 'flat';
  return diff > 0 ? 'up' : 'down';
}

export const hqMetricsService = {
  /**
   * Get aggregated composite metrics for the entire tenant (HQ dashboard)
   */
  async getTenantCompositeMetrics(tenantId: string): Promise<TenantCompositeMetrics> {
    const redis = getRedisClient();
    const cacheKey = REDIS_KEYS.hqMetrics(tenantId);
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const branches = await prisma.branch.findMany({
      where: { tenantId, status: 'active' },
      select: { id: true, name: true, code: true, timezone: true },
    });

    let totalWaiting = 0;
    let totalServed = 0;
    let totalNoShows = 0;
    let totalOpenCounters = 0;
    let totalCounters = 0;
    let problemCount = 0;
    let weightedSlaSum = 0;
    let weightedHealthSum = 0;
    let totalWeight = 0;

    // Yesterday totals for trend comparison
    let yesterdayWaiting = 0;
    let yesterdayServed = 0;
    let yesterdaySlaSum = 0;
    let yesterdaySlaWeight = 0;

    for (const branch of branches) {
      const { start, end } = getTodayRangeUTC(branch.timezone);

      // Yesterday range
      const yesterdayStart = new Date(start.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayEnd = new Date(end.getTime() - 24 * 60 * 60 * 1000);

      const [waiting, completed, noShows, counters, completedTickets, yesterdayStats] =
        await Promise.all([
          prisma.ticket.count({
            where: { branchId: branch.id, status: TICKET_STATUS.WAITING, createdAt: { gte: start, lte: end } },
          }),
          prisma.ticket.count({
            where: { branchId: branch.id, status: TICKET_STATUS.COMPLETED, createdAt: { gte: start, lte: end } },
          }),
          prisma.ticket.count({
            where: { branchId: branch.id, status: TICKET_STATUS.NO_SHOW, createdAt: { gte: start, lte: end } },
          }),
          prisma.counter.findMany({
            where: { branchId: branch.id },
            select: { status: true },
          }),
          prisma.ticket.findMany({
            where: {
              branchId: branch.id,
              status: TICKET_STATUS.COMPLETED,
              calledAt: { not: null },
              createdAt: { gte: start, lte: end },
            },
            select: { createdAt: true, calledAt: true },
          }),
          prisma.dailyBranchStats.findFirst({
            where: {
              branchId: branch.id,
              date: { gte: yesterdayStart, lte: yesterdayEnd },
            },
          }),
        ]);

      const openCounters = counters.filter((c) => c.status === 'open').length;
      const branchTotalCounters = counters.length;

      // SLA calculation
      const slaThreshold = 15;
      let avgWaitMins = 0;
      let slaPercent = 100;

      if (completedTickets.length > 0) {
        const waitTimes = completedTickets.map((t) =>
          calculateDurationMins(t.createdAt, t.calledAt!)
        );
        avgWaitMins = waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length;
        const withinSla = waitTimes.filter((w) => w <= slaThreshold).length;
        slaPercent = Math.round((withinSla / completedTickets.length) * 100);
      }

      // Health score
      const score = computeHealthScore(avgWaitMins, slaPercent, openCounters, waiting, slaThreshold);
      if (score < 50) problemCount++;

      // Accumulate totals
      totalWaiting += waiting;
      totalServed += completed;
      totalNoShows += noShows;
      totalOpenCounters += openCounters;
      totalCounters += branchTotalCounters;

      // Weighted averages (weight by volume)
      const branchWeight = Math.max(completed, 1);
      weightedSlaSum += slaPercent * branchWeight;
      weightedHealthSum += score * branchWeight;
      totalWeight += branchWeight;

      // Yesterday trend data
      if (yesterdayStats) {
        yesterdayServed += yesterdayStats.completedTickets;
        yesterdayWaiting += yesterdayStats.totalTickets - yesterdayStats.completedTickets - yesterdayStats.noShows;
        yesterdaySlaSum += (yesterdayStats.avgWaitTimeMins ?? 15) <= 15 ? 85 * yesterdayStats.completedTickets : 60 * yesterdayStats.completedTickets;
        yesterdaySlaWeight += yesterdayStats.completedTickets;
      }
    }

    const weightedSla = totalWeight > 0 ? Math.round(weightedSlaSum / totalWeight) : 100;
    const networkHealth = totalWeight > 0 ? Math.round(weightedHealthSum / totalWeight) : 100;
    const capacityUtil = totalCounters > 0 ? Math.round((totalOpenCounters / totalCounters) * 100) : 0;

    const yesterdaySla = yesterdaySlaWeight > 0 ? Math.round(yesterdaySlaSum / yesterdaySlaWeight) : 100;

    const metrics: TenantCompositeMetrics = {
      networkHealthScore: networkHealth,
      networkHealthLabel: healthLabel(networkHealth),
      totalWaiting,
      totalServed,
      totalNoShows,
      weightedSlaPercent: weightedSla,
      capacityUtilization: capacityUtil,
      totalCounters,
      openCounters: totalOpenCounters,
      problemBranchCount: problemCount,
      totalBranches: branches.length,
      trends: {
        waiting: trendDirection(totalWaiting, Math.max(yesterdayWaiting, 0)),
        served: trendDirection(totalServed, yesterdayServed),
        sla: trendDirection(weightedSla, yesterdaySla),
      },
      generatedAt: new Date().toISOString(),
    };

    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(metrics));
    return metrics;
  },

  /**
   * Get per-branch health scores for the performance matrix
   */
  async getBranchHealthScores(tenantId: string): Promise<BranchHealthRow[]> {
    const redis = getRedisClient();
    const cacheKey = REDIS_KEYS.hqBranches(tenantId);
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const branches = await prisma.branch.findMany({
      where: { tenantId, status: 'active' },
      select: { id: true, name: true, code: true, timezone: true },
    });

    const rows: BranchHealthRow[] = await Promise.all(
      branches.map(async (branch) => {
        const { start, end } = getTodayRangeUTC(branch.timezone);

        const [waiting, completed, noShows, counters, completedTickets, topServiceResult] =
          await Promise.all([
            prisma.ticket.count({
              where: { branchId: branch.id, status: TICKET_STATUS.WAITING, createdAt: { gte: start, lte: end } },
            }),
            prisma.ticket.count({
              where: { branchId: branch.id, status: TICKET_STATUS.COMPLETED, createdAt: { gte: start, lte: end } },
            }),
            prisma.ticket.count({
              where: { branchId: branch.id, status: TICKET_STATUS.NO_SHOW, createdAt: { gte: start, lte: end } },
            }),
            prisma.counter.findMany({
              where: { branchId: branch.id },
              select: { status: true },
            }),
            prisma.ticket.findMany({
              where: {
                branchId: branch.id,
                status: TICKET_STATUS.COMPLETED,
                calledAt: { not: null },
                createdAt: { gte: start, lte: end },
              },
              select: { createdAt: true, calledAt: true },
            }),
            prisma.ticket.groupBy({
              by: ['serviceCategoryId'],
              where: {
                branchId: branch.id,
                createdAt: { gte: start, lte: end },
              },
              _count: { id: true },
              orderBy: { _count: { id: 'desc' } },
              take: 1,
            }),
          ]);

        const openCounters = counters.filter((c) => c.status === 'open').length;
        const branchTotalCounters = counters.length;

        const slaThreshold = 15;
        let avgWaitMins = 0;
        let slaPercent = 100;

        if (completedTickets.length > 0) {
          const waitTimes = completedTickets.map((t) =>
            calculateDurationMins(t.createdAt, t.calledAt!)
          );
          avgWaitMins = Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length);
          const withinSla = waitTimes.filter((w) => w <= slaThreshold).length;
          slaPercent = Math.round((withinSla / completedTickets.length) * 100);
        }

        const score = computeHealthScore(avgWaitMins, slaPercent, openCounters, waiting, slaThreshold);

        // Status color
        let statusColor: 'green' | 'yellow' | 'red' = 'green';
        const alerts: string[] = [];

        if (waiting > 0 && openCounters === 0) {
          statusColor = 'red';
          alerts.push(`${waiting} en attente, aucun guichet`);
        } else if (avgWaitMins > 20) {
          statusColor = 'red';
          alerts.push(`Attente moy: ${avgWaitMins} min`);
        } else if (slaPercent < 70) {
          statusColor = 'red';
          alerts.push(`SLA: ${slaPercent}%`);
        } else if (waiting > 20) {
          statusColor = 'red';
          alerts.push(`${waiting} en attente`);
        } else if (waiting > 10 || avgWaitMins > 15 || slaPercent < 85) {
          statusColor = 'yellow';
          if (waiting > 10) alerts.push(`${waiting} en attente`);
          if (avgWaitMins > 15) alerts.push(`Attente: ${avgWaitMins} min`);
          if (slaPercent < 85) alerts.push(`SLA: ${slaPercent}%`);
        } else if (openCounters < branchTotalCounters / 2 && waiting > 5) {
          statusColor = 'yellow';
          alerts.push(`${openCounters}/${branchTotalCounters} guichets`);
        }

        // Get top service name
        let topService: string | undefined;
        if (topServiceResult.length > 0) {
          const svc = await prisma.serviceCategory.findUnique({
            where: { id: topServiceResult[0]!.serviceCategoryId },
            select: { nameFr: true },
          });
          topService = svc?.nameFr;
        }

        return {
          branchId: branch.id,
          branchName: branch.name,
          branchCode: branch.code,
          healthScore: score,
          healthLabel: healthLabel(score),
          statusColor,
          waiting,
          served: completed,
          slaPercent,
          avgWaitMins,
          openCounters,
          totalCounters: branchTotalCounters,
          noShows,
          topService,
          alerts,
        };
      })
    );

    // Sort by health score ascending (worst first)
    rows.sort((a, b) => a.healthScore - b.healthScore);

    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(rows));
    return rows;
  },
};
