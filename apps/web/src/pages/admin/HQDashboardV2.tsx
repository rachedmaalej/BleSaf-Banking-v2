import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useHqStore } from '@/stores/hqStore';
import { analyticsApi } from '@/lib/api';
import { NetworkHealthGauge } from '@/components/admin/NetworkHealthGauge';
import { BranchPerformanceMatrix } from '@/components/admin/BranchPerformanceMatrix';
import { RecommendationCard } from '@/components/manager/RecommendationCard';
import { TrendChart } from '@/components/manager/TrendChart';
import type { TrendDirection } from '@blesaf/shared';

// SG Brand Colors
const SG_RED = '#E9041E';
const SG_BLACK = '#1A1A1A';

const REFRESH_INTERVAL = 60_000; // 60s

interface RankingEntry {
  branchId: string;
  branchName: string;
  branchCode: string;
  served: number;
  waiting: number;
  avgWaitMins: number;
  rank: number;
}

interface ChartDataPoint {
  date: string;
  value: number;
}

interface ChartData {
  served: ChartDataPoint[];
  avgWait: ChartDataPoint[];
  slaPercent: ChartDataPoint[];
  noShows: ChartDataPoint[];
}

// Trend arrow component
function TrendArrow({ trend, inverse }: { trend: TrendDirection; inverse?: boolean }) {
  if (trend === 'flat') return <span className="text-gray-400 text-xs">—</span>;
  // For waiting: up is bad (red), down is good (green)
  // For served/sla: up is good (green), down is bad (red)
  const isPositive = inverse ? trend === 'down' : trend === 'up';
  return (
    <span
      className="material-symbols-outlined"
      style={{ fontSize: 16, color: isPositive ? '#10B981' : '#E9041E' }}
    >
      {trend === 'up' ? 'trending_up' : 'trending_down'}
    </span>
  );
}

