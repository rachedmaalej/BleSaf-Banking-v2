import { getRedisClient, REDIS_KEYS } from '../lib/redis';
import { hqMetricsService } from './hqMetricsService';
import type { Recommendation, RecommendationActionType, RecommendationUrgency, BranchHealthRow } from '@blesaf/shared';

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

export const hqRecommendationEngine = {
  /**
   * Generate tenant-level recommendations for HQ dashboard
   * Analyzes cross-branch patterns and generates actionable insights
   */
  async generateTenantRecommendations(tenantId: string): Promise<Recommendation[]> {
    const redis = getRedisClient();
    const cacheKey = REDIS_KEYS.hqRecommendations(tenantId);
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [metrics, branchRows] = await Promise.all([
      hqMetricsService.getTenantCompositeMetrics(tenantId),
      hqMetricsService.getBranchHealthScores(tenantId),
    ]);

    const recommendations: Recommendation[] = [];

    const criticalBranches = branchRows.filter((b) => b.statusColor === 'red');
    const warningBranches = branchRows.filter((b) => b.statusColor === 'yellow');
    const healthyBranches = branchRows.filter((b) => b.statusColor === 'green');

    // --- Rule 1: CRITICAL — Branch in critical state with closed counters ---
    for (const branch of criticalBranches) {
      if (branch.openCounters < branch.totalCounters) {
        recommendations.push(makeRecommendation(
          `Ouvrir un guichet — ${branch.branchName}`,
          'open_counter',
          'critical',
          `${branch.branchName} en état critique (score: ${branch.healthScore}/100). ${branch.waiting} clients en attente, ${branch.openCounters}/${branch.totalCounters} guichets ouverts.`,
          {
            targetId: branch.branchId,
            targetLabel: branch.branchName,
            executable: false,
            impact: `Améliorer la situation à ${branch.branchName}`,
          }
        ));
        break; // Only show most critical branch
      }
    }

    // --- Rule 2: HIGH — Multiple branches below SLA target ---
    const belowSlaBranches = branchRows.filter((b) => b.slaPercent < 80);
    if (belowSlaBranches.length >= 3) {
      recommendations.push(makeRecommendation(
        `Dégradation SLA réseau — ${belowSlaBranches.length} agences`,
        'general',
        'high',
        `${belowSlaBranches.length} agences sous le seuil SLA de 80%: ${belowSlaBranches.slice(0, 3).map((b) => `${b.branchName} (${b.slaPercent}%)`).join(', ')}${belowSlaBranches.length > 3 ? '...' : ''}.`,
        {
          executable: false,
          impact: `Identifier les causes racines de la dégradation`,
        }
      ));
    }

    // --- Rule 3: HIGH — Branch with long-waiting customers ---
    const highWaitBranches = branchRows.filter((b) => b.avgWaitMins > 20);
    if (highWaitBranches.length > 0) {
      const worst = highWaitBranches[0]!;
      recommendations.push(makeRecommendation(
        `Attente excessive — ${worst.branchName}`,
        'general',
        'high',
        `Temps d'attente moyen de ${worst.avgWaitMins} min à ${worst.branchName}. ${worst.waiting} clients en attente.`,
        {
          targetId: worst.branchId,
          targetLabel: worst.branchName,
          executable: false,
          impact: `Réduire les temps d'attente`,
        }
      ));
    }

    // --- Rule 4: MEDIUM — Staffing imbalance (overstaffed + understaffed) ---
    const overstaffed = branchRows.filter((b) => b.waiting <= 2 && b.openCounters > 2 && b.healthScore > 80);
    const understaffed = branchRows.filter((b) => b.waiting > 10 && b.openCounters < b.totalCounters);
    if (overstaffed.length > 0 && understaffed.length > 0) {
      const from = overstaffed[0]!;
      const to = understaffed[0]!;
      recommendations.push(makeRecommendation(
        `Rééquilibrer les effectifs`,
        'request_staff',
        'medium',
        `${from.branchName} est en sureffectif (${from.openCounters} guichets, ${from.waiting} en attente). ${to.branchName} est en sous-effectif (${to.openCounters}/${to.totalCounters} guichets, ${to.waiting} en attente).`,
        {
          executable: false,
          impact: `Optimiser la répartition des ressources`,
        }
      ));
    }

    // --- Rule 5: LOW — Network performing well ---
    if (criticalBranches.length === 0 && warningBranches.length === 0 && healthyBranches.length > 0) {
      recommendations.push(makeRecommendation(
        `Réseau performant`,
        'general',
        'low',
        `Toutes les ${healthyBranches.length} agences sont en état sain. Score réseau: ${metrics.networkHealthScore}/100, SLA: ${metrics.weightedSlaPercent}%.`,
        {
          executable: false,
          impact: `Continuer le suivi`,
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

    const limited = recommendations.slice(0, 4);

    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(limited));
    return limited;
  },
};
