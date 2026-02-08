import { prisma } from '../lib/prisma';
import { getTodayRangeUTC, calculateDurationMins } from '../lib/datetime';
import { getRedisClient } from '../lib/redis';
import { TICKET_STATUS } from '@blesaf/shared';
import type { Recommendation, RecommendationActionType, RecommendationUrgency, CompositeMetrics, BranchForecast } from '@blesaf/shared';

const CACHE_TTL = 120; // 2 minutes

function makeId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function makeRecommendation(
  action: string,
  actionType: RecommendationActionType,
  urgency: RecommendationUrgency,
  rationale: string,
  opts: {
    targetId?: string;
    targetLabel?: string;
    executable?: boolean;
    impact?: string;
  } = {}
): Recommendation {
  return {
    id: makeId(),
    action,
    actionType,
    urgency,
    rationale,
    targetId: opts.targetId,
    targetLabel: opts.targetLabel,
    executable: opts.executable ?? false,
    impact: opts.impact,
  };
}

export const recommendationEngine = {
  /**
   * Generate rule-based recommendations for a branch
   * Returns prioritized list of actionable recommendations
   */
  async generateRecommendations(
    branchId: string,
    compositeMetrics: CompositeMetrics | null,
    forecast: BranchForecast | null
  ): Promise<Recommendation[]> {
    // Check Redis cache
    const redis = getRedisClient();
    const cacheKey = `ai:recommendations:${branchId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const recommendations: Recommendation[] = [];

    // Fetch current state
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { timezone: true },
    });
    if (!branch) return [];

    const { start, end } = getTodayRangeUTC(branch.timezone);

    const [counters, waitingTickets, activeBreaks] = await Promise.all([
      prisma.counter.findMany({
        where: { branchId },
        select: { id: true, number: true, status: true, assignedUserId: true },
      }),
      prisma.ticket.findMany({
        where: {
          branchId,
          status: TICKET_STATUS.WAITING,
          createdAt: { gte: start, lte: end },
        },
        select: { id: true, ticketNumber: true, createdAt: true, serviceCategoryId: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.tellerBreak.findMany({
        where: {
          counter: { branchId },
          actualEnd: null,
        },
        select: {
          id: true,
          reason: true,
          expectedEnd: true,
          startedAt: true,
          durationMins: true,
          userId: true,
          counter: { select: { id: true, number: true } },
          user: { select: { name: true } },
        },
      }),
    ]);

    const openCounters = counters.filter((c) => c.status === 'open');
    const closedCounters = counters.filter((c) => c.status === 'closed');
    const waitingCount = waitingTickets.length;
    const now = new Date();

    // --- Rule 1: Critical — Queue health is critical and closed counters available ---
    if (compositeMetrics && compositeMetrics.healthScore < 30 && closedCounters.length > 0) {
      const target = closedCounters[0]!;
      recommendations.push(makeRecommendation(
        `Ouvrir le guichet ${target.number}`,
        'open_counter',
        'critical',
        `Score de santé critique (${compositeMetrics.healthScore}/100). ${waitingCount} clients en attente avec seulement ${openCounters.length} guichet(s) ouvert(s).`,
        {
          targetId: target.id,
          targetLabel: `Guichet ${target.number}`,
          executable: true,
          impact: `Réduire le temps d'attente d'environ ${Math.round(waitingCount / Math.max(openCounters.length, 1))} min`,
        }
      ));
    }

    // --- Rule 2: High — Long-waiting customer (> 20 min) ---
    for (const ticket of waitingTickets) {
      const waitMins = calculateDurationMins(ticket.createdAt, now);
      if (waitMins > 20) {
        recommendations.push(makeRecommendation(
          `Prioriser le ticket ${ticket.ticketNumber}`,
          'bump_priority',
          'high',
          `Client en attente depuis ${Math.round(waitMins)} minutes — risque de dépassement SLA.`,
          {
            targetId: ticket.id,
            targetLabel: ticket.ticketNumber,
            executable: true,
            impact: `Passer en VIP pour être servi immédiatement`,
          }
        ));
        break; // Only recommend for the longest-waiting ticket
      }
    }

    // --- Rule 3: High — Break overtime (> 10 min past expected end) ---
    for (const brk of activeBreaks) {
      if (brk.expectedEnd && now > new Date(brk.expectedEnd)) {
        const overMins = calculateDurationMins(new Date(brk.expectedEnd), now);
        if (overMins > 10) {
          recommendations.push(makeRecommendation(
            `Fin de pause — ${brk.user?.name || 'Guichet ' + brk.counter.number}`,
            'end_break',
            'high',
            `Pause dépassée de ${Math.round(overMins)} minutes (raison: ${brk.reason}).`,
            {
              targetId: brk.id,
              targetLabel: brk.user?.name || `Guichet ${brk.counter.number}`,
              executable: true,
              impact: `Récupérer un guichet actif`,
            }
          ));
        }
      }
    }

    // --- Rule 4: Medium — Forecast shows spike + available counters ---
    if (forecast && closedCounters.length > 0) {
      const currentHour = now.getHours();
      const nextHourForecast = forecast.hourlyForecast.find((f) => f.hour === (currentHour + 1) % 24);
      if (nextHourForecast && nextHourForecast.predictedVolume > waitingCount * 1.5 && nextHourForecast.confidence > 0.5) {
        const target = closedCounters[0]!;
        recommendations.push(makeRecommendation(
          `Pré-ouvrir le guichet ${target.number}`,
          'pre_open_counter',
          'medium',
          `Prévision: ${nextHourForecast.predictedVolume} clients à ${(currentHour + 1) % 24}h (actuellement ${waitingCount}). Anticipez l'affluence.`,
          {
            targetId: target.id,
            targetLabel: `Guichet ${target.number}`,
            executable: true,
            impact: `Préparer la capacité avant le pic`,
          }
        ));
      }
    }

    // --- Rule 5: Medium — SLA at risk ---
    if (compositeMetrics && compositeMetrics.slaTrajectory === 'at_risk') {
      recommendations.push(makeRecommendation(
        `Vérifier les guichets lents`,
        'review_tellers',
        'medium',
        `La trajectoire SLA indique un risque: ${compositeMetrics.slaCurrent}% → ${compositeMetrics.slaProjected}%. Vérifiez les guichets avec un temps de service élevé.`,
        {
          executable: false,
          impact: `Améliorer la conformité SLA`,
        }
      ));
    }

    // --- Rule 6: Medium — Understaffed (health 30-60 + closed counters) ---
    if (
      compositeMetrics &&
      compositeMetrics.healthScore >= 30 &&
      compositeMetrics.healthScore < 60 &&
      closedCounters.length > 0 &&
      !recommendations.some((r) => r.actionType === 'open_counter' || r.actionType === 'pre_open_counter')
    ) {
      const target = closedCounters[0]!;
      recommendations.push(makeRecommendation(
        `Ouvrir le guichet ${target.number}`,
        'open_counter',
        'medium',
        `Score de santé en attention (${compositeMetrics.healthScore}/100). L'ouverture d'un guichet supplémentaire améliorerait le débit.`,
        {
          targetId: target.id,
          targetLabel: `Guichet ${target.number}`,
          executable: true,
          impact: `Améliorer le score de santé`,
        }
      ));
    }

    // --- Rule 7: Low — Overstaffed, consider closing ---
    if (
      compositeMetrics &&
      compositeMetrics.capacityUtilization > 200 &&
      openCounters.length > 1 &&
      waitingCount < 3
    ) {
      recommendations.push(makeRecommendation(
        `Envisager de fermer un guichet`,
        'close_counter',
        'low',
        `Sur-effectif détecté: ${openCounters.length} guichets ouverts pour ${waitingCount} clients en attente. Optimisez les ressources.`,
        {
          executable: false,
          impact: `Optimiser l'utilisation des ressources`,
        }
      ));
    }

    // Sort by urgency
    const urgencyOrder: Record<RecommendationUrgency, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    recommendations.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

    // Limit to top 4 recommendations
    const limited = recommendations.slice(0, 4);

    // Cache result
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(limited));

    return limited;
  },
};