export default function HQDashboardV2() {
  const { t } = useTranslation();
  const { tenantMetrics, branchHealthRows, recommendations, fetchAll, isLoading } = useHqStore();

  // Additional data not in the HQ store
  const [ranking, setRanking] = useState<RankingEntry[] | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    await fetchAll();
    setLastUpdate(new Date());

    // Load ranking
    try {
      const res = await analyticsApi.getBranchRanking();
      setRanking(res.data.data?.ranking || []);
    } catch { /* silent */ }
  }, [fetchAll]);

  // Load chart data from first branch (or skip if no branches)
  const loadChartData = useCallback(async () => {
    if (!branchHealthRows || branchHealthRows.length === 0) return;
    // Use first branch for trend charts (network-level would need aggregation endpoint)
    const firstBranch = branchHealthRows[0]!;
    try {
      const res = await analyticsApi.getChartData(
        firstBranch.branchId,
        'week',
        ['served', 'avgWait', 'slaPercent', 'noShows']
      );
      setChartData(res.data.data);
    } catch { /* silent */ }
  }, [branchHealthRows]);

  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(loadData, REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadData]);

  // Load charts when branches available
  useEffect(() => {
    if (branchHealthRows && branchHealthRows.length > 0 && !chartData) {
      loadChartData();
    }
  }, [branchHealthRows, chartData, loadChartData]);

  const metrics = tenantMetrics;

  // Determine accent color for each KPI card
  const waitingAccent = metrics && metrics.totalWaiting > 30 ? 'red' as const
    : metrics && metrics.totalWaiting > 15 ? 'amber' as const
    : 'green' as const;
  const slaAccent = metrics && metrics.weightedSlaPercent < 70 ? 'red' as const
    : metrics && metrics.weightedSlaPercent < 85 ? 'amber' as const
    : 'green' as const;
  const servedAccent = 'green' as const;
  const countersAccent = metrics && metrics.capacityUtilization < 40 ? 'amber' as const : 'neutral' as const;
  const alertsAccent = metrics && metrics.problemBranchCount > 0 ? 'red' as const : 'neutral' as const;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* ============================== */}
      {/* TIER 1: STATUS CARDS GRID      */}
      {/* ============================== */}
      <div className="bg-[#FAFAFA] pt-5 pb-1">
        <div className="max-w-[1400px] mx-auto px-4">
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-bold" style={{ color: SG_BLACK }}>
                {t('hq.title')}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('hq.lastUpdate')}: {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <button
              onClick={loadData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              <span className={`material-symbols-outlined ${isLoading ? 'animate-spin' : ''}`} style={{ fontSize: 16 }}>
                refresh
              </span>
              {t('hq.refresh')}
            </button>
          </div>

          {/* Cards grid — gauge card + 5 KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Gauge card */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center justify-center">
              <NetworkHealthGauge metrics={metrics} />
            </div>

            {/* En attente */}
            <KpiCard
              icon="groups"
              label={t('hq.kpi.waiting')}
              value={metrics?.totalWaiting ?? '—'}
              accent={waitingAccent}
              trend={metrics?.trends.waiting}
              trendInverse
              trendLabel={t('hq.kpi.vsYesterday')}
            />

            {/* SLA Réseau */}
            <KpiCard
              icon="verified"
              label={t('hq.kpi.sla')}
              value={metrics ? `${metrics.weightedSlaPercent}%` : '—'}
              accent={slaAccent}
              trend={metrics?.trends.sla}
              trendLabel={t('hq.kpi.vsYesterday')}
            />

            {/* Servis */}
            <KpiCard
              icon="check_circle"
              label={t('hq.kpi.served')}
              value={metrics?.totalServed ?? '—'}
              accent={servedAccent}
              trend={metrics?.trends.served}
              trendLabel={t('hq.kpi.vsYesterday')}
            />

            {/* Guichets */}
            <KpiCard
              icon="grid_view"
              label={t('hq.kpi.counters')}
              value={metrics ? `${metrics.capacityUtilization}%` : '—'}
              subtext={metrics ? `${metrics.openCounters}/${metrics.totalCounters}` : undefined}
              accent={countersAccent}
            />

            {/* Alertes */}
            <KpiCard
              icon="error"
              label={t('hq.kpi.problems')}
              value={metrics?.problemBranchCount ?? '—'}
              subtext={metrics ? `/ ${metrics.totalBranches}` : undefined}
              accent={alertsAccent}
              alertNote={metrics && metrics.problemBranchCount > 0
                ? `${metrics.problemBranchCount} ${metrics.problemBranchCount === 1 ? 'agence critique' : 'agences critiques'}`
                : undefined
              }
            />
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="max-w-[1400px] mx-auto px-4 py-5 space-y-5">

        {/* ============================== */}
        {/* TIER 2: BRANCH MATRIX          */}
        {/* ============================== */}
        <section>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              account_tree
            </span>
            {t('hq.branchMatrix')}
          </h2>
          <BranchPerformanceMatrix branches={branchHealthRows} />
        </section>

        {/* ============================== */}
        {/* TIER 3: COMPARATIVE ANALYTICS  */}
        {/* ============================== */}
        <section>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              analytics
            </span>
            {t('hq.comparative')}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Branch Ranking */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  leaderboard
                </span>
                {t('hq.ranking.title')}
              </h3>

              {!ranking ? (
                <div className="flex items-center justify-center py-8">
                  <span className="material-symbols-outlined animate-spin text-gray-400 mr-2" style={{ fontSize: 20 }}>
                    progress_activity
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {/* Top 5 */}
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>emoji_events</span>
                      {t('hq.ranking.top5')}
                    </p>
                    <div className="space-y-1.5">
                      {ranking.slice(0, 5).map((r, i) => (
                        <div key={r.branchId} className="flex items-center gap-2 text-xs">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            i === 0 ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {r.rank}
                          </span>
                          <span className="flex-1 truncate font-medium text-gray-900">{r.branchName}</span>
                          <span className="tabular-nums font-semibold text-gray-700">{r.served}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Bottom 5 */}
                  <div>
                    <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>trending_down</span>
                      {t('hq.ranking.bottom5')}
                    </p>
                    <div className="space-y-1.5">
                      {ranking.slice(-5).reverse().map((r) => (
                        <div key={r.branchId} className="flex items-center gap-2 text-xs">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-red-50 text-red-600">
                            {r.rank}
                          </span>
                          <span className="flex-1 truncate font-medium text-gray-900">{r.branchName}</span>
                          <span className="tabular-nums font-semibold text-gray-700">{r.served}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Trend Charts */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  show_chart
                </span>
                {t('hq.trends.title')}
              </h3>

              {!chartData ? (
                <div className="flex items-center justify-center py-8">
                  <span className="material-symbols-outlined animate-spin text-gray-400 mr-2" style={{ fontSize: 20 }}>
                    progress_activity
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <TrendChart
                    data={chartData.served || []}
                    title={t('hq.trends.served')}
                    color="black"
                  />
                  <TrendChart
                    data={chartData.avgWait || []}
                    title={t('hq.trends.avgWait')}
                    color="red"
                    valueFormatter={(v) => `${v} min`}
                  />
                  <TrendChart
                    data={chartData.slaPercent || []}
                    title={t('hq.trends.sla')}
                    color="rose"
                    valueFormatter={(v) => `${v}%`}
                  />
                  <TrendChart
                    data={chartData.noShows || []}
                    title={t('hq.trends.noShows')}
                    color="gray"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ============================== */}
        {/* TIER 4: RECOMMENDATIONS        */}
        {/* ============================== */}
        {recommendations.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                lightbulb
              </span>
              {t('hq.recommendations')}
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {recommendations.map((rec) => (
                <div key={rec.id} className="flex-shrink-0 w-80">
                  <RecommendationCard
                    recommendation={rec}
                    isExecuting={false}
                    onExecute={() => {}}
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ============================================================
// KPI Card sub-component (Alternative 2: Status Cards Grid)
// ============================================================

const ACCENT_COLORS = {
  red: { bar: SG_RED, trendBg: '#FEE2E2', trendText: '#991B1B' },
  amber: { bar: '#F59E0B', trendBg: '#FEF3C7', trendText: '#92400E' },
  green: { bar: '#10B981', trendBg: '#ECFDF5', trendText: '#065F46' },
  neutral: { bar: '#D1D5DB', trendBg: '#F3F4F6', trendText: '#6B7280' },
};

function KpiCard({
  icon,
  label,
  value,
  accent,
  trend,
  trendInverse,
  trendLabel,
  subtext,
  alertNote,
}: {
  icon: string;
  label: string;
  value: string | number;
  accent: 'red' | 'amber' | 'green' | 'neutral';
  trend?: TrendDirection;
  trendInverse?: boolean;
  trendLabel?: string;
  subtext?: string;
  alertNote?: string;
}) {
  const colors = ACCENT_COLORS[accent];
  const valueColor = accent === 'red' ? SG_RED
    : accent === 'amber' ? '#F59E0B'
    : SG_BLACK;

  return (
    <div className="bg-white rounded-xl border border-gray-200 relative overflow-hidden flex flex-col gap-1 p-4 pt-5">
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ backgroundColor: colors.bar }}
      />

      {/* Header: label + icon */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          {label}
        </span>
        <span className="material-symbols-outlined text-gray-300" style={{ fontSize: 18 }}>
          {icon}
        </span>
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-[28px] font-bold tabular-nums leading-none" style={{ color: valueColor }}>
          {value}
        </span>
        {subtext && (
          <span className="text-xs text-gray-400 tabular-nums font-medium">{subtext}</span>
        )}
      </div>

      {/* Trend indicator */}
      {trend && (
        <div className="flex items-center gap-1 mt-0.5">
          <TrendArrow trend={trend} inverse={trendInverse} />
          {trendLabel && (
            <span className="text-[11px] text-gray-400">{trendLabel}</span>
          )}
        </div>
      )}

      {/* Alert note (for the alerts card) */}
      {alertNote && (
        <div className="flex items-center gap-1 mt-0.5">
          <span className="material-symbols-outlined text-amber-500" style={{ fontSize: 14 }}>
            warning
          </span>
          <span className="text-[11px] text-amber-700 font-medium">{alertNote}</span>
        </div>
      )}
    </div>
  );
}
