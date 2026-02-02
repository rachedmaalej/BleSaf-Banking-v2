import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useQueueStore } from '@/stores/queueStore';
import { analyticsApi, adminApi, breaksApi } from '@/lib/api';
import {
  getSocket,
  connectSocket,
  joinBranchRoom,
  SOCKET_EVENTS,
} from '@/lib/socket';
import { BreakModal } from '@/components/manager/BreakModal';
import { BreakTimer, BREAK_REASON_LABELS } from '@/components/manager/BreakTimer';

// SG Brand Colors
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  rose: '#D66874',
  gray: '#666666',
  lightGray: '#F5F5F5',
  green: '#10B981',
  amber: '#F59E0B',
};

// Alert thresholds
const ALERT_THRESHOLDS = {
  QUEUE_WARNING: 10,
  QUEUE_CRITICAL: 20,
  SLOW_TELLER_MINS: 15,
};

interface TodayStats {
  tickets: {
    total: number;
    waiting: number;
    completed: number;
    noShows: number;
  };
  times: {
    avgWaitMins: number;
    avgServiceMins: number;
  };
  counters: {
    total: number;
    open: number;
  };
}

interface AgentStat {
  userId: string;
  userName: string;
  totalServed: number;
  avgServiceMins: number;
}

interface Teller {
  id: string;
  name: string;
  email: string;
  status: string;
}

interface Alert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  message: string;
}

interface Comparison {
  today: { served: number; avgWait: number; noShows: number; total: number };
  yesterday: { served: number; avgWait: number; noShows: number; total: number };
  trends: { servedChange: number; waitChange: number; noShowChange: number };
}

interface BranchRank {
  branchId: string;
  branchName: string;
  branchCode: string;
  served: number;
  waiting: number;
  avgWait: number;
  rank: number;
  isUserBranch: boolean;
}

interface RankingData {
  branches: BranchRank[];
  yourRank: number | null;
  totalBranches: number;
  gapToLeader: number;
}

