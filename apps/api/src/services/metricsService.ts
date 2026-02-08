import { prisma } from '../lib/prisma';
import { getTodayRangeUTC, calculateDurationMins } from '../lib/datetime';
import { NotFoundError, ForbiddenError } from '../lib/errors';
import { getRedisClient } from '../lib/redis';
import { JWTPayload, USER_ROLE, TICKET_STATUS } from '@blesaf/shared';
import type { CompositeMetrics, SlaTrajectory } from '@blesaf/shared';

const CACHE_TTL = 60; // 60 seconds

export const metricsService = {
  /**
   * Get composite metrics for the branch manager hero bar
   * Combines queue health score, capacity utilization, SLA trajectory
   */
  async getCompositeMetrics(
    branchId: string,
    tenantId: string,
    user: JWTPayload
  ): Promise<CompositeMetrics> {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { tenantId: true, timezone: true },
    });

    if (!branch || branch.tenantId !== tenantId) {
      throw new NotFoundError('Branch not found');
    }

    if (user.role === USER_ROLE.BRANCH_MANAGER && user.branchId !== branchId) {
      throw new ForbiddenError('Cannot access metrics for another branch');
    }

    // Check Redis cache
    const redis = getRedisClient();
    const cacheKey = `metrics:composite:${branchId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const { start, end } = getTodayRangeUTC(branch.timezone);

    // Parallel queries for all data we need
    const [
      waitingCount,
      completedTickets,
      counters,
      branchTarget,
      // Get tickets completed in last 2 hours for SLA trajectory
      recentTickets,
      olderTickets,
    ] = await Promise.all([
      // Current waiting count
      prisma.ticket.count({
        where: { branchId, status: TICKET_STATUS.WAITING, createdAt: { gte: start, lte: end } },
      }),
      // All completed tickets today (for SLA)
      prisma.ticket.findMany({
        where: {
          branchId,
          status: TICKET_STATUS.COMPLETED,
          calledAt: { not: null },
          createdAt: { gte: start, lte: end },
        },
        select: { createdAt: true, calledAt: true, completedAt: true },
      }),
      // All counters
      prisma.counter.findMany({
        where: { branchId },
        select: { status: true, id: true },
      }),
      // Branch target for SLA threshold
      prisma.branchTarget.findFirst({
        where: { branchId },
        orderBy: { date: 'desc' },
      }),
      // Tickets completed in last 1 hour (recent SLA)
      prisma.ticket.findMany({
        where: {
          branchId,
          status: TICKET_STATUS.COMPLETED,
          calledAt: { not: null },
          completedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        },
        select: { createdAt: true, calledAt: true },
      }),
      // Tickets completed 1-2 hours ago (older SLA for trajectory)
      prisma.ticket.findMany({
        where: {
          branchId,
          status: TICKET_STATUS.COMPLETED,
          calledAt: { not: null },
          completedAt: {
            gte: new Date(Date.now() - 2 * 60 * 60 * 1000),
            lt: new Date(Date.now() - 60 * 60 * 1000),
          },
        },
        select: { createdAt: true, calledAt: true },
      }),
    ]);

    const slaThreshold = branchTarget?.slaThreshold ?? 15;
    const openCounters = counters.filter((c) => c.status === 'open').length;
    const onBreakCounters = counters.filter((c) => c.status === 'on_break').length;

    // --- Queue Health Score (0-100) ---
    // 35% wait time ratio + 25% SLA + 20% capacity + 20% queue pressure
    const waitTimes = completedTickets.map((t) => calculateDurationMins(t.createdAt, t.calledAt!));
    const avgWaitMins = waitTimes.length > 0
      ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length
      : 0;

    const withinSla = waitTimes.filter((w) => w <= slaThreshold).length;
    const slaPercent = waitTimes.length > 0 ? (withinSla / waitTimes.length) * 100 : 100;

    const queueCritical = 20; // critical threshold for waiting count
    const neededCounters = Math.max(1, Math.ceil(waitingCount / 5)); // rough: 1 counter per 5 waiting

    const waitScore = Math.max(0, 1 - Math.min(avgWaitMins / slaThreshold, 2));
    const slaScore = slaPercent / 100;
    const capacityScore = Math.min(openCounters / Math.max(neededCounters, 1), 1);
    const pressureScore = Math.max(0, 1 - Math.min(waitingCount / queueCritical, 1));

    const healthScore = Math.round(
      (0.35 * waitScore + 0.25 * slaScore + 0.20 * capacityScore + 0.20 * pressureScore) * 100
    );

    const healthLabel = healthScore >= 80 ? 'excellent'
      : healthScore >= 60 ? 'good'
      : healthScore >= 30 ? 'attention'
      : 'critical';

    // --- Capacity Utilization ---
    const effectiveCounters = openCounters - onBreakCounters;
    const utilization = neededCounters > 0
      ? Math.round((effectiveCounters / neededCounters) * 100)
      : effectiveCounters > 0 ? 100 : 0;

    const capacityLabel = utilization > 150 ? 'overstaffed'
      : utilization >= 80 ? 'adequate'
      : utilization >= 50 ? 'understaffed'
      : 'critical';

    // --- SLA Trajectory ---
    const recentSla = calculateSlaPercent(recentTickets, slaThreshold);
    const olderSla = calculateSlaPercent(olderTickets, slaThreshold);

    let slaTrajectory: SlaTrajectory = 'on_track';
    const slaProjected = recentTickets.length >= 2
      ? Math.max(0, Math.min(100, Math.round(recentSla + (recentSla - olderSla) * 0.5)))
      : Math.round(slaPercent);

    if (slaProjected < 70) {
      slaTrajectory = 'failing';
    } else if (slaProjected < 85 || (recentSla < olderSla - 5)) {
      slaTrajectory = 'at_risk';
    }

    const metrics: CompositeMetrics = {
      healthScore,
      healthLabel,
      capacityUtilization: utilization,
      capacityLabel,
      slaTrajectory,
      slaCurrent: Math.round(slaPercent),
      slaProjected,
      nextAction: null, // Will be populated by recommendation engine
      generatedAt: new Date().toISOString(),
    };

    // Cache result
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(metrics));

    return metrics;
  },
};

function calculateSlaPercent(
  tickets: { createdAt: Date; calledAt: Date | null }[],
  threshold: number
): number {
  if (tickets.length === 0) return 100;
  const withinSla = tickets.filter((t) => {
    if (!t.calledAt) return true;
    return calculateDurationMins(t.createdAt, t.calledAt) <= threshold;
  }).length;
  return Math.round((withinSla / tickets.length) * 100);
}
