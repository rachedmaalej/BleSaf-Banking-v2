import { useState, useEffect } from 'react';
import { TrendChart } from './TrendChart';
import { analyticsApi } from '@/lib/api';

interface HistoricalTrendsSectionProps {
  branchId: string;
}

interface ChartData {
  served: { date: string; value: number }[];
  avgWait: { date: string; value: number }[];
  slaPercent: { date: string; value: number }[];
  noShows: { date: string; value: number }[];
}

export function HistoricalTrendsSection({ branchId }: HistoricalTrendsSectionProps) {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChartData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await analyticsApi.getChartData(branchId, period, [
          'served',
          'avgWait',
          'slaPercent',
          'noShows',
        ]);
        setChartData(response.data.data.metrics);
      } catch (err) {
        console.error('Failed to fetch chart data:', err);
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [branchId, period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E9041E]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <span className="material-symbols-outlined text-2xl mb-2">error</span>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Period Toggle */}
      <div className="flex justify-end">
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          <button
            onClick={() => setPeriod('week')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              period === 'week'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            7 jours
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              period === 'month'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            30 jours
          </button>
        </div>
      </div>

      {/* Charts Grid */}
      {chartData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TrendChart
            data={chartData.served || []}
            title="Clients servis"
            color="red"
            valueFormatter={(v) => v.toString()}
          />
          <TrendChart
            data={chartData.avgWait || []}
            title="Temps d'attente moyen"
            color="black"
            yAxisLabel="min"
            valueFormatter={(v) => `${v} min`}
          />
          <TrendChart
            data={chartData.slaPercent || []}
            title="SLA respecté"
            color="rose"
            yAxisLabel="%"
            valueFormatter={(v) => `${v}%`}
          />
          <TrendChart
            data={chartData.noShows || []}
            title="Absents"
            color="gray"
            valueFormatter={(v) => v.toString()}
          />
        </div>
      )}
    </div>
  );
}

export default HistoricalTrendsSection;
