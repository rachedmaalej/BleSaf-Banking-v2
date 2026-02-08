import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';
import { KpiTooltip } from './KpiTooltip';
import type { BranchForecast } from '@blesaf/shared';

interface ForecastChartProps {
  forecast: BranchForecast | null;
}

export function ForecastChart({ forecast }: ForecastChartProps) {
  const { t } = useTranslation();

  const data = useMemo(() => {
    if (!forecast) return [];
    return forecast.hourlyForecast.map((point) => ({
      hour: `${point.hour}h`,
      predicted: point.predictedVolume,
      actual: point.actualVolume,
      confidence: Math.round(point.confidence * 100),
    }));
  }, [forecast]);

  if (!forecast || data.length === 0) return null;

  const currentHourIndex = 0; // First point is always current hour

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <KpiTooltip tooltipKey="forecast">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          <span className="material-symbols-outlined align-text-bottom mr-1" style={{ fontSize: 18 }}>
            trending_up
          </span>
          {t('dashboard.ai.forecastTitle')}
        </h3>
      </KpiTooltip>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E9041E" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#E9041E" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 11, fill: '#6B7280' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6B7280' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: '1px solid #E5E7EB',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
              formatter={(value: number, name: string) => {
                const label = name === 'predicted'
                  ? t('dashboard.ai.forecastPredicted')
                  : t('dashboard.ai.forecastActual');
                return [value, label] as [number, string];
              }}
            />
            <Area
              type="monotone"
              dataKey="predicted"
              stroke="#E9041E"
              fill="url(#forecastGradient)"
              strokeWidth={2}
              dot={false}
            />
            {/* Current hour dot */}
            {data[currentHourIndex]?.actual !== undefined && (
              <ReferenceDot
                x={data[currentHourIndex].hour}
                y={data[currentHourIndex].actual!}
                r={5}
                fill="#E9041E"
                stroke="#fff"
                strokeWidth={2}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Peak info */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        {t('dashboard.ai.forecastPeak', {
          hour: forecast.peakHour,
          volume: forecast.peakVolume,
        })}
      </div>
    </div>
  );
}