export default function BranchDashboard() {
  const { t } = useTranslation();
  const { branch } = useAuthStore();
  const { branchStatus, fetchBranchStatus } = useQueueStore();

  const [stats, setStats] = useState<TodayStats | null>(null);
  const [agentStats, setAgentStats] = useState<AgentStat[]>([]);
  const [tellers, setTellers] = useState<Teller[]>([]);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [ranking, setRanking] = useState<RankingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingCounter, setUpdatingCounter] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Break modal state
  const [breakModalOpen, setBreakModalOpen] = useState(false);
  const [selectedCounterForBreak, setSelectedCounterForBreak] = useState<{
    id: string;
    number: number;
    assignedUserName?: string;
  } | null>(null);

  // Active breaks state (keyed by counterId)
  const [activeBreaks, setActiveBreaks] = useState<Record<string, {
    breakId: string;
    reason: string;
    expectedEnd: string;
    userName: string;
  }>>({});

  // Calculate alerts based on current state
  const alerts: Alert[] = [];

  // Queue alerts
  if (stats && stats.tickets.waiting >= ALERT_THRESHOLDS.QUEUE_CRITICAL) {
    alerts.push({
      id: 'queue-critical',
      type: 'critical',
      message: `Queue critique: ${stats.tickets.waiting} clients en attente`,
    });
  } else if (stats && stats.tickets.waiting >= ALERT_THRESHOLDS.QUEUE_WARNING) {
    alerts.push({
      id: 'queue-warning',
      type: 'warning',
      message: `File d'attente longue: ${stats.tickets.waiting} clients`,
    });
  }

  // Slow teller alerts
  const slowTellers = agentStats.filter(
    (a) => a.avgServiceMins > ALERT_THRESHOLDS.SLOW_TELLER_MINS
  );
  if (slowTellers.length > 0) {
    alerts.push({
      id: 'slow-tellers',
      type: 'warning',
      message: `${slowTellers.length} guichetier(s) avec temps de service élevé`,
    });
  }

  // Closed counters during business hours
  const closedCounters = branchStatus?.counters.filter(
    (c) => c.status === 'closed'
  );
  if (closedCounters && closedCounters.length > 0 && stats && stats.tickets.waiting > 0) {
    alerts.push({
      id: 'closed-counters',
      type: 'info',
      message: `${closedCounters.length} guichet(s) fermé(s) avec clients en attente`,
    });
  }

  // Overtime break alerts
  const overtimeBreaks = Object.entries(activeBreaks).filter(([_, breakInfo]) => {
    return new Date(breakInfo.expectedEnd) < new Date();
  });
  if (overtimeBreaks.length > 0) {
    alerts.push({
      id: 'overtime-breaks',
      type: 'warning',
      message: `${overtimeBreaks.length} guichetier(s) en pause dépassée`,
    });
  }

  // Calculate team averages
  const teamAvgServiceMins =
    agentStats.length > 0
      ? agentStats.reduce((sum, a) => sum + a.avgServiceMins, 0) / agentStats.length
      : 0;

  const teamTotalServed = agentStats.reduce((sum, a) => sum + a.totalServed, 0);
  const teamAvgServed =
    agentStats.length > 0 ? Math.round(teamTotalServed / agentStats.length) : 0;

  // Sort tellers by performance (most served first)
  const rankedTellers = [...agentStats].sort((a, b) => b.totalServed - a.totalServed);

  useEffect(() => {
    if (!branch?.id) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch all core data in parallel
        const [statsRes, agentsRes, tellersRes, comparisonRes, rankingRes] = await Promise.all([
          analyticsApi.getTodayStats(branch.id),
          analyticsApi.getAgentStats(
            branch.id,
            new Date().toISOString().split('T')[0],
            new Date().toISOString().split('T')[0]
          ),
          adminApi.listUsers(1, 50, branch.id, 'teller'),
          analyticsApi.getBranchComparison(branch.id),
          analyticsApi.getBranchRanking(),
        ]);

        setStats(statsRes.data.data);
        setAgentStats(agentsRes.data.data || []);
        setTellers(tellersRes.data.data || []);
        setComparison(comparisonRes.data.data);
        setRanking(rankingRes.data.data);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }

      // Fetch breaks separately (truly non-blocking - after loading state is set)
      breaksApi.getBranchBreaks(branch.id)
        .then((breaksRes) => {
          const breaksData = breaksRes.data.data;
          if (breaksData?.activeBreaks) {
            const breaksMap: Record<string, any> = {};
            breaksData.activeBreaks.forEach((b: any) => {
              breaksMap[b.counterId] = {
                breakId: b.breakId,
                reason: b.reason,
                expectedEnd: b.expectedEnd,
                userName: b.userName,
              };
            });
            setActiveBreaks(breaksMap);
          }
        })
        .catch(() => {
          // Breaks fetch is non-critical, ignore errors
        });
    };

    fetchData();
    fetchBranchStatus(branch.id);

    // Socket connection
    connectSocket();
    const socket = getSocket();
    joinBranchRoom(branch.id);

    const refreshStats = () => fetchData();
    const refreshQueue = () => fetchBranchStatus(branch.id);

    socket.on(SOCKET_EVENTS.TICKET_COMPLETED, refreshStats);
    socket.on(SOCKET_EVENTS.TICKET_CALLED, refreshStats);
    socket.on(SOCKET_EVENTS.QUEUE_UPDATED, refreshQueue);

    // Break socket events
    socket.on('break:started', (data: any) => {
      setActiveBreaks((prev) => ({
        ...prev,
        [data.counterId]: {
          breakId: data.breakId,
          reason: data.reason,
          expectedEnd: data.expectedEnd,
          userName: data.userName,
        },
      }));
      refreshQueue();
    });

    socket.on('break:ended', (data: any) => {
      setActiveBreaks((prev) => {
        const updated = { ...prev };
        delete updated[data.counterId];
        return updated;
      });
      refreshQueue();
    });

    socket.on('break:extended', (data: any) => {
      setActiveBreaks((prev) => ({
        ...prev,
        [data.counterId]: {
          ...prev[data.counterId],
          expectedEnd: data.newExpectedEnd,
        },
      }));
    });

    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);

    return () => {
      socket.off(SOCKET_EVENTS.TICKET_COMPLETED, refreshStats);
      socket.off(SOCKET_EVENTS.TICKET_CALLED, refreshStats);
      socket.off(SOCKET_EVENTS.QUEUE_UPDATED, refreshQueue);
      socket.off('break:started');
      socket.off('break:ended');
      socket.off('break:extended');
      clearInterval(interval);
    };
  }, [branch?.id, fetchBranchStatus]);

  // Toggle counter status
  const toggleCounter = async (counterId: string, currentStatus: string) => {
    setUpdatingCounter(counterId);
    try {
      const newStatus = currentStatus === 'open' ? 'closed' : 'open';
      await adminApi.updateCounter(counterId, { status: newStatus });
      await fetchBranchStatus(branch!.id);
    } catch (error) {
      console.error('Failed to toggle counter:', error);
    } finally {
      setUpdatingCounter(null);
    }
  };

  // Assign teller to counter
  const assignTeller = async (counterId: string, userId: string | null) => {
    setUpdatingCounter(counterId);
    try {
      await adminApi.updateCounter(counterId, {
        assignedUserId: userId || null,
      });
      await fetchBranchStatus(branch!.id);
    } catch (error) {
      console.error('Failed to assign teller:', error);
    } finally {
      setUpdatingCounter(null);
    }
  };

  // Open break modal for a counter
  const openBreakModal = (counter: { id: string; number: number; assignedUserName?: string }) => {
    setSelectedCounterForBreak(counter);
    setBreakModalOpen(true);
  };

  // End a break
  const endBreak = async (breakId: string, counterId: string) => {
    setUpdatingCounter(counterId);
    try {
      await breaksApi.endBreak(breakId);
      // Remove from active breaks
      setActiveBreaks((prev) => {
        const updated = { ...prev };
        delete updated[counterId];
        return updated;
      });
      await fetchBranchStatus(branch!.id);
    } catch (error) {
      console.error('Failed to end break:', error);
    } finally {
      setUpdatingCounter(null);
    }
  };

  // Extend a break
  const extendBreak = async (breakId: string, counterId: string) => {
    setUpdatingCounter(counterId);
    try {
      const result = await breaksApi.extendBreak(breakId, 15);
      // Update active break with new expected end
      setActiveBreaks((prev) => ({
        ...prev,
        [counterId]: {
          ...prev[counterId],
          expectedEnd: result.data.data.newExpectedEnd,
        },
      }));
    } catch (error) {
      console.error('Failed to extend break:', error);
    } finally {
      setUpdatingCounter(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!branch?.id) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-600 mb-4">{t('manager.noBranchAssigned')}</p>
        <p className="text-sm text-gray-500">{t('manager.useBranchSelector')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('manager.dashboard')}</h1>
          <p className="text-gray-600">{branch?.name}</p>
        </div>
        {lastUpdated && (
          <div className="text-sm text-gray-500">
            Mis à jour: {lastUpdated.toLocaleTimeString('fr-FR')}
          </div>
        )}
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <div
          className="mb-6 p-4 rounded-lg border-l-4"
          style={{
            backgroundColor: alerts.some((a) => a.type === 'critical')
              ? '#FEE2E2'
              : '#FEF3C7',
            borderColor: alerts.some((a) => a.type === 'critical')
              ? SG_COLORS.red
              : SG_COLORS.amber,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className="material-symbols-outlined"
              style={{
                color: alerts.some((a) => a.type === 'critical')
                  ? SG_COLORS.red
                  : SG_COLORS.amber,
              }}
            >
              warning
            </span>
            <span className="font-semibold">
              {alerts.length} alerte(s) nécessitant votre attention
            </span>
          </div>
          <ul className="text-sm space-y-1">
            {alerts.map((alert) => (
              <li key={alert.id} className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor:
                      alert.type === 'critical'
                        ? SG_COLORS.red
                        : alert.type === 'warning'
                        ? SG_COLORS.amber
                        : SG_COLORS.gray,
                  }}
                />
                {alert.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Today's Scorecard with Trends */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Waiting */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div
            className="text-3xl font-bold"
            style={{
              color:
                (stats?.tickets.waiting || 0) >= ALERT_THRESHOLDS.QUEUE_WARNING
                  ? SG_COLORS.red
                  : SG_COLORS.black,
            }}
          >
            {stats?.tickets.waiting || 0}
          </div>
          <div className="text-sm text-gray-600">En attente</div>
          {(stats?.tickets.waiting || 0) >= ALERT_THRESHOLDS.QUEUE_WARNING && (
            <span className="text-xs text-red-600">⚠️ Élevé</span>
          )}
        </div>

        {/* Served with trend */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-3xl font-bold" style={{ color: SG_COLORS.green }}>
            {stats?.tickets.completed || 0}
          </div>
          <div className="text-sm text-gray-600">Servis</div>
          {comparison && comparison.trends.servedChange !== 0 && (
            <div
              className="text-xs flex items-center justify-center gap-1 mt-1"
              style={{
                color: comparison.trends.servedChange > 0 ? SG_COLORS.green : SG_COLORS.red,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                {comparison.trends.servedChange > 0 ? 'trending_up' : 'trending_down'}
              </span>
              {comparison.trends.servedChange > 0 ? '+' : ''}{comparison.trends.servedChange}% vs hier
            </div>
          )}
        </div>

        {/* Avg Wait with trend */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div
            className="text-3xl font-bold"
            style={{
              color:
                (stats?.times.avgWaitMins || 0) > 15
                  ? SG_COLORS.amber
                  : SG_COLORS.black,
            }}
          >
            ~{stats?.times.avgWaitMins || 0}
          </div>
          <div className="text-sm text-gray-600">Attente moy. (min)</div>
          {comparison && comparison.trends.waitChange !== 0 && (
            <div
              className="text-xs flex items-center justify-center gap-1 mt-1"
              style={{
                color: comparison.trends.waitChange < 0 ? SG_COLORS.green : SG_COLORS.red,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                {comparison.trends.waitChange < 0 ? 'trending_down' : 'trending_up'}
              </span>
              {comparison.trends.waitChange > 0 ? '+' : ''}{comparison.trends.waitChange}% vs hier
            </div>
          )}
        </div>

        {/* No Shows */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-3xl font-bold" style={{ color: SG_COLORS.black }}>
            {stats?.tickets.noShows || 0}
          </div>
          <div className="text-sm text-gray-600">Absents</div>
          {comparison && comparison.trends.noShowChange !== 0 && (
            <div
              className="text-xs flex items-center justify-center gap-1 mt-1"
              style={{
                color: comparison.trends.noShowChange < 0 ? SG_COLORS.green : SG_COLORS.amber,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                {comparison.trends.noShowChange < 0 ? 'trending_down' : 'trending_up'}
              </span>
              {comparison.trends.noShowChange > 0 ? '+' : ''}{comparison.trends.noShowChange}% vs hier
            </div>
          )}
        </div>

        {/* Branch Rank */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-3xl font-bold" style={{ color: SG_COLORS.black }}>
            {ranking?.yourRank ? `#${ranking.yourRank}` : '-'}/{ranking?.totalBranches || '-'}
          </div>
          <div className="text-sm text-gray-600">Classement</div>
          {ranking?.yourRank === 1 && (
            <span className="text-xs" style={{ color: SG_COLORS.green }}>🏆 Leader</span>
          )}
          {ranking && ranking.yourRank && ranking.yourRank > 1 && ranking.gapToLeader > 0 && (
            <span className="text-xs text-gray-500">-{ranking.gapToLeader} vs leader</span>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Counter Control Panel */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-gray-500">storefront</span>
              Guichets
            </h2>
          </div>

          <div className="space-y-3">
            {branchStatus?.counters.map((counter) => {
              const breakInfo = activeBreaks[counter.id];
              // Check both the status and active breaks (status might be stale)
              const isOnBreak = (counter.status as string) === 'on_break' || !!breakInfo;
              const isOpen = counter.status === 'open' && !isOnBreak;
              const assignedTellerName = tellers.find(t => t.id === counter.assignedUserId)?.name;

              return (
                <div
                  key={counter.id}
                  className="p-4 rounded-lg border"
                  style={{
                    borderColor: isOnBreak
                      ? SG_COLORS.amber
                      : isOpen
                      ? SG_COLORS.green
                      : '#E5E7EB',
                    backgroundColor: isOnBreak
                      ? 'rgba(245, 158, 11, 0.05)'
                      : isOpen
                      ? 'rgba(16, 185, 129, 0.05)'
                      : '#F9FAFB',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: isOnBreak
                            ? SG_COLORS.amber
                            : isOpen
                            ? SG_COLORS.green
                            : '#9CA3AF',
                        }}
                      />
                      <span className="font-semibold">G{counter.number}</span>
                      {assignedTellerName && (
                        <span className="text-sm text-gray-600">{assignedTellerName}</span>
                      )}
                      {counter.label && (
                        <span className="text-sm text-gray-400">({counter.label})</span>
                      )}
                    </div>
                    <div className="text-right">
                      {isOnBreak && breakInfo ? (
                        <div className="flex flex-col items-end">
                          <span className="text-sm flex items-center gap-1" style={{ color: SG_COLORS.amber }}>
                            <span>{BREAK_REASON_LABELS[breakInfo.reason]?.icon || '☕'}</span>
                            <span>{BREAK_REASON_LABELS[breakInfo.reason]?.label || 'Pause'}</span>
                          </span>
                          <BreakTimer expectedEnd={breakInfo.expectedEnd} />
                        </div>
                      ) : counter.currentTicket ? (
                        <span className="font-bold text-lg" style={{ color: SG_COLORS.red }}>
                          {counter.currentTicket.ticketNumber}
                        </span>
                      ) : isOpen ? (
                        <span className="text-sm text-gray-500">En attente</span>
                      ) : (
                        <span className="text-sm text-gray-400">Fermé</span>
                      )}
                    </div>
                  </div>

                  {/* Actions row - different based on state */}
                  {isOnBreak && breakInfo ? (
                    // On break: show End Break and Extend buttons
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => endBreak(breakInfo.breakId, counter.id)}
                        disabled={updatingCounter === counter.id}
                        className="flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                        style={{
                          backgroundColor: SG_COLORS.green,
                          color: 'white',
                        }}
                      >
                        {updatingCounter === counter.id ? (
                          <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                        ) : (
                          'Reprendre'
                        )}
                      </button>
                      <button
                        onClick={() => extendBreak(breakInfo.breakId, counter.id)}
                        disabled={updatingCounter === counter.id}
                        className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                        style={{
                          backgroundColor: '#FEF3C7',
                          color: '#B45309',
                        }}
                      >
                        +15 min
                      </button>
                    </div>
                  ) : (
                    // Normal state: show teller dropdown and action buttons
                    <div className="flex items-center justify-between gap-2">
                      {/* Teller Assignment Dropdown */}
                      <select
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
                        value={counter.assignedUserId || ''}
                        onChange={(e) => assignTeller(counter.id, e.target.value || null)}
                        disabled={updatingCounter === counter.id}
                      >
                        <option value="">-- Non assigné --</option>
                        {tellers.map((teller) => (
                          <option key={teller.id} value={teller.id}>
                            {teller.name}
                          </option>
                        ))}
                      </select>

                      {/* Break Button (only when open with assigned teller) */}
                      {isOpen && counter.assignedUserId && (
                        <button
                          onClick={() => openBreakModal({
                            id: counter.id,
                            number: counter.number,
                            assignedUserName: assignedTellerName,
                          })}
                          disabled={updatingCounter === counter.id}
                          className="px-3 py-2 text-sm font-medium rounded-lg transition-colors"
                          style={{
                            backgroundColor: '#FEF3C7',
                            color: '#B45309',
                          }}
                          title="Mettre en pause"
                        >
                          ☕
                        </button>
                      )}

                      {/* Toggle Button */}
                      <button
                        onClick={() => toggleCounter(counter.id, counter.status)}
                        disabled={updatingCounter === counter.id}
                        className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                        style={{
                          backgroundColor: isOpen ? '#FEE2E2' : '#D1FAE5',
                          color: isOpen ? SG_COLORS.red : '#059669',
                        }}
                      >
                        {updatingCounter === counter.id ? (
                          <span className="material-symbols-outlined animate-spin text-sm">
                            progress_activity
                          </span>
                        ) : isOpen ? (
                          'Fermer'
                        ) : (
                          'Ouvrir'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Teller Leaderboard */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-gray-500">leaderboard</span>
              Performance des guichetiers
            </h2>
          </div>

          {rankedTellers.length > 0 ? (
            <div className="space-y-2">
              {rankedTellers.map((agent, index) => {
                const isSlow = agent.avgServiceMins > ALERT_THRESHOLDS.SLOW_TELLER_MINS;
                const isTop = index === 0 && agent.totalServed > 0;

                return (
                  <div
                    key={agent.userId}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{
                      backgroundColor: isSlow
                        ? '#FEF3C7'
                        : isTop
                        ? '#ECFDF5'
                        : '#F9FAFB',
                      borderLeft: isTop
                        ? `3px solid ${SG_COLORS.green}`
                        : isSlow
                        ? `3px solid ${SG_COLORS.amber}`
                        : 'none',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{
                          backgroundColor: isTop
                            ? '#FCD34D'
                            : isSlow
                            ? SG_COLORS.amber
                            : '#E5E7EB',
                          color: isTop || isSlow ? '#1A1A1A' : '#6B7280',
                        }}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {agent.userName}
                          {isTop && <span title="Top performer">🥇</span>}
                          {isSlow && (
                            <span
                              className="text-xs px-2 py-0.5 rounded"
                              style={{
                                backgroundColor: '#FEF3C7',
                                color: '#B45309',
                              }}
                            >
                              ⚠️ Lent
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{agent.totalServed} servis</div>
                      <div
                        className="text-sm"
                        style={{
                          color: isSlow ? SG_COLORS.amber : SG_COLORS.gray,
                        }}
                      >
                        ~{agent.avgServiceMins} min/client
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Team Average Row */}
              <div
                className="flex items-center justify-between p-3 mt-2 rounded-lg"
                style={{ backgroundColor: '#F3F4F6', borderTop: '2px dashed #D1D5DB' }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-gray-400"
                    style={{ fontSize: '18px' }}
                  >
                    groups
                  </span>
                  <span className="text-sm font-medium text-gray-600">Moyenne équipe</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-700">{teamAvgServed} servis/agent</div>
                  <div className="text-sm text-gray-500">~{teamAvgServiceMins.toFixed(1)} min/client</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Aucune activité aujourd'hui
            </div>
          )}
        </div>

        {/* Queue Preview */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-gray-500">schedule</span>
              File d'attente
            </h2>
            <span className="text-sm text-gray-500">
              {branchStatus?.waitingTickets?.length || 0} en attente
            </span>
          </div>

          {branchStatus?.waitingTickets && branchStatus.waitingTickets.length > 0 ? (
            <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {branchStatus.waitingTickets.slice(0, 16).map((ticket, index) => (
                <div
                  key={ticket.id}
                  className="p-3 rounded-lg text-center"
                  style={{
                    backgroundColor: index < 3 ? '#FEF3C7' : '#F3F4F6',
                    border: index === 0 ? `2px solid ${SG_COLORS.amber}` : 'none',
                  }}
                >
                  <div className="font-bold">{ticket.ticketNumber}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {ticket.serviceName}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Aucun client en attente
            </div>
          )}
        </div>

        {/* Branch Ranking */}
        {ranking && ranking.branches.length > 1 && (
          <div className="bg-white rounded-lg border border-gray-200 p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-500">emoji_events</span>
                Classement des agences (Aujourd'hui)
              </h2>
              <span className="text-sm text-gray-500">
                {ranking.totalBranches} agences
              </span>
            </div>

            <div className="space-y-3">
              {ranking.branches.slice(0, 5).map((branch) => {
                const maxServed = ranking.branches[0]?.served || 1;
                const progressWidth = Math.max((branch.served / maxServed) * 100, 5);

                return (
                  <div
                    key={branch.branchId}
                    className="relative p-4 rounded-lg"
                    style={{
                      backgroundColor: branch.isUserBranch ? '#EEF2FF' : '#F9FAFB',
                      border: branch.isUserBranch ? `2px solid ${SG_COLORS.red}` : '1px solid #E5E7EB',
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{
                            backgroundColor:
                              branch.rank === 1
                                ? '#FCD34D'
                                : branch.rank === 2
                                ? '#E5E7EB'
                                : branch.rank === 3
                                ? '#FED7AA'
                                : '#F3F4F6',
                            color: branch.rank <= 3 ? '#1A1A1A' : '#6B7280',
                          }}
                        >
                          {branch.rank === 1 ? '🥇' : branch.rank === 2 ? '🥈' : branch.rank === 3 ? '🥉' : `#${branch.rank}`}
                        </span>
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            {branch.branchName}
                            {branch.isUserBranch && (
                              <span
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: SG_COLORS.red,
                                  color: 'white',
                                }}
                              >
                                Vous
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {branch.branchCode}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{branch.served}</div>
                        <div className="text-xs text-gray-500">servis</div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progressWidth}%`,
                          backgroundColor: branch.isUserBranch
                            ? SG_COLORS.red
                            : branch.rank === 1
                            ? SG_COLORS.green
                            : SG_COLORS.gray,
                        }}
                      />
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <span>{branch.waiting} en attente</span>
                      <span>~{branch.avgWait} min attente moy.</span>
                    </div>
                  </div>
                );
              })}

              {/* Summary row: Gap to leader + Yesterday trend */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200 text-sm">
                {/* Gap to leader */}
                {ranking.yourRank && ranking.yourRank > 1 && ranking.gapToLeader > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '18px' }}>
                      target
                    </span>
                    <span className="text-gray-600">
                      Écart: <strong className="text-gray-900">-{ranking.gapToLeader}</strong>
                    </span>
                  </div>
                ) : ranking.yourRank === 1 ? (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: SG_COLORS.green }}>
                      trophy
                    </span>
                    <span style={{ color: SG_COLORS.green }} className="font-medium">
                      Vous êtes en tête!
                    </span>
                  </div>
                ) : (
                  <div />
                )}

                {/* Yesterday trend */}
                {comparison && comparison.trends.servedChange !== 0 && (
                  <div
                    className="flex items-center gap-1"
                    style={{
                      color: comparison.trends.servedChange > 0 ? SG_COLORS.green : SG_COLORS.red,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      {comparison.trends.servedChange > 0 ? 'trending_up' : 'trending_down'}
                    </span>
                    <span className="font-medium">
                      {comparison.trends.servedChange > 0 ? '+' : ''}{comparison.trends.servedChange}% vs hier
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Load Material Symbols */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
      />

      {/* Break Modal */}
      {selectedCounterForBreak && (
        <BreakModal
          isOpen={breakModalOpen}
          onClose={() => {
            setBreakModalOpen(false);
            setSelectedCounterForBreak(null);
          }}
          counter={selectedCounterForBreak}
          onBreakStarted={() => {
            fetchBranchStatus(branch!.id);
          }}
        />
      )}
    </div>
  );
}
