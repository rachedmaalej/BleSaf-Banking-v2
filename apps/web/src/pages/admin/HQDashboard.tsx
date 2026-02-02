import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { analyticsApi } from '@/lib/api';
import Card, { CardTitle } from '@/components/ui/Card';

interface BranchOverview {
  branchId: string;
  branchName: string;
  branchCode: string;
  waiting: number;
  completed: number;
  noShows: number;
  openCounters: number;
  statusColor: 'green' | 'yellow' | 'red';
}

interface OverviewData {
  branches: BranchOverview[];
  totals: {
    waiting: number;
    completed: number;
    noShows: number;
    openCounters: number;
  };
}

export default function HQDashboard() {
  const { t } = useTranslation();
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const response = await analyticsApi.getTenantOverview();
        setOverview(response.data.data);
      } catch (error) {
        console.error('Failed to fetch overview:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOverview();
    const interval = setInterval(fetchOverview, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusStyles = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-100 border-green-500';
      case 'yellow':
        return 'bg-amber-100 border-amber-500';
      case 'red':
        return 'bg-red-100 border-red-500';
      default:
        return 'bg-gray-100';
    }
  };

  const getStatusLabel = (color: string) => {
    switch (color) {
      case 'green':
        return t('admin.healthy');
      case 'yellow':
        return t('admin.warning');
      case 'red':
        return t('admin.critical');
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('admin.dashboard')}</h1>
        <p className="text-gray-600">{t('admin.allBranches')}</p>
      </div>

      {/* Summary stats */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600">
                {overview.totals.waiting}
              </div>
              <div className="text-sm text-gray-600">{t('manager.waiting')}</div>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {overview.totals.completed}
              </div>
              <div className="text-sm text-gray-600">{t('manager.served')}</div>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">
                {overview.totals.noShows}
              </div>
              <div className="text-sm text-gray-600">{t('manager.noShows')}</div>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">
                {overview.totals.openCounters}
              </div>
              <div className="text-sm text-gray-600">
                {t('manager.openCounters')}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Branch status grid */}
      <Card>
        <CardTitle>{t('admin.branchStatus')}</CardTitle>
        <div className="mt-4 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {overview?.branches.map((branch) => (
            <div
              key={branch.branchId}
              className={`p-4 rounded-lg border-s-4 ${getStatusStyles(
                branch.statusColor
              )}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{branch.branchName}</h3>
                  <span className="text-sm text-gray-500">{branch.branchCode}</span>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded ${
                    branch.statusColor === 'green'
                      ? 'bg-green-200 text-green-800'
                      : branch.statusColor === 'yellow'
                      ? 'bg-amber-200 text-amber-800'
                      : 'bg-red-200 text-red-800'
                  }`}
                >
                  {getStatusLabel(branch.statusColor)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-xl font-bold">{branch.waiting}</div>
                  <div className="text-xs text-gray-500">{t('manager.waiting')}</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-green-600">
                    {branch.completed}
                  </div>
                  <div className="text-xs text-gray-500">{t('manager.served')}</div>
                </div>
                <div>
                  <div className="text-xl font-bold">{branch.openCounters}</div>
                  <div className="text-xs text-gray-500">{t('manager.openCounters')}</div>
                </div>
              </div>
            </div>
          ))}

          {!overview?.branches.length && (
            <p className="col-span-full text-center text-gray-500 py-8">
              {t('display.noTickets')}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
