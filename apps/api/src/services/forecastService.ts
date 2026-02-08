import { prisma } from '../lib/prisma';
import { NotFoundError, ForbiddenError } from '../lib/errors';
import { getRedisClient } from '../lib/redis';
import { JWTPayload, USER_ROLE } from '@blesaf/shared';
import type { ForecastPoint, BranchForecast } from '@blesaf/shared';

const CACHE_TTL = 300; // 5 minutes
const MIN_DATA_DAYS = 7; // Minimum days of data needed for forecast
const LOOKBACK_WEEKS = 4; // Look back 4 weeks for historical patterns
const ALPHA = 0.3; // Smoothing factor: higher = more weight on recent data

export const forecastService = {
  /**
   * Get hourly demand forecast for the next 4 hours
   * Uses exponential weighted moving average with day-of-week seasonality
   * from HourlySnapshot historical data
   */
  async getHourlyForecast(
    branchId: string,
    tenantId: string,
    user: JWTPayload,
    hoursAhead = 4
  ): Promise<BranchForecast | null> {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { tenantId: true, timezone: true },
    });

    if (!branch || branch.tenantId !== tenantId) {
      throw new NotFoundError('Branch not found');
    }

    if (user.role === USER_ROLE.BRANCH_MANAGER && user.branchId !== branchId) {
      throw new ForbiddenError('Cannot access forecast for another branch');
    }

    // Check Redis cache
    const redis = getRedisClient();
    const cacheKey = `ai:forecast:${branchId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Check if we have enough historical data
    const dataCount = await prisma.hourlySnapshot.count({
      where: { branchId },
    });

    if (dataCount < MIN_DATA_DAYS * 10) {
      // Not enough data — return null (frontend hides chart)
      return null;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentDayOfWeek = now.getDay(); // 0=Sunday
    const lookbackDate = new Date(now.getTime() - LOOKBACK_WEEKS * 7 * 24 * 60 * 60 * 1000);

    // Get historical snapshots for same day-of-week
    const historicalSnapshots = await prisma.hourlySnapshot.findMany({
      where: {
        branchId,
        timestamp: { gte: lookbackDate },
      },
      select: {
        hour: true,
        queueLength: true,
        activeCounters: true,
        avgWaitTimeMins: true,
        timestamp: true,
      },
      orderBy: { timestamp: 'desc' },
    });

    if (historicalSnapshots.length === 0) {
      return null;
    }

    // Group by day-of-week and hour
    const sameDaySnapshots = historicalSnapshots.filter((s) => {
      return s.timestamp.getDay() === currentDayOfWeek;
    });

    const recentSnapshots = historicalSnapshots.slice(0, Math.min(historicalSnapshots.length, 7 * 24));

    // Build forecast for each hour ahead
    const forecast: ForecastPoint[] = [];
    let peakHour = currentHour;
    let peakVolume = 0;

    for (let i = 0; i <= hoursAhead; i++) {
      const targetHour = (currentHour + i) % 24;

      // Historical average for same day-of-week + hour
      const sameDayHourData = sameDaySnapshots.filter((s) => s.hour === targetHour);
      const historicalAvg = sameDayHourData.length > 0
        ? sameDayHourData.reduce((sum, s) => sum + s.queueLength, 0) / sameDayHourData.length
        : 0;

      // Recent average for this hour (any day)
      const recentHourData = recentSnapshots.filter((s) => s.hour === targetHour);
      const recentAvg = recentHourData.length > 0
        ? recentHourData.reduce((sum, s) => sum + s.queueLength, 0) / recentHourData.length
        : historicalAvg;

      // Exponential weighted average
      const predictedVolume = Math.round(
        ALPHA * recentAvg + (1 - ALPHA) * historicalAvg
      );

      // Confidence based on data availability
      const dataPoints = sameDayHourData.length + recentHourData.length;
      const confidence = Math.min(dataPoints / 10, 1); // Max confidence at 10+ data points

      // For past hours today, include actual volume
      let actualVolume: number | undefined;
      if (i === 0) {
        // Current hour — get actual waiting count
        const currentWaiting = await prisma.ticket.count({
          where: {
            branchId,
            status: 'waiting',
          },
        });
        actualVolume = currentWaiting;
      }

      const point: ForecastPoint = {
        hour: targetHour,
        predictedVolume: Math.max(0, predictedVolume),
        confidence,
        ...(actualVolume !== undefined && { actualVolume }),
      };

      forecast.push(point);

      if (predictedVolume > peakVolume) {
        peakVolume = predictedVolume;
        peakHour = targetHour;
      }
    }

    const result: BranchForecast = {
      branchId,
      date: now.toISOString().split('T')[0]!,
      hourlyForecast: forecast,
      peakHour,
      peakVolume,
      generatedAt: new Date().toISOString(),
    };

    // Cache result
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));

    return result;
  },
};
