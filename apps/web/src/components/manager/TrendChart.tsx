import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface TrendChartProps {
  data: { date: string; value: number }[];
  title: string;
  color: string;
  yAxisLabel?: string;
  valueFormatter?: (value: number) => string;
  trend?: 'up' | 'down' | 'flat';
}

// SG Brand colors
const COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  rose: '#D66874',
  gray: '#6B7280',
};

export function TrendChart({
  data,
  title,
  color,
  yAxisLabel,
  valueFormatter = (v) => v.toString(),
  trend,
}: TrendChartProps) {
  const chartColor = COLORS[color as keyof typeof COLORS] || color;

  // Calculate trend if not provided
  const calculatedTrend = useMemo(() => {
    if (trend) return trend;
    if (data.length < 2) return 'flat';

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b.value, 0) / secondHalf.length;

    if (secondAvg > firstAvg * 1.05) return 'up';
    if (secondAvg < firstAvg * 0.95) return 'down';
    return 'flat';
  }, [data, trend]);

  const trendIcon = calculatedTrend === 'up' ? 'trending_up' : calculatedTrend === 'down' ? 'trending_down' : 'trending_flat';
  const trendColor = calculatedTrend === 'up' ? 'text-green-600' : calculatedTrend === 'down' ? 'text-red-600' : 'text-gray-500';

  // Format date for display (e.g., "Lun 3" for Monday 3rd)
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return `${days[date.getDay()]} ${date.getDate()}`;
  };

  // Current value (last data point)
  const currentValue = data.length > 0 ? data[data.length - 1].value : 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700">{title}</h4>
        <div className="flex items-center gap-1">
          <span className={`material-symbols-outlined text-lg ${trendColor}`}>
            {trendIcon}
          </span>
          <span className="text-lg font-semibold text-gray-900">
            {valueFormatter(currentValue)}
          </span>
          {yAxisLabel && (
            <span className="text-xs text-gray-500 ml-1">{yAxisLabel}</span>
          )}
        </div>
      </div>

      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 10, fill: '#6B7280' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#6B7280' }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length && label) {
                  return (
                    <div className="bg-gray-900 text-white px-2 py-1 rounded text-xs">
                      <div className="font-medium">{formatDate(String(label))}</div>
                      <div>{valueFormatter(payload[0].value as number)}</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={chartColor}
              strokeWidth={2}
              fill={`url(#gradient-${color})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default TrendChart;
