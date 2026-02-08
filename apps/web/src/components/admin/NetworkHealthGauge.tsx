import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TenantCompositeMetrics } from '@blesaf/shared';

interface NetworkHealthGaugeProps {
  metrics: TenantCompositeMetrics | null;
}

const GAUGE_COLORS = {
  critical: '#E9041E',
  attention: '#F59E0B',
  good: '#10B981',
  excellent: '#059669',
};

export function NetworkHealthGauge({ metrics }: NetworkHealthGaugeProps) {
  const { t } = useTranslation();

  const { score, label, color, rotation } = useMemo(() => {
    if (!metrics) {
      return { score: 0, label: '—', color: '#D1D5DB', rotation: -90 };
    }
    const s = metrics.networkHealthScore;
    const c = s >= 80 ? GAUGE_COLORS.excellent
      : s >= 60 ? GAUGE_COLORS.good
      : s >= 30 ? GAUGE_COLORS.attention
      : GAUGE_COLORS.critical;
    const r = -90 + (s / 100) * 180;
    return {
      score: s,
      label: t(`hq.health.${metrics.networkHealthLabel}`),
      color: c,
      rotation: r,
    };
  }, [metrics, t]);

  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
        {t('hq.networkHealth')}
      </span>

      {/* SVG gauge — viewBox extended to 100 tall to fit score + label below the arc */}
      <svg viewBox="0 0 120 100" className="w-[140px] h-[116px] mt-1">
        {/* Background arc */}
        <path
          d="M 10 58 A 50 50 0 0 1 110 58"
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Colored arc (proportional) */}
        {metrics && (
          <path
            d="M 10 58 A 50 50 0 0 1 110 58"
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
          x1="60" y1="58" x2="60" y2="20"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          transform={`rotate(${rotation}, 60, 58)`}
          className="transition-all duration-700 ease-out"
        />
        {/* Center dot */}
        <circle cx="60" cy="58" r="4" fill={color} className="transition-colors duration-700" />

        {/* Score number — placed below the center dot with clear spacing */}
        <text
          x="60" y="80"
          textAnchor="middle"
          fill={color}
          fontSize="20"
          fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
          className="transition-colors duration-700"
        >
          {metrics ? score : '—'}
        </text>

        {/* Health label — below the score */}
        <text
          x="60" y="95"
          textAnchor="middle"
          fill={color}
          fontSize="9"
          fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
          letterSpacing="0.08em"
          textTransform="uppercase"
          className="transition-colors duration-700"
        >
          {label.toUpperCase()}
        </text>
      </svg>
    </div>
  );
}
