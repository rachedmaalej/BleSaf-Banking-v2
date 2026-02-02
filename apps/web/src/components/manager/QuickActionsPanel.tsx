import { useState } from 'react';
import { adminApi } from '@/lib/api';

// SG Brand Colors - V1 Monochrome
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  rose: '#D66874',
  gray: '#666666',
  blackBg: 'rgba(26, 26, 26, 0.05)',
  roseBg: 'rgba(214, 104, 116, 0.1)',
};

interface QuickActionsPanelProps {
  branchId: string;
  counters: {
    id: string;
    status: string;
  }[];
  onActionComplete: () => void;
}

export function QuickActionsPanel({
  branchId,
  counters,
  onActionComplete,
}: QuickActionsPanelProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openCounters = counters.filter((c) => c.status === 'open').length;
  const closedCounters = counters.filter((c) => c.status === 'closed').length;
  const onBreakCounters = counters.filter((c) => c.status === 'on_break').length;

  const handleOpenAll = async () => {
    setIsLoading('open');
    setError(null);
    try {
      await adminApi.openAllCounters(branchId);
      onActionComplete();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de l\'ouverture');
    } finally {
      setIsLoading(null);
    }
  };

  const handleCloseAll = async () => {
    setIsLoading('close');
    setError(null);
    try {
      await adminApi.closeAllCounters(branchId);
      onActionComplete();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la fermeture');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-gray-500">bolt</span>
          Actions rapides
        </h2>
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: SG_COLORS.black }}
            />
            {openCounters} ouverts
          </span>
          <span className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: '#9CA3AF' }}
            />
            {closedCounters} fermés
          </span>
          {onBreakCounters > 0 && (
            <span className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: SG_COLORS.rose }}
              />
              {onBreakCounters} en pause
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* Open All Counters */}
        <button
          onClick={handleOpenAll}
          disabled={isLoading !== null || closedCounters === 0}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: SG_COLORS.black,
            color: 'white',
          }}
        >
          {isLoading === 'open' ? (
            <span className="material-symbols-outlined animate-spin" style={{ fontSize: '20px' }}>
              progress_activity
            </span>
          ) : (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                door_open
              </span>
              Ouvrir tous les guichets
            </>
          )}
        </button>

        {/* Close All Counters */}
        <button
          onClick={handleCloseAll}
          disabled={isLoading !== null || openCounters === 0}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border"
          style={{
            backgroundColor: 'white',
            color: SG_COLORS.rose,
            borderColor: SG_COLORS.rose,
          }}
        >
          {isLoading === 'close' ? (
            <span className="material-symbols-outlined animate-spin" style={{ fontSize: '20px' }}>
              progress_activity
            </span>
          ) : (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                door_front
              </span>
              Fermer tous les guichets
            </>
          )}
        </button>
      </div>

      {onBreakCounters > 0 && (
        <p className="mt-3 text-xs text-gray-500 text-center">
          Les guichets en pause ne seront pas affectés
        </p>
      )}
    </div>
  );
}
