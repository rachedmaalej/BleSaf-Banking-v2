import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { analyticsApi } from '@/lib/api';
import {
  AlertBanner,
  WaitingKpiCard,
  ServedKpiCard,
  SlaKpiCard,
  CounterKpiCard,
  BranchTable,
  NeedsAttentionSection,
  type BranchAlert,
  type BranchRow,
  type ProblemBranch,
} from '@/components/admin';

// SG Brand Colors
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  gray: '#666666',
};

interface BranchOverview {
  branchId: string;
  branchName: string;
  branchCode: string;
  waiting: number;
  completed: number;
  noShows: number;
  openCounters: number;
  totalCounters: number;
  avgWaitMins: number;
  slaPercent: number;
  statusColor: 'green' | 'yellow' | 'red';
  issues: string[];
}

interface OverviewData {
  branches: BranchOverview[];
  totals: {
    waiting: number;
    completed: number;
    noShows: number;
    openCounters: number;
    totalCounters: number;
    slaPercent: number;
  };
  totalBranches: number;
  problemBranches: ProblemBranch[];
  alerts: BranchAlert[];
}

export default function HQDashboard() {
  const { t } = useTranslation();
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNeedsAttention, setShowNeedsAttention] = useState(true);
  const [showAllBranches, setShowAllBranches] = useState(false);
  const needsAttentionRef = useRef<HTMLDivElement>(null);

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

  const handleReviewAlerts = () => {
    setShowNeedsAttention(true);
    setTimeout(() => {
      needsAttentionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleBranchClick = (branchId: string) => {
    // TODO: Navigate to branch detail or open modal
    console.log('Branch clicked:', branchId);
  };

  // Transform branch data for table
  const branchRows: BranchRow[] = overview?.branches.map((b) => ({
    branchId: b.branchId,
    branchName: b.branchName,
    branchCode: b.branchCode,
    waiting: b.waiting,
    served: b.completed,
    slaPercent: b.slaPercent,
    openCounters: b.openCounters,
    totalCounters: b.totalCounters,
    avgWaitMins: b.avgWaitMins,
    statusColor: b.statusColor,
  })) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: SG_COLORS.black }}>
            {t('admin.dashboard')}
          </h1>
          <p className="text-gray-600">
            {overview?.totalBranches || 0} {t('admin.allBranches').toLowerCase()}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            schedule
          </span>
          <span>
            Mis à jour: {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Alert Banner */}
      {overview?.alerts && overview.alerts.length > 0 && (
        <div className="mb-6">
          <AlertBanner alerts={overview.alerts} onReviewClick={handleReviewAlerts} />
        </div>
      )}

      {/* KPI Cards */}
      {overview?.totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <WaitingKpiCard
            value={overview.totals.waiting ?? 0}
            trend={
              (overview.totals.waiting ?? 0) > 50
                ? { direction: 'up', value: 'Élevé', isPositive: false }
                : undefined
            }
          />
          <ServedKpiCard
            value={overview.totals.completed ?? 0}
            trend={{ direction: 'up', value: `+${overview.totals.completed ?? 0}`, isPositive: true }}
          />
          <SlaKpiCard
            value={overview.totals.slaPercent ?? 100}
            trend={
              (overview.totals.slaPercent ?? 100) < 90
                ? { direction: 'down', value: `${100 - (overview.totals.slaPercent ?? 100)}% hors SLA`, isPositive: false }
                : { direction: 'up', value: 'On track', isPositive: true }
            }
          />
          <CounterKpiCard
            open={overview.totals.openCounters ?? 0}
            total={overview.totals.totalCounters ?? 0}
            closedCount={(overview.totals.totalCounters ?? 0) - (overview.totals.openCounters ?? 0)}
          />
        </div>
      )}

      {/* Needs Attention Section */}
      {overview?.problemBranches && overview.problemBranches.length > 0 && (
        <div ref={needsAttentionRef} className="mb-6">
          <div
            className="border-b border-gray-200"
            style={{ backgroundColor: '#FAFAFA' }}
          >
            <button
              onClick={() => setShowNeedsAttention(!showNeedsAttention)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '20px', color: SG_COLORS.red }}
                >
                  warning
                </span>
                <span className="font-medium" style={{ color: SG_COLORS.black }}>
                  Nécessitent Attention
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: 'rgba(233, 4, 30, 0.1)', color: SG_COLORS.red }}
                >
                  {overview.problemBranches.length}
                </span>
              </div>
              <span
                className="material-symbols-outlined transition-transform"
                style={{
                  fontSize: '20px',
                  color: SG_COLORS.gray,
                  transform: showNeedsAttention ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                expand_more
              </span>
            </button>
            {showNeedsAttention && (
              <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-200">
                <NeedsAttentionSection
                  branches={overview.problemBranches}
                  onBranchClick={handleBranchClick}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* All Branches Section */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowAllBranches(!showAllBranches)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '20px', color: SG_COLORS.gray }}
            >
              apartment
            </span>
            <span className="font-medium" style={{ color: SG_COLORS.black }}>
              Toutes les Agences
            </span>
            <span className="text-sm text-gray-500">
              {overview?.totalBranches || 0} agences
            </span>
          </div>
          <span
            className="material-symbols-outlined transition-transform"
            style={{
              fontSize: '20px',
              color: SG_COLORS.gray,
              transform: showAllBranches ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            expand_more
          </span>
        </button>
        {showAllBranches && (
          <div className="px-6 pb-6 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
            <div className="pt-4">
              <BranchTable
                branches={branchRows}
                pageSize={10}
                onBranchClick={handleBranchClick}
              />
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats Summary (always visible) */}
      {overview?.branches && !showAllBranches && (
        <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: '#FAFAFA' }}>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-gray-600">
                  {overview.branches.filter((b) => b.statusColor === 'green').length} OK
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-gray-600">
                  {overview.branches.filter((b) => b.statusColor === 'yellow').length} Avertissements
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-gray-600">
                  {overview.branches.filter((b) => b.statusColor === 'red').length} Critiques
                </span>
              </span>
            </div>
            <button
              onClick={() => setShowAllBranches(true)}
              className="text-sm font-medium hover:underline"
              style={{ color: SG_COLORS.black }}
            >
              Voir toutes les agences →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
