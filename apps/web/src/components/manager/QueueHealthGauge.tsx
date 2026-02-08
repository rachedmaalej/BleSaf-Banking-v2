import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { KpiTooltip } from './KpiTooltip';
import type { CompositeMetrics } from '@blesaf/shared';

interface QueueHealthGaugeProps {
  metrics: CompositeMetrics | null;
}

const GAUGE_COLORS = {
  critical: '#E9041E', // SG Red
  attention: '#F59E0B', // Amber
  good: '#10B981',     // Green
  excellent: '#059669', // Emerald
};

export function QueueHealthGauge({ metrics }: QueueHealthGaugeProps) {
  const { t } = useTranslation();

  const { score, label, color, rotation } = useMemo(() => {
    if (!metrics) {
      return { score: 0, label: '—', color: '#D1D5DB', rotation: -90 };
    }
    const s = metrics.healthScore;
    const c = s >= 80 ? GAUGE_COLORS.excellent
      : s >= 60 ? GAUGE_COLORS.good
      : s >= 30 ? GAUGE_COLORS.attention
      : GAUGE_COLORS.critical;
    // Map 0-100 to -90° (left) to 90° (right)
    const r = -90 + (s / 100) * 180;
    return {
      score: s,
      label: t(`dashboard.ai.health.${metrics.healthLabel}`),
      color: c,
      rotation: r,
    };
  }, [metrics, t]);

  return (
    <div className="flex flex-col items-center">
      <KpiTooltip tooltipKey="healthScore">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {t('dashboard.ai.healthScore')}
        </span>
      </KpiTooltip>

      {/* Semicircular gauge using SVG */}
      <div className="relative w-32 h-20 mt-2">
        <svg viewBox="0 0 120 70" className="w-full h-full">
          {/* Background arc */}
          <path
            d="M 10 60 A 50 50 0 0 1 110 60"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Colored arc (proportional) */}
          {metrics && (
            <path
              d="M 10 60 A 50 50 0 0 1 110 60"
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 157} 157`}
              className="transition-all duration-700 ease-out"
            />
          )}
          {/* Needle */}
          <line
            x1="60"
            y1="60"
            x2="60"
            y2="22"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            transform={`rotate(${rotation}, 60, 60)`}
            className="transition-all duration-700 ease-out"
          />
          {/* Center dot */}
          <circle cx="60" cy="60" r="4" fill={color} className="transition-colors duration-700" />
        </svg>

        {/* Score text */}
        <div className="absolute inset-x-0 bottom-0 text-center">
          <span className="text-2xl font-bold" style={{ color }}>
            {metrics ? score : '—'}
          </span>
        </div>
      </div>

      {/* Label */}
      <span
        className="text-xs font-semibold mt-1 uppercase tracking-wider"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  );
}
