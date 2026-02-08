// SG Brand Colors
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  rose: '#D66874',
};

export interface ProblemBranch {
  branchId: string;
  branchName: string;
  branchCode: string;
  severity: 'critical' | 'warning';
  issues: string[];
  metrics: {
    waiting?: number;
    avgWaitMins?: number;
    slaPercent?: number;
    openCounters?: number;
    totalCounters?: number;
  };
}

interface NeedsAttentionSectionProps {
  branches: ProblemBranch[];
  onBranchClick?: (branchId: string) => void;
}

export function NeedsAttentionSection({ branches, onBranchClick }: NeedsAttentionSectionProps) {
  if (branches.length === 0) {
    return null;
  }

  const criticalCount = branches.filter((b) => b.severity === 'critical').length;
  const warningCount = branches.filter((b) => b.severity === 'warning').length;

  // Sort: critical first, then warning
  const sortedBranches = [...branches].sort((a, b) => {
    if (a.severity === 'critical' && b.severity !== 'critical') return -1;
    if (a.severity !== 'critical' && b.severity === 'critical') return 1;
    return 0;
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '22px', color: SG_COLORS.red }}
            >
              warning
            </span>
            <div>
              <h3 className="font-semibold" style={{ color: SG_COLORS.black }}>
                Nécessitent Attention
              </h3>
              <p className="text-sm text-gray-500">
                {criticalCount > 0 && (
                  <span className="text-red-600">{criticalCount} critique{criticalCount > 1 ? 's' : ''}</span>
                )}
                {criticalCount > 0 && warningCount > 0 && ', '}
                {warningCount > 0 && (
                  <span className="text-amber-600">{warningCount} avertissement{warningCount > 1 ? 's' : ''}</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Problem branches list */}
      <div className="divide-y divide-gray-100">
        {sortedBranches.map((branch) => (
          <div
            key={branch.branchId}
            className={`px-5 py-4 hover:bg-gray-50 transition-colors ${
              onBranchClick ? 'cursor-pointer' : ''
            }`}
            onClick={() => onBranchClick?.(branch.branchId)}
            style={{
              borderLeft: `4px solid ${branch.severity === 'critical' ? SG_COLORS.red : '#F59E0B'}`,
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${
                      branch.severity === 'critical'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {branch.severity === 'critical' ? '!!' : '!'}
                  </span>
                  <span className="font-medium" style={{ color: SG_COLORS.black }}>
                    {branch.branchName}
                  </span>
                  <span className="text-sm text-gray-500">{branch.branchCode}</span>
                </div>
                <ul className="text-sm text-gray-600 space-y-0.5">
                  {branch.issues.map((issue, index) => (
                    <li key={index} className="flex items-center gap-1">
                      <span className="w-1 h-1 bg-gray-400 rounded-full" />
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center gap-4 text-sm">
                {branch.metrics.waiting !== undefined && (
                  <div className="text-center">
                    <div
                      className={`font-medium ${
                        branch.metrics.waiting > 15 ? 'text-red-600' : ''
                      }`}
                    >
                      {branch.metrics.waiting}
                    </div>
                    <div className="text-xs text-gray-500">attente</div>
                  </div>
                )}
                {branch.metrics.avgWaitMins !== undefined && (
                  <div className="text-center">
                    <div
                      className={`font-medium ${
                        branch.metrics.avgWaitMins > 20 ? 'text-red-600' : ''
                      }`}
                    >
                      {branch.metrics.avgWaitMins} min
                    </div>
                    <div className="text-xs text-gray-500">moy.</div>
                  </div>
                )}
                {branch.metrics.slaPercent !== undefined && (
                  <div className="text-center">
                    <div
                      className={`font-medium ${
                        branch.metrics.slaPercent < 75 ? 'text-red-600' : 'text-amber-600'
                      }`}
                    >
                      {branch.metrics.slaPercent}%
                    </div>
                    <div className="text-xs text-gray-500">SLA</div>
                  </div>
                )}
                {branch.metrics.openCounters !== undefined && (
                  <div className="text-center">
                    <div
                      className={`font-medium ${
                        branch.metrics.openCounters === 0 ? 'text-red-600' : ''
                      }`}
                    >
                      {branch.metrics.openCounters}/{branch.metrics.totalCounters || 0}
                    </div>
                    <div className="text-xs text-gray-500">guichets</div>
                  </div>
                )}
                {onBranchClick && (
                  <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '20px' }}>
                    chevron_right
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
