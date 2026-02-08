// SG Brand Colors
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  rose: '#D66874',
};

interface SparklineData {
  value: number;
}

interface KpiCardProps {
  icon: string;
  label: string;
  value: number | string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: string; // e.g., "+12%", "-5%", "8 closed"
    isPositive?: boolean; // Whether this trend direction is good
  };
  sparklineData?: SparklineData[];
  valueColor?: string;
  format?: 'number' | 'percent' | 'ratio';
}

// Simple SVG sparkline component
function Sparkline({ data, color = SG_COLORS.black }: { data: SparklineData[]; color?: string }) {
  if (!data || data.length < 2) return null;

  const width = 80;
  const height = 24;
  const padding = 2;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((val, i) => {
    const x = padding + (i / (values.length - 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} className="opacity-60">
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function KpiCard({
  icon,
  label,
  value,
  trend,
  sparklineData,
  valueColor = SG_COLORS.black,
  format = 'number',
}: KpiCardProps) {
  const formatValue = () => {
    if (typeof value === 'string') return value;
    if (format === 'percent') return `${value}%`;
    if (format === 'number') return value.toLocaleString('fr-FR');
    return value;
  };

  const getTrendColor = () => {
    if (!trend) return 'text-gray-500';
    if (trend.direction === 'neutral') return 'text-gray-500';
    // If isPositive is defined, use it; otherwise default to up=good, down=bad
    const isGood = trend.isPositive ?? trend.direction === 'up';
    return isGood ? 'text-green-600' : 'text-red-600';
  };

  const getTrendIcon = () => {
    if (!trend || trend.direction === 'neutral') return null;
    return trend.direction === 'up' ? 'trending_up' : 'trending_down';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '20px' }}>
            {icon}
          </span>
          <span className="text-sm text-gray-600">{label}</span>
        </div>
        {sparklineData && sparklineData.length > 1 && (
          <Sparkline data={sparklineData} color={valueColor} />
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold" style={{ color: valueColor }}>
          {formatValue()}
        </span>
        {trend && (
          <span className={`flex items-center gap-0.5 text-sm ${getTrendColor()}`}>
            {getTrendIcon() && (
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                {getTrendIcon()}
              </span>
            )}
            <span>{trend.value}</span>
          </span>
        )}
      </div>
    </div>
  );
}

// Preset KPI cards for common metrics
interface PresetKpiProps {
  value: number;
  trend?: KpiCardProps['trend'];
  sparklineData?: SparklineData[];
}

export function WaitingKpiCard({ value, trend, sparklineData }: PresetKpiProps) {
  return (
    <KpiCard
      icon="hourglass_top"
      label="En attente"
      value={value}
      valueColor="#6366F1" // Indigo for waiting
      trend={trend}
      sparklineData={sparklineData}
    />
  );
}

export function ServedKpiCard({ value, trend, sparklineData }: PresetKpiProps) {
  return (
    <KpiCard
      icon="check_circle"
      label="Servis"
      value={value}
      valueColor="#10B981" // Green for served
      trend={trend}
      sparklineData={sparklineData}
    />
  );
}

export function SlaKpiCard({ value, trend, sparklineData }: PresetKpiProps) {
  // SLA color based on value
  const getColor = () => {
    if (value >= 90) return '#10B981'; // Green
    if (value >= 75) return '#F59E0B'; // Amber
    return SG_COLORS.red; // Red
  };

  return (
    <KpiCard
      icon="speed"
      label="SLA %"
      value={value}
      format="percent"
      valueColor={getColor()}
      trend={trend}
      sparklineData={sparklineData}
    />
  );
}

interface CounterKpiProps {
  open: number;
  total: number;
  closedCount?: number;
}

export function CounterKpiCard({ open, total, closedCount }: CounterKpiProps) {
  return (
    <KpiCard
      icon="storefront"
      label="Guichets"
      value={`${open}/${total}`}
      valueColor={open < total ? '#F59E0B' : SG_COLORS.black}
      trend={
        closedCount && closedCount > 0
          ? {
              direction: 'neutral',
              value: `${closedCount} fermé${closedCount > 1 ? 's' : ''}`,
            }
          : undefined
      }
    />
  );
}
