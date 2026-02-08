import { useState } from 'react';

// SG Brand Colors
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  rose: '#D66874',
};

export interface BranchAlert {
  branchId: string;
  branchName: string;
  type: 'critical' | 'warning';
  message: string;
}

interface AlertBannerProps {
  alerts: BranchAlert[];
  onReviewClick?: () => void;
}

export function AlertBanner({ alerts, onReviewClick }: AlertBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (alerts.length === 0 || isDismissed) {
    return null;
  }

  const criticalCount = alerts.filter((a) => a.type === 'critical').length;
  const warningCount = alerts.filter((a) => a.type === 'warning').length;
  const hasCritical = criticalCount > 0;

  return (
    <div
      className="rounded-lg px-4 py-3 flex items-center justify-between"
      style={{
        backgroundColor: hasCritical ? 'rgba(233, 4, 30, 0.08)' : 'rgba(245, 158, 11, 0.08)',
        borderLeft: `4px solid ${hasCritical ? SG_COLORS.red : '#F59E0B'}`,
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: '24px',
            color: hasCritical ? SG_COLORS.red : '#F59E0B',
          }}
        >
          {hasCritical ? 'error' : 'warning'}
        </span>
        <div>
          <span className="font-medium" style={{ color: SG_COLORS.black }}>
            {alerts.length} agence{alerts.length > 1 ? 's' : ''} nécessite{alerts.length > 1 ? 'nt' : ''} attention
          </span>
          <span className="text-sm text-gray-500 ml-2">
            {criticalCount > 0 && (
              <span className="text-red-600">{criticalCount} critique{criticalCount > 1 ? 's' : ''}</span>
            )}
            {criticalCount > 0 && warningCount > 0 && ', '}
            {warningCount > 0 && (
              <span className="text-amber-600">{warningCount} avertissement{warningCount > 1 ? 's' : ''}</span>
            )}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onReviewClick && (
          <button
            onClick={onReviewClick}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{
              backgroundColor: hasCritical ? SG_COLORS.red : '#F59E0B',
              color: 'white',
            }}
          >
            Examiner
          </button>
        )}
        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 rounded hover:bg-gray-200 transition-colors"
          title="Masquer"
        >
          <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '20px' }}>
            close
          </span>
        </button>
      </div>
    </div>
  );
}
