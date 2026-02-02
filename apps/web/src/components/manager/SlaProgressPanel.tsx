import { useState, useEffect } from 'react';
import { analyticsApi } from '@/lib/api';

// SG Brand Colors
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  rose: '#D66874',
  gray: '#666666',
  lightGray: '#F5F5F5',
  redBg: '#FEE2E2',
  roseBg: 'rgba(214, 104, 116, 0.1)',
  blackBg: 'rgba(26, 26, 26, 0.03)',
  grayBg: '#F0F0F0',
  greenBg: '#DCFCE7',
  green: '#16A34A',
};

interface SlaMetrics {
  sla: {
    targetMins: number;
    withinSla: number;
    totalServed: number;
    percentage: number;
    status: 'green' | 'yellow' | 'red';
  };
  dailyTarget: {
    target: number;
    served: number;
    remaining: number;
    progress: number;
  };
  waitTimes: {
    avgMins: number;
    maxMins: number;
    currentlyWaiting: number;
  };
}

interface SlaProgressPanelProps {
  branchId: string;
}

export function SlaProgressPanel({ branchId }: SlaProgressPanelProps) {
  const [metrics, setMetrics] = useState<SlaMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await analyticsApi.getSlaMetrics(branchId);
        setMetrics(response.data.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch SLA metrics:', err);
        setError('Échec du chargement');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [branchId]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center justify-center py-4">
          <span className="material-symbols-outlined animate-spin text-gray-400">progress_activity</span>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="text-center text-gray-500 text-sm py-4">
          {error || 'Données non disponibles'}
        </div>
      </div>
    );
  }

  // Determine SLA status colors
  const slaStatusColor =
    metrics.sla.status === 'green'
      ? SG_COLORS.green
      : metrics.sla.status === 'yellow'
      ? SG_COLORS.rose
      : SG_COLORS.red;
  const slaStatusBg =
    metrics.sla.status === 'green'
      ? SG_COLORS.greenBg
      : metrics.sla.status === 'yellow'
      ? SG_COLORS.roseBg
      : SG_COLORS.redBg;

  // Target progress color (black for on track, rose for behind)
  const targetProgressColor =
    metrics.dailyTarget.progress >= 50 || new Date().getHours() < 12
      ? SG_COLORS.black
      : metrics.dailyTarget.progress >= 25
      ? SG_COLORS.rose
      : SG_COLORS.red;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-gray-500">speed</span>
          Objectifs & SLA
        </h2>
        <span
          className="text-xs px-2 py-1 rounded-full font-medium"
          style={{ backgroundColor: slaStatusBg, color: slaStatusColor }}
        >
          SLA: {metrics.sla.percentage}%
        </span>
      </div>

      <div className="space-y-4">
        {/* Daily Target Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Objectif journalier</span>
            <span className="text-sm font-bold" style={{ color: targetProgressColor }}>
              {metrics.dailyTarget.served}/{metrics.dailyTarget.target}
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${metrics.dailyTarget.progress}%`,
                backgroundColor: targetProgressColor,
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
            <span>{metrics.dailyTarget.progress}% atteint</span>
            <span>{metrics.dailyTarget.remaining} restants</span>
          </div>
        </div>

        {/* SLA Compliance */}
        <div
          className="p-3 rounded-lg"
          style={{ backgroundColor: slaStatusBg }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium" style={{ color: slaStatusColor }}>
                SLA (≤{metrics.sla.targetMins} min)
              </div>
              <div className="text-xs text-gray-600">
                {metrics.sla.withinSla}/{metrics.sla.totalServed} dans les délais
              </div>
            </div>
            <div
              className="text-2xl font-bold"
              style={{ color: slaStatusColor }}
            >
              {metrics.sla.percentage}%
            </div>
          </div>
          {/* Mini progress bar */}
          <div className="h-1.5 bg-white/50 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${metrics.sla.percentage}%`,
                backgroundColor: slaStatusColor,
              }}
            />
          </div>
        </div>

        {/* Wait Time Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg" style={{ backgroundColor: SG_COLORS.grayBg }}>
            <div className="text-lg font-semibold" style={{ color: SG_COLORS.black }}>
              ~{metrics.waitTimes.avgMins}
            </div>
            <div className="text-xs text-gray-500">min moy.</div>
          </div>
          <div
            className="p-2 rounded-lg"
            style={{
              backgroundColor: metrics.waitTimes.maxMins > 20 ? SG_COLORS.redBg : SG_COLORS.grayBg,
            }}
          >
            <div
              className="text-lg font-semibold"
              style={{ color: metrics.waitTimes.maxMins > 20 ? SG_COLORS.red : SG_COLORS.black }}
            >
              {metrics.waitTimes.maxMins}
            </div>
            <div className="text-xs text-gray-500">min max</div>
          </div>
          <div className="p-2 rounded-lg" style={{ backgroundColor: SG_COLORS.grayBg }}>
            <div className="text-lg font-semibold" style={{ color: SG_COLORS.black }}>
              {metrics.waitTimes.currentlyWaiting}
            </div>
            <div className="text-xs text-gray-500">en attente</div>
          </div>
        </div>
      </div>
    </div>
  );
}
