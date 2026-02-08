import { useState } from 'react';
import { adminApi, queueApi } from '@/lib/api';

// SG Brand Colors - V1 Monochrome
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  rose: '#D66874',
  gray: '#666666',
  green: '#10B981',
  amber: '#F59E0B',
  blackBg: 'rgba(26, 26, 26, 0.05)',
  roseBg: 'rgba(214, 104, 116, 0.1)',
};

interface QuickActionsPanelProps {
  branchId: string;
  counters: {
    id: string;
    status: string;
  }[];
  queueStatus: 'open' | 'paused';
  queuePausedAt?: string | null;
  onActionComplete: () => void;
  onAnnouncementClick?: () => void;
  defaultExpanded?: boolean;
}

export function QuickActionsPanel({
  branchId,
  counters,
  queueStatus,
  queuePausedAt,
  onActionComplete,
  onAnnouncementClick,
  defaultExpanded = false,
}: QuickActionsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);

  const openCounters = counters.filter((c) => c.status === 'open').length;
  const closedCounters = counters.filter((c) => c.status === 'closed').length;
  const onBreakCounters = counters.filter((c) => c.status === 'on_break').length;
  const isQueuePaused = queueStatus === 'paused';

  // Calculate pause duration
  const getPauseDuration = () => {
    if (!queuePausedAt) return '';
    const pausedAt = new Date(queuePausedAt);
    const mins = Math.floor((Date.now() - pausedAt.getTime()) / 60000);
    return mins > 0 ? ` (${mins} min)` : '';
  };

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

  const handlePauseQueue = async () => {
    setIsLoading('pause');
    setError(null);
    try {
      await queueApi.pauseQueue(branchId);
      onActionComplete();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la pause');
    } finally {
      setIsLoading(null);
    }
  };

  const handleResumeQueue = async () => {
    setIsLoading('resume');
    setError(null);
    try {
      await queueApi.resumeQueue(branchId);
      onActionComplete();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la reprise');
    } finally {
      setIsLoading(null);
    }
  };

  const handleResetQueue = async () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      // Auto-cancel confirmation after 3 seconds
      setTimeout(() => setResetConfirm(false), 3000);
      return;
    }

    setIsLoading('reset');
    setError(null);
    setResetConfirm(false);
    try {
      await queueApi.resetQueue(branchId);
      onActionComplete();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la réinitialisation');
    } finally {
      setIsLoading(null);
    }
  };

  // Summary items for collapsed view
  const summaryItems = [
    {
      icon: 'door_open',
      label: 'Guichets',
      value: `${openCounters} ouverts${closedCounters > 0 ? ` · ${closedCounters} fermés` : ''}${onBreakCounters > 0 ? ` · ${onBreakCounters} pause` : ''}`,
    },
    {
      icon: isQueuePaused ? 'pause_circle' : 'play_circle',
      label: 'File',
      value: isQueuePaused ? `En pause${getPauseDuration()}` : 'Active',
      highlight: isQueuePaused,
    },
  ];

  return (
    <div
      className="border-b border-gray-200"
      style={{ backgroundColor: '#FAFAFA' }}
    >
      {/* Collapsed summary header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-6 text-sm">
          {/* Title with bolt icon */}
          <span className="flex items-center gap-2" style={{ color: SG_COLORS.black }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '18px', color: SG_COLORS.gray }}
            >
              bolt
            </span>
            <strong>Actions rapides</strong>
          </span>

          {/* Summary items */}
          {summaryItems.map((item, index) => (
            <span
              key={index}
              className="flex items-center gap-2"
              style={{ color: item.highlight ? SG_COLORS.amber : SG_COLORS.gray }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '18px', color: item.highlight ? SG_COLORS.amber : SG_COLORS.gray }}
              >
                {item.icon}
              </span>
              <span>
                {item.label}:{' '}
                <strong style={{ color: item.highlight ? SG_COLORS.amber : SG_COLORS.black }}>
                  {item.value}
                </strong>
              </span>
            </span>
          ))}
        </div>
        <span
          className="material-symbols-outlined transition-transform"
          style={{
            fontSize: '20px',
            color: SG_COLORS.gray,
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          expand_more
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-200">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Queue Pause/Resume Section */}
          <div className="mb-4">
            {isQueuePaused ? (
              <div
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', borderLeft: `3px solid ${SG_COLORS.amber}` }}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined" style={{ color: SG_COLORS.amber, fontSize: '20px' }}>
                    pause_circle
                  </span>
                  <div>
                    <p className="font-medium text-sm" style={{ color: SG_COLORS.amber }}>
                      File d'attente en pause{getPauseDuration()}
                    </p>
                    <p className="text-xs text-gray-500">Les clients ne peuvent pas prendre de ticket</p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleResumeQueue(); }}
                  disabled={isLoading !== null}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: SG_COLORS.green, color: 'white' }}
                >
                  {isLoading === 'resume' ? (
                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>
                      progress_activity
                    </span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>play_arrow</span>
                      Reprendre
                    </>
                  )}
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); handlePauseQueue(); }}
                disabled={isLoading !== null}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 border"
                style={{ backgroundColor: 'white', color: SG_COLORS.amber, borderColor: SG_COLORS.amber }}
              >
                {isLoading === 'pause' ? (
                  <span className="material-symbols-outlined animate-spin" style={{ fontSize: '20px' }}>
                    progress_activity
                  </span>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>pause_circle</span>
                    Mettre la file en pause
                  </>
                )}
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-3">
            {/* Open All Counters */}
            <button
              onClick={(e) => { e.stopPropagation(); handleOpenAll(); }}
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
                  Ouvrir tout
                </>
              )}
            </button>

            {/* Close All Counters */}
            <button
              onClick={(e) => { e.stopPropagation(); handleCloseAll(); }}
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
                  Fermer tout
                </>
              )}
            </button>

            {/* Send Announcement */}
            <button
              onClick={(e) => { e.stopPropagation(); onAnnouncementClick?.(); }}
              disabled={isLoading !== null || !onAnnouncementClick}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border"
              style={{
                backgroundColor: 'white',
                color: SG_COLORS.red,
                borderColor: SG_COLORS.red,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                campaign
              </span>
              Annonce
            </button>

            {/* Reset Queue */}
            <button
              onClick={(e) => { e.stopPropagation(); handleResetQueue(); }}
              disabled={isLoading !== null}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border"
              style={{
                backgroundColor: resetConfirm ? SG_COLORS.red : 'white',
                color: resetConfirm ? 'white' : SG_COLORS.gray,
                borderColor: resetConfirm ? SG_COLORS.red : SG_COLORS.gray,
              }}
            >
              {isLoading === 'reset' ? (
                <span className="material-symbols-outlined animate-spin" style={{ fontSize: '20px' }}>
                  progress_activity
                </span>
              ) : resetConfirm ? (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    warning
                  </span>
                  Confirmer?
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    restart_alt
                  </span>
                  Réinitialiser
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
      )}
    </div>
  );
}
