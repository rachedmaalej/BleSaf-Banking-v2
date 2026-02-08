import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { BranchHealthRow } from '@blesaf/shared';

interface BranchPerformanceMatrixProps {
  branches: BranchHealthRow[] | null;
  onBranchClick?: (branchId: string) => void;
}

type SortField = 'branchName' | 'healthScore' | 'waiting' | 'served' | 'slaPercent' | 'avgWaitMins';
type SortDir = 'asc' | 'desc';
type FilterStatus = 'all' | 'critical' | 'warning' | 'healthy';

const SG_RED = '#E9041E';

const STATUS_DOT: Record<string, string> = {
  red: 'bg-red-500',
  yellow: 'bg-amber-400',
  green: 'bg-emerald-500',
};

const ROW_TINT: Record<string, string> = {
  red: 'bg-red-50/60',
  yellow: 'bg-amber-50/40',
  green: '',
};

function HealthBar({ score }: { score: number }) {
  const color = score >= 80 ? '#059669'
    : score >= 60 ? '#10B981'
    : score >= 30 ? '#F59E0B'
    : '#E9041E';

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold tabular-nums" style={{ color, minWidth: 28 }}>
        {score}
      </span>
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return (
    <span className="material-symbols-outlined text-gray-300" style={{ fontSize: 16 }}>
      unfold_more
    </span>
  );
  return (
    <span className="material-symbols-outlined" style={{ fontSize: 16, color: SG_RED }}>
      {dir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
    </span>
  );
}

export function BranchPerformanceMatrix({ branches, onBranchClick }: BranchPerformanceMatrixProps) {
  const { t } = useTranslation();
  const [sortField, setSortField] = useState<SortField>('healthScore');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'branchName' ? 'asc' : 'desc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    if (!branches) return [];

    let filtered = branches;
    if (filter === 'critical') filtered = branches.filter((b) => b.statusColor === 'red');
    else if (filter === 'warning') filtered = branches.filter((b) => b.statusColor === 'yellow');
    else if (filter === 'healthy') filtered = branches.filter((b) => b.statusColor === 'green');

    return [...filtered].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const numA = av as number;
      const numB = bv as number;
      return sortDir === 'asc' ? numA - numB : numB - numA;
    });
  }, [branches, filter, sortField, sortDir]);

  const counts = useMemo(() => {
    if (!branches) return { all: 0, critical: 0, warning: 0, healthy: 0 };
    return {
      all: branches.length,
      critical: branches.filter((b) => b.statusColor === 'red').length,
      warning: branches.filter((b) => b.statusColor === 'yellow').length,
      healthy: branches.filter((b) => b.statusColor === 'green').length,
    };
  }, [branches]);

  const filters: { key: FilterStatus; label: string; color: string; count: number }[] = [
    { key: 'all', label: t('hq.filter.all'), color: 'text-gray-700 bg-gray-100', count: counts.all },
    { key: 'critical', label: t('hq.filter.critical'), color: 'text-red-700 bg-red-50', count: counts.critical },
    { key: 'warning', label: t('hq.filter.warning'), color: 'text-amber-700 bg-amber-50', count: counts.warning },
    { key: 'healthy', label: t('hq.filter.healthy'), color: 'text-emerald-700 bg-emerald-50', count: counts.healthy },
  ];

  const columns: { key: SortField; label: string; align?: string }[] = [
    { key: 'branchName', label: t('hq.col.branch') },
    { key: 'healthScore', label: t('hq.col.health'), align: 'text-center' },
    { key: 'waiting', label: t('hq.col.waiting'), align: 'text-center' },
    { key: 'served', label: t('hq.col.served'), align: 'text-center' },
    { key: 'slaPercent', label: 'SLA %', align: 'text-center' },
    { key: 'avgWaitMins', label: t('hq.col.avgWait'), align: 'text-center' },
  ];

  if (!branches) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-gray-400 mr-2" style={{ fontSize: 20 }}>
          progress_activity
        </span>
        <span className="text-sm text-gray-500">{t('hq.loading')}</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Filter tabs */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
              filter === f.key
                ? `${f.color} ring-1 ring-current/20`
                : 'text-gray-400 bg-transparent hover:bg-gray-50'
            }`}
          >
            {f.label}
            <span className="tabular-nums">{f.count}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {/* Status dot column */}
              <th className="w-8 px-2 py-3" />
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`px-3 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wide cursor-pointer select-none hover:text-gray-900 transition-colors ${col.align || 'text-left'}`}
                >
                  <div className={`inline-flex items-center gap-1 ${col.align || ''}`}>
                    {col.label}
                    <SortIcon active={sortField === col.key} dir={sortDir} />
                  </div>
                </th>
              ))}
              {/* Counters column */}
              <th className="px-3 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wide text-center">
                {t('hq.col.counters')}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-400">
                  {t('hq.noResults')}
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((branch) => (
                <>
                  <tr
                    key={branch.branchId}
                    onClick={() => {
                      setExpandedId(expandedId === branch.branchId ? null : branch.branchId);
                      onBranchClick?.(branch.branchId);
                    }}
                    className={`border-b border-gray-50 cursor-pointer hover:bg-gray-50/80 transition-colors ${ROW_TINT[branch.statusColor]}`}
                  >
                    {/* Status dot */}
                    <td className="px-2 py-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[branch.statusColor]}`} />
                    </td>
                    {/* Branch name */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{branch.branchName}</span>
                        <span className="text-xs text-gray-400">{branch.branchCode}</span>
                      </div>
                      {branch.alerts.length > 0 && (
                        <p className="text-xs text-red-500 mt-0.5 truncate max-w-[200px]">
                          {branch.alerts[0]}
                        </p>
                      )}
                    </td>
                    {/* Health Score */}
                    <td className="px-3 py-3 text-center">
                      <HealthBar score={branch.healthScore} />
                    </td>
                    {/* Waiting */}
                    <td className="px-3 py-3 text-center">
                      <span className={`font-bold tabular-nums ${branch.waiting > 15 ? 'text-red-600' : branch.waiting > 8 ? 'text-amber-600' : 'text-gray-900'}`}>
                        {branch.waiting}
                      </span>
                    </td>
                    {/* Served */}
                    <td className="px-3 py-3 text-center">
                      <span className="font-semibold text-gray-900 tabular-nums">{branch.served}</span>
                    </td>
                    {/* SLA % */}
                    <td className="px-3 py-3 text-center">
                      <span className={`font-bold tabular-nums ${branch.slaPercent < 70 ? 'text-red-600' : branch.slaPercent < 85 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {branch.slaPercent}%
                      </span>
                    </td>
                    {/* Avg Wait */}
                    <td className="px-3 py-3 text-center">
                      <span className={`tabular-nums ${branch.avgWaitMins > 20 ? 'text-red-600 font-bold' : branch.avgWaitMins > 15 ? 'text-amber-600 font-semibold' : 'text-gray-700'}`}>
                        {branch.avgWaitMins} min
                      </span>
                    </td>
                    {/* Counters */}
                    <td className="px-3 py-3 text-center">
                      <span className="font-semibold text-gray-900 tabular-nums">{branch.openCounters}</span>
                      <span className="text-gray-400">/{branch.totalCounters}</span>
                    </td>
                  </tr>
                  {/* Expanded detail row */}
                  {expandedId === branch.branchId && (
                    <tr key={`${branch.branchId}-detail`} className="bg-gray-50/50">
                      <td colSpan={8} className="px-6 py-3">
                        <div className="flex items-center gap-6 text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                              warning
                            </span>
                            <span className="font-medium">{t('hq.noShows')}:</span>
                            <span className="tabular-nums">{branch.noShows}</span>
                          </div>
                          {branch.topService && (
                            <div className="flex items-center gap-1">
                              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                                star
                              </span>
                              <span className="font-medium">{t('hq.topService')}:</span>
                              <span>{branch.topService}</span>
                            </div>
                          )}
                          {branch.alerts.length > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-red-500" style={{ fontSize: 16 }}>
                                error
                              </span>
                              <span>{branch.alerts.join(' · ')}</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
